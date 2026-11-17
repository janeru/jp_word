import type { Permission, Role, UpsertRoleRequest } from '@jp-word/shared';
import { PERMISSION_CODES } from '@jp-word/shared';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError.js';
import type { IRoleRepository } from '../repositories/RoleRepository.js';
import type { IPermissionRepository } from '../repositories/PermissionRepository.js';
import type { IUserRepository } from '../repositories/UserRepository.js';
import { toPermissionDto, toRoleDto } from '../mappers/authMapper.js';
import { invalidateAuthUsers } from '../redis/authCache.js';

/** 角色與權限的管理邏輯(後台用) */
export class RoleService {
  constructor(
    private readonly roles: IRoleRepository,
    private readonly permissions: IPermissionRepository,
    private readonly users: IUserRepository,
  ) {}

  /** 列出全部角色(含各自的權限) */
  async list(): Promise<Role[]> {
    const entities = await this.roles.findAllWithPermissions();
    return entities.map(toRoleDto);
  }

  /** 列出全部可指派的權限(後台勾選清單用) */
  async listPermissions(): Promise<Permission[]> {
    const entities = await this.permissions.findAll();
    return entities.map(toPermissionDto);
  }

  async create(body: Partial<UpsertRoleRequest>): Promise<Role> {
    const payload = this.validate(body);

    if (await this.roles.findByCode(payload.code)) {
      throw new ConflictError(`角色代號 ${payload.code} 已存在`);
    }

    const role = await this.roles.create({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
    });
    await this.syncPermissions(role.id, payload.permissionCodes);

    return this.getOrThrow(role.id);
  }

  async update(id: number, body: Partial<UpsertRoleRequest>): Promise<Role> {
    await this.getOrThrow(id);
    const payload = this.validate(body);

    // code 是程式判斷角色的依據,建立後不開放更改,避免既有邏輯失準
    await this.roles.update(id, {
      name: payload.name,
      description: payload.description ?? null,
    });
    await this.syncPermissions(id, payload.permissionCodes);
    await this.invalidateRoleHolders(id);

    return this.getOrThrow(id);
  }

  async remove(id: number): Promise<void> {
    const role = await this.getOrThrow(id);
    if (role.isDefault) {
      throw new ValidationError('預設角色不能刪除');
    }
    // 先取得受影響的人再刪除 —— 刪完就查不到關聯了
    await this.invalidateRoleHolders(id);
    await this.roles.softDelete(id);
  }

  /**
   * 清掉所有掛著這個角色的使用者快取。
   *
   * 這是整套快取最容易出錯的地方:改「一個角色」的權限,
   * 受影響的是「所有擁有該角色的人」,不是單一使用者。
   * 漏掉這步,那些人會繼續拿著舊權限直到 TTL 過期。
   */
  private async invalidateRoleHolders(roleId: number): Promise<void> {
    const userIds = await this.users.findUserIdsByRoleId(roleId);
    await invalidateAuthUsers(userIds);
  }

  private async getOrThrow(id: number): Promise<Role> {
    const entity = await this.roles.findByIdWithPermissions(id);
    if (!entity) throw new NotFoundError(`找不到角色 id=${id}`);
    return toRoleDto(entity);
  }

  /** 把權限代號換成 id 後覆寫 role_permission */
  private async syncPermissions(
    roleId: number,
    codes: UpsertRoleRequest['permissionCodes'],
  ): Promise<void> {
    const entities = await this.permissions.findByCodes(codes);
    await this.roles.replacePermissions(
      roleId,
      entities.map((p) => p.id),
    );
  }

  private validate(body: Partial<UpsertRoleRequest>): UpsertRoleRequest {
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const codes = Array.isArray(body.permissionCodes) ? body.permissionCodes : [];

    if (!code) throw new ValidationError('請輸入角色代號');
    if (!name) throw new ValidationError('請輸入角色名稱');

    // 只接受 shared 定義過的權限代號,擋掉打錯字造成的「無聲失效」
    const unknown = codes.filter((c) => !PERMISSION_CODES.includes(c));
    if (unknown.length > 0) {
      throw new ValidationError(`未知的權限代號:${unknown.join(', ')}`);
    }

    return {
      code,
      name,
      description: typeof body.description === 'string' ? body.description : null,
      permissionCodes: [...new Set(codes)],
    };
  }
}
