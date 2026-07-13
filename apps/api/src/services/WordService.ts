import type { JlptLevel, Word } from '@jp-word/shared';
import { JLPT_LEVELS } from '@jp-word/shared';
import { ValidationError } from '../errors/AppError.js';
import type { IWordRepository } from '../repositories/WordRepository.js';
import { toWordDto } from '../mappers/wordMapper.js';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

/** 取得單字的查詢參數(來自 HTTP query,尚未驗證) */
export interface ListWordsInput {
  level?: string;
  category?: string;
  limit?: string;
}

/** 單字相關業務邏輯 */
export class WordService {
  constructor(private readonly words: IWordRepository) {}

  async list(input: ListWordsInput): Promise<Word[]> {
    const level = this.parseLevel(input.level);
    const limit = this.parseLimit(input.limit);

    const entities = await this.words.find({
      level,
      categorySlug: input.category,
      limit,
    });
    return entities.map(toWordDto);
  }

  private parseLevel(raw?: string): JlptLevel | undefined {
    if (!raw) return undefined;
    if (!JLPT_LEVELS.includes(raw as JlptLevel)) {
      throw new ValidationError('無效的 level 參數');
    }
    return raw as JlptLevel;
  }

  private parseLimit(raw?: string): number {
    const n = Number(raw ?? DEFAULT_LIMIT);
    if (Number.isNaN(n) || n <= 0) {
      throw new ValidationError('無效的 limit 參數');
    }
    return Math.min(n, MAX_LIMIT);
  }
}
