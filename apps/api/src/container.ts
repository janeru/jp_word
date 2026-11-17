import type { DataSource } from 'typeorm';
import { WordRepository } from './repositories/WordRepository.js';
import { CategoryRepository } from './repositories/CategoryRepository.js';
import { ScoreRepository } from './repositories/ScoreRepository.js';
import { UserRepository } from './repositories/UserRepository.js';
import { RoleRepository } from './repositories/RoleRepository.js';
import { PermissionRepository } from './repositories/PermissionRepository.js';
import { WordService } from './services/WordService.js';
import { CategoryService } from './services/CategoryService.js';
import { ScoreService } from './services/ScoreService.js';
import { AuthService } from './services/AuthService.js';
import { RoleService } from './services/RoleService.js';
import { UserService } from './services/UserService.js';
import { WordController } from './controllers/WordController.js';
import { CategoryController } from './controllers/CategoryController.js';
import { ScoreController } from './controllers/ScoreController.js';
import { AuthController } from './controllers/AuthController.js';
import { RoleController } from './controllers/RoleController.js';
import { UserController } from './controllers/UserController.js';
import { createAuthMiddleware, type AuthMiddleware } from './http/authMiddleware.js';

/**
 * 依賴注入組合根(Composition Root)。
 * 在單一入口把 Repository → Service → Controller 串接起來,
 * 各層彼此只透過建構子接收依賴,方便替換與測試。
 */
export interface Container {
  wordController: WordController;
  categoryController: CategoryController;
  scoreController: ScoreController;
  authController: AuthController;
  roleController: RoleController;
  userController: UserController;
  /** 驗證身分與檢查權限的中介層,由路由掛載 */
  auth: AuthMiddleware;
}

export function createContainer(dataSource: DataSource): Container {
  // Repository 層(資料存取)
  const wordRepository = new WordRepository(dataSource);
  const categoryRepository = new CategoryRepository(dataSource);
  const scoreRepository = new ScoreRepository(dataSource);
  const userRepository = new UserRepository(dataSource);
  const roleRepository = new RoleRepository(dataSource);
  const permissionRepository = new PermissionRepository(dataSource);

  // Service 層(業務邏輯)
  const wordService = new WordService(wordRepository);
  const categoryService = new CategoryService(categoryRepository);
  const scoreService = new ScoreService(scoreRepository);
  const authService = new AuthService(userRepository, roleRepository);
  const roleService = new RoleService(roleRepository, permissionRepository, userRepository);
  const userService = new UserService(userRepository, roleRepository);

  // Controller 層(HTTP)
  return {
    wordController: new WordController(wordService),
    categoryController: new CategoryController(categoryService),
    scoreController: new ScoreController(scoreService),
    authController: new AuthController(authService),
    roleController: new RoleController(roleService),
    userController: new UserController(userService),
    // 中介層需要 AuthService 才能依 token 查出最新權限
    auth: createAuthMiddleware(authService),
  };
}
