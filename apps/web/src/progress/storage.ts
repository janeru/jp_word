// 關卡進度儲存於瀏覽器 localStorage(免登入)。
// 記錄「已解鎖到第幾關」與「每關最佳成績」。

const STORAGE_KEY = 'jp-word-progress-v1';
const PLAYER_KEY = 'jp-word-player';
const DEFAULT_PLAYER = '玩家';

/** 取得玩家暱稱(沒設定過回預設值) */
export function getPlayerName(): string {
  return localStorage.getItem(PLAYER_KEY)?.trim() || DEFAULT_PLAYER;
}

/** 設定玩家暱稱(空字串則回復預設) */
export function setPlayerName(name: string): void {
  const trimmed = name.trim().slice(0, 20);
  if (trimmed) localStorage.setItem(PLAYER_KEY, trimmed);
  else localStorage.removeItem(PLAYER_KEY);
}

/** 單一關卡的最佳成績 */
export interface LevelRecord {
  /** 最佳分數 */
  bestScore: number;
  /** 最佳星數(1~3) */
  bestStars: number;
  /** 最佳命中率(0~1) */
  bestAccuracy: number;
  /** 是否已清關 */
  cleared: boolean;
}

interface ProgressData {
  /** 各關卡成績,key 為分類 slug */
  records: Record<string, LevelRecord>;
}

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressData;
  } catch {
    // 解析失敗就當作全新進度
  }
  return { records: {} };
}

function save(data: ProgressData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** 取得某關卡的成績紀錄(沒有則回 null) */
export function getRecord(slug: string): LevelRecord | null {
  return load().records[slug] ?? null;
}

/** 取得所有關卡成績 */
export function getAllRecords(): Record<string, LevelRecord> {
  return load().records;
}

/**
 * 依「關卡順序」判斷某一關是否已解鎖。
 * 規則:第一關永遠解鎖;其餘關卡需前一關已清關。
 * @param orderedSlugs 依關卡順序排好的分類 slug 陣列
 */
export function isUnlocked(orderedSlugs: string[], slug: string): boolean {
  const index = orderedSlugs.indexOf(slug);
  if (index <= 0) return true; // 第一關(或找不到)一律開放
  const prevSlug = orderedSlugs[index - 1];
  return getRecord(prevSlug)?.cleared === true;
}

/**
 * 記錄一場遊戲結果,只有更好的成績會覆蓋。
 * @returns 更新後的該關卡紀錄
 */
export function recordResult(
  slug: string,
  result: { score: number; stars: number; accuracy: number; cleared: boolean },
): LevelRecord {
  const data = load();
  const prev = data.records[slug];
  const next: LevelRecord = {
    bestScore: Math.max(prev?.bestScore ?? 0, result.score),
    bestStars: Math.max(prev?.bestStars ?? 0, result.stars),
    bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, result.accuracy),
    cleared: (prev?.cleared ?? false) || result.cleared,
  };
  data.records[slug] = next;
  save(data);
  return next;
}

/** 清空所有進度(重來用) */
export function resetProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
