import type { AssignRolesRequest, AuthUser } from '@jp-word/shared';
import { NotFoundError, ValidationError } from '../errors/AppError.js';
import type { IUserRepository } from '../repositories/UserRepository.js';
import type { IRoleRepository } from '../repositories/RoleRepository.js';
import { toAuthUser } from '../mappers/authMapper.js';
import { invalidateAuthUser } from '../redis/authCache.js';

/** 使用者管理邏輯(後台用) */
export class UserService {
  constructor(
    private readonly users: IUserRepository,
    private readonly roles: IRoleRepository,
  ) {}

  /** 列出全部使用者(含角色) */
  async list(): Promise<AuthUser[]> {
    const entities = await this.users.findAllWithRoles();
    return entities.map(toAuthUser);
  }

  async get(id: number): Promise<AuthUser> {
    const entity = await this.users.findByIdWithRoles(id);
    if (!entity) throw new NotFoundError(`找不到使用者 id=${id}`);
    return toAuthUser(entity);
  }

  /** 指派角色:整批覆寫這個使用者的角色 */
  async assignRoles(id: number, body: Partial<AssignRolesRequest>): Promise<AuthUser> {
    await this.get(id);

    const roleIds = Array.isArray(body.roleIds) ? [...new Set(body.roleIds)] : [];
    if (roleIds.some((rid) => typeof rid !== 'number')) {
      throw new ValidationError('roleIds 必須是數字陣列');
    }

    // 確認每個 id 都是存在的角色,避免寫入孤兒關聯
    const existing = await this.roles.findAllWithPermissions();
    const validIds = new Set(existing.map((r) => r.id));
    const invalid = roleIds.filter((rid) => !validIds.has(rid));
    if (invalid.length > 0) {
      throw new ValidationError(`找不到角色 id:${invalid.join(', ')}`);
    }

    await this.users.replaceRoles(id, roleIds);
    // 這個人的權限變了,清掉快取讓下一個請求重新計算
    await invalidateAuthUser(id);
    return this.get(id);
  }
}
