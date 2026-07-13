import type { Category } from '@jp-word/shared';
import { NotFoundError } from '../errors/AppError.js';
import type { ICategoryRepository } from '../repositories/CategoryRepository.js';
import { toCategoryDto } from '../mappers/categoryMapper.js';

/** 分類相關業務邏輯 */
export class CategoryService {
  constructor(private readonly categories: ICategoryRepository) {}

  async listAll(): Promise<Category[]> {
    const entities = await this.categories.findAllOrdered();
    return entities.map(toCategoryDto);
  }

  async getBySlug(slug: string): Promise<Category> {
    const entity = await this.categories.findBySlug(slug);
    if (!entity) {
      throw new NotFoundError(`找不到分類:${slug}`);
    }
    return toCategoryDto(entity);
  }
}
