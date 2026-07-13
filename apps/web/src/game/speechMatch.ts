import type { Word } from '@jp-word/shared';

/** 片假名轉平假名(0x30A1–0x30F6 平移到平假名區) */
function katakanaToHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

/** 正規化:轉平假名、去空白/標點/長音符、轉小寫,方便比對 */
function normalize(s: string): string {
  return katakanaToHiragana(s)
    .replace(/[\s　。、,.!?！?「」・ー―ｰ]/g, '')
    .toLowerCase();
}

/** Levenshtein 編輯距離 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** 依目標長度決定可容許的誤差字數 */
function tolerance(len: number): number {
  if (len <= 2) return 0; // 很短的字要求精準,避免誤判
  if (len <= 4) return 1;
  return Math.floor(len * 0.3);
}

/** 單一候選是否對上單一目標讀音 */
function candidateMatches(nc: string, nt: string): boolean {
  if (!nc || !nt) return false;
  if (nc === nt) return true;
  if (nc.includes(nt) || nt.includes(nc)) return true;
  return editDistance(nc, nt) <= tolerance(nt.length);
}

/**
 * 判斷使用者念的內容是否對上目標單字。
 * 語音辨識回傳的日文可能是漢字或假名、也可能是同音別字,因此:
 *  - 同時比對「假名讀音」與「漢字寫法」
 *  - 檢查所有候選結果(alternatives)
 *  - 採正規化 + 模糊(編輯距離)比對,容許辨識小誤差(適合學習用途)
 */
export function matchesSpoken(candidates: readonly string[], word: Word): boolean {
  const targets = [word.kana, word.kanji].filter((t): t is string => !!t).map(normalize);

  for (const raw of candidates) {
    if (!raw) continue;
    // 漢字原文直接包含(辨識結果常是漢字)
    if (word.kanji && raw.includes(word.kanji)) return true;

    const nc = normalize(raw);
    for (const nt of targets) {
      if (candidateMatches(nc, nt)) return true;
    }
  }
  return false;
}
