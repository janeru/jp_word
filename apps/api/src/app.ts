import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import cors from 'cors';
import { env } from './env.js';
import type { Container } from './container.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler } from './http/errorHandler.js';

/**
 * 建立 Express 應用程式(不含 listen)。
 * 把中介層、路由、錯誤處理組裝起來,方便測試時直接取用 app。
 */
export function createApp(container: Container): Express {
  const app = express();

  app.use(cors({ origin: env.webOrigin }));
  app.use(express.json());

  app.use('/api', createApiRouter(container));

  // 正式環境:由後端一併托管前端 build 產物(同源,免 CORS)
  if (env.nodeEnv === 'production') {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const webDist = process.env.WEB_DIST ?? path.resolve(here, '../../web/dist');
    app.use(express.static(webDist));
    // SPA fallback:非 /api 的 GET 一律回 index.html(Express 5 用中介層,不用 '*')
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  // 錯誤處理中介層一定掛在所有路由之後
  app.use(errorHandler);

  return app;
}
