import type { Category } from '@jp-word/shared';
import type { CategoryEntity } from '../entities/Category.js';

/** CategoryEntity → 對外 DTO */
export function toCategoryDto(entity: CategoryEntity): Category {
  return {
    id: entity.id,
    slug: entity.slug,
    nameJa: entity.nameJa,
    nameZh: entity.nameZh,
    group: entity.group,
    sortOrder: entity.sortOrder,
    level: entity.level,
  };
}
