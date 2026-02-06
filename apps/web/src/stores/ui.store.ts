import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface Modal {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

export interface Artifact {
  code: string;
  language?: string;
  /** Index of the code block within the message (for identity) */
  blockIndex: number;
  /** ID of the message containing this code block */
  messageId: string;
}

interface UIState {
  modals: Record<string, Modal>;
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  selectedArtifact: Artifact | null;
}

interface UIActions {
  openModal: (id: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  toggleModal: (id: string, data?: unknown) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  resetModals: () => void;
  setSelectedArtifact: (artifact: Artifact | null) => void;
  clearSelectedArtifact: () => void;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  modals: {},
  sidebarOpen: true,
  theme: "system",
  selectedArtifact: null,
};

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      ...initialState,
      openModal: (id, data) =>
        set(
          (state) => ({
            modals: {
              ...state.modals,
              [id]: { id, isOpen: true, data },
            },
          }),
          false,
          "openModal"
        ),
      closeModal: (id) =>
        set(
          (state) => ({
            modals: {
              ...state.modals,
              [id]: { ...state.modals[id], isOpen: false },
            },
          }),
          false,
          "closeModal"
        ),
      toggleModal: (id, data) =>
        set(
          (state) => {
            const currentModal = state.modals[id];
            return {
              modals: {
                ...state.modals,
                [id]: {
                  id,
                  isOpen: !currentModal?.isOpen,
                  data: data ?? currentModal?.data,
                },
              },
            };
          },
          false,
          "toggleModal"
        ),
      setSidebarOpen: (sidebarOpen) =>
        set({ sidebarOpen }, false, "setSidebarOpen"),
      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          "toggleSidebar"
        ),
      setTheme: (theme) => set({ theme }, false, "setTheme"),
      resetModals: () => set({ modals: {} }, false, "resetModals"),
      setSelectedArtifact: (artifact) =>
        set({ selectedArtifact: artifact }, false, "setSelectedArtifact"),
      clearSelectedArtifact: () =>
        set({ selectedArtifact: null }, false, "clearSelectedArtifact"),
    }),
    { name: "UIStore" }
  )
);
