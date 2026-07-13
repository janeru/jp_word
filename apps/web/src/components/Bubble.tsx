import { useEffect, useRef, useState } from 'react';
import type { AnimationEvent, MouseEvent } from 'react';
import type { FallingBubble } from '../game/types.ts';
import { displayLabel } from '../game/engine.ts';
import { playAlert } from '../audio/sound.ts';

interface BubbleProps {
  bubble: FallingBubble;
  onPick: (wordId: number, e: MouseEvent<HTMLButtonElement>) => void;
  onLand: (wordId: number) => void;
}

/** 泡泡進入「危險」狀態的時間點(佔落下時間的比例) */
const DANGER_AT = 0.72;

/** 一顆從上方落下的日文假名泡泡;快落地時轉紅示警,點擊作答,落地觸發 onLand */
export function Bubble({ bubble, onPick, onLand }: BubbleProps) {
  const [danger, setDanger] = useState(false);
  const alerted = useRef(false);

  // 快落地時進入危險狀態並發出心跳示警(只觸發一次)
  useEffect(() => {
    const dangerDelay = bubble.startDelayMs + bubble.fallMs * DANGER_AT;
    const t = window.setTimeout(() => {
      setDanger(true);
      if (!alerted.current) {
        alerted.current = true;
        playAlert();
      }
    }, dangerDelay);
    return () => window.clearTimeout(t);
  }, [bubble.startDelayMs, bubble.fallMs]);

  const handleAnimationEnd = (e: AnimationEvent<HTMLButtonElement>) => {
    if (e.animationName === 'fall') onLand(bubble.word.id);
  };

  return (
    <button
      type="button"
      className={`bubble ${danger ? 'danger' : ''}`}
      style={{
        left: `${bubble.xPercent}%`,
        animationDuration: `${bubble.fallMs}ms`,
        animationDelay: `${bubble.startDelayMs}ms`,
      }}
      onClick={(e) => onPick(bubble.word.id, e)}
      onAnimationEnd={handleAnimationEnd}
    >
      {displayLabel(bubble.word)}
    </button>
  );
}
