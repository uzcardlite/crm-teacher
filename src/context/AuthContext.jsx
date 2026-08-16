import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getMe, login as loginRequest } from "../api/auth";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "../utils/tokenStorage";
import { applyServerPrefs } from "../utils/appearance";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    // access_token yo'q, lekin refresh_token bo'lsa ham getMe()ni chaqiramiz —
    // apiClient'ning 401 interceptor'i buni sokin ravishda yangilaydi (login'ga otmasdan)
    if (!getAccessToken() && !getRefreshToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
      applyServerPrefs(me.ui_prefs);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (phone, password) => {
    const tokens = await loginRequest(phone, password);
    setTokens(tokens);
    const me = await getMe();
    setUser(me);
    // Carry the account's theme/language onto this device at sign-in — the
    // whole point of storing them server-side.
    applyServerPrefs(me.ui_prefs);
    return me;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    refreshUser: loadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
