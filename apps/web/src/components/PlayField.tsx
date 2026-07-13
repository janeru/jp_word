import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Word } from '@jp-word/shared';
import type { GameOutcome } from '../game/types.ts';
import { useGame } from '../game/useGame.ts';
import { pointsForMatch } from '../game/scoring.ts';
import { Bubble } from './Bubble.tsx';
import { SoundToggle } from './SoundToggle.tsx';
import { playCorrect, playWrong } from '../audio/sound.ts';
import { speakJa } from '../audio/speech.ts';

interface Props {
  words: Word[];
  accScore: number;
  waveLabel: string;
  categoryName: string;
  onQuit: () => void;
  onDone: (outcome: GameOutcome) => void;
}

interface Feedback {
  correct: boolean;
  text: string;
}

/** 場地上的一次性特效(點爆環 / 浮動加分) */
interface Effect {
  id: number;
  x: number;
  y: number;
  kind: 'burst' | 'float';
  text?: string;
}

/** 單一小關的落下場地:上方中文題目 + 緩緩落下的假名泡泡 */
export function PlayField({ words, accScore, waveLabel, categoryName, onQuit, onDone }: Props) {
  const game = useGame(words);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [shake, setShake] = useState(false);
  const feedbackTimer = useRef<number>(0);
  const doneRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fxId = useRef(0);

  useEffect(() => {
    if (game.outcome && !doneRef.current) {
      doneRef.current = true;
      onDone(game.outcome);
    }
  }, [game.outcome, onDone]);

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  const addEffect = (fx: Omit<Effect, 'id'>) => {
    const id = ++fxId.current;
    setEffects((list) => [...list, { ...fx, id }]);
    window.setTimeout(() => {
      setEffects((list) => list.filter((e) => e.id !== id));
    }, 650);
  };

  const handlePick = (wordId: number, e: MouseEvent<HTMLButtonElement>) => {
    if (game.status !== 'playing') return;
    const correct = wordId === game.target?.word.id;

    // 點擊位置(相對場地)供特效定位
    const rect = fieldRef.current?.getBoundingClientRect();
    const x = e.clientX - (rect?.left ?? 0);
    const y = e.clientY - (rect?.top ?? 0);

    if (correct) {
      playCorrect();
      if (game.target) speakJa(game.target.word.kana);
      const gained = pointsForMatch(game.combo + 1);
      addEffect({ x, y, kind: 'burst' });
      addEffect({ x, y, kind: 'float', text: `+${gained}` });
      setFeedback({ correct: true, text: '✓ 配對成功!' });
    } else {
      playWrong();
      setShake(true);
      window.setTimeout(() => setShake(false), 320);
      setFeedback({ correct: false, text: '✗ 不是這顆' });
    }

    window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 700);
    game.pick(wordId);
  };

  return (
    <div className="screen game-screen">
      <div className="game-top">
        <button type="button" className="btn-ghost" onClick={onQuit}>
          ← 離開
        </button>
        <SoundToggle />
        <div className="hud">
          <span>
            {categoryName} · {waveLabel} · {game.solved}/{game.total}
          </span>
          <span className="hud-score">{accScore + game.score} 分</span>
          <span className={`hud-combo ${game.combo >= 2 ? 'hot' : ''}`}>連擊 ×{game.combo}</span>
        </div>
      </div>

      <div className="prompt">
        <span className="prompt-hint">請點出「</span>
        <span className="prompt-word">{game.target?.word.meaning ?? ''}</span>
        <span className="prompt-hint">」的日文</span>
      </div>

      <div className={`feedback ${feedback ? (feedback.correct ? 'ok' : 'ng') : 'hidden'}`}>
        {feedback?.text ?? ''}
      </div>

      <div ref={fieldRef} className={`bubble-field ${shake ? 'shake' : ''}`}>
        {game.activeBubbles.map((b) => (
          <Bubble key={b.word.id} bubble={b} onPick={handlePick} onLand={game.land} />
        ))}

        {effects.map((fx) =>
          fx.kind === 'burst' ? (
            <span key={fx.id} className="fx-burst" style={{ left: fx.x, top: fx.y }} />
          ) : (
            <span key={fx.id} className="fx-float" style={{ left: fx.x, top: fx.y }}>
              {fx.text}
            </span>
          ),
        )}

        <div className="ground" />
      </div>
    </div>
  );
}
