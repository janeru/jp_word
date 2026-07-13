import { useState } from 'react';
import { isMuted, setMuted } from '../audio/sound.ts';

/** 音效開關(🔊/🔇),狀態存 localStorage */
export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted());

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  return (
    <button
      type="button"
      className="sound-toggle"
      onClick={toggle}
      aria-label={muted ? '開啟音效' : '關閉音效'}
      title={muted ? '開啟音效' : '關閉音效'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
