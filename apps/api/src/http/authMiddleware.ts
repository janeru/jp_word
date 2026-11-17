import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthUser, PermissionCode } from '@jp-word/shared';
import { env } from '../env.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { verifyToken } from '../auth/token.js';
import type { AuthService } from '../services/AuthService.js';

// 讓 req.user 在整個專案都有型別。
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** 已登入的使用者(含角色與權限);未登入時為 undefined */
      user?: AuthUser;
    }
  }
}

/** 從 httpOnly cookie 取出 token */
function readToken(req: Request): string | null {
  const raw: unknown = req.cookies?.[env.auth.cookieName];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

/**
 * 建立三個驗證中介層。
 * 都需要 AuthService 才能從 token 的 id 查出最新的角色與權限,
 * 所以做成工廠函式,由 container 注入。
 */
export function createAuthMiddleware(authService: AuthService) {
  /**
   * 解析登入狀態但不強制。
   * 有帶有效 token 就填 req.user,沒有也放行 — 給「登入與否都能看,
   * 但登入後有額外內容」的端點用(例如排行榜標記出自己的名次)。
   */
  const optionalAuth: RequestHandler = (req, _res, next) => {
    const token = readToken(req);
    if (!token) return next();

    const payload = verifyToken(token);
    if (!payload) return next();

    authService
      .loadAuthUser(payload.sub)
      .then((user) => {
        // 查不到或已停用 → 當作未登入
        if (user) req.user = user;
        next();
      })
      .catch(next);
  };

  /** 強制登入:沒有有效身分就 401 */
  const authenticate: RequestHandler = (req, res, next) => {
    optionalAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      if (!req.user) return next(new UnauthorizedError('請先登入'));
      next();
    });
  };

  /**
   * 權限檢查:必須先登入,且具備指定權限之一。
   * 用法:router.post('/', requirePermission('ContentManage_Word_Create'), handler)
   */
  const requirePermission =
    (...codes: PermissionCode[]): RequestHandler =>
    (req: Request, res: Response, next: NextFunction) => {
      authenticate(req, res, (err?: unknown) => {
        if (err) return next(err);
        const owned = req.user?.permissions ?? [];
        const allowed = codes.some((c) => owned.includes(c));
        if (!allowed) {
          return next(new ForbiddenError(`權限不足,需要:${codes.join(' 或 ')}`));
        }
        next();
      });
    };

  return { optionalAuth, authenticate, requirePermission };
}

export type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;
