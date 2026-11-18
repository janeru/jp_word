import { Router } from 'express';
import type { Container } from '../container.js';
import { sendOk } from '../http/apiResponse.js';
import { createWordsRouter } from './words.js';
import { createCategoriesRouter } from './categories.js';
import { createScoresRouter } from './scores.js';
import { createAuthRouter } from './auth.js';
import { createRolesRouter } from './roles.js';
import { createUsersRouter } from './users.js';

/** 組裝 /api 底下所有路由 */
export function createApiRouter(container: Container): Router {
  const router = Router();
  const { auth } = container;

  // 不需登入:健康檢查與認證本身
  router.get('/health', (_req, res) => sendOk(res, 'pong'));
  router.use('/auth', createAuthRouter(container.authController, auth));

  // 需登入 + 對應權限
  router.use('/words', createWordsRouter(container.wordController, auth));
  router.use('/categories', createCategoriesRouter(container.categoryController, auth));
  router.use('/scores', createScoresRouter(container.scoreController, auth));
  router.use('/roles', createRolesRouter(container.roleController, auth));
  router.use('/users', createUsersRouter(container.userController, auth));

  return router;
}
