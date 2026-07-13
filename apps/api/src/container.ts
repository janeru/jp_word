import type { DataSource } from 'typeorm';
import { WordRepository } from './repositories/WordRepository.js';
import { CategoryRepository } from './repositories/CategoryRepository.js';
import { ScoreRepository } from './repositories/ScoreRepository.js';
import { WordService } from './services/WordService.js';
import { CategoryService } from './services/CategoryService.js';
import { ScoreService } from './services/ScoreService.js';
import { WordController } from './controllers/WordController.js';
import { CategoryController } from './controllers/CategoryController.js';
import { ScoreController } from './controllers/ScoreController.js';

/**
 * 依賴注入組合根(Composition Root)。
 * 在單一入口把 Repository → Service → Controller 串接起來,
 * 各層彼此只透過建構子接收依賴,方便替換與測試。
 */
export interface Container {
  wordController: WordController;
  categoryController: CategoryController;
  scoreController: ScoreController;
}

export function createContainer(dataSource: DataSource): Container {
  // Repository 層(資料存取)
  const wordRepository = new WordRepository(dataSource);
  const categoryRepository = new CategoryRepository(dataSource);
  const scoreRepository = new ScoreRepository(dataSource);

  // Service 層(業務邏輯)
  const wordService = new WordService(wordRepository);
  const categoryService = new CategoryService(categoryRepository);
  const scoreService = new ScoreService(scoreRepository);

  // Controller 層(HTTP)
  return {
    wordController: new WordController(wordService),
    categoryController: new CategoryController(categoryService),
    scoreController: new ScoreController(scoreService),
  };
}
