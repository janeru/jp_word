// 前後端共用的型別與常數。前端與後端都從 `@jp-word/shared` 匯入,避免重複定義。

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
  playerName: string;
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

/** POST /api/scores 的請求 body */
export interface CreateScoreRequest extends GameResult {
  playerName: string;
}

/** 統一的 API 回應包裝 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
