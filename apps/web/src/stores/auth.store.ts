import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface User {
  id: string;
  address: string;
  email?: string;
  createdAt: string;
}

interface AuthState {
  token?: string;
  user?: User;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setToken: (token: string | undefined) => void;
  setUser: (user: User | undefined) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  token: undefined,
  user: undefined,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setToken: (token) =>
          set({ token, isAuthenticated: !!token }, false, "setToken"),
        setUser: (user) => set({ user }, false, "setUser"),
        login: (token, user) => {
          // Sync with localStorage for api-client compatibility
          if (typeof window !== "undefined") {
            localStorage.setItem("auth_token", token);
          }
          set({ token, user, isAuthenticated: true }, false, "login");
        },
        logout: () => {
          // Clear localStorage token
          if (typeof window !== "undefined") {
            localStorage.removeItem("auth_token");
          }
          set(initialState, false, "logout");
        },
        setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);
