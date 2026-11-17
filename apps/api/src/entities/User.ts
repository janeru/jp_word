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
import { UserRoleEntity } from './UserRole.js';

/**
 * 使用者 Entity。
 * 參考 official-backend 的 users 表,差別在於本專案沒有 SSO,
 * 因此改為自帶帳密登入,多一個 passwordHash 欄位(bcrypt 雜湊,絕不存明碼)。
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** 登入帳號,全站唯一(一律小寫存放) */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /**
   * bcrypt 雜湊後的密碼。
   * select: false → 一般查詢不會帶出這個欄位,只有驗證密碼時才明確指定撈取,
   * 避免不小心把雜湊值序列化回前端。
   */
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  /** 顯示名稱(排行榜上顯示的名字) */
  @Column({ type: 'varchar', length: 32 })
  name: string;

  /** 使用者身上的角色(多對多,經 user_role 中介表) */
  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  userRoles: UserRoleEntity[];

  /** 停用中的帳號無法登入 */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /** 軟刪除:保留歷史成績的關聯,不做實體刪除 */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
