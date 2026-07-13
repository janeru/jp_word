import type { Word } from '@jp-word/shared';
import type { FallingBubble } from './types.ts';

// ---- 遊戲場地/落下的共用常數(JS 與 CSS 需一致) ----
/** 落下場地高度(px) */
export const AREA_HEIGHT = 560;
/** 泡泡直徑(px) */
export const BUBBLE_SIZE = 84;
/** 整團泡泡出場時間錯落的範圍(ms),讓垂直略微散開 */
const SCATTER_MS = 2500;

/**
 * 依單字數量決定落下時間:字越多給越多時間,確保有機會在落地前配對完。
 * 大約每個字 ~1.6 秒的節奏。
 */
function fallDurationFor(count: number): number {
  return 6000 + count * 1100;
}

/** 顯示用的日文標籤:一律用假名(kana) */
export function displayLabel(word: Word): string {
  return word.kana;
}

/** 每個小關(wave)最多幾個字 */
const WORDS_PER_WAVE = 5;

/**
 * 把一個類別的單字切成數個「小關」,每關約 WORDS_PER_WAVE 個字(平均分配)。
 * 先打亂,再平均切成 2~3 關,降低單一畫面的泡泡數量。
 */
export function chunkWords(words: readonly Word[]): Word[][] {
  const order = shuffle(words);
  const total = order.length;
  const waves = Math.max(1, Math.ceil(total / WORDS_PER_WAVE));
  const size = Math.ceil(total / waves);
  const chunks: Word[][] = [];
  for (let i = 0; i < total; i += size) chunks.push(order.slice(i, i + size));
  return chunks;
}

/** Fisher–Yates 洗牌,回傳新陣列 */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 依單字清單建立「落下泡泡」清單。
 * - 順序打亂
 * - 依索引指定出場延遲(startDelayMs),使泡泡接連落下;索引越前面越早落地
 * - 水平位置錯開,避免整齊排排站
 */
export function buildBubbles(words: readonly Word[]): FallingBubble[] {
  // 出場順序隨機(每局重新洗牌)
  const order = shuffle(words);
  const count = order.length;
  const fallMs = fallDurationFor(count);

  // 每顆泡泡分到「獨立且不重疊」的水平欄位;欄位指派順序打亂,位置才隨機
  const laneOrder = shuffle(Array.from({ length: count }, (_, i) => i));
  const LEFT = 8;
  const RIGHT = 84;

  return order.map((word, i) => {
    const lane = laneOrder[i];
    const xPercent = count <= 1 ? 46 : LEFT + lane * ((RIGHT - LEFT) / (count - 1));
    return {
      word,
      xPercent,
      // 整團一起落下,只用小幅隨機錯開垂直位置(欄位已不同,不會重疊)
      startDelayMs: Math.round(Math.random() * SCATTER_MS),
      fallMs,
    };
  });
}
