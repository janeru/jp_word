// 計分規則(純函式,方便調整與測試)。

/** 配對成功的基礎分 */
const BASE = 100;
/** 每一段連擊加分 */
const COMBO_STEP = 15;
/** 連擊加成上限 */
const COMBO_CAP = 10;

/**
 * 一次配對成功的得分。
 * @param combo 目前連擊數(含這次)
 */
export function pointsForMatch(combo: number): number {
  return BASE + Math.min(combo, COMBO_CAP) * COMBO_STEP;
}

/**
 * 過關後依「點錯次數」換算星數。
 * 全對 → 3 星;錯 ≤ 總數 1/4 → 2 星;其餘過關 → 1 星。
 */
export function starsForClear(total: number, wrong: number): number {
  if (wrong === 0) return 3;
  if (wrong <= Math.ceil(total * 0.25)) return 2;
  return 1;
}
