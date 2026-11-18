import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoleEntity } from './Role.js';
import { PermissionEntity } from './Permission.js';

/**
 * 角色 ⇄ 權限 的中介表(多對多)。
 * 調整角色權限 = 增刪這張表的列,不需要改程式碼。
 * 同 UserRole,不做軟刪除,以 (roleId, permissionId) 唯一索引防重複。
 */
@Entity('role_permission')
@Index(['roleId', 'permissionId'], { unique: true })
export class RolePermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  roleId: number;

  @ManyToOne(() => RoleEntity, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @Column({ type: 'int' })
  permissionId: number;

  @ManyToOne(() => PermissionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: PermissionEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
