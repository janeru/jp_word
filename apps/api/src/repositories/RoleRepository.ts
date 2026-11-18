import type { DataSource, Repository } from 'typeorm';
import { RoleEntity } from '../entities/Role.js';
import { RolePermissionEntity } from '../entities/RolePermission.js';

/** 角色資料存取介面 */
export interface IRoleRepository {
  findAllWithPermissions(): Promise<RoleEntity[]>;
  findByIdWithPermissions(id: number): Promise<RoleEntity | null>;
  findByCode(code: string): Promise<RoleEntity | null>;
  /** 新使用者註冊時要自動掛上的預設角色 */
  findDefaults(): Promise<RoleEntity[]>;
  create(data: Pick<RoleEntity, 'code' | 'name' | 'description'>): Promise<RoleEntity>;
  update(id: number, data: Partial<Pick<RoleEntity, 'name' | 'description'>>): Promise<void>;
  softDelete(id: number): Promise<void>;
  /** 覆寫角色的權限 */
  replacePermissions(roleId: number, permissionIds: number[]): Promise<void>;
}

/** TypeORM 實作 */
export class RoleRepository implements IRoleRepository {
  private readonly repo: Repository<RoleEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(RoleEntity);
  }

  findAllWithPermissions(): Promise<RoleEntity[]> {
    return this.repo.find({
      relations: { rolePermissions: { permission: true } },
      order: { id: 'ASC' },
    });
  }

  findByIdWithPermissions(id: number): Promise<RoleEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: { rolePermissions: { permission: true } },
    });
  }

  findByCode(code: string): Promise<RoleEntity | null> {
    return this.repo.findOne({ where: { code } });
  }

  findDefaults(): Promise<RoleEntity[]> {
    return this.repo.find({ where: { isDefault: true } });
  }

  create(data: Pick<RoleEntity, 'code' | 'name' | 'description'>): Promise<RoleEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async update(
    id: number,
    data: Partial<Pick<RoleEntity, 'name' | 'description'>>,
  ): Promise<void> {
    await this.repo.update(id, data);
  }

  async softDelete(id: number): Promise<void> {
    await this.repo.softDelete(id);
  }

  async replacePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(RolePermissionEntity, { roleId });
      if (permissionIds.length > 0) {
        await manager.insert(
          RolePermissionEntity,
          permissionIds.map((permissionId) => ({ roleId, permissionId })),
        );
      }
    });
  }
}
