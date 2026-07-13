import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { JlptLevel } from '@jp-word/shared';

/** 遊戲成績 Entity(排行榜用) */
@Entity('scores')
export class ScoreEntity {
  @PrimaryGeneratedColumn()
  id: number;

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
