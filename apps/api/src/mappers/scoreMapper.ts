import type { ScoreEntry } from '@jp-word/shared';
import type { ScoreEntity } from '../entities/Score.js';

/** ScoreEntity → 對外 DTO(日期轉 ISO 字串) */
export function toScoreDto(entity: ScoreEntity): ScoreEntry {
  return {
    id: entity.id,
    playerName: entity.playerName,
    score: entity.score,
    hits: entity.hits,
    misses: entity.misses,
    maxCombo: entity.maxCombo,
    level: entity.level,
    categorySlug: entity.categorySlug,
    durationSec: entity.durationSec,
    createdAt: entity.createdAt.toISOString(),
  };
}
