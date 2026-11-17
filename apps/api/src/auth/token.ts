import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env } from '../env.js';

/**
 * JWT 內帶的最小資訊。
 * 刻意只放 id 與 email — 角色與權限每次請求都從資料庫重新查,
 * 這樣管理員一改權限就立即生效,不必等使用者的 token 過期。
 */
export interface TokenPayload {
  sub: number;
  email: string;
}

/** 簽發 token */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.auth.jwtSecret, {
    expiresIn: env.auth.tokenTtlSec,
  });
}

/** 驗證 token;無效或過期回 null(由呼叫端決定要不要當成未登入) */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.auth.jwtSecret);
    if (typeof decoded === 'string') return null;
    const { sub, email } = decoded as Record<string, unknown>;
    if (typeof sub !== 'number' || typeof email !== 'string') return null;
    return { sub, email };
  } catch {
    // 簽章錯誤、過期、格式不對 — 一律視為未登入
    return null;
  }
}

/**
 * Cookie 設定。
 * httpOnly  → JavaScript 讀不到,可大幅降低 XSS 竊取 token 的風險
 * sameSite  → lax 可擋大部分 CSRF;前後端同源(開發用 Vite proxy、
 *             正式由後端托管前端)所以不需要 none
 * secure    → 正式環境只走 HTTPS 傳送
 */
function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: env.auth.tokenTtlSec * 1000,
  };
}

/** 登入成功:把 token 寫進 httpOnly cookie */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.auth.cookieName, token, cookieOptions());
}

/** 登出:清掉 cookie(選項要與寫入時一致,瀏覽器才認得是同一個 cookie) */
export function clearAuthCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(env.auth.cookieName, options);
}
