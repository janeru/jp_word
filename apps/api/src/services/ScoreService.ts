import type {
  AuthUser,
  CreateScoreRequest,
  JlptLevel,
  MyRank,
  ScoreEntry,
} from '@jp-word/shared';
import { JLPT_LEVELS } from '@jp-word/shared';
import { ValidationError } from '../errors/AppError.js';
import type { IScoreRepository } from '../repositories/ScoreRepository.js';
import { toScoreDto } from '../mappers/scoreMapper.js';
import {
  getBestScore,
  getCachedTop,
  getRank,
  getTotalPlayers,
  invalidateTop,
  recordScore,
  setCachedTop,
} from '../redis/leaderboardCache.js';

const MAX_LEADERBOARD = 100;
const DEFAULT_LEADERBOARD = 10;
const MAX_NAME_LENGTH = 32;

/** 成績相關業務邏輯 */
export class ScoreService {
  constructor(private readonly scores: IScoreRepository) {}

  async leaderboard(rawLimit?: string): Promise<ScoreEntry[]> {
    const n = Number(rawLimit ?? DEFAULT_LEADERBOARD);
    const limit = Number.isNaN(n) || n <= 0 ? DEFAULT_LEADERBOARD : Math.min(n, MAX_LEADERBOARD);

    // 先看快取;Redis 不可用時 getCachedTop 回 null,自動走資料庫
    const cached = await getCachedTop(limit);
    if (cached) return cached;

    const entities = await this.scores.findTop(limit);
    const entries = entities.map(toScoreDto);
    await setCachedTop(limit, entries);
    return entries;
  }

  /**
   * 查詢登入者在總排行榜上的名次。
   * 靠 Redis Sorted Set 的 ZREVRANK,複雜度 O(log N);
   * 同樣的事用 SQL 要視窗函數掃全表。Redis 不可用時三個欄位都回 null。
   */
  async myRank(user: AuthUser): Promise<MyRank> {
    const [rank, bestScore, totalPlayers] = await Promise.all([
      getRank(user.id),
      getBestScore(user.id),
      getTotalPlayers(),
    ]);
    return { rank, bestScore, totalPlayers };
  }

  /**
   * 上傳一場成績。
   * playerName 與 userId 一律取自登入者,不看 request body —
   * 這樣前端就無法冒用他人名義送成績上排行榜。
   */
  async submit(body: Partial<CreateScoreRequest>, user: AuthUser): Promise<ScoreEntry> {
    const payload = this.validate(body);
    const saved = await this.scores.create({
      userId: user.id,
      playerName: user.name.slice(0, MAX_NAME_LENGTH),
      score: payload.score,
      hits: payload.hits,
      misses: payload.misses,
      maxCombo: payload.maxCombo,
      level: payload.level,
      categorySlug: payload.categorySlug,
      durationSec: payload.durationSec,
    });

    // 更新排名(GT:只在刷新個人最高分時才寫入)並清掉列表快取,
    // 讓新高分立即出現在榜上,不必等 TTL 到期。
    await Promise.all([recordScore(user.id, payload.score), invalidateTop()]);

    return toScoreDto(saved);
  }

  /** 驗證並補齊上傳的成績資料(不含玩家身分,身分由 submit 從登入者帶入) */
  private validate(body: Partial<CreateScoreRequest>): CreateScoreRequest {
    if (typeof body.score !== 'number' || Number.isNaN(body.score)) {
      throw new ValidationError('分數必須是數字');
    }
    if (!body.level || !JLPT_LEVELS.includes(body.level as JlptLevel)) {
      throw new ValidationError('無效的 level');
    }
    return {
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
