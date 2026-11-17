import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser, LoginRequest, PermissionCode, RegisterRequest } from '@jp-word/shared';
import * as api from '../api.ts';

interface AuthState {
  /** 目前登入者;未登入為 null */
  user: AuthUser | null;
  /** 啟動時正在向後端確認登入狀態 */
  loading: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  /** 檢查目前使用者是否具備某項權限(畫面顯示與否用) */
  can: (code: PermissionCode) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * 登入狀態的來源。
 *
 * token 存在 httpOnly cookie,前端讀不到也不保管 —
 * 因此「是否已登入」不能靠 localStorage 判斷,
 * 一律在啟動時打 /api/auth/me 由後端回答。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 首次載入:用 cookie 向後端還原登入狀態
  useEffect(() => {
    api
      .fetchMe()
      .then(setUser)
      .catch(() => setUser(null)) // 後端沒起來或未登入都當作未登入
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    setUser(await api.login(payload));
  }, []);

  const register = useCallback(async (payload: RegisterRequest) => {
    setUser(await api.register(payload));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // 就算後端呼叫失敗,前端也要回到未登入狀態
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (code: PermissionCode) => user?.permissions.includes(code) ?? false,
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, can }),
    [user, loading, login, register, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 取用登入狀態;必須在 AuthProvider 底下呼叫 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必須放在 AuthProvider 之內');
  return ctx;
}
