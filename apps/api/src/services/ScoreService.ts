import type { CreateScoreRequest, JlptLevel, ScoreEntry } from '@jp-word/shared';
import { JLPT_LEVELS } from '@jp-word/shared';
import { ValidationError } from '../errors/AppError.js';
import type { IScoreRepository } from '../repositories/ScoreRepository.js';
import { toScoreDto } from '../mappers/scoreMapper.js';

const MAX_LEADERBOARD = 100;
const DEFAULT_LEADERBOARD = 10;
const MAX_NAME_LENGTH = 32;

/** 成績相關業務邏輯 */
export class ScoreService {
  constructor(private readonly scores: IScoreRepository) {}

  async leaderboard(rawLimit?: string): Promise<ScoreEntry[]> {
    const n = Number(rawLimit ?? DEFAULT_LEADERBOARD);
    const limit = Number.isNaN(n) || n <= 0 ? DEFAULT_LEADERBOARD : Math.min(n, MAX_LEADERBOARD);
    const entities = await this.scores.findTop(limit);
    return entities.map(toScoreDto);
  }

  async submit(body: Partial<CreateScoreRequest>): Promise<ScoreEntry> {
    const payload = this.validate(body);
    const saved = await this.scores.create({
      playerName: payload.playerName.slice(0, MAX_NAME_LENGTH),
      score: payload.score,
      hits: payload.hits,
      misses: payload.misses,
      maxCombo: payload.maxCombo,
      level: payload.level,
      categorySlug: payload.categorySlug,
      durationSec: payload.durationSec,
    });
    return toScoreDto(saved);
  }

  /** 驗證並補齊上傳的成績資料 */
  private validate(body: Partial<CreateScoreRequest>): CreateScoreRequest {
    if (!body.playerName || typeof body.playerName !== 'string') {
      throw new ValidationError('缺少玩家名稱');
    }
    if (typeof body.score !== 'number' || Number.isNaN(body.score)) {
      throw new ValidationError('分數必須是數字');
    }
    if (!body.level || !JLPT_LEVELS.includes(body.level as JlptLevel)) {
      throw new ValidationError('無效的 level');
    }
    return {
      playerName: body.playerName,
      score: body.score,
      hits: body.hits ?? 0,
      misses: body.misses ?? 0,
      maxCombo: body.maxCombo ?? 0,
      level: body.level,
      categorySlug: body.categorySlug ?? null,
      durationSec: body.durationSec ?? 0,
    };
  }
}
