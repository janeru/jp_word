import type { Request, RequestHandler } from 'express';
import { env } from '../env.js';
import { withRedis } from '../redis/client.js';
import { sendError } from './apiResponse.js';

/**
 * 以 Redis 計數的速率限制。
 *
 * 為什麼不用行程內記憶體:
 * 1. Render 免費方案閒置會休眠,重啟後記憶體計數器歸零 —— 攻擊者等它睡一次就能重來。
 * 2. 多台 API 時,每台各算各的,實際允許次數會變成 N 倍。
 *
 * 降級策略(與其他快取不同):
 * Redis 掛掉時選擇 fail-open —— 放行但失去保護。
 * 反過來 fail-closed 會讓所有人都無法登入,把快取故障升級成全站故障,
 * 對這個規模的專案來說代價太大。正式環境應搭配告警。
 */

/** 取得用戶端 IP(Render 等平台會經過反向代理) */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? 'unknown';
}

/**
 * 對單一鍵值做「時間窗內計數」。
 * 用 INCR + EXPIRE:第一次計數時才設定過期時間,窗格到期自動歸零。
 *
 * @returns 這個窗格內累計的次數;Redis 不可用時回 0(等同放行)
 */
async function hit(key: string, windowSec: number): Promise<number> {
  return withRedis(async (redis) => {
    const count = await redis.incr(key);
    // 只在第一次設定 TTL,否則每次請求都延長窗格會變成永遠不過期
    if (count === 1) await redis.expire(key, windowSec);
    return count;
  }, 0);
}

/**
 * 登入速率限制。
 *
 * 同時對 IP 與 email 兩把鍵計數,理由不同:
 * - 只擋 IP:攻擊者換 IP 就繞過
 * - 只擋 email:會被拿來惡意鎖定他人帳號(阻斷服務)
 * 所以 email 那把刻意設得寬鬆(3 倍),只擋住針對單一帳號的密集嘗試。
 */
export const loginRateLimit: RequestHandler = (req, res, next) => {
  const { loginMaxAttempts: max, loginWindowSec: window } = env.redis;
  const ip = clientIp(req);
  const email =
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

  const checks: Promise<number>[] = [hit(`rl:login:ip:${ip}`, window)];
  if (email) checks.push(hit(`rl:login:email:${email}`, window));

  Promise.all(checks)
    .then(([ipCount, emailCount = 0]) => {
      const blocked = ipCount > max || emailCount > max * 3;
      if (blocked) {
        // 429 Too Many Requests;Retry-After 告訴用戶端多久後再試
        res.setHeader('Retry-After', String(window));
        return sendError(res, `嘗試次數過多,請於 ${Math.ceil(window / 60)} 分鐘後再試`, 429);
      }
      next();
    })
    .catch(next);
};

/** 註冊速率限制:只看 IP,防止大量灌帳號 */
export const registerRateLimit: RequestHandler = (req, res, next) => {
  const window = env.redis.loginWindowSec;
  hit(`rl:register:ip:${clientIp(req)}`, window)
    .then((count) => {
      if (count > 5) {
        res.setHeader('Retry-After', String(window));
        return sendError(res, `註冊過於頻繁,請於 ${Math.ceil(window / 60)} 分鐘後再試`, 429);
      }
      next();
    })
    .catch(next);
};
