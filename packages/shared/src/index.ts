// 前後端共用的型別與常數。前端與後端都從 `@jp-word/shared` 匯入,避免重複定義。

// 認證與權限(RBAC)相關型別
export * from './auth.js';

/** JLPT 等級,用來標記單字難度 */
export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

/** 詞性 */
export type WordType =
  | 'noun' // 名詞
  | 'verb' // 動詞
  | 'i-adjective' // い形容詞
  | 'na-adjective' // な形容詞
  | 'phrase' // 短語/慣用語
  | 'other';

/** 分類的大群組:基礎單字 vs 旅遊實用 */
export type CategoryGroup = 'basic' | 'travel';

/** 單字分類/主題,例如「食物」「餐廳」 */
export interface Category {
  id: number;
  /** 程式用的穩定代號,例如 'food'、'restaurant' */
  slug: string;
  /** 日文名稱,例如「食べ物」 */
  nameJa: string;
  /** 中文名稱,例如「食物」 */
  nameZh: string;
  /** 所屬群組 */
  group: CategoryGroup;
  /** 選單排序 */
  sortOrder: number;
  /** 難度等級 */
  level: JlptLevel;
}

/** 一個日文單字 */
export interface Word {
  id: number;
  /** 假名讀音,例如「たべる」 */
  kana: string;
  /** 漢字寫法(可能沒有),例如「食べる」 */
  kanji: string | null;
  /** 羅馬拼音,例如「taberu」 */
  romaji: string;
  /** 中文意思,例如「吃」 */
  meaning: string;
  /** 難度等級 */
  level: JlptLevel;
  /** 詞性 */
  wordType: WordType;
  /** 該單字所屬的分類代號(多對多,一個字可能屬於多個分類) */
  categorySlugs?: string[];
}

/** 單場遊戲結束後上傳的成績 */
export interface GameResult {
  score: number;
  /** 擊中的單字數 */
  hits: number;
  /** 漏掉的單字數 */
  misses: number;
  /** 最高連擊數 */
  maxCombo: number;
  /** 這場遊戲的難度等級 */
  level: JlptLevel;
  /** 這場遊戲的分類代號(可為 null 代表綜合) */
  categorySlug: string | null;
  /** 遊戲持續秒數 */
  durationSec: number;
}

/** 排行榜上的一筆紀錄 */
export interface ScoreEntry extends GameResult {
  id: number;
  /** 顯示用的玩家名稱,由後端從登入者身上帶出(前端無法自填) */
  playerName: string;
  /** 成績所屬的使用者;舊資料可能為 null */
  userId: number | null;
  createdAt: string; // ISO 8601
}

// ---- API 契約 ----

/** GET /api/words 的查詢參數 */
export interface GetWordsQuery {
  level?: JlptLevel;
  /** 依分類代號篩選,例如 'food' */
  category?: string;
  limit?: number;
}

/**
 * POST /api/scores 的請求 body。
 * 玩家名稱不由前端提供 — 後端一律從登入身分(JWT)取得,避免冒名。
 */
export type CreateScoreRequest = GameResult;

/** GET /api/scores/me/rank 的回應:目前登入者在總排行榜上的名次 */
export interface MyRank {
  /** 名次(1 起算);還沒有成績時為 null */
  rank: number | null;
  /** 個人最高分;還沒有成績時為 null */
  bestScore: number | null;
  /** 榜上總人數 */
  totalPlayers: number | null;
}

/** 統一的 API 回應包裝 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
