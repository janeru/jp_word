import { Router } from 'express';
import type { WordController } from '../controllers/WordController.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝單字路由 */
export function createWordsRouter(controller: WordController): Router {
  const router = Router();
  // GET /api/words?level=N5&category=food&limit=50
  router.get('/', asyncHandler(controller.list));
  return router;
}
