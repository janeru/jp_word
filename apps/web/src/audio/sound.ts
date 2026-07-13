// 8-bit 復古風格音效引擎:用 Web Audio API 即時合成,無外部音檔、零版權疑慮。
//
// 注意:此處「不使用」任天堂《超級瑪莉兄弟》的實際樂曲(有版權),
// 而是原創的晶片音樂(chiptune)風格旋律,聽感神似復古平台遊戲。

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

/** BGM 世代編號:每次停止就 +1,讓排在後面的循環自動中止 */
let bgmGen = 0;
let bgmTimer = 0;
/** 目前正在發聲的「背景音樂」振盪器(停止 BGM 時一次關閉;一次性音效不列入,才能自然播完) */
const bgmOsc = new Set<OscillatorNode>();

const BASE_VOLUME = 0.16;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : BASE_VOLUME;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** 在使用者互動時呼叫,喚醒(resume)音訊上下文,符合瀏覽器自動播放政策 */
export function initAudioOnGesture(): void {
  try {
    const c = getCtx();
    if (c.state === 'suspended') void c.resume();
  } catch {
    // 忽略:某些環境不支援 Web Audio
  }
}

export function isMuted(): boolean {
  return muted;
}

export function loadMuted(): boolean {
  muted = localStorage.getItem('jp-word-muted') === '1';
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  localStorage.setItem('jp-word-muted', m ? '1' : '0');
  if (master) master.gain.value = m ? 0 : BASE_VOLUME;
  if (m) stopBgm();
}

/** MIDI 音高轉頻率 */
function midiToFreq(m: number): number {
  return 440 * 2 ** ((m - 69) / 12);
}

/** 排一個音:在 start 時刻以 type 波形發出 freq,持續 dur 秒。trackBgm 為 true 時列入 BGM 可被 stopBgm 中止 */
function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  vol: number,
  trackBgm = false,
): void {
  const c = getCtx();
  if (!master) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // 簡單的音量包絡,避免爆音
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.008);
  g.gain.linearRampToValueAtTime(0.0001, start + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.03);
  if (trackBgm) {
    bgmOsc.add(osc);
    osc.onended = () => bgmOsc.delete(osc);
  }
}

// ---- 原創輕快循環旋律(C 大調)----
const BEAT = 0.15;
// 主旋律(MIDI 音高),每個 1 拍
const LEAD_MIDI = [72, 76, 79, 76, 77, 74, 72, 74, 76, 72, 74, 71, 72, 74, 76, 79];
// 低音(每個 2 拍)
const BASS_MIDI = [48, 48, 53, 53, 50, 50, 43, 43];

function scheduleBgmOnce(startAt: number): number {
  let t = startAt;
  for (const m of LEAD_MIDI) {
    tone(midiToFreq(m), t, BEAT * 0.9, 'square', 0.55, true);
    t += BEAT;
  }
  const leadEnd = t;

  t = startAt;
  for (const m of BASS_MIDI) {
    tone(midiToFreq(m), t, BEAT * 2 * 0.95, 'triangle', 0.8, true);
    t += BEAT * 2;
  }
  return leadEnd;
}

/** 開始播放循環背景音樂 */
export function startBgm(): void {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
  stopBgm();
  const gen = ++bgmGen;
  const loop = () => {
    if (gen !== bgmGen) return;
    const end = scheduleBgmOnce(c.currentTime + 0.06);
    const ms = (end - c.currentTime) * 1000;
    bgmTimer = window.setTimeout(loop, Math.max(50, ms - 50));
  };
  loop();
}

/** 停止背景音樂(並關掉正在響的音) */
export function stopBgm(): void {
  bgmGen++;
  window.clearTimeout(bgmTimer);
  bgmOsc.forEach((o) => {
    try {
      o.stop();
    } catch {
      // 已停止的忽略
    }
  });
  bgmOsc.clear();
}

/** 播放一段音符序列 [MIDI, 秒] */
function playSeq(seq: [number, number][], type: OscillatorType, withBass = false): void {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
  let t = c.currentTime + 0.03;
  for (const [m, d] of seq) {
    tone(midiToFreq(m), t, d, type, 0.7);
    if (withBass) tone(midiToFreq(m - 12), t, d, 'triangle', 0.5);
    t += d;
  }
}

/** 失敗音樂:下行的「嗯~嗯~嗯~↓」 */
export function playFail(): void {
  stopBgm();
  playSeq(
    [
      [69, 0.16],
      [68, 0.16],
      [67, 0.16],
      [66, 0.34],
      [59, 0.55],
    ],
    'square',
    true,
  );
}

/** 過關音樂:上行小號角 */
export function playClear(): void {
  stopBgm();
  playSeq(
    [
      [72, 0.12],
      [76, 0.12],
      [79, 0.12],
      [84, 0.12],
      [79, 0.12],
      [84, 0.42],
    ],
    'square',
    true,
  );
}

/** 配對成功的小音效 */
export function playCorrect(): void {
  playSeq(
    [
      [84, 0.06],
      [89, 0.09],
    ],
    'square',
  );
}

/** 危險提示:泡泡快落地時的低沉雙拍「心跳」 */
export function playAlert(): void {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime + 0.02;
  tone(midiToFreq(45), t, 0.09, 'triangle', 0.7);
  tone(midiToFreq(45), t + 0.15, 0.09, 'triangle', 0.7);
}

/** 點錯的小音效 */
export function playWrong(): void {
  playSeq(
    [
      [55, 0.1],
      [52, 0.12],
    ],
    'square',
  );
}
