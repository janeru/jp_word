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
  auth: {
    /** 簽發 JWT 用的密鑰。正式環境必須自行設定,見下方檢查。 */
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me',
    /** token 有效期(秒),預設 7 天;到期就要重新登入 */
    tokenTtlSec: Number(process.env.JWT_TTL_SEC ?? 60 * 60 * 24 * 7),
    /** 存放 token 的 httpOnly cookie 名稱 */
    cookieName: process.env.AUTH_COOKIE_NAME ?? 'jp_word_token',
    /** 首次啟動時自動建立的管理員帳號(留空則不建立) */
    adminEmail: process.env.ADMIN_EMAIL ?? '',
    adminPassword: process.env.ADMIN_PASSWORD ?? '',
    adminName: process.env.ADMIN_NAME ?? '管理員',
  },
  redis: {
    /** 沒設定就整套停用,服務照常運作(直接查資料庫) */
    url: process.env.REDIS_URL ?? '',
    get enabled(): boolean {
      return this.url.length > 0;
    },
    /** 使用者權限快取的存活秒數;短 TTL 當作漏清快取時的安全網 */
    authTtlSec: Number(process.env.REDIS_AUTH_TTL_SEC ?? 60),
    /** 排行榜列表快取的存活秒數 */
    leaderboardTtlSec: Number(process.env.REDIS_LEADERBOARD_TTL_SEC ?? 30),
    /** 登入速率限制:每個時間窗內允許的嘗試次數 */
    loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 10),
    /** 登入速率限制的時間窗(秒) */
    loginWindowSec: Number(process.env.LOGIN_WINDOW_SEC ?? 300),
  },
};

// 正式環境不允許用預設密鑰跑 — 否則任何人都能自己簽出有效的 token。
if (env.nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('正式環境必須設定 JWT_SECRET 環境變數');
}
