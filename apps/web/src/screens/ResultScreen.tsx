import type { Category } from '@jp-word/shared';
import type { GameOutcome } from '../game/types.ts';
import { StarRating } from '../components/StarRating.tsx';

interface Props {
  category: Category;
  outcome: GameOutcome;
  /** 是否為該關的新最佳分數(僅過關時有意義) */
  isNewBest: boolean;
  /** 是否有下一關 */
  hasNext: boolean;
  onRetry: () => void;
  onNext: () => void;
  onBackToLevels: () => void;
}

/** 結算畫面:過關顯示星等/分數,失敗顯示鼓勵與重試 */
export function ResultScreen({
  category,
  outcome,
  isNewBest,
  hasNext,
  onRetry,
  onNext,
  onBackToLevels,
}: Props) {
  const { cleared } = outcome;

  return (
    <div className="screen result-screen">
      <h1>{cleared ? '🎉 過關!' : '😢 這關失敗了'}</h1>
      <p className="subtitle">
        {category.nameZh}（{category.nameJa}）
      </p>

      {cleared ? (
        <div className="result-stars">
          <StarRating full={outcome.stars} size={48} />
        </div>
      ) : (
        <p className="fail-note">有泡泡掉到地面了!配對完全部才能過關,再挑戰一次吧 💪</p>
      )}

      <div className="result-score">
        {outcome.score} <small>分</small>
        {cleared && isNewBest && <span className="badge-new">最佳紀錄!</span>}
      </div>

      <div className="result-stats">
        <div>
          <span className="stat-num">
            {outcome.matched}/{outcome.total}
          </span>
          <span className="stat-label">配對</span>
        </div>
        <div>
          <span className="stat-num">{outcome.wrong}</span>
          <span className="stat-label">點錯</span>
        </div>
        <div>
          <span className="stat-num">×{outcome.maxCombo}</span>
          <span className="stat-label">最高連擊</span>
        </div>
        <div>
          <span className="stat-num">{outcome.durationSec}s</span>
          <span className="stat-label">耗時</span>
        </div>
      </div>

      <div className="result-actions">
        {cleared && hasNext && (
          <button type="button" className="btn-primary" onClick={onNext}>
            下一關 →
          </button>
        )}
        <button type="button" className={cleared ? 'btn-secondary' : 'btn-primary'} onClick={onRetry}>
          {cleared ? '再玩一次' : '再挑戰一次'}
        </button>
        <button type="button" className="btn-ghost" onClick={onBackToLevels}>
          回關卡選單
        </button>
      </div>
    </div>
  );
}
