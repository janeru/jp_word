import { Router } from 'express';
import type { RoleController } from '../controllers/RoleController.js';
import type { AuthMiddleware } from '../http/authMiddleware.js';
import { asyncHandler } from '../http/asyncHandler.js';

/** 組裝角色/權限路由(全部需要「權限管理」相關權限) */
export function createRolesRouter(
  controller: RoleController,
  auth: AuthMiddleware,
): Router {
  const router = Router();
  // GET    /api/roles              列出角色
  router.get(
    '/',
    auth.requirePermission('PermissionManage_Role_Search'),
    asyncHandler(controller.list),
  );
  // GET    /api/roles/permissions  列出所有可指派的權限(後台勾選清單)
  router.get(
    '/permissions',
    auth.requirePermission('PermissionManage_Role_Search'),
    asyncHandler(controller.listPermissions),
  );
  // POST   /api/roles              新增角色
  router.post(
    '/',
    auth.requirePermission('PermissionManage_Role_Create'),
    asyncHandler(controller.create),
  );
  // PUT    /api/roles/:id          編輯角色與其權限
  router.put(
    '/:id',
    auth.requirePermission('PermissionManage_Role_Edit'),
    asyncHandler(controller.update),
  );
  // DELETE /api/roles/:id          刪除角色
  router.delete(
    '/:id',
    auth.requirePermission('PermissionManage_Role_Delete'),
    asyncHandler(controller.remove),
  );
  return router;
}
