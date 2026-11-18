import { Router } from 'express';
import type { WordController } from '../controllers/WordController.js';
import type { AuthMiddleware } from '../http/authMiddleware.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝單字路由 */
export function createWordsRouter(
  controller: WordController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  // GET /api/words?level=N5&category=food&limit=50
  router.get(
    '/',
    auth.requirePermission('ContentManage_Word_Search'),
    asyncHandler(controller.list),
  );
  return router;
}
