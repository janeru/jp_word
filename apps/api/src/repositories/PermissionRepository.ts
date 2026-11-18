import { In, type DataSource, type Repository } from 'typeorm';
import { PermissionEntity } from '../entities/Permission.js';
import type { PermissionCode } from '@jp-word/shared';

/** 權限資料存取介面 */
export interface IPermissionRepository {
  findAll(): Promise<PermissionEntity[]>;
  findByCodes(codes: PermissionCode[]): Promise<PermissionEntity[]>;
}

/** TypeORM 實作 */
export class PermissionRepository implements IPermissionRepository {
  private readonly repo: Repository<PermissionEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PermissionEntity);
  }

  findAll(): Promise<PermissionEntity[]> {
    return this.repo.find({ order: { groupCode: 'ASC', sort: 'ASC' } });
  }

  findByCodes(codes: PermissionCode[]): Promise<PermissionEntity[]> {
    if (codes.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { code: In(codes) } });
  }
}
