import type { DataSource, Repository } from 'typeorm';
import { ScoreEntity } from '../entities/Score.js';

/** 建立成績時需要的資料(不含自動產生的 id/createdAt) */
export type NewScore = Omit<ScoreEntity, 'id' | 'createdAt'>;

/** 成績資料存取介面(Repository Pattern) */
export interface IScoreRepository {
  findTop(limit: number): Promise<ScoreEntity[]>;
  create(data: NewScore): Promise<ScoreEntity>;
}

/** TypeORM 實作 */
export class ScoreRepository implements IScoreRepository {
  private readonly repo: Repository<ScoreEntity>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(ScoreEntity);
  }

  findTop(limit: number): Promise<ScoreEntity[]> {
    return this.repo.find({
      order: { score: 'DESC', createdAt: 'ASC' },
      take: limit,
    });
  }

  create(data: NewScore): Promise<ScoreEntity> {
    return this.repo.save(this.repo.create(data));
  }
}
