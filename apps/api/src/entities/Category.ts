import {
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { CategoryGroup, JlptLevel } from '@jp-word/shared';
import { WordEntity } from './Word.js';

/** 單字分類/主題 Entity */
@Entity('categories')
export class CategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** 程式用穩定代號,例如 'food' */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  slug: string;

  /** 日文名稱 */
  @Column({ type: 'varchar', length: 32 })
  nameJa: string;

  /** 中文名稱 */
  @Column({ type: 'varchar', length: 32 })
  nameZh: string;

  /** 群組:basic(基礎) / travel(旅遊) */
  @Column({ type: 'varchar', length: 16 })
  group: CategoryGroup;

  /** 選單排序 */
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 2, default: 'N5' })
  level: JlptLevel;

  // 反向關聯:一個分類底下有多個單字。擁有端在 WordEntity。
  @ManyToMany(() => WordEntity, (word) => word.categories)
  words: WordEntity[];
}
