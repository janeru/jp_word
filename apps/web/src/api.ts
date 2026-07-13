import type {
  ApiResponse,
  Category,
  CreateScoreRequest,
  JlptLevel,
  ScoreEntry,
  Word,
} from '@jp-word/shared';

// 呼叫後端 API 的小工具。開發時透過 Vite proxy 打到後端。
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.ok) throw new Error(body.error);
  return body.data;
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

export function submitScore(payload: CreateScoreRequest): Promise<ScoreEntry> {
  return request<ScoreEntry>('/scores', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
