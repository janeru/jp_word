import type { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../entities/User.js';
import { UserRoleEntity } from '../entities/UserRole.js';

/** 建立使用者所需的資料 */
export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
}

/** 使用者資料存取介面 */
export interface IUserRepository {
  /** 依 id 取得使用者,並一併載入角色與角色底下的權限 */
  findByIdWithRoles(id: number): Promise<UserEntity | null>;
  /** 依 email 取得使用者(含 passwordHash,登入驗證用) */
  findByEmailWithPassword(email: string): Promise<UserEntity | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(data: NewUser): Promise<UserEntity>;
  touchLastLogin(id: number): Promise<void>;
  findAllWithRoles(): Promise<UserEntity[]>;
  /** 查出掛著指定角色的所有使用者 id(角色權限異動時要清這批人的快取) */
  findUserIdsByRoleId(roleId: number): Promise<number[]>;
  /** 以「先清空再寫入」的方式覆寫使用者的角色 */
  replaceRoles(userId: number, roleIds: number[]): Promise<void>;
  assignRoles(userId: number, roleIds: number[]): Promise<void>;
}

/** TypeORM 實作 */
export class UserRepository implements IUserRepository {
  private readonly repo: Repository<UserEntity>;
  private readonly userRoleRepo: Repository<UserRoleEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserEntity);
    this.userRoleRepo = dataSource.getRepository(UserRoleEntity);
  }

  findByIdWithRoles(id: number): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { id },
      // 三層 relation:user → user_role → role → role_permission → permission
      relations: {
        userRoles: { role: { rolePermissions: { permission: true } } },
      },
    });
  }

  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    // passwordHash 在 Entity 上是 select:false,這裡必須明確加選才拿得到
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      // 軟刪除的帳號也算佔用 email,避免刪除後重註冊造成身分混淆
      .withDeleted()
      .getCount();
    return count > 0;
  }

  create(data: NewUser): Promise<UserEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async touchLastLogin(id: number): Promise<void> {
    await this.repo.update(id, { lastLoginAt: new Date() });
  }

  findAllWithRoles(): Promise<UserEntity[]> {
    return this.repo.find({
      relations: { userRoles: { role: { rolePermissions: { permission: true } } } },
      order: { createdAt: 'DESC' },
    });
  }

  async findUserIdsByRoleId(roleId: number): Promise<number[]> {
    const rows = await this.userRoleRepo.find({
      where: { roleId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  /** 覆寫角色:整批換掉,包在交易裡避免刪完寫入失敗留下沒有角色的使用者 */
  async replaceRoles(userId: number, roleIds: number[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserRoleEntity, { userId });
      if (roleIds.length > 0) {
        await manager.insert(
          UserRoleEntity,
          roleIds.map((roleId) => ({ userId, roleId })),
        );
      }
    });
  }

  /** 附加角色(重複掛載時靜默忽略,靠唯一索引擋) */
  async assignRoles(userId: number, roleIds: number[]): Promise<void> {
    if (roleIds.length === 0) return;
    await this.userRoleRepo
      .createQueryBuilder()
      .insert()
      .values(roleIds.map((roleId) => ({ userId, roleId })))
      .orIgnore()
      .execute();
  }
}
