import { Router } from 'express';
import type { AuthController } from '../controllers/AuthController.js';
import type { AuthMiddleware } from '../http/authMiddleware.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { loginRateLimit, registerRateLimit } from '../http/rateLimit.js';

/** 組裝認證路由 */
export function createAuthRouter(
  controller: AuthController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  // POST /api/auth/register  註冊(自動掛預設角色並直接登入)
  router.post('/register', registerRateLimit, asyncHandler(controller.register));
  // POST /api/auth/login     登入,token 寫進 httpOnly cookie
  router.post('/login', loginRateLimit, asyncHandler(controller.login));
  // POST /api/auth/logout    登出,清掉 cookie
  router.post('/logout', asyncHandler(controller.logout));
  // GET  /api/auth/me        取得目前登入者(未登入回 null,前端用來還原狀態)
  router.get('/me', auth.optionalAuth, asyncHandler(controller.me));
  return router;
}
