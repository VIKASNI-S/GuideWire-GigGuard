import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";

type AdminUser = { id: string; email: string; name: string; role: string };
type Ctx = {
  admin: AdminUser | null;
  token: string | null;
  bootstrapped: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const KEY = "phoeraksha_admin_token";
const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const CtxObj = createContext<Ctx | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem(KEY));
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setBootstrapped(true);
        return;
      }
      try {
        const { data } = await axios.get<{ admin: AdminUser }>(`${API}/api/admin/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setAdmin(data.admin);
      } catch {
        localStorage.removeItem(KEY);
        if (!cancelled) {
          setToken(null);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(email: string, password: string) {
    const { data } = await axios.post<{ token: string; admin: AdminUser }>(
      `${API}/api/admin/auth/login`,
      { email, password }
    );
    localStorage.setItem(KEY, data.token);
    setToken(data.token);
    setAdmin(data.admin);
  }

  function logout() {
    localStorage.removeItem(KEY);
    setToken(null);
    setAdmin(null);
  }

  const value = useMemo(() => ({ admin, token, bootstrapped, login, logout }), [admin, token, bootstrapped]);
  return <CtxObj.Provider value={value}>{children}</CtxObj.Provider>;
}

export function useAdminAuth(): Ctx {
  const ctx = useContext(CtxObj);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
