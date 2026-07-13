import 'dotenv/config';

// 集中管理環境變數,提供預設值與型別轉換。
export const env = {
  /** development | production */
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3008),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  /** 為 true 時,若資料庫是空的就在啟動時自動灌種子(部署 Demo 用) */
  autoSeed: process.env.AUTO_SEED === 'true',
  db: {
    /** 雲端平台常提供單一連線字串;有值時優先使用 */
    url: process.env.DATABASE_URL,
    /** 代管 Postgres(如 Neon)通常需要 SSL */
    ssl: process.env.DB_SSL === 'true',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'jp_word',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'false') === 'true',
  },
};
