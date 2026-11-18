import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { JlptLevel } from '@jp-word/shared';
import { UserEntity } from './User.js';

/** 遊戲成績 Entity(排行榜用) */
@Entity('scores')
export class ScoreEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 成績所屬的使用者。
   * nullable 是為了保留導入登入機制之前的舊資料;新成績一律有 userId。
   */
  @Index()
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity | null;

  /**
   * 送出成績當下的顯示名稱(快照)。
   * 由後端從登入者身上帶入,前端無法自填;
   * 存快照是為了使用者日後改名時,排行榜的歷史紀錄仍是當時的名字。
   */
  @Column({ type: 'varchar', length: 32 })
  playerName: string;

  @Index()
  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  hits: number;

  @Column({ type: 'int' })
  misses: number;

  @Column({ type: 'int' })
  maxCombo: number;

  @Column({ type: 'varchar', length: 2 })
  level: JlptLevel;

  /** 這場遊戲的分類代號(null 代表綜合) */
  @Column({ type: 'varchar', length: 32, nullable: true })
  categorySlug: string | null;

  @Column({ type: 'int' })
  durationSec: number;

  @CreateDateColumn()
  createdAt: Date;
}
