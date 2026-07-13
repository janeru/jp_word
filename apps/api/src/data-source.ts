import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { env } from './env.js';
import { WordEntity } from './entities/Word.js';
import { ScoreEntity } from './entities/Score.js';
import { CategoryEntity } from './entities/Category.js';

// 共用設定:Entity 註冊、migration 路徑、schema 同步。
const base = {
  type: 'postgres' as const,
  synchronize: env.db.synchronize,
  logging: false,
  entities: [WordEntity, ScoreEntity, CategoryEntity],
  migrations: ['src/migrations/*.ts'],
  // 代管 Postgres 常需要 SSL;自簽憑證用 rejectUnauthorized:false 放行。
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
};

// 有 DATABASE_URL(雲端平台)就用連線字串,否則用個別欄位(本機開發)。
const options: DataSourceOptions = env.db.url
  ? { ...base, url: env.db.url }
  : {
      ...base,
      host: env.db.host,
      port: env.db.port,
      username: env.db.username,
      password: env.db.password,
      database: env.db.database,
    };

// TypeORM DataSource:資料庫連線、Entity 註冊、migration 設定都在這裡。
export const AppDataSource = new DataSource(options);
