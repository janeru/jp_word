import type { AuthUser, Permission, PermissionCode, Role } from '@jp-word/shared';
import type { UserEntity } from '../entities/User.js';
import type { RoleEntity } from '../entities/Role.js';
import type { PermissionEntity } from '../entities/Permission.js';

/** PermissionEntity → 對外 DTO */
export function toPermissionDto(entity: PermissionEntity): Permission {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    groupCode: entity.groupCode,
    sort: entity.sort,
  };
}

/** RoleEntity → 對外 DTO(含權限清單) */
export function toRoleDto(entity: RoleEntity): Role {
  return {
    id: entity.id,
    code: entity.code,
    name: entity.name,
    description: entity.description,
    isDefault: entity.isDefault,
    permissions: (entity.rolePermissions ?? [])
      .map((rp) => rp.permission)
      .filter((p): p is PermissionEntity => Boolean(p))
      .map(toPermissionDto),
  };
}

/**
 * UserEntity → 對外 DTO。
 * 重點:permissions 是「所有角色權限的聯集」並去重複 —
 * 使用者有多個角色時,只要任一角色有該權限就算有。
 * 這裡不會帶出 passwordHash(Entity 已設 select:false,DTO 也未列入)。
 */
export function toAuthUser(entity: UserEntity): AuthUser {
  const roles = (entity.userRoles ?? []).map((ur) => ur.role).filter(Boolean);

  const permissions = [
    ...new Set(
      roles.flatMap((role) =>
        (role.rolePermissions ?? [])
          .map((rp) => rp.permission?.code)
          .filter((code): code is PermissionCode => Boolean(code)),
      ),
    ),
  ];

  return {
    id: entity.id,
    email: entity.email,
    name: entity.name,
    roles: roles.map((r) => ({ id: r.id, code: r.code, name: r.name })),
    permissions,
    lastLoginAt: entity.lastLoginAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
  };
}
