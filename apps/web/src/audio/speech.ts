// 日文發音:用瀏覽器內建的 SpeechSynthesis 唸出單字(ja-JP),免音檔、無版權。
import { isMuted } from './sound.ts';

let voices: SpeechSynthesisVoice[] = [];

function refreshVoices(): void {
  if ('speechSynthesis' in window) {
    voices = window.speechSynthesis.getVoices();
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

/** 唸出一段日文文字 */
export function speakJa(text: string): void {
  if (isMuted()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    // 取消前一句,避免連續作答時堆疊
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    const jaVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('ja'));
    if (jaVoice) u.voice = jaVoice;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch {
    // 不支援語音合成的環境就略過
  }
}
