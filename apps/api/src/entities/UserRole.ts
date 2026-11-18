import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './User.js';
import { RoleEntity } from './Role.js';

/**
 * 使用者 ⇄ 角色 的中介表(多對多)。
 * 一個使用者可以有多個角色,權限取其聯集。
 *
 * 與 official-backend 的差異:這裡不做軟刪除。
 * 取消角色就是把關聯刪掉,配合 (userId, roleId) 唯一索引避免重複掛載;
 * 若沿用軟刪除,唯一索引會被已刪除的舊列卡住。
 */
@Entity('user_role')
@Index(['userId', 'roleId'], { unique: true })
export class UserRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, (u) => u.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'int' })
  roleId: number;

  @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
