import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** HTTP error code when the message represents an API error (e.g. 402) */
  errorCode?: number;
}

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";

export interface ChatSession {
  id: string;
  name: string;
  model: string;
  lifiMcpEnabled: boolean;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  /** Current wallet address for session isolation */
  walletAddress: string | null;
  /** Sessions stored per wallet address: { [walletAddress]: { [sessionId]: ChatSession } } */
  sessionsByWallet: Record<string, Record<string, ChatSession>>;
  activeSessionId: string | null;
}

interface ChatActions {
  /** Set the current wallet address - call this when wallet connects/disconnects */
  setWalletAddress: (address: string | null) => void;
  createSession: (id?: string) => string;
  /**
   * Delete a session by id.
   * @param id - The session id to delete
   * @param walletAddress - Optional wallet address to use (bypasses store state for reliability)
   */
  deleteSession: (id: string, walletAddress?: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    errorCode?: number
  ) => string;
  updateMessage: (
    sessionId: string,
    messageId: string,
    content: string,
    errorCode?: number
  ) => void;
  renameSession: (id: string, name: string) => void;
  setSessionModel: (id: string, model: string) => void;
  setSessionLifiMcp: (id: string, enabled: boolean) => void;
  getSortedSessions: () => ChatSession[];
}

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  walletAddress: null,
  sessionsByWallet: {},
  activeSessionId: null,
};

// ---------------------------------------------------------------------------
// Helper to get sessions for current wallet
// ---------------------------------------------------------------------------

/** Stable empty object to avoid infinite loops with React 18 concurrent features */
const EMPTY_SESSIONS: Record<string, ChatSession> = {};

const getWalletSessions = (state: ChatState): Record<string, ChatSession> => {
  if (!state.walletAddress) return EMPTY_SESSIONS;
  return state.sessionsByWallet[state.walletAddress] ?? EMPTY_SESSIONS;
};

// ---------------------------------------------------------------------------
// Selector hooks – keeps components simple by co-locating selectors here
// ---------------------------------------------------------------------------

/** Get sessions for the current wallet */
export const useSessions = () =>
  useChatStore((s) => {
    if (!s.walletAddress) return EMPTY_SESSIONS;
    return s.sessionsByWallet[s.walletAddress] ?? EMPTY_SESSIONS;
  });

export const useActiveSessionId = () => useChatStore((s) => s.activeSessionId);

export const useSession = (id: string) =>
  useChatStore((s) => {
    if (!s.walletAddress) return null;
    const sessions = s.sessionsByWallet[s.walletAddress] ?? {};
    return sessions[id] ?? null;
  });

export const useWalletAddress = () => useChatStore((s) => s.walletAddress);

/** Actions */
export const useSetWalletAddress = () =>
  useChatStore((s) => s.setWalletAddress);
export const useCreateSession = () => useChatStore((s) => s.createSession);
export const useDeleteSession = () => useChatStore((s) => s.deleteSession);
export const useAddMessage = () => useChatStore((s) => s.addMessage);
export const useUpdateMessage = () => useChatStore((s) => s.updateMessage);
export const useSetActiveSession = () =>
  useChatStore((s) => s.setActiveSession);
export const useRenameSession = () => useChatStore((s) => s.renameSession);
export const useSetSessionModel = () => useChatStore((s) => s.setSessionModel);
export const useSetSessionLifiMcp = () =>
  useChatStore((s) => s.setSessionLifiMcp);
export const useGetSortedSessions = () =>
  useChatStore((s) => s.getSortedSessions);

// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setWalletAddress: (address) =>
          set(
            (state) => ({
              walletAddress: address?.toLowerCase() ?? null,
              // Clear active session when wallet changes
              activeSessionId:
                state.walletAddress !== address?.toLowerCase()
                  ? null
                  : state.activeSessionId,
            }),
            false,
            "setWalletAddress"
          ),

        createSession: (id?: string) => {
          const state = get();
          const walletAddress = state.walletAddress;
          if (!walletAddress) {
            throw new Error("Cannot create session without wallet connected");
          }

          const sessionId = id ?? crypto.randomUUID();
          const now = Date.now();
          const walletSessions = state.sessionsByWallet[walletAddress] ?? {};

          set(
            {
              sessionsByWallet: {
                ...state.sessionsByWallet,
                [walletAddress]: {
                  ...walletSessions,
                  [sessionId]: {
                    id: sessionId,
                    name: "New Chat",
                    model: DEFAULT_MODEL,
                    lifiMcpEnabled: false,
                    messages: [],
                    createdAt: now,
                    updatedAt: now,
                  },
                },
              },
              activeSessionId: sessionId,
            },
            false,
            "createSession"
          );
          return sessionId;
        },

        deleteSession: (id, explicitWalletAddress) =>
          set(
            (state) => {
              // Use explicit wallet address if provided, otherwise fall back to store state
              const walletAddress =
                explicitWalletAddress?.toLowerCase() ?? state.walletAddress;
              if (!walletAddress) return state;

              const walletSessions =
                state.sessionsByWallet[walletAddress] ?? {};
              const { [id]: _, ...rest } = walletSessions;

              return {
                sessionsByWallet: {
                  ...state.sessionsByWallet,
                  [walletAddress]: rest,
                },
                activeSessionId:
                  state.activeSessionId === id ? null : state.activeSessionId,
              };
            },
            false,
            "deleteSession"
          ),

        setActiveSession: (id) =>
          set({ activeSessionId: id }, false, "setActiveSession"),

        addMessage: (sessionId, role, content, errorCode?) => {
          const messageId = crypto.randomUUID();
          set(
            (state) => {
              const walletAddress = state.walletAddress;
              if (!walletAddress) return state;

              const walletSessions =
                state.sessionsByWallet[walletAddress] ?? {};
              const session = walletSessions[sessionId];
              if (!session) return state;

              const message: ChatMessage = {
                id: messageId,
                role,
                content,
                createdAt: Date.now(),
                ...(errorCode !== undefined && { errorCode }),
              };

              const isFirstUserMessage =
                role === "user" &&
                session.messages.filter((m) => m.role === "user").length === 0;

              return {
                sessionsByWallet: {
                  ...state.sessionsByWallet,
                  [walletAddress]: {
                    ...walletSessions,
                    [sessionId]: {
                      ...session,
                      name: isFirstUserMessage
                        ? content.slice(0, 50) +
                          (content.length > 50 ? "..." : "")
                        : session.name,
                      messages: [...session.messages, message],
                      updatedAt: Date.now(),
                    },
                  },
                },
              };
            },
            false,
            "addMessage"
          );
          return messageId;
        },

        updateMessage: (sessionId, messageId, content, errorCode?) =>
          set(
            (state) => {
              const walletAddress = state.walletAddress;
              if (!walletAddress) return state;

              const walletSessions =
                state.sessionsByWallet[walletAddress] ?? {};
              const session = walletSessions[sessionId];
              if (!session) return state;

              return {
                sessionsByWallet: {
                  ...state.sessionsByWallet,
                  [walletAddress]: {
                    ...walletSessions,
                    [sessionId]: {
                      ...session,
                      messages: session.messages.map((m) =>
                        m.id === messageId
                          ? {
                              ...m,
                              content,
                              ...(errorCode !== undefined && { errorCode }),
                            }
                          : m
                      ),
                      updatedAt: Date.now(),
                    },
                  },
                },
              };
            },
            false,
            "updateMessage"
          ),

        renameSession: (id, name) =>
          set(
            (state) => {
              const walletAddress = state.walletAddress;
              if (!walletAddress) return state;

              const walletSessions =
                state.sessionsByWallet[walletAddress] ?? {};
              const session = walletSessions[id];
              if (!session) return state;

              return {
                sessionsByWallet: {
                  ...state.sessionsByWallet,
                  [walletAddress]: {
                    ...walletSessions,
                    [id]: { ...session, name, updatedAt: Date.now() },
                  },
                },
              };
            },
            false,
            "renameSession"
          ),

        setSessionModel: (id, model) =>
          set(
            (state) => {
              const walletAddress = state.walletAddress;
              if (!walletAddress) return state;

              const walletSessions =
                state.sessionsByWallet[walletAddress] ?? {};
              const session = walletSessions[id];
              if (!session) return state;

              return {
                sessionsByWallet: {
                  ...state.sessionsByWallet,
                  [walletAddress]: {
                    ...walletSessions,
                    [id]: { ...session, model },
                  },
                },
              };
            },
            false,
            "setSessionModel"
          ),

        setSessionLifiMcp: (id, enabled) =>
          set(
            (state) => {
              const walletAddress = state.walletAddress;
              if (!walletAddress) return state;

              const walletSessions =
                state.sessionsByWallet[walletAddress] ?? {};
              const session = walletSessions[id];
              if (!session) return state;

              return {
                sessionsByWallet: {
                  ...state.sessionsByWallet,
                  [walletAddress]: {
                    ...walletSessions,
                    [id]: { ...session, lifiMcpEnabled: enabled },
                  },
                },
              };
            },
            false,
            "setSessionLifiMcp"
          ),

        getSortedSessions: () => {
          const state = get();
          const sessions = getWalletSessions(state);
          return Object.values(sessions).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
        },
      }),
      {
        name: "router402_chat-storage",
      }
    ),
    { name: "ChatStore" }
  )
);
