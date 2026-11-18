import { Router } from 'express';
import type { CategoryController } from '../controllers/CategoryController.js';
import type { AuthMiddleware } from '../http/authMiddleware.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝分類路由 */
export function createCategoriesRouter(
  controller: CategoryController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  // GET /api/categories        取得所有分類(依群組、排序)
  router.get(
    '/',
    auth.requirePermission('ContentManage_Category_Search'),
    asyncHandler(controller.list),
  );
  // GET /api/categories/:slug  取得單一分類
  router.get(
    '/:slug',
    auth.requirePermission('ContentManage_Category_Search'),
    asyncHandler(controller.getBySlug),
  );
  return router;
}
