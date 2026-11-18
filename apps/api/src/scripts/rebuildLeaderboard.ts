import 'reflect-metadata';
import { AppDataSource } from '../data-source.js';
import { ScoreEntity } from '../entities/Score.js';
import { closeRedis, initRedis } from '../redis/client.js';
import { rebuildRanking } from '../redis/leaderboardCache.js';

/**
 * 從 Postgres 重建排行榜 Sorted Set。
 *
 * Postgres 是真相來源,Redis 只是加速層 —— 所以 Redis 資料掉了、
 * 被 flush 了,或是換了一台 Redis,都能用這支指令補回來。
 * 執行:pnpm --filter api leaderboard:rebuild
 */
async function main(): Promise<void> {
  await AppDataSource.initialize();
  initRedis();
  // 等 ioredis 完成連線,否則 withRedis 會因狀態未 ready 而靜默略過
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 每位使用者只取最高分
  const rows = await AppDataSource.getRepository(ScoreEntity)
    .createQueryBuilder('s')
    .select('s.userId', 'userId')
    .addSelect('MAX(s.score)', 'score')
    .where('s.userId IS NOT NULL')
    .groupBy('s.userId')
    .getRawMany<{ userId: number; score: string }>();

  const entries = rows.map((r) => ({ userId: r.userId, score: Number(r.score) }));
  await rebuildRanking(entries);

  console.log(`✅ 已重建排行榜:${entries.length} 位玩家`);

  await closeRedis();
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ 重建排行榜失敗:', err);
  process.exit(1);
});
