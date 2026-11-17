import type {
  ApiResponse,
  AuthUser,
  Category,
  CreateScoreRequest,
  JlptLevel,
  LoginRequest,
  RegisterRequest,
  ScoreEntry,
  Word,
} from '@jp-word/shared';

/** 未登入或 token 過期時丟出;呼叫端可據此把畫面切回登入頁 */
export class UnauthorizedApiError extends Error {}

// 呼叫後端 API 的小工具。開發時透過 Vite proxy 打到後端。
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    // 帶上 httpOnly cookie;沒有這行後端會當作未登入
    credentials: 'include',
    ...init,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) {
    if (res.status === 401) throw new UnauthorizedApiError(body.error);
    throw new Error(body.error);
  }
  return body.data;
}

// ---- 認證 ----

/** 取得目前登入者;未登入回 null(不會丟錯,供啟動時還原狀態用) */
export function fetchMe(): Promise<AuthUser | null> {
  return request<AuthUser | null>('/auth/me');
}

export function login(payload: LoginRequest): Promise<AuthUser> {
  return request<AuthUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterRequest): Promise<AuthUser> {
  return request<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<{ loggedOut: boolean }> {
  return request<{ loggedOut: boolean }>('/auth/logout', { method: 'POST' });
}

/** 取得所有分類(依群組、排序) */
export function fetchCategories(): Promise<Category[]> {
  return request<Category[]>('/categories');
}

export function fetchWords(level?: JlptLevel, limit = 50): Promise<Word[]> {
  const params = new URLSearchParams();
  if (level) params.set('level', level);
  params.set('limit', String(limit));
  return request<Word[]>(`/words?${params.toString()}`);
}

/** 取得某分類底下的所有單字 */
export function fetchWordsByCategory(slug: string, limit = 200): Promise<Word[]> {
  const params = new URLSearchParams({ category: slug, limit: String(limit) });
  return request<Word[]>(`/words?${params.toString()}`);
}

export function fetchScores(limit = 10): Promise<ScoreEntry[]> {
  return request<ScoreEntry[]>(`/scores?limit=${limit}`);
}

/** 上傳成績;玩家名稱由後端從登入身分帶入,前端不需要(也無法)提供 */
export function submitScore(payload: CreateScoreRequest): Promise<ScoreEntry> {
  return request<ScoreEntry>('/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
