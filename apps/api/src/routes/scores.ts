import { Router } from 'express';
import type { ScoreController } from '../controllers/ScoreController.js';
import type { AuthMiddleware } from '../http/authMiddleware.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝成績路由 */
export function createScoresRouter(
  controller: ScoreController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  // GET  /api/scores?limit=10  排行榜
  router.get(
    '/',
    auth.requirePermission('Game_Leaderboard_Search'),
    asyncHandler(controller.leaderboard),
  );
  // GET  /api/scores/me/rank   我目前的名次(Redis ZSET)
  router.get(
    '/me/rank',
    auth.requirePermission('Game_Leaderboard_Search'),
    asyncHandler(controller.myRank),
  );
  // POST /api/scores           上傳一場成績(名字由後端從登入身分帶)
  router.post('/', auth.requirePermission('Game_Play'), asyncHandler(controller.submit));
  return router;
}
