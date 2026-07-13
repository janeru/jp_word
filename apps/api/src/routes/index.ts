import { Router } from 'express';
import type { Container } from '../container.js';
import { sendOk } from '../http/apiResponse.js';
import { createWordsRouter } from './words.js';
import { createCategoriesRouter } from './categories.js';
import { createScoresRouter } from './scores.js';

/** 組裝 /api 底下所有路由 */
export function createApiRouter(container: Container): Router {
  const router = Router();

  router.get('/health', (_req, res) => sendOk(res, 'pong'));
  router.use('/words', createWordsRouter(container.wordController));
  router.use('/categories', createCategoriesRouter(container.categoryController));
  router.use('/scores', createScoresRouter(container.scoreController));

  return router;
}
