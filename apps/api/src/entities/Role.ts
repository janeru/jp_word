import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RolePermissionEntity } from './RolePermission.js';

/**
 * 角色 Entity。
 * 角色是「權限的集合」,使用者透過掛角色取得權限,不直接掛權限。
 * 參考 official-backend 的 roles 表,省略多站台用的 source_id。
 */
@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** 程式用的穩定代號,例如 'admin'、'player' */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  /** 顯示名稱,例如「管理員」 */
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  /** 新使用者註冊時自動掛上的角色(預期只有一個為 true) */
  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  /** 角色擁有的權限(多對多,經 role_permission 中介表) */
  @OneToMany(() => RolePermissionEntity, (rp) => rp.role)
  rolePermissions: RolePermissionEntity[];

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
