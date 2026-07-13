import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { JlptLevel, WordType } from '@jp-word/shared';
import { CategoryEntity } from './Category.js';

/** 日文單字 Entity */
@Entity('words')
export class WordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** 假名讀音,例如「たべる」 */
  @Column({ type: 'varchar', length: 64 })
  kana: string;

  /** 漢字寫法(可能沒有) */
  @Column({ type: 'varchar', length: 64, nullable: true })
  kanji: string | null;

  /** 羅馬拼音,玩家輸入用 */
  @Column({ type: 'varchar', length: 64 })
  romaji: string;

  /** 中文意思 */
  @Column({ type: 'varchar', length: 128 })
  meaning: string;

  /** 難度等級 */
  @Index()
  @Column({ type: 'varchar', length: 2, default: 'N5' })
  level: JlptLevel;

  /** 詞性 */
  @Column({ type: 'varchar', length: 16, default: 'noun' })
  wordType: WordType;

  // 多對多:一個單字可屬於多個分類。此端為擁有端(@JoinTable),
  // TypeORM 會自動建立中介表 word_categories。
  @ManyToMany(() => CategoryEntity, (category) => category.words)
  @JoinTable({
    name: 'word_categories',
    joinColumn: { name: 'word_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: CategoryEntity[];
}
