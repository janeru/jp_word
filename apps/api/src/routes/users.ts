import { Router } from 'express';
import type { UserController } from '../controllers/UserController.js';
import type { AuthMiddleware } from '../http/authMiddleware.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝使用者管理路由 */
export function createUsersRouter(
  controller: UserController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  // GET /api/users            列出所有使用者
  router.get(
    '/',
    auth.requirePermission('PermissionManage_User_Search'),
    asyncHandler(controller.list),
  );
  // GET /api/users/:id        單一使用者
  router.get(
    '/:id',
    auth.requirePermission('PermissionManage_User_Search'),
    asyncHandler(controller.get),
  );
  // PUT /api/users/:id/roles  指派角色(整批覆寫)
  router.put(
    '/:id/roles',
    auth.requirePermission('PermissionManage_User_Edit'),
    asyncHandler(controller.assignRoles),
  );
  return router;
}
