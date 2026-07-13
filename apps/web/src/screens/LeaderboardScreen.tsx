import { useEffect, useState } from 'react';
import type { Category, ScoreEntry } from '@jp-word/shared';
import { fetchScores } from '../api.ts';

interface Props {
  categories: Category[];
  onBack: () => void;
}

/** 排行榜畫面:顯示後端記錄的最高分成績 */
export function LeaderboardScreen({ categories, onBack }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    fetchScores(20)
      .then((data) => {
        setScores(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const nameOf = (slug: string | null) =>
    slug ? categories.find((c) => c.slug === slug)?.nameZh ?? slug : '綜合';

  return (
    <div className="screen">
      <div className="header-row">
        <h1>🏆 排行榜</h1>
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← 返回
        </button>
      </div>

      {status === 'loading' && <p className="subtitle">載入中…</p>}
      {status === 'error' && <p className="error-text">無法載入排行榜,請確認後端已啟動。</p>}
      {status === 'ready' && scores.length === 0 && (
        <p className="subtitle">還沒有任何成績,快去挑戰第一名吧!</p>
      )}

      {status === 'ready' && scores.length > 0 && (
        <ol className="leaderboard">
          {scores.map((s, i) => (
            <li key={s.id} className={`lb-row ${i < 3 ? 'top' : ''}`}>
              <span className="lb-rank">{i + 1}</span>
              <span className="lb-name">{s.playerName}</span>
              <span className="lb-cat">{nameOf(s.categorySlug)}</span>
              <span className="lb-score">{s.score} 分</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
