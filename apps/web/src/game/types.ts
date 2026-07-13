import type { Word } from '@jp-word/shared';

/** 遊戲狀態:進行中 / 過關 / 失敗 */
export type GameStatus = 'playing' | 'cleared' | 'failed';

/** 一顆會從上方落下的泡泡 */
export interface FallingBubble {
  word: Word;
  /** 水平位置(百分比 0~100) */
  xPercent: number;
  /** 起始延遲(毫秒),讓整團泡泡垂直略微錯落 */
  startDelayMs: number;
  /** 從出現到落地的時間(毫秒) */
  fallMs: number;
}

/** 一場遊戲結束後的結果 */
export interface GameOutcome {
  /** 是否過關(在任一泡泡落地前配對完全部) */
  cleared: boolean;
  score: number;
  /** 配對成功數 */
  matched: number;
  /** 點錯次數 */
  wrong: number;
  /** 最高連擊 */
  maxCombo: number;
  /** 本關單字總數 */
  total: number;
  /** 星數(失敗為 0,過關 1~3) */
  stars: number;
  /** 遊戲耗時(秒) */
  durationSec: number;
}
