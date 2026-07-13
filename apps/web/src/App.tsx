import { useCallback, useEffect, useState } from 'react';
import type { Category, Word } from '@jp-word/shared';
import { fetchCategories, fetchWordsByCategory, submitScore } from './api.ts';
import type { GameOutcome } from './game/types.ts';
import { getPlayerName, getRecord, recordResult } from './progress/storage.ts';
import { LevelSelectScreen } from './screens/LevelSelectScreen.tsx';
import { GameScreen } from './screens/GameScreen.tsx';
import { SpeakGameScreen } from './screens/SpeakGameScreen.tsx';
import { ResultScreen } from './screens/ResultScreen.tsx';
import { LeaderboardScreen } from './screens/LeaderboardScreen.tsx';
import { initAudioOnGesture, loadMuted } from './audio/sound.ts';

/** 遊戲模式:泡泡挑戰 / 口說挑戰 */
export type GameMode = 'bubble' | 'speak';

type Phase =
  | { name: 'loading' }
  | { name: 'error'; message: string }
  | { name: 'levels' }
  | { name: 'playing'; category: Category; words: Word[]; mode: GameMode; gameKey: number }
  | {
      name: 'result';
      category: Category;
      mode: GameMode;
      outcome: GameOutcome;
      isNewBest: boolean;
    }
  | { name: 'leaderboard' };

export function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mode, setMode] = useState<GameMode>('bubble');
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });

  // 讀取靜音偏好,並在第一次互動時喚醒音訊(符合瀏覽器自動播放政策)
  useEffect(() => {
    loadMuted();
    window.addEventListener('pointerdown', initAudioOnGesture, { once: true });
    return () => window.removeEventListener('pointerdown', initAudioOnGesture);
  }, []);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        setPhase({ name: 'levels' });
      })
      .catch((err: unknown) => {
        setPhase({ name: 'error', message: err instanceof Error ? err.message : String(err) });
      });
  }, []);

  // 進入某關卡(依指定模式):抓該分類單字並開始遊戲
  const launch = useCallback(async (category: Category, gameMode: GameMode) => {
    setPhase({ name: 'loading' });
    try {
      const words = await fetchWordsByCategory(category.slug);
      if (gameMode === 'speak') {
        setPhase({ name: 'playing', category, words, mode: 'speak', gameKey: Date.now() });
      } else {
        setPhase({ name: 'playing', category, words, mode: 'bubble', gameKey: Date.now() });
      }
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  // 遊戲結束:過關才寫入進度與上傳成績,再切到結算畫面
  const handleFinish = useCallback(
    (category: Category, gameMode: GameMode, outcome: GameOutcome) => {
      let isNewBest = false;

      if (outcome.cleared) {
        const prev = getRecord(category.slug);
        isNewBest = outcome.score > (prev?.bestScore ?? -1);
        const answered = outcome.matched + outcome.wrong;

        recordResult(category.slug, {
          score: outcome.score,
          stars: outcome.stars,
          accuracy: answered > 0 ? outcome.matched / answered : 1,
          cleared: true,
        });

        submitScore({
          playerName: getPlayerName(),
          score: outcome.score,
          hits: outcome.matched,
          misses: outcome.wrong,
          maxCombo: outcome.maxCombo,
          level: category.level,
          categorySlug: category.slug,
          durationSec: outcome.durationSec,
        }).catch(() => undefined);
      }

      setPhase({ name: 'result', category, mode: gameMode, outcome, isNewBest });
    },
    [],
  );

  if (phase.name === 'loading') {
    return <div className="screen center">載入中…</div>;
  }

  if (phase.name === 'error') {
    return (
      <div className="screen center">
        <p className="error-text">❌ 無法連上後端:{phase.message}</p>
        <p className="subtitle">請確認後端已啟動(pnpm --filter api dev),且資料庫已 seed。</p>
      </div>
    );
  }

  if (phase.name === 'levels') {
    return (
      <LevelSelectScreen
        categories={categories}
        mode={mode}
        onModeChange={setMode}
        onSelect={(category) => launch(category, mode)}
        onOpenLeaderboard={() => setPhase({ name: 'leaderboard' })}
      />
    );
  }

  if (phase.name === 'leaderboard') {
    return <LeaderboardScreen categories={categories} onBack={() => setPhase({ name: 'levels' })} />;
  }

  if (phase.name === 'playing') {
    const common = {
      category: phase.category,
      words: phase.words,
      onFinish: (outcome: GameOutcome) => handleFinish(phase.category, phase.mode, outcome),
      onQuit: () => setPhase({ name: 'levels' }),
    };
    return phase.mode === 'speak' ? (
      <SpeakGameScreen key={phase.gameKey} {...common} />
    ) : (
      <GameScreen key={phase.gameKey} {...common} />
    );
  }

  // phase.name === 'result'
  const index = categories.findIndex((c) => c.slug === phase.category.slug);
  const nextCategory = categories[index + 1] ?? null;

  return (
    <ResultScreen
      category={phase.category}
      outcome={phase.outcome}
      isNewBest={phase.isNewBest}
      hasNext={nextCategory !== null}
      onRetry={() => launch(phase.category, phase.mode)}
      onNext={() => nextCategory && launch(nextCategory, phase.mode)}
      onBackToLevels={() => setPhase({ name: 'levels' })}
    />
  );
}
