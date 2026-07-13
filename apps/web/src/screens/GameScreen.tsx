import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '@jp-word/shared';
import type { GameOutcome } from '../game/types.ts';
import { chunkWords } from '../game/engine.ts';
import { starsForClear } from '../game/scoring.ts';
import { PlayField } from '../components/PlayField.tsx';
import { playClear, playFail, startBgm, stopBgm } from '../audio/sound.ts';

interface Props {
  category: Category;
  words: Word[];
  onFinish: (outcome: GameOutcome) => void;
  onQuit: () => void;
}

interface Accum {
  score: number;
  matched: number;
  wrong: number;
  maxCombo: number;
}

/** 過場顯示時間(ms) */
const TRANSITION_MS = 1200;

/**
 * 遊戲主畫面:把一個類別切成數個小關(wave),逐關進行。
 * 全部小關過關 = 類別過關;任一小關失敗 = 類別失敗。
 */
export function GameScreen({ category, words, onFinish, onQuit }: Props) {
  const chunks = useMemo(() => chunkWords(words), [words]);
  const [waveIndex, setWaveIndex] = useState(0);
  const [transition, setTransition] = useState(false);
  const acc = useRef<Accum>({ score: 0, matched: 0, wrong: 0, maxCombo: 0 });
  const startRef = useRef<number>(performance.now());
  const transTimer = useRef<number>(0);

  // 進入遊戲開始背景音樂,離開時停止(小關切換時不會重啟,因為本元件不會卸載)
  useEffect(() => {
    startBgm();
    return () => stopBgm();
  }, []);

  useEffect(() => () => window.clearTimeout(transTimer.current), []);

  const finish = (cleared: boolean) => {
    if (cleared) playClear();
    else playFail();
    const a = acc.current;
    onFinish({
      cleared,
      score: a.score,
      matched: a.matched,
      wrong: a.wrong,
      maxCombo: a.maxCombo,
      total: words.length,
      stars: cleared ? starsForClear(words.length, a.wrong) : 0,
      durationSec: Math.round((performance.now() - startRef.current) / 1000),
    });
  };

  const handleWaveDone = (o: GameOutcome) => {
    acc.current = {
      score: acc.current.score + o.score,
      matched: acc.current.matched + o.matched,
      wrong: acc.current.wrong + o.wrong,
      maxCombo: Math.max(acc.current.maxCombo, o.maxCombo),
    };

    if (!o.cleared) {
      finish(false); // 小關失敗 → 整個類別失敗
      return;
    }

    if (waveIndex < chunks.length - 1) {
      // 過小關 → 過場後進下一小關
      setTransition(true);
      transTimer.current = window.setTimeout(() => {
        setTransition(false);
        setWaveIndex((i) => i + 1);
      }, TRANSITION_MS);
    } else {
      finish(true); // 最後一小關過關 → 類別過關
    }
  };

  if (transition) {
    return (
      <div className="screen center">
        <div className="wave-clear">
          <div className="wave-clear-big">🎉 小關 {waveIndex + 1} 過關!</div>
          <div className="subtitle">準備下一小關…</div>
        </div>
      </div>
    );
  }

  return (
    <PlayField
      key={waveIndex}
      words={chunks[waveIndex]}
      accScore={acc.current.score}
      waveLabel={`小關 ${waveIndex + 1}/${chunks.length}`}
      categoryName={category.nameZh}
      onQuit={onQuit}
      onDone={handleWaveDone}
    />
  );
}
