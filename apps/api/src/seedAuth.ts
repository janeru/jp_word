import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import type { DataSource } from 'typeorm';
import { DEFAULT_ROLES, PERMISSIONS, ROLE_ADMIN } from '@jp-word/shared';
import { AppDataSource } from './data-source.js';
import { env } from './env.js';
import { PermissionEntity } from './entities/Permission.js';
import { RoleEntity } from './entities/Role.js';
import { RolePermissionEntity } from './entities/RolePermission.js';
import { UserEntity } from './entities/User.js';
import { UserRoleEntity } from './entities/UserRole.js';
import { hashPassword } from './auth/password.js';

/**
 * 灌入 RBAC 基礎資料:權限 → 角色 → 角色權限 → 預設管理員。
 *
 * 設計成可重複執行(idempotent):
 * 權限以 code 為鍵 upsert,角色權限每次依 shared 的定義重新對齊,
 * 所以之後在 packages/shared 新增權限後,再跑一次就會同步進資料庫。
 */
export async function seedAuth(dataSource: DataSource): Promise<{
  permissions: number;
  roles: number;
  adminCreated: boolean;
}> {
  const permissionRepo = dataSource.getRepository(PermissionEntity);
  const roleRepo = dataSource.getRepository(RoleEntity);
  const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

  // 1. 權限:以 code 為鍵 upsert,順序即 shared 定義表的順序
  const existingPermissions = await permissionRepo.find();
  const permissionByCode = new Map(existingPermissions.map((p) => [p.code, p]));

  for (const [index, meta] of PERMISSIONS.entries()) {
    const existing = permissionByCode.get(meta.code);
    if (existing) {
      // 名稱或分組可能在 shared 改過,這裡對齊回來
      existing.name = meta.name;
      existing.groupCode = meta.groupCode;
      existing.sort = index;
      permissionByCode.set(meta.code, await permissionRepo.save(existing));
    } else {
      const created = await permissionRepo.save(
        permissionRepo.create({
          code: meta.code,
          name: meta.name,
          groupCode: meta.groupCode,
          sort: index,
        }),
      );
      permissionByCode.set(meta.code, created);
    }
  }

  // 2. 角色 + 3. 角色權限
  for (const seed of DEFAULT_ROLES) {
    let role = await roleRepo.findOne({ where: { code: seed.code } });
    if (role) {
      role.name = seed.name;
      role.description = seed.description;
      role.isDefault = seed.isDefault;
      role = await roleRepo.save(role);
    } else {
      role = await roleRepo.save(
        roleRepo.create({
          code: seed.code,
          name: seed.name,
          description: seed.description,
          isDefault: seed.isDefault,
        }),
      );
    }

    // 重新對齊這個角色的權限(先清空再寫入,確保與 shared 定義一致)
    await rolePermissionRepo.delete({ roleId: role.id });
    const rows = seed.permissions
      .map((code) => permissionByCode.get(code))
      .filter((p): p is PermissionEntity => Boolean(p))
      .map((p) => ({ roleId: role.id, permissionId: p.id }));
    if (rows.length > 0) {
      await rolePermissionRepo.insert(rows);
    }
  }

  // 4. 預設管理員(只在有設定環境變數、且該 email 尚未存在時建立)
  const adminCreated = await ensureAdminUser(dataSource);

  return {
    permissions: PERMISSIONS.length,
    roles: DEFAULT_ROLES.length,
    adminCreated,
  };
}

/** 依環境變數建立第一位管理員 — 沒有他就沒人能進權限管理頁 */
async function ensureAdminUser(dataSource: DataSource): Promise<boolean> {
  const { adminEmail, adminPassword, adminName } = env.auth;
  if (!adminEmail || !adminPassword) {
    console.log('ℹ️  未設定 ADMIN_EMAIL / ADMIN_PASSWORD,略過建立管理員帳號');
    return false;
  }

  const userRepo = dataSource.getRepository(UserEntity);
  const email = adminEmail.trim().toLowerCase();

  const existing = await userRepo.findOne({ where: { email }, withDeleted: true });
  if (existing) {
    console.log(`ℹ️  管理員 ${email} 已存在,略過建立`);
    return false;
  }

  const adminRole = await dataSource
    .getRepository(RoleEntity)
    .findOne({ where: { code: ROLE_ADMIN } });
  if (!adminRole) throw new Error('找不到 admin 角色,請先確認角色 seed 有成功');

  const user = await userRepo.save(
    userRepo.create({
      email,
      name: adminName,
      passwordHash: await hashPassword(adminPassword),
    }),
  );
  await dataSource
    .getRepository(UserRoleEntity)
    .insert({ userId: user.id, roleId: adminRole.id });

  console.log(`✅ 已建立管理員帳號:${email}`);
  return true;
}

// 直接以 `pnpm --filter api seed:auth` 執行時:自行連線 → 灌資料 → 關閉連線
const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  (async () => {
    await AppDataSource.initialize();
    console.log('✅ 資料庫連線成功,開始灌入權限資料…');
    const r = await seedAuth(AppDataSource);
    console.log(`✅ 已同步 ${r.permissions} 個權限、${r.roles} 個角色`);
    await AppDataSource.destroy();
  })().catch((err) => {
    console.error('❌ seed:auth 失敗:', err);
    process.exit(1);
  });
}
