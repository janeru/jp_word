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

/** 依關卡數量,算出一條「蛇形蜿蜒」路線上每一站的位置(百分比座標) */
function serpentinePoints(count: number): { x: number; y: number }[] {
  const cols = Math.min(4, count);
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const r = Math.floor(i / cols);
    const p = i % cols;
    const c = r % 2 === 0 ? p : cols - 1 - p; // 奇數列反向 → 蛇形
    const x = cols === 1 ? 50 : 12 + c * (76 / (cols - 1));
    const y = rows === 1 ? 50 : 14 + r * (72 / (rows - 1));
    return { x, y };
  });
}

/** 關卡選擇畫面:依群組列出所有關卡,顯示解鎖狀態與最佳成績 */
export function LevelSelectScreen({
  categories,
  mode,
  onModeChange,
  onSelect,
  onOpenLeaderboard,
}: Props) {
  const records = getAllRecords();
  const groups: CategoryGroup[] = ['basic', 'travel'];
  const [name, setName] = useState(getPlayerName());
  const [selectedWorld, setSelectedWorld] = useState<CategoryGroup>('basic');

  // WORLD 2 需破完 WORLD 1 全部關卡才解鎖
  const basicCats = categories.filter((c) => c.group === 'basic');
  const basicAllCleared =
    basicCats.length > 0 && basicCats.every((c) => records[c.slug]?.cleared);

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

      {/* 世界分頁:點擊切換,WORLD 2 需破完 WORLD 1 才解鎖 */}
      <div className="world-tabs">
        {groups.map((g, i) => {
          const locked = g === 'travel' && !basicAllCleared;
          return (
            <button
              key={g}
              type="button"
              className={`world-tab ${selectedWorld === g ? 'active' : ''} ${locked ? 'locked' : ''}`}
              disabled={locked}
              onClick={() => setSelectedWorld(g)}
            >
              {locked ? '🔒 ' : ''}
              WORLD {i + 1}・{GROUP_LABEL[g]}
            </button>
          );
        })}
      </div>
      {!basicAllCleared && (
        <p className="world-locked-hint">破完 WORLD 1 全部關卡即可解鎖 WORLD 2 🔓</p>
      )}

      {(() => {
        const inGroup = categories.filter((c) => c.group === selectedWorld);
        // 各世界內以自己的順序循序解鎖(第 1 關開放,過一關解鎖下一關)
        const groupSlugs = inGroup.map((c) => c.slug);
        const points = serpentinePoints(inGroup.length);
        const rows = Math.ceil(inGroup.length / Math.min(4, inGroup.length));
        return (
          <section className="world">
            <div className="world-map" style={{ minHeight: rows * 150 }}>
              {/* 蜿蜒的虛線小徑 */}
              <svg className="map-path" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} />
              </svg>

              {inGroup.map((cat, i) => {
                const unlocked = isUnlocked(groupSlugs, cat.slug);
                const record = records[cat.slug];
                const state = !unlocked ? 'locked' : record?.cleared ? 'cleared' : 'current';
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    className={`map-node ${state}`}
                    style={{ left: `${points[i].x}%`, top: `${points[i].y}%` }}
                    disabled={!unlocked}
                    onClick={() => onSelect(cat)}
                  >
                    <span className="node-medallion">{state === 'locked' ? '🔒' : i + 1}</span>
                    <span className="node-tag">
                      {cat.nameZh}
                      {state === 'cleared' && <StarRating full={record!.bestStars} size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
