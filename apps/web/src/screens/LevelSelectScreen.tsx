import { useState } from 'react';
import type { Category, CategoryGroup } from '@jp-word/shared';
import type { GameMode } from '../App.tsx';
import { StarRating } from '../components/StarRating.tsx';
import { SoundToggle } from '../components/SoundToggle.tsx';
import { getAllRecords, getPlayerName, isUnlocked, setPlayerName } from '../progress/storage.ts';

interface Props {
  categories: Category[];
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  onSelect: (category: Category) => void;
  onOpenLeaderboard: () => void;
}

const GROUP_LABEL: Record<CategoryGroup, string> = {
  basic: '基礎單字',
  travel: '旅遊實用',
};

/** 關卡選擇畫面:依群組列出所有關卡,顯示解鎖狀態與最佳成績 */
export function LevelSelectScreen({
  categories,
  mode,
  onModeChange,
  onSelect,
  onOpenLeaderboard,
}: Props) {
  const orderedSlugs = categories.map((c) => c.slug);
  const records = getAllRecords();
  const groups: CategoryGroup[] = ['basic', 'travel'];
  const [name, setName] = useState(getPlayerName());

  const handleNameChange = (value: string) => {
    setName(value);
    setPlayerName(value);
  };

  return (
    <div className="screen">
      <header className="app-header">
        <div className="header-row">
          <h1>🎯 日文單字射擊遊戲</h1>
          <div className="header-controls">
            <label className="name-field">
              暱稱
              <input
                value={name}
                maxLength={20}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="玩家"
              />
            </label>
            <button type="button" className="btn-secondary" onClick={onOpenLeaderboard}>
              🏆 排行榜
            </button>
            <SoundToggle />
          </div>
        </div>
        <p className="subtitle">選擇一個關卡開始,過關才能解鎖下一關。</p>

        <div className="mode-switch">
          <button
            type="button"
            className={`mode-btn ${mode === 'bubble' ? 'active' : ''}`}
            onClick={() => onModeChange('bubble')}
          >
            🫧 泡泡挑戰
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'speak' ? 'active' : ''}`}
            onClick={() => onModeChange('speak')}
          >
            🎤 口說挑戰
          </button>
        </div>
        <p className="mode-desc">
          {mode === 'bubble'
            ? '看中文,點出對應的日文泡泡,趕在落地前配對完!'
            : '看中文,用日文念出來,語音辨識過關(需麥克風,建議 Chrome/Safari)。'}
        </p>
      </header>

      {groups.map((group) => {
        const inGroup = categories.filter((c) => c.group === group);
        if (inGroup.length === 0) return null;
        return (
          <section key={group} className="level-group">
            <h2 className="group-title">{GROUP_LABEL[group]}</h2>
            <div className="level-grid">
              {inGroup.map((cat) => {
                const globalIndex = orderedSlugs.indexOf(cat.slug);
                const unlocked = isUnlocked(orderedSlugs, cat.slug);
                const record = records[cat.slug];
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    className={`level-card ${unlocked ? '' : 'locked'} ${
                      record?.cleared ? 'cleared' : ''
                    }`}
                    disabled={!unlocked}
                    onClick={() => onSelect(cat)}
                  >
                    <span className="level-no">關卡 {globalIndex + 1}</span>
                    <span className="level-name-ja">{cat.nameJa}</span>
                    <span className="level-name-zh">{cat.nameZh}</span>
                    {unlocked ? (
                      record?.cleared ? (
                        <>
                          <StarRating full={record.bestStars} size={18} />
                          <span className="level-best">最佳 {record.bestScore} 分</span>
                        </>
                      ) : (
                        <span className="level-hint">尚未挑戰</span>
                      )
                    ) : (
                      <span className="level-lock">🔒 未解鎖</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
