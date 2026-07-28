import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Word } from '@jp-word/shared';
import type { FallingBubble, GameOutcome } from '../game/types.ts';
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

interface Effect {
  id: number;
  x: number;
  y: number;
  kind: 'burst' | 'float';
  text?: string;
}

interface Apple {
  id: number;
  xPercent: number;
  /** 出場時的虛擬時間(ms) */
  bornElapsed: number;
  fallMs: number;
}

/** 每隔多久掉一顆蘋果 */
const APPLE_INTERVAL_MS = 6500;
/** 吃到蘋果後的慢動作:落下速度倍率與持續(真實)時間,可累加 */
const APPLE_SLOW_SCALE = 0.3;
const APPLE_SLOW_MS = 4000;
/** 連擊獎勵:達到門檻後泡泡放慢的速度倍率 */
const COMBO_SLOW_SCALE = 0.55;
const COMBO_THRESHOLD = 3;
/** 落到多少比例算「危險」 */
const DANGER_PROGRESS = 0.72;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** 單一小關的落下場地:泡泡與蘋果的落下改由 requestAnimationFrame 時鐘控制,可平滑慢動作 */
export function PlayField({ words, accScore, waveLabel, categoryName, onQuit, onDone }: Props) {
  const game = useGame(words);

  // 依螢幕大小決定場地高度與泡泡尺寸(開局時決定一次)
  const { areaH, size, appleSize } = useMemo(() => {
    const mobile = typeof window !== 'undefined' && window.innerWidth <= 640;
    return { areaH: mobile ? 440 : 560, size: mobile ? 58 : 84, appleSize: mobile ? 42 : 52 };
  }, []);

  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [apples, setApples] = useState<Apple[]>([]);
  const [shake, setShake] = useState(false);

  const elapsedRef = useRef(0);
  const appleSlowUntil = useRef(0);
  const feedbackTimer = useRef<number>(0);
  const doneRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const fxId = useRef(0);
  const appleId = useRef(0);

  // 讓 rAF 迴圈取得最新值(避免閉包過期)
  const bubblesRef = useRef<FallingBubble[]>(game.activeBubbles);
  const applesRef = useRef<Apple[]>(apples);
  const statusRef = useRef(game.status);
  const comboRef = useRef(game.combo);
  const landRef = useRef(game.land);
  bubblesRef.current = game.activeBubbles;
  applesRef.current = apples;
  statusRef.current = game.status;
  comboRef.current = game.combo;
  landRef.current = game.land;

  useEffect(() => {
    if (game.outcome && !doneRef.current) {
      doneRef.current = true;
      onDone(game.outcome);
    }
  }, [game.outcome, onDone]);

  useEffect(() => () => window.clearTimeout(feedbackTimer.current), []);

  // ── 遊戲時鐘(rAF):以可變速度推進虛擬時間,驅動所有落下物 ──
  useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const loop = (ts: number) => {
      if (last === null) last = ts;
      const dt = ts - last;
      last = ts;

      if (statusRef.current === 'playing') {
        // 慢動作:蘋果效果(限時)與連擊獎勵(達門檻)取最慢者
        let scale = 1;
        if (performance.now() < appleSlowUntil.current) scale = Math.min(scale, APPLE_SLOW_SCALE);
        if (comboRef.current >= COMBO_THRESHOLD) scale = Math.min(scale, COMBO_SLOW_SCALE);
        elapsedRef.current += dt * scale;

        // 落地判定:任一泡泡到底 → 失敗
        for (const b of bubblesRef.current) {
          if ((elapsedRef.current - b.startDelayMs) / b.fallMs >= 1) {
            landRef.current(b.word.id);
            break;
          }
        }
        // 蘋果落地就移除(不影響輸贏)
        const hasLandedApple = applesRef.current.some(
          (a) => (elapsedRef.current - a.bornElapsed) / a.fallMs >= 1,
        );
        if (hasLandedApple) {
          setApples((list) =>
            list.filter((a) => (elapsedRef.current - a.bornElapsed) / a.fallMs < 1),
          );
        }

        setElapsed(elapsedRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 定期掉落蘋果
  useEffect(() => {
    if (game.status !== 'playing') return;
    const spawn = () => {
      const id = ++appleId.current;
      setApples((list) => [
        ...list,
        {
          id,
          xPercent: 8 + Math.random() * 74,
          bornElapsed: elapsedRef.current,
          fallMs: 5200 + Math.random() * 2000,
        },
      ]);
    };
    const timer = window.setInterval(spawn, APPLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const removeApple = (id: number) => setApples((list) => list.filter((a) => a.id !== id));

  const addEffect = (fx: Omit<Effect, 'id'>) => {
    const id = ++fxId.current;
    setEffects((list) => [...list, { ...fx, id }]);
    window.setTimeout(() => setEffects((list) => list.filter((e) => e.id !== id)), 650);
  };

  const relativePos = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  const handlePick = (wordId: number, e: MouseEvent<HTMLButtonElement>) => {
    if (game.status !== 'playing') return;
    const correct = wordId === game.target?.word.id;
    const { x, y } = relativePos(e);

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

  // 吃到蘋果:啟動/延長慢動作(可累加)
  const eatApple = (id: number, e: MouseEvent<HTMLButtonElement>) => {
    if (game.status !== 'playing') return;
    const { x, y } = relativePos(e);
    removeApple(id);
    playCorrect();
    addEffect({ x, y, kind: 'float', text: '🍎 慢動作！' });
    const now = performance.now();
    appleSlowUntil.current = Math.max(now, appleSlowUntil.current) + APPLE_SLOW_MS;
  };

  // 目前是否處於慢動作(給畫面提示)
  const appleSlow = performance.now() < appleSlowUntil.current;
  const comboSlow = game.combo >= COMBO_THRESHOLD;
  const slowed = appleSlow || comboSlow;

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

      <div
        ref={fieldRef}
        className={`bubble-field ${shake ? 'shake' : ''} ${slowed ? 'slow' : ''}`}
        style={{ height: areaH }}
      >
        {game.activeBubbles.map((b) => {
          const prog = clamp((elapsed - b.startDelayMs) / b.fallMs, 0, 1);
          return (
            <Bubble
              key={b.word.id}
              bubble={b}
              y={-size + prog * areaH}
              size={size}
              danger={prog >= DANGER_PROGRESS}
              onPick={handlePick}
            />
          );
        })}

        {apples.map((a) => {
          const prog = clamp((elapsed - a.bornElapsed) / a.fallMs, 0, 1);
          return (
            <button
              key={a.id}
              type="button"
              className="apple"
              style={{
                left: `${a.xPercent}%`,
                width: appleSize,
                height: appleSize,
                transform: `translateY(${-appleSize + prog * areaH}px)`,
              }}
              onClick={(e) => eatApple(a.id, e)}
            >
              🍎
            </button>
          );
        })}

        {slowed && (
          <div className="slow-banner">
            {appleSlow ? '🍎 慢動作！' : '🔥 連擊獎勵・慢速'}
          </div>
        )}

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
