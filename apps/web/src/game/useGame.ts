import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { Word } from '@jp-word/shared';
import type { FallingBubble, GameOutcome, GameStatus } from './types.ts';
import { buildBubbles, shuffle } from './engine.ts';
import { pointsForMatch, starsForClear } from './scoring.ts';

interface GameState {
  status: GameStatus;
  /** 已配對成功的 wordId(依配對順序) */
  popped: number[];
  combo: number;
  maxCombo: number;
  score: number;
  /** 點錯次數 */
  wrong: number;
}

type Action =
  | { type: 'PICK'; wordId: number; targetId: number | null; total: number }
  | { type: 'LAND'; wordId: number };

const INITIAL: GameState = {
  status: 'playing',
  popped: [],
  combo: 0,
  maxCombo: 0,
  score: 0,
  wrong: 0,
};

function reducer(state: GameState, action: Action): GameState {
  if (state.status !== 'playing') return state;

  // 有泡泡落地 → 整關失敗
  if (action.type === 'LAND') {
    if (state.popped.includes(action.wordId)) return state; // 已配對的忽略
    return { ...state, status: 'failed' };
  }

  // 點中「目前該配對的泡泡」→ 成功
  if (action.wordId === action.targetId) {
    const combo = state.combo + 1;
    const popped = [...state.popped, action.wordId];
    return {
      ...state,
      popped,
      combo,
      maxCombo: Math.max(state.maxCombo, combo),
      score: state.score + pointsForMatch(combo),
      status: popped.length >= action.total ? 'cleared' : 'playing',
    };
  }

  // 點錯泡泡 → 連擊歸零、失誤 +1(不影響泡泡)
  return { ...state, combo: 0, wrong: state.wrong + 1 };
}

/** 墜落配對遊戲引擎 hook */
export function useGame(words: Word[]) {
  // 泡泡清單只在開局建立一次
  const bubbles = useMemo(() => buildBubbles(words), [words]);
  // 出題順序:與落下順序無關的獨立隨機序(每局固定)
  const answerOrder = useMemo(() => shuffle(bubbles.map((b) => b.word.id)), [bubbles]);
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const startRef = useRef<number>(performance.now());

  // 尚未配對的泡泡(仍在落下)
  const activeBubbles: FallingBubble[] = useMemo(
    () => bubbles.filter((b) => !state.popped.includes(b.word.id)),
    [bubbles, state.popped],
  );

  // 目前該配對的目標 = 出題順序中,第一個尚未配對的字(與落下位置無關)
  const targetId = answerOrder.find((id) => !state.popped.includes(id)) ?? null;
  const target = bubbles.find((b) => b.word.id === targetId) ?? null;

  const pick = useCallback(
    (wordId: number) => {
      dispatch({
        type: 'PICK',
        wordId,
        targetId: target?.word.id ?? null,
        total: bubbles.length,
      });
    },
    [target, bubbles.length],
  );

  const land = useCallback((wordId: number) => {
    dispatch({ type: 'LAND', wordId });
  }, []);

  const outcome: GameOutcome | null = useMemo(() => {
    if (state.status === 'playing') return null;
    const cleared = state.status === 'cleared';
    return {
      cleared,
      score: state.score,
      matched: state.popped.length,
      wrong: state.wrong,
      maxCombo: state.maxCombo,
      total: bubbles.length,
      stars: cleared ? starsForClear(bubbles.length, state.wrong) : 0,
      durationSec: Math.round((performance.now() - startRef.current) / 1000),
    };
  }, [state, bubbles.length]);

  return {
    status: state.status,
    /** 目前該配對的目標泡泡(顯示其中文題目) */
    target,
    /** 仍在落下、尚未配對的泡泡 */
    activeBubbles,
    solved: state.popped.length,
    total: bubbles.length,
    score: state.score,
    combo: state.combo,
    maxCombo: state.maxCombo,
    wrong: state.wrong,
    pick,
    land,
    outcome,
  };
}
