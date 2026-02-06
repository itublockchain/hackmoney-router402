import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  sessions: Record<string, ChatSession>;
  activeSessionId: string | null;
}

interface ChatActions {
  createSession: (id?: string) => string;
  deleteSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;
  addMessage: (
    sessionId: string,
    role: "user" | "assistant",
    content: string
  ) => void;
  renameSession: (id: string, name: string) => void;
  getSortedSessions: () => ChatSession[];
}

export type ChatStore = ChatState & ChatActions;

const initialState: ChatState = {
  sessions: {},
  activeSessionId: null,
};

// ---------------------------------------------------------------------------
// Selector hooks – keeps components simple by co-locating selectors here
// ---------------------------------------------------------------------------

/** Sorted sessions list (most recent first) – derive in component via useMemo */
export const useSessions = () => useChatStore((s) => s.sessions);
export const useActiveSessionId = () => useChatStore((s) => s.activeSessionId);
export const useSession = (id: string) =>
  useChatStore((s) => s.sessions[id] ?? null);

/** Actions */
export const useCreateSession = () => useChatStore((s) => s.createSession);
export const useDeleteSession = () => useChatStore((s) => s.deleteSession);
export const useAddMessage = () => useChatStore((s) => s.addMessage);
export const useSetActiveSession = () =>
  useChatStore((s) => s.setActiveSession);
export const useRenameSession = () => useChatStore((s) => s.renameSession);
export const useGetSortedSessions = () =>
  useChatStore((s) => s.getSortedSessions);

// ---------------------------------------------------------------------------

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        createSession: (id?: string) => {
          const sessionId = id ?? crypto.randomUUID();
          const now = Date.now();
          set(
            (state) => ({
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  id: sessionId,
                  name: "New Chat",
                  messages: [],
                  createdAt: now,
                  updatedAt: now,
                },
              },
              activeSessionId: sessionId,
            }),
            false,
            "createSession"
          );
          return sessionId;
        },

        deleteSession: (id) =>
          set(
            (state) => {
              const { [id]: _, ...rest } = state.sessions;
              return {
                sessions: rest,
                activeSessionId:
                  state.activeSessionId === id ? null : state.activeSessionId,
              };
            },
            false,
            "deleteSession"
          ),

        setActiveSession: (id) =>
          set({ activeSessionId: id }, false, "setActiveSession"),

        addMessage: (sessionId, role, content) =>
          set(
            (state) => {
              const session = state.sessions[sessionId];
              if (!session) return state;

              const message: ChatMessage = {
                id: crypto.randomUUID(),
                role,
                content,
                createdAt: Date.now(),
              };

              const isFirstUserMessage =
                role === "user" &&
                session.messages.filter((m) => m.role === "user").length === 0;

              return {
                sessions: {
                  ...state.sessions,
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
              };
            },
            false,
            "addMessage"
          ),

        renameSession: (id, name) =>
          set(
            (state) => {
              const session = state.sessions[id];
              if (!session) return state;
              return {
                sessions: {
                  ...state.sessions,
                  [id]: { ...session, name, updatedAt: Date.now() },
                },
              };
            },
            false,
            "renameSession"
          ),

        getSortedSessions: () => {
          const { sessions } = get();
          return Object.values(sessions).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
        },
      }),
      {
        name: "chat-storage",
      }
    ),
    { name: "ChatStore" }
  )
);
