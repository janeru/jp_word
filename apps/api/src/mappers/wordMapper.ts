import type { Word } from '@jp-word/shared';
import type { WordEntity } from '../entities/Word.js';

/** WordEntity → 對外 DTO */
export function toWordDto(entity: WordEntity): Word {
  return {
    id: entity.id,
    kana: entity.kana,
    kanji: entity.kanji,
    romaji: entity.romaji,
    meaning: entity.meaning,
    level: entity.level,
    wordType: entity.wordType,
    categorySlugs: (entity.categories ?? []).map((c) => c.slug),
  };
}
