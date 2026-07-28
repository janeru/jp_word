import { useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import type { FallingBubble } from '../game/types.ts';
import { displayLabel } from '../game/engine.ts';
import { playAlert } from '../audio/sound.ts';

interface BubbleProps {
  bubble: FallingBubble;
  /** 目前的垂直位置(px,由 PlayField 的時鐘計算) */
  y: number;
  /** 直徑(px) */
  size: number;
  /** 是否快落地(示警) */
  danger: boolean;
  onPick: (wordId: number, e: MouseEvent<HTMLButtonElement>) => void;
}

/** 一顆日文假名泡泡;位置與落地都由外部的遊戲時鐘控制,自己只負責顯示與點擊 */
export function Bubble({ bubble, y, size, danger, onPick }: BubbleProps) {
  const alerted = useRef(false);

  // 進入危險狀態時發出一次心跳示警
  useEffect(() => {
    if (danger && !alerted.current) {
      alerted.current = true;
      playAlert();
    }
  }, [danger]);

  return (
    <button
      type="button"
      className={`bubble ${danger ? 'danger' : ''}`}
      style={{
        left: `${bubble.xPercent}%`,
        width: size,
        height: size,
        transform: `translateY(${y}px)`,
      }}
      onClick={(e) => onPick(bubble.word.id, e)}
    >
      {displayLabel(bubble.word)}
    </button>
  );
}
