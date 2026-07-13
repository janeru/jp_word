import type { DataSource, Repository } from 'typeorm';
import type { JlptLevel } from '@jp-word/shared';
import { WordEntity } from '../entities/Word.js';

/** 查詢單字的條件 */
export interface FindWordsCriteria {
  level?: JlptLevel;
  categorySlug?: string;
  limit: number;
}

/**
 * 單字資料存取介面(Repository Pattern)。
 * Service 只依賴這個介面,不直接碰 TypeORM,方便替換與測試。
 */
export interface IWordRepository {
  find(criteria: FindWordsCriteria): Promise<WordEntity[]>;
}

/** TypeORM 實作 */
export class WordRepository implements IWordRepository {
  private readonly repo: Repository<WordEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(WordEntity);
  }

  async find(criteria: FindWordsCriteria): Promise<WordEntity[]> {
    const qb = this.repo
      .createQueryBuilder('word')
      // 一律帶出單字所屬的全部分類(多對多)
      .leftJoinAndSelect('word.categories', 'category')
      .take(criteria.limit)
      .orderBy('word.id', 'ASC');

    if (criteria.level) {
      qb.andWhere('word.level = :level', { level: criteria.level });
    }

    // 依分類篩選:用子查詢過濾出「屬於該分類」的單字 id,
    // 但仍保留上面 leftJoinAndSelect 帶出的完整分類清單。
    if (criteria.categorySlug) {
      qb.andWhere(
        'word.id IN ' +
          qb
            .subQuery()
            .select('w.id')
            .from(WordEntity, 'w')
            .leftJoin('w.categories', 'c')
            .where('c.slug = :slug')
            .getQuery(),
        { slug: criteria.categorySlug },
      );
    }

    return qb.getMany();
  }
}
