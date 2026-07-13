import { useCallback, useEffect, useRef, useState } from 'react';

// 瀏覽器 SpeechRecognition 的最小型別(DOM lib 未內建,用最少定義)
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechResult {
  /** 最佳辨識文字 */
  transcript: string;
  /** 所有候選結果(供比對用) */
  alternatives: string[];
}

/** 語音辨識 hook(日文 ja-JP) */
export function useSpeechRecognition() {
  const supported = useRef<boolean>(!!getCtor()).current;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState<SpeechResult | null>(null);
  const [error, setError] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    // 收掉前一個
    recRef.current?.abort();

    const rec = new Ctor();
    rec.lang = 'ja-JP';
    rec.interimResults = true;
    rec.maxAlternatives = 6;
    rec.continuous = false;

    rec.onresult = (e) => {
      let interimText = '';
      const finals: string[] = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          for (let j = 0; j < r.length; j++) finals.push(r[j].transcript);
        } else {
          interimText += r[0].transcript;
        }
      }
      if (finals.length > 0) {
        setResult({ transcript: finals[0], alternatives: finals });
        setInterim('');
      } else {
        setInterim(interimText);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setError(e.error);
      setListening(false);
    };

    recRef.current = rec;
    setError('');
    setInterim('');
    setResult(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, interim, result, error, start, stop };
}
