import 'reflect-metadata';
import { pathToFileURL } from 'node:url';
import type { DataSource } from 'typeorm';
import type { CategoryGroup, WordType } from '@jp-word/shared';
import { AppDataSource } from './data-source.js';
import { WordEntity } from './entities/Word.js';
import { CategoryEntity } from './entities/Category.js';

// ─────────────────────────────────────────────────────────────
// 資料來源:worker360「JLPT N5 旅遊實用日語單字」
// N5 全部為 N5 等級。共 14 個分類(10 基礎 + 4 旅遊)、約 200 筆。
// 部分單字橫跨多個分類(如「水」在食物與餐廳),因此用多對多關聯,
// 單字只存一筆、掛在多個分類下(以 kanji||kana 為去重複的鍵)。
// ─────────────────────────────────────────────────────────────

interface SeedCategory {
  slug: string;
  nameJa: string;
  nameZh: string;
  group: CategoryGroup;
}

// 排序即陣列順序;基礎分類排在旅遊之前 → 共用單字的定義以基礎分類為準。
const CATEGORIES: SeedCategory[] = [
  { slug: 'numbers', nameJa: '数字', nameZh: '數字', group: 'basic' },
  { slug: 'time', nameJa: '時間', nameZh: '時間', group: 'basic' },
  { slug: 'daily-items', nameJa: '日用品', nameZh: '日常用品', group: 'basic' },
  { slug: 'location', nameJa: '場所・方向', nameZh: '地點方位', group: 'basic' },
  { slug: 'food', nameJa: '食べ物', nameZh: '食物', group: 'basic' },
  { slug: 'transport', nameJa: '乗り物', nameZh: '交通工具', group: 'basic' },
  { slug: 'clothing', nameJa: '衣類', nameZh: '服飾', group: 'basic' },
  { slug: 'adjectives', nameJa: '形容詞', nameZh: '形容詞', group: 'basic' },
  { slug: 'verbs', nameJa: '動詞', nameZh: '動詞', group: 'basic' },
  { slug: 'body', nameJa: '体', nameZh: '身體部位', group: 'basic' },
  { slug: 'restaurant', nameJa: 'レストラン', nameZh: '餐廳', group: 'travel' },
  { slug: 'shopping', nameJa: '買い物', nameZh: '購物', group: 'travel' },
  { slug: 'directions', nameJa: '交通・道案内', nameZh: '交通問路', group: 'travel' },
  { slug: 'hotel', nameJa: 'ホテル', nameZh: '飯店住宿', group: 'travel' },
];

interface SeedWord {
  kana: string;
  kanji: string | null;
  romaji: string;
  meaning: string;
  wordType: WordType;
}

// 各分類底下的單字。共用字重複列在多個分類即可,程式會自動去重複並合併分類。
const CATEGORY_WORDS: Record<string, SeedWord[]> = {
  numbers: [
    { kana: 'れい', kanji: '零', romaji: 'rei', meaning: '零', wordType: 'noun' },
    { kana: 'いち', kanji: '一', romaji: 'ichi', meaning: '一', wordType: 'noun' },
    { kana: 'に', kanji: '二', romaji: 'ni', meaning: '二', wordType: 'noun' },
    { kana: 'さん', kanji: '三', romaji: 'san', meaning: '三', wordType: 'noun' },
    { kana: 'よん', kanji: '四', romaji: 'yon', meaning: '四', wordType: 'noun' },
    { kana: 'ご', kanji: '五', romaji: 'go', meaning: '五', wordType: 'noun' },
    { kana: 'ろく', kanji: '六', romaji: 'roku', meaning: '六', wordType: 'noun' },
    { kana: 'なな', kanji: '七', romaji: 'nana', meaning: '七', wordType: 'noun' },
    { kana: 'はち', kanji: '八', romaji: 'hachi', meaning: '八', wordType: 'noun' },
    { kana: 'きゅう', kanji: '九', romaji: 'kyū', meaning: '九', wordType: 'noun' },
    { kana: 'じゅう', kanji: '十', romaji: 'jū', meaning: '十', wordType: 'noun' },
    { kana: 'ひゃく', kanji: '百', romaji: 'hyaku', meaning: '百', wordType: 'noun' },
    { kana: 'せん', kanji: '千', romaji: 'sen', meaning: '千', wordType: 'noun' },
  ],
  time: [
    { kana: 'あさ', kanji: '朝', romaji: 'asa', meaning: '早上', wordType: 'noun' },
    { kana: 'ごご', kanji: '午後', romaji: 'gogo', meaning: '下午', wordType: 'noun' },
    { kana: 'よる', kanji: '夜', romaji: 'yoru', meaning: '晚上/夜晚', wordType: 'noun' },
    { kana: 'きょう', kanji: '今日', romaji: 'kyō', meaning: '今天', wordType: 'noun' },
    { kana: 'きのう', kanji: '昨日', romaji: 'kinō', meaning: '昨天', wordType: 'noun' },
    { kana: 'あした', kanji: '明日', romaji: 'ashita', meaning: '明天', wordType: 'noun' },
    { kana: 'げつようび', kanji: '月曜日', romaji: 'getsuyōbi', meaning: '星期一', wordType: 'noun' },
    { kana: 'にちようび', kanji: '日曜日', romaji: 'nichiyōbi', meaning: '星期日', wordType: 'noun' },
    { kana: 'いちがつ', kanji: '一月', romaji: 'ichigatsu', meaning: '一月', wordType: 'noun' },
    { kana: 'じゅうにがつ', kanji: '十二月', romaji: 'jūnigatsu', meaning: '十二月', wordType: 'noun' },
    { kana: 'じかん', kanji: '時間', romaji: 'jikan', meaning: '時間(小時)', wordType: 'noun' },
    { kana: 'ふん', kanji: '分', romaji: 'fun', meaning: '分鐘', wordType: 'noun' },
  ],
  'daily-items': [
    { kana: 'ノート', kanji: null, romaji: 'nōto', meaning: '筆記本', wordType: 'noun' },
    { kana: 'えんぴつ', kanji: '鉛筆', romaji: 'enpitsu', meaning: '鉛筆', wordType: 'noun' },
    { kana: 'けしゴム', kanji: '消しゴム', romaji: 'keshigomu', meaning: '橡皮擦', wordType: 'noun' },
    { kana: 'かさ', kanji: '傘', romaji: 'kasa', meaning: '傘', wordType: 'noun' },
    { kana: 'おかね', kanji: 'お金', romaji: 'okane', meaning: '錢', wordType: 'noun' },
    { kana: 'しんぶん', kanji: '新聞', romaji: 'shinbun', meaning: '報紙', wordType: 'noun' },
    { kana: 'いす', kanji: '椅子', romaji: 'isu', meaning: '椅子', wordType: 'noun' },
    { kana: 'つくえ', kanji: '机', romaji: 'tsukue', meaning: '桌子', wordType: 'noun' },
    { kana: 'ほん', kanji: '本', romaji: 'hon', meaning: '書', wordType: 'noun' },
    { kana: 'かばん', kanji: '鞄', romaji: 'kaban', meaning: '包包', wordType: 'noun' },
    { kana: 'かぎ', kanji: '鍵', romaji: 'kagi', meaning: '鑰匙', wordType: 'noun' },
    { kana: 'テレビ', kanji: null, romaji: 'terebi', meaning: '電視', wordType: 'noun' },
  ],
  location: [
    { kana: 'うえ', kanji: '上', romaji: 'ue', meaning: '上面', wordType: 'noun' },
    { kana: 'した', kanji: '下', romaji: 'shita', meaning: '下面', wordType: 'noun' },
    { kana: 'ひだり', kanji: '左', romaji: 'hidari', meaning: '左邊', wordType: 'noun' },
    { kana: 'みぎ', kanji: '右', romaji: 'migi', meaning: '右邊', wordType: 'noun' },
    { kana: 'まえ', kanji: '前', romaji: 'mae', meaning: '前面', wordType: 'noun' },
    { kana: 'うしろ', kanji: '後ろ', romaji: 'ushiro', meaning: '後面', wordType: 'noun' },
    { kana: 'がっこう', kanji: '学校', romaji: 'gakkō', meaning: '學校', wordType: 'noun' },
    { kana: 'びょういん', kanji: '病院', romaji: 'byōin', meaning: '醫院', wordType: 'noun' },
    { kana: 'ぎんこう', kanji: '銀行', romaji: 'ginkō', meaning: '銀行', wordType: 'noun' },
    { kana: 'えき', kanji: '駅', romaji: 'eki', meaning: '車站', wordType: 'noun' },
    { kana: 'へや', kanji: '部屋', romaji: 'heya', meaning: '房間', wordType: 'noun' },
    { kana: 'トイレ', kanji: null, romaji: 'toire', meaning: '廁所', wordType: 'noun' },
  ],
  food: [
    { kana: 'ごはん', kanji: 'ご飯', romaji: 'gohan', meaning: '米飯/飯', wordType: 'noun' },
    { kana: 'みず', kanji: '水', romaji: 'mizu', meaning: '水', wordType: 'noun' },
    { kana: 'にく', kanji: '肉', romaji: 'niku', meaning: '肉', wordType: 'noun' },
    { kana: 'さかな', kanji: '魚', romaji: 'sakana', meaning: '魚', wordType: 'noun' },
    { kana: 'たまご', kanji: '卵', romaji: 'tamago', meaning: '雞蛋', wordType: 'noun' },
    { kana: 'やさい', kanji: '野菜', romaji: 'yasai', meaning: '蔬菜', wordType: 'noun' },
    { kana: 'パン', kanji: null, romaji: 'pan', meaning: '麵包', wordType: 'noun' },
    { kana: 'スープ', kanji: null, romaji: 'sūpu', meaning: '湯', wordType: 'noun' },
    { kana: 'りんご', kanji: '林檎', romaji: 'ringo', meaning: '蘋果', wordType: 'noun' },
    { kana: 'みかん', kanji: '蜜柑', romaji: 'mikan', meaning: '橘子', wordType: 'noun' },
    { kana: 'コーヒー', kanji: null, romaji: 'kōhī', meaning: '咖啡', wordType: 'noun' },
  ],
  transport: [
    { kana: 'くるま', kanji: '車', romaji: 'kuruma', meaning: '車', wordType: 'noun' },
    { kana: 'じてんしゃ', kanji: '自転車', romaji: 'jitensha', meaning: '腳踏車', wordType: 'noun' },
    { kana: 'でんしゃ', kanji: '電車', romaji: 'densha', meaning: '電車', wordType: 'noun' },
    { kana: 'バス', kanji: null, romaji: 'basu', meaning: '巴士', wordType: 'noun' },
    { kana: 'タクシー', kanji: null, romaji: 'takushī', meaning: '計程車', wordType: 'noun' },
    { kana: 'ひこうき', kanji: '飛行機', romaji: 'hikōki', meaning: '飛機', wordType: 'noun' },
    { kana: 'ふね', kanji: '船', romaji: 'fune', meaning: '船', wordType: 'noun' },
    { kana: 'ちかてつ', kanji: '地下鉄', romaji: 'chikatetsu', meaning: '地鐵', wordType: 'noun' },
    { kana: 'きっぷ', kanji: '切符', romaji: 'kippu', meaning: '票', wordType: 'noun' },
  ],
  clothing: [
    { kana: 'ふく', kanji: '服', romaji: 'fuku', meaning: '衣服', wordType: 'noun' },
    { kana: 'ぼうし', kanji: '帽子', romaji: 'bōshi', meaning: '帽子', wordType: 'noun' },
    { kana: 'くつ', kanji: '靴', romaji: 'kutsu', meaning: '鞋子', wordType: 'noun' },
    { kana: 'くつした', kanji: '靴下', romaji: 'kutsushita', meaning: '襪子', wordType: 'noun' },
    { kana: 'Tシャツ', kanji: null, romaji: 'T-shatsu', meaning: 'T恤', wordType: 'noun' },
    { kana: 'ズボン', kanji: null, romaji: 'zubon', meaning: '褲子', wordType: 'noun' },
    { kana: 'スカート', kanji: null, romaji: 'sukāto', meaning: '裙子', wordType: 'noun' },
    { kana: 'めがね', kanji: '眼鏡', romaji: 'megane', meaning: '眼鏡', wordType: 'noun' },
    { kana: 'てぶくろ', kanji: '手袋', romaji: 'tebukuro', meaning: '手套', wordType: 'noun' },
  ],
  adjectives: [
    { kana: 'おいしい', kanji: '美味しい', romaji: 'oishii', meaning: '好吃的', wordType: 'i-adjective' },
    { kana: 'たかい', kanji: '高い', romaji: 'takai', meaning: '貴的/高的', wordType: 'i-adjective' },
    { kana: 'やすい', kanji: '安い', romaji: 'yasui', meaning: '便宜的', wordType: 'i-adjective' },
    { kana: 'あつい', kanji: '暑い', romaji: 'atsui', meaning: '熱的', wordType: 'i-adjective' },
    { kana: 'さむい', kanji: '寒い', romaji: 'samui', meaning: '冷的(天氣)', wordType: 'i-adjective' },
    { kana: 'いそがしい', kanji: '忙しい', romaji: 'isogashī', meaning: '忙碌的', wordType: 'i-adjective' },
    { kana: 'きれい', kanji: '綺麗', romaji: 'kirei', meaning: '漂亮的/乾淨的', wordType: 'na-adjective' },
    { kana: 'かんたん', kanji: '簡単', romaji: 'kantan', meaning: '簡單的', wordType: 'na-adjective' },
    { kana: 'おもしろい', kanji: '面白い', romaji: 'omoshiroi', meaning: '有趣的', wordType: 'i-adjective' },
    { kana: 'いい', kanji: '良い', romaji: 'ī', meaning: '好的', wordType: 'i-adjective' },
    { kana: 'おおきい', kanji: '大きい', romaji: 'ōkii', meaning: '大的', wordType: 'i-adjective' },
    { kana: 'ちいさい', kanji: '小さい', romaji: 'chīsai', meaning: '小的', wordType: 'i-adjective' },
  ],
  verbs: [
    { kana: 'いく', kanji: '行く', romaji: 'iku', meaning: '去', wordType: 'verb' },
    { kana: 'くる', kanji: '来る', romaji: 'kuru', meaning: '來', wordType: 'verb' },
    { kana: 'たべる', kanji: '食べる', romaji: 'taberu', meaning: '吃', wordType: 'verb' },
    { kana: 'のむ', kanji: '飲む', romaji: 'nomu', meaning: '喝', wordType: 'verb' },
    { kana: 'みる', kanji: '見る', romaji: 'miru', meaning: '看', wordType: 'verb' },
    { kana: 'きく', kanji: '聞く', romaji: 'kiku', meaning: '聽', wordType: 'verb' },
    { kana: 'かう', kanji: '買う', romaji: 'kau', meaning: '買', wordType: 'verb' },
    { kana: 'はなす', kanji: '話す', romaji: 'hanasu', meaning: '說話', wordType: 'verb' },
    { kana: 'よむ', kanji: '読む', romaji: 'yomu', meaning: '讀/看書', wordType: 'verb' },
    { kana: 'かく', kanji: '書く', romaji: 'kaku', meaning: '寫', wordType: 'verb' },
    { kana: 'ねる', kanji: '寝る', romaji: 'neru', meaning: '睡覺', wordType: 'verb' },
    { kana: 'おきる', kanji: '起きる', romaji: 'okiru', meaning: '起床', wordType: 'verb' },
  ],
  body: [
    { kana: 'かお', kanji: '顔', romaji: 'kao', meaning: '臉', wordType: 'noun' },
    { kana: 'め', kanji: '目', romaji: 'me', meaning: '眼睛', wordType: 'noun' },
    { kana: 'はな', kanji: '鼻', romaji: 'hana', meaning: '鼻子', wordType: 'noun' },
    { kana: 'くち', kanji: '口', romaji: 'kuchi', meaning: '嘴巴', wordType: 'noun' },
    { kana: 'みみ', kanji: '耳', romaji: 'mimi', meaning: '耳朵', wordType: 'noun' },
    { kana: 'あたま', kanji: '頭', romaji: 'atama', meaning: '頭', wordType: 'noun' },
    { kana: 'て', kanji: '手', romaji: 'te', meaning: '手', wordType: 'noun' },
    { kana: 'あし', kanji: '足', romaji: 'ashi', meaning: '腳', wordType: 'noun' },
    { kana: 'おなか', kanji: 'お腹', romaji: 'onaka', meaning: '肚子', wordType: 'noun' },
    { kana: 'は', kanji: '歯', romaji: 'ha', meaning: '牙齒', wordType: 'noun' },
  ],
  restaurant: [
    { kana: 'メニュー', kanji: null, romaji: 'menyū', meaning: '菜單', wordType: 'noun' },
    { kana: 'みず', kanji: '水', romaji: 'mizu', meaning: '水', wordType: 'noun' },
    { kana: 'おかいけい', kanji: 'お会計', romaji: 'okaikei', meaning: '結帳', wordType: 'noun' },
    { kana: 'おいしい', kanji: '美味しい', romaji: 'oishii', meaning: '好吃的', wordType: 'i-adjective' },
    { kana: 'ごちそうさま', kanji: 'ご馳走様', romaji: 'gochisōsama', meaning: '謝謝招待', wordType: 'phrase' },
    { kana: 'ちゅうもん', kanji: '注文', romaji: 'chūmon', meaning: '點餐', wordType: 'noun' },
    { kana: 'おすすめ', kanji: null, romaji: 'osusume', meaning: '推薦', wordType: 'noun' },
    { kana: 'きんえんせき', kanji: '禁煙席', romaji: "kin'enseki", meaning: '禁菸席', wordType: 'noun' },
    { kana: 'りょうしゅうしょ', kanji: '領収書', romaji: 'ryōshūsho', meaning: '收據/發票', wordType: 'noun' },
    { kana: 'ひとり／ふたり', kanji: '一人／二人', romaji: 'hitori/futari', meaning: '一位/兩位', wordType: 'phrase' },
  ],
  shopping: [
    { kana: 'いくら', kanji: null, romaji: 'ikura', meaning: '多少錢?', wordType: 'phrase' },
    { kana: 'わりびき', kanji: '割引', romaji: 'waribiki', meaning: '折扣', wordType: 'noun' },
    { kana: 'めんぜい', kanji: '免税', romaji: 'menzei', meaning: '免稅', wordType: 'noun' },
    { kana: 'しちゃく', kanji: '試着', romaji: 'shichaku', meaning: '試穿', wordType: 'noun' },
    { kana: 'これ', kanji: null, romaji: 'kore', meaning: '這個', wordType: 'other' },
    { kana: 'それ', kanji: null, romaji: 'sore', meaning: '那個', wordType: 'other' },
    { kana: 'ふくろ', kanji: '袋', romaji: 'fukuro', meaning: '塑膠袋', wordType: 'noun' },
    { kana: 'クレジットカード', kanji: null, romaji: 'kurejittokādo', meaning: '信用卡', wordType: 'noun' },
    { kana: 'くすり', kanji: '薬', romaji: 'kusuri', meaning: '藥品', wordType: 'noun' },
    { kana: 'てんいん', kanji: '店員', romaji: "ten'in", meaning: '店員', wordType: 'noun' },
  ],
  directions: [
    { kana: 'えき', kanji: '駅', romaji: 'eki', meaning: '車站', wordType: 'noun' },
    { kana: 'でんしゃ', kanji: '電車', romaji: 'densha', meaning: '電車', wordType: 'noun' },
    { kana: 'のりかえ', kanji: '乗り換え', romaji: 'norikae', meaning: '轉乘', wordType: 'noun' },
    { kana: 'ちず', kanji: '地図', romaji: 'chizu', meaning: '地圖', wordType: 'noun' },
    { kana: 'どこ', kanji: null, romaji: 'doko', meaning: '在哪裡?', wordType: 'phrase' },
    { kana: 'まっすぐ', kanji: '真っすぐ', romaji: 'massugu', meaning: '直走', wordType: 'other' },
    { kana: 'ひだり', kanji: '左', romaji: 'hidari', meaning: '左邊', wordType: 'noun' },
    { kana: 'みぎ', kanji: '右', romaji: 'migi', meaning: '右邊', wordType: 'noun' },
    { kana: 'きっぷ', kanji: '切符', romaji: 'kippu', meaning: '票', wordType: 'noun' },
    { kana: 'ちかく', kanji: '近く', romaji: 'chikaku', meaning: '附近', wordType: 'noun' },
  ],
  hotel: [
    { kana: 'よやく', kanji: '予約', romaji: 'yoyaku', meaning: '預約', wordType: 'noun' },
    { kana: 'へや', kanji: '部屋', romaji: 'heya', meaning: '房間', wordType: 'noun' },
    { kana: 'かぎ', kanji: '鍵', romaji: 'kagi', meaning: '鑰匙', wordType: 'noun' },
    { kana: 'チェックイン', kanji: null, romaji: 'chekkuin', meaning: '入住', wordType: 'noun' },
    { kana: 'チェックアウト', kanji: null, romaji: 'chekkuauto', meaning: '退房', wordType: 'noun' },
    { kana: 'にもつ', kanji: '荷物', romaji: 'nimotsu', meaning: '行李', wordType: 'noun' },
    { kana: 'ちょうしょく', kanji: '朝食', romaji: 'chōshoku', meaning: '早餐', wordType: 'noun' },
    { kana: 'きく', kanji: '聞く', romaji: 'kiku', meaning: '聽', wordType: 'verb' },
    { kana: 'ワイファイ', kanji: null, romaji: 'wai-fai', meaning: '網路/Wi-Fi', wordType: 'noun' },
    { kana: 'タオル', kanji: null, romaji: 'taoru', meaning: '毛巾', wordType: 'noun' },
  ],
};

/**
 * 把種子資料寫入指定的資料庫(假設 dataSource 已 initialize)。
 * 供 seed 腳本與「開機自動灌種子」共用。
 */
export async function seedDatabase(
  dataSource: DataSource,
): Promise<{ categories: number; words: number }> {
  // 清空既有資料(先清中介表再清主表,避免外鍵衝突)。
  await dataSource.query('DELETE FROM word_categories');
  await dataSource.query('DELETE FROM words');
  await dataSource.query('DELETE FROM categories');

  const categoryRepo = dataSource.getRepository(CategoryEntity);
  const wordRepo = dataSource.getRepository(WordEntity);

  // 1) 建立分類
  const categoryEntities = CATEGORIES.map((c, index) =>
    categoryRepo.create({
      slug: c.slug,
      nameJa: c.nameJa,
      nameZh: c.nameZh,
      group: c.group,
      sortOrder: index,
      level: 'N5',
    }),
  );
  await categoryRepo.save(categoryEntities);
  const bySlug = new Map(categoryEntities.map((c) => [c.slug, c]));

  // 2) 去重複合併單字:以 kanji||kana 為鍵,累積它出現過的分類
  const merged = new Map<string, { word: SeedWord; slugs: Set<string> }>();
  for (const cat of CATEGORIES) {
    for (const w of CATEGORY_WORDS[cat.slug] ?? []) {
      const key = w.kanji ?? w.kana;
      const existing = merged.get(key);
      if (existing) existing.slugs.add(cat.slug);
      else merged.set(key, { word: w, slugs: new Set([cat.slug]) });
    }
  }

  // 3) 建立單字並掛上分類(多對多)
  const wordEntities = [...merged.values()].map(({ word, slugs }) =>
    wordRepo.create({
      kana: word.kana,
      kanji: word.kanji,
      romaji: word.romaji,
      meaning: word.meaning,
      level: 'N5',
      wordType: word.wordType,
      categories: [...slugs].map((s) => bySlug.get(s)!),
    }),
  );
  await wordRepo.save(wordEntities);

  return { categories: categoryEntities.length, words: wordEntities.length };
}

// 直接以 `pnpm --filter api seed` 執行時:自行連線 → 灌資料 → 關閉連線
const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  (async () => {
    await AppDataSource.initialize();
    console.log('✅ 資料庫連線成功,開始 seed…');
    const r = await seedDatabase(AppDataSource);
    console.log(`✅ 已建立 ${r.categories} 個分類、${r.words} 個單字(去重複後)`);
    await AppDataSource.destroy();
  })().catch((err) => {
    console.error('❌ seed 失敗:', err);
    process.exit(1);
  });
}
