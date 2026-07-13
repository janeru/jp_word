import { useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Word } from '@jp-word/shared';
import type { GameOutcome } from '../game/types.ts';
import { shuffle } from '../game/engine.ts';
import { matchesSpoken } from '../game/speechMatch.ts';
import { useSpeechRecognition } from '../game/useSpeechRecognition.ts';
import { pointsForMatch, starsForClear } from '../game/scoring.ts';
import { playCorrect, playWrong } from '../audio/sound.ts';
import { speakJa } from '../audio/speech.ts';
import { SoundToggle } from '../components/SoundToggle.tsx';

interface Props {
  category: Category;
  words: Word[];
  onFinish: (outcome: GameOutcome) => void;
  onQuit: () => void;
}

interface Feedback {
  ok: boolean;
  text: string;
}

/** 口說挑戰:看中文題目,念出對應日文,語音辨識比對讀音,全部念對即過關 */
export function SpeakGameScreen({ category, words, onFinish, onQuit }: Props) {
  const order = useMemo(() => shuffle(words), [words]);
  const speech = useSpeechRecognition();

  const [idx, setIdx] = useState(0);
  const [scoreView, setScoreView] = useState(0);
  const [comboView, setComboView] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hintShown, setHintShown] = useState(false);

  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const correctRef = useRef(0);
  const imperfectRef = useRef(0);
  const wordErrRef = useRef(false);
  const startRef = useRef<number>(performance.now());
  const finishedRef = useRef(false);

  const total = order.length;
  const current = order[idx];

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish({
      cleared: true,
      score: scoreRef.current,
      matched: correctRef.current,
      wrong: imperfectRef.current,
      maxCombo: maxComboRef.current,
      total,
      stars: starsForClear(total, imperfectRef.current),
      durationSec: Math.round((performance.now() - startRef.current) / 1000),
    });
  };

  const advance = () => {
    wordErrRef.current = false;
    setFeedback(null);
    setHintShown(false);
    const next = idx + 1;
    if (next >= total) finish();
    else setIdx(next);
  };

  const markImperfect = () => {
    if (!wordErrRef.current) {
      wordErrRef.current = true;
      imperfectRef.current += 1;
    }
    comboRef.current = 0;
    setComboView(0);
  };

  const handleCorrect = () => {
    correctRef.current += 1;
    let gained: number;
    if (wordErrRef.current) {
      gained = 100; // 曾念錯過,不給連擊加成
    } else {
      comboRef.current += 1;
      gained = pointsForMatch(comboRef.current);
    }
    maxComboRef.current = Math.max(maxComboRef.current, comboRef.current);
    scoreRef.current += gained;
    setScoreView(scoreRef.current);
    setComboView(comboRef.current);
    playCorrect();
    speakJa(current.kana); // 唸出正確讀音加強記憶
    setFeedback({ ok: true, text: `✓ 正確!「${current.kanji ?? current.kana}」= ${current.kana}` });
    window.setTimeout(advance, 1100);
  };

  const handleWrong = (heard: string) => {
    markImperfect();
    setHintShown(true); // 念錯就顯示讀音提示,幫助跟著念
    playWrong();
    setFeedback({ ok: false, text: heard ? `聽到「${heard}」,再念一次看看` : '沒聽清楚,再念一次' });
  };

  // 每次拿到辨識結果就比對
  useEffect(() => {
    if (!speech.result || !current) return;
    const candidates = [speech.result.transcript, ...speech.result.alternatives];
    if (matchesSpoken(candidates, current)) handleCorrect();
    else handleWrong(speech.result.transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.result]);

  // 不支援語音辨識的瀏覽器
  if (!speech.supported) {
    return (
      <div className="screen center">
        <p className="error-text">😢 這個瀏覽器不支援語音辨識</p>
        <p className="subtitle">
          口說挑戰需要 Chrome / Edge / Safari(並允許麥克風)。
          <br />
          可以先改玩「泡泡挑戰」喔!
        </p>
        <button type="button" className="btn-primary" onClick={onQuit}>
          回關卡選單
        </button>
      </div>
    );
  }

  const isCorrectFeedback = feedback?.ok === true;

  return (
    <div className="screen game-screen">
      <div className="game-top">
        <button type="button" className="btn-ghost" onClick={onQuit}>
          ← 離開
        </button>
        <SoundToggle />
        <div className="hud">
          <span>
            {category.nameZh} · 口說 · {idx + (isCorrectFeedback ? 1 : 0)}/{total}
          </span>
          <span className="hud-score">{scoreView} 分</span>
          <span className={`hud-combo ${comboView >= 2 ? 'hot' : ''}`}>連擊 ×{comboView}</span>
        </div>
      </div>

      <div className="speak-card">
        <div className="speak-hint">請用日文念出:</div>
        <div className="speak-meaning">{current?.meaning}</div>
        <div className="speak-jp">{current?.kanji ?? current?.kana}</div>

        <div className="speak-hint-line">
          <button
            type="button"
            className="btn-secondary listen-btn"
            onClick={() => current && speakJa(current.kana)}
          >
            🔊 聽發音
          </button>
          {hintShown && !isCorrectFeedback && (
            <span className="reading-hint">讀音:{current?.kana}</span>
          )}
        </div>

        <button
          type="button"
          className={`mic-btn ${speech.listening ? 'listening' : ''}`}
          onClick={speech.start}
          disabled={speech.listening || isCorrectFeedback}
        >
          {speech.listening ? '🎤 聆聽中…' : '🎤 按我念日文'}
        </button>

        {speech.interim && <div className="speak-interim">{speech.interim}</div>}

        <div className={`feedback ${feedback ? (feedback.ok ? 'ok' : 'ng') : 'hidden'}`}>
          {feedback?.text ?? ''}
        </div>

        {speech.error === 'not-allowed' && (
          <p className="error-text">請允許瀏覽器使用麥克風,才能進行口說挑戰。</p>
        )}

        <button type="button" className="btn-ghost skip-btn" onClick={advance} disabled={isCorrectFeedback}>
          略過這題 →
        </button>
      </div>
    </div>
  );
}
