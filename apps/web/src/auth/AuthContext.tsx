import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GUEST_PERMISSIONS,
  type AuthUser,
  type LoginRequest,
  type PermissionCode,
  type RegisterRequest,
} from '@jp-word/shared';
import * as api from '../api.ts';

interface AuthState {
  /** 目前登入者;未登入為 null */
  user: AuthUser | null;
  /** 未登入但選擇以訪客身分遊玩(成績不上排行榜) */
  guest: boolean;
  /** 啟動時正在向後端確認登入狀態 */
  loading: boolean;
  /** 進入訪客模式 */
  enterGuest: () => void;
  /** 離開訪客模式,回到登入畫面 */
  leaveGuest: () => void;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  /** 檢查目前使用者是否具備某項權限(畫面顯示與否用) */
  can: (code: PermissionCode) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

// 訪客選擇只記在 sessionStorage:重新整理不必再選一次,關掉分頁就回到登入畫面
const GUEST_KEY = 'jp-word-guest';

function loadGuest(): boolean {
  try {
    return sessionStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

function saveGuest(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(GUEST_KEY, '1');
    else sessionStorage.removeItem(GUEST_KEY);
  } catch {
    // 無痕模式等情況存不了,只影響重新整理後要再選一次
  }
}

/**
 * 登入狀態的來源。
 *
 * token 存在 httpOnly cookie,前端讀不到也不保管 —
 * 因此「是否已登入」不能靠 localStorage 判斷,
 * 一律在啟動時打 /api/auth/me 由後端回答。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [guest, setGuest] = useState(loadGuest);
  const [loading, setLoading] = useState(true);

  const setGuestMode = useCallback((on: boolean) => {
    saveGuest(on);
    setGuest(on);
  }, []);
  const enterGuest = useCallback(() => setGuestMode(true), [setGuestMode]);
  const leaveGuest = useCallback(() => setGuestMode(false), [setGuestMode]);

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
    setGuestMode(false);
  }, [setGuestMode]);

  const register = useCallback(async (payload: RegisterRequest) => {
    setUser(await api.register(payload));
    setGuestMode(false);
  }, [setGuestMode]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      // 就算後端呼叫失敗,前端也要回到未登入狀態
      setUser(null);
    }
  }, []);

  const can = useCallback(
    // 未登入時以訪客權限判斷,與後端 requirePermission 的規則一致
    (code: PermissionCode) => (user ? user.permissions : GUEST_PERMISSIONS).includes(code),
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({ user, guest, loading, enterGuest, leaveGuest, login, register, logout, can }),
    [user, guest, loading, enterGuest, leaveGuest, login, register, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 取用登入狀態;必須在 AuthProvider 底下呼叫 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必須放在 AuthProvider 之內');
  return ctx;
}
