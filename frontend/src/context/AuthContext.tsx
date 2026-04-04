import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { api } from "../services/api";
import type { UserSummary } from "../types";

type State = {
  user: UserSummary | null;
  loading: boolean;
  bootstrapped: boolean;
};

type Action =
  | { type: "SET_USER"; user: UserSummary | null }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "BOOTSTRAP_DONE" };

const initial: State = {
  user: null,
  loading: true,
  bootstrapped: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.user };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "BOOTSTRAP_DONE":
      return { ...state, bootstrapped: true, loading: false };
    default:
      return state;
  }
}

type Ctx = {
  user: UserSummary | null;
  loading: boolean;
  bootstrapped: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: UserSummary }>("/api/auth/me");
      dispatch({ type: "SET_USER", user: data.user });
    } catch {
      dispatch({ type: "SET_USER", user: null });
    } finally {
      dispatch({ type: "BOOTSTRAP_DONE" });
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      dispatch({ type: "SET_USER", user: null });
      toast.success("Signed out");
    }
  }, []);

  const value: Ctx = {
    user: state.user,
    loading: state.loading,
    bootstrapped: state.bootstrapped,
    refreshUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
