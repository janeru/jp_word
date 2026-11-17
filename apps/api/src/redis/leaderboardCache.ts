import type { ScoreEntry } from '@jp-word/shared';
import { env } from '../env.js';
import { withRedis } from './client.js';

/**
 * 排行榜的 Redis 層。分成兩個用途不同的結構:
 *
 * 1. lb:top:{limit}  — 前 N 名列表的 JSON 快取(短 TTL)
 *    只是省下重複的 ORDER BY 查詢,內容仍來自 Postgres。
 *
 * 2. lb:global       — Sorted Set,member = userId,score = 該玩家最高分
 *    這是 Redis 真正帶來的新能力:ZREVRANK 可以用 O(log N) 回答
 *    「我排第幾名」,同樣的事在 SQL 要用視窗函數掃過整張表。
 *
 * Postgres 永遠是真相來源。ZSET 可用 scripts/rebuildLeaderboard.ts 重建。
 */

const GLOBAL_KEY = 'lb:global';
const topKey = (limit: number) => `lb:top:${limit}`;

// ---- 前 N 名列表快取 ----

export function getCachedTop(limit: number): Promise<ScoreEntry[] | null> {
  return withRedis(async (redis) => {
    const raw = await redis.get(topKey(limit));
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : null;
  }, null);
}

export function setCachedTop(limit: number, entries: ScoreEntry[]): Promise<void> {
  return withRedis(async (redis) => {
    await redis.set(
      topKey(limit),
      JSON.stringify(entries),
      'EX',
      env.redis.leaderboardTtlSec,
    );
  }, undefined);
}

/** 有新成績時清掉列表快取,讓新高分立刻出現在榜上 */
export function invalidateTop(): Promise<void> {
  return withRedis(async (redis) => {
    const keys = await redis.keys('lb:top:*');
    if (keys.length > 0) await redis.del(...keys);
  }, undefined);
}

// ---- 排名 Sorted Set ----

/**
 * 記錄一名玩家的分數。
 * 'GT' 表示只有比現有分數更高時才更新 —— 讓 ZSET 天然保存每人的最高分,
 * 不需要先讀出舊值再比較(那會有競態條件)。
 */
export function recordScore(userId: number, score: number): Promise<void> {
  return withRedis(async (redis) => {
    await redis.zadd(GLOBAL_KEY, 'GT', score, String(userId));
  }, undefined);
}

/** 查詢名次(1 起算);沒有成績或 Redis 不可用時回 null */
export function getRank(userId: number): Promise<number | null> {
  return withRedis(async (redis) => {
    const rank = await redis.zrevrank(GLOBAL_KEY, String(userId));
    return rank === null ? null : rank + 1;
  }, null);
}

/** 榜上總人數 */
export function getTotalPlayers(): Promise<number | null> {
  return withRedis(async (redis) => redis.zcard(GLOBAL_KEY), null);
}

/** 取得某玩家目前的最高分 */
export function getBestScore(userId: number): Promise<number | null> {
  return withRedis(async (redis) => {
    const raw = await redis.zscore(GLOBAL_KEY, String(userId));
    return raw === null ? null : Number(raw);
  }, null);
}

/** 從既有資料整批重建 ZSET(重建指令用) */
export function rebuildRanking(rows: { userId: number; score: number }[]): Promise<void> {
  return withRedis(async (redis) => {
    await redis.del(GLOBAL_KEY);
    if (rows.length === 0) return;
    const args = rows.flatMap((r) => [r.score, String(r.userId)] as [number, string]);
    await redis.zadd(GLOBAL_KEY, ...(args as unknown as string[]));
  }, undefined);
}
