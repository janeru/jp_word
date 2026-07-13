import { Router } from 'express';
import type { ScoreController } from '../controllers/ScoreController.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝成績路由 */
export function createScoresRouter(controller: ScoreController): Router {
  const router = Router();
  // GET  /api/scores?limit=10  排行榜
  router.get('/', asyncHandler(controller.leaderboard));
  // POST /api/scores           上傳一場成績
  router.post('/', asyncHandler(controller.submit));
  return router;
}
