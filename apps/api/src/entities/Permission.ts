import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PermissionCode, PermissionGroupCode } from '@jp-word/shared';

/**
 * 權限 Entity。
 * 權限是「可以做什麼」的最小單位,以 code 為程式判斷依據。
 * 資料由 seed 依 packages/shared 的 PERMISSIONS 定義表同步產生,
 * 不透過 API 新增 — 因為每個 code 都要有對應的程式碼在檢查它。
 *
 * 簡化處:official-backend 用樹狀的 permission_groups 表做分組,
 * 本專案規模小,改用扁平的 groupCode 欄位表示分組。
 */
@Entity('permissions')
export class PermissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** 權限代號,例如 'ContentManage_Word_Edit' */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  code: PermissionCode;

  /** 顯示名稱,例如「編輯單字」 */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** 所屬群組代號,後台分組顯示用 */
  @Column({ type: 'varchar', length: 50 })
  groupCode: PermissionGroupCode;

  /** 群組內排序 */
  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
