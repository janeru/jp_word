import 'reflect-metadata';
import { env } from './env.js';
import { AppDataSource } from './data-source.js';
import { createContainer } from './container.js';
import { createApp } from './app.js';
import { CategoryEntity } from './entities/Category.js';
import { seedDatabase } from './seed.js';

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

  const container = createContainer(AppDataSource);
  const app = createApp(container);

  app.listen(env.port, () => {
    console.log(`🚀 後端服務啟動:http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('❌ 服務啟動失敗:', err);
  process.exit(1);
});
