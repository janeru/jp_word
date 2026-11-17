import type { AuthUser } from '@jp-word/shared';
import { env } from '../env.js';
import { withRedis } from './client.js';

/**
 * 使用者身分(角色 + 權限聯集)的共用快取。
 *
 * 為什麼一定要放 Redis 而不是行程內記憶體:
 * 若跑多台 API,管理員在 A 台改權限、只清掉 A 的記憶體快取,
 * B 台會繼續拿舊權限放行 —— 「撤銷立即生效」的保證就破了。
 * 快取必須是共用的,所有實例才看得到同一份失效訊號。
 *
 * TTL 是安全網而非主要機制:正確性靠變更時主動清除,
 * 萬一有路徑漏清,最多也只會過期 authTtlSec 秒。
 */

const userKey = (id: number) => `auth:user:${id}`;

/** 讀取快取的身分;沒有或 Redis 不可用時回 null(呼叫端去查資料庫) */
export function getCachedAuthUser(id: number): Promise<AuthUser | null> {
  return withRedis(async (redis) => {
    const raw = await redis.get(userKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  }, null);
}

/** 寫入快取 */
export function setCachedAuthUser(user: AuthUser): Promise<void> {
  return withRedis(async (redis) => {
    await redis.set(userKey(user.id), JSON.stringify(user), 'EX', env.redis.authTtlSec);
  }, undefined);
}

/** 清除單一使用者的快取(指派角色、改名、停用時呼叫) */
export function invalidateAuthUser(id: number): Promise<void> {
  return withRedis(async (redis) => {
    await redis.del(userKey(id));
  }, undefined);
}

/**
 * 清除一批使用者的快取。
 * 用在「角色的權限被改動」時 —— 受影響的是所有掛著該角色的人,
 * 不是單一使用者。呼叫端要先查出這批 userId。
 */
export function invalidateAuthUsers(ids: number[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return withRedis(async (redis) => {
    await redis.del(...ids.map(userKey));
  }, undefined);
}
