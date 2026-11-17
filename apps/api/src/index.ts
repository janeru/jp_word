import 'reflect-metadata';
import { env } from './env.js';
import { AppDataSource } from './data-source.js';
import { createContainer } from './container.js';
import { createApp } from './app.js';
import { CategoryEntity } from './entities/Category.js';
import { seedDatabase } from './seed.js';
import { seedAuth } from './seedAuth.js';
import { closeRedis, initRedis } from './redis/client.js';

/** 服務啟動流程:連 DB →(必要時灌種子)→ 組裝依賴 → 建立 app → 監聽 */
async function bootstrap() {
  await AppDataSource.initialize();
  console.log('✅ 資料庫連線成功');

  // 部署 Demo:若開啟 AUTO_SEED 且資料庫是空的,自動灌種子
  if (env.autoSeed) {
    const count = await AppDataSource.getRepository(CategoryEntity).count();
    if (count === 0) {
      console.log('🌱 資料庫是空的,開始自動灌種子…');
      const r = await seedDatabase(AppDataSource);
      console.log(`✅ 已建立 ${r.categories} 個分類、${r.words} 個單字`);
    }
  }

  // RBAC 基礎資料每次啟動都同步一次:
  // 這個動作是 idempotent 的,可確保 shared 裡新增的權限一定進得了資料庫,
  // 否則路由掛的 requirePermission 會找不到對應權限而永遠擋人。
  const authSeed = await seedAuth(AppDataSource);
  console.log(`🔐 已同步 ${authSeed.permissions} 個權限、${authSeed.roles} 個角色`);

  // Redis 是選用的加速層:沒設定 REDIS_URL 就不啟用,服務照常運作
  initRedis();

  const container = createContainer(AppDataSource);
  const app = createApp(container);

  const server = app.listen(env.port, () => {
    console.log(`🚀 後端服務啟動:http://localhost:${env.port}`);
  });

  // 優雅關閉:先停止收新請求,再關掉 Redis 與資料庫連線
  const shutdown = (signal: string) => {
    console.log(`\n收到 ${signal},正在關閉服務…`);
    server.close(() => {
      void Promise.allSettled([closeRedis(), AppDataSource.destroy()]).then(() => {
        console.log('👋 已關閉');
        process.exit(0);
      });
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ 服務啟動失敗:', err);
  process.exit(1);
});
