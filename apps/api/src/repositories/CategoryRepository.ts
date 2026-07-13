import type { DataSource, Repository } from 'typeorm';
import { CategoryEntity } from '../entities/Category.js';

/** 分類資料存取介面(Repository Pattern) */
export interface ICategoryRepository {
  findAllOrdered(): Promise<CategoryEntity[]>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
}

/** TypeORM 實作 */
export class CategoryRepository implements ICategoryRepository {
  private readonly repo: Repository<CategoryEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(CategoryEntity);
  }

  findAllOrdered(): Promise<CategoryEntity[]> {
    // 群組(basic 先於 travel)、再依關卡排序
    return this.repo.find({ order: { group: 'ASC', sortOrder: 'ASC' } });
  }

  findBySlug(slug: string): Promise<CategoryEntity | null> {
    return this.repo.findOne({ where: { slug } });
  }
}
