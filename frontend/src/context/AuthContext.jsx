import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { IS_STATIC } from "@/lib/static";

const API = process.env.REACT_APP_BACKEND_URL;
const KEY = "apl_token";
const AuthCtx = createContext(null);

export const authHeaders = () => {
  const t = localStorage.getItem(KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anon, object = owner

  useEffect(() => {
    if (IS_STATIC || !localStorage.getItem(KEY)) return setUser(false);
    axios
      .get(`${API}/api/auth/me`, { headers: authHeaders() })
      .then(({ data }) => setUser(data))
      .catch(() => {
        localStorage.removeItem(KEY);
        setUser(false);
      });
  }, []);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
    localStorage.setItem(KEY, data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(false);
  };

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
