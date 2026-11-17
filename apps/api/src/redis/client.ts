import Redis from 'ioredis';
import { env } from '../env.js';

/**
 * Redis 連線與「失敗不影響服務」的包裝。
 *
 * 核心原則:Redis 在本專案是「加速層」,不是真相來源。
 * Postgres 才是。所以 Redis 掛掉時,所有操作一律降級(fail-open)——
 * 讀取當作 cache miss 去查資料庫,寫入靜默略過,服務照常運作。
 *
 * 唯一的例外是速率限制(見 http/rateLimit.ts),它的降級策略要另外權衡。
 */

let client: Redis | null = null;
/** 連線失敗時暫停呼叫的截止時間,避免每個請求都卡在重連 */
let mutedUntil = 0;
const MUTE_MS = 10_000;

/** 建立連線(未啟用 Redis 時回 null) */
export function initRedis(): Redis | null {
  if (!env.redis.enabled) {
    console.log('ℹ️  未設定 REDIS_URL,快取與速率限制停用(直接走資料庫)');
    return null;
  }

  client = new Redis(env.redis.url, {
    // 命令排隊會讓 Redis 掛掉時請求卡住,直接讓它失敗以便走降級路徑
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    // 指數退避重連,上限 3 秒
    retryStrategy: (times) => Math.min(times * 200, 3000),
    lazyConnect: false,
  });

  client.on('error', (err: Error) => {
    // 連線問題會反覆觸發,靜音一段時間避免洗版
    if (Date.now() < mutedUntil) return;
    mutedUntil = Date.now() + MUTE_MS;
    console.warn(`⚠️  Redis 連線異常(服務降級為直接查資料庫):${err.message}`);
  });

  client.on('ready', () => {
    mutedUntil = 0;
    console.log('✅ Redis 連線成功');
  });

  return client;
}

/** 取得連線;未啟用或尚未初始化回 null */
export function getRedis(): Redis | null {
  return client;
}

/** 關閉連線(服務結束時呼叫) */
export async function closeRedis(): Promise<void> {
  if (!client) return;
  await client.quit().catch(() => undefined);
  client = null;
}

/**
 * 執行一段 Redis 操作,失敗時回傳 fallback 而不是拋錯。
 * 所有讀寫都該經過它,呼叫端就不必各自寫 try/catch。
 *
 * @param fn       實際的 Redis 操作
 * @param fallback Redis 不可用或出錯時的回傳值
 */
export async function withRedis<T>(
  fn: (redis: Redis) => Promise<T>,
  fallback: T,
): Promise<T> {
  const redis = getRedis();
  if (!redis || redis.status !== 'ready') return fallback;

  try {
    return await fn(redis);
  } catch (err) {
    if (Date.now() >= mutedUntil) {
      mutedUntil = Date.now() + MUTE_MS;
      console.warn(`⚠️  Redis 操作失敗(已降級):${(err as Error).message}`);
    }
    return fallback;
  }
}
