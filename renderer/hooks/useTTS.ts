// ============================================================
// useTTS — Web Speech API 기반 원고 낭독 훅
// ============================================================
// 작가가 자기 문장을 "듣고" 부자연스러운 문장을 즉시 발견할 수 있도록
// 브라우저 내장 TTS API를 활용. 외부 의존성 0.

import { useState, useCallback, useRef, useEffect } from 'react';

export interface TTSState {
  /** 현재 TTS 재생 중 여부 */
  isSpeaking: boolean;
  /** 일시정지 중 여부 */
  isPaused: boolean;
  /** TTS API 지원 여부 */
  isSupported: boolean;
  /** 사용 가능한 음성 목록 */
  voices: SpeechSynthesisVoice[];
  /** 현재 진행률 (0–1) */
  progress: number;
}

export interface TTSControls {
  /** 텍스트 낭독 시작 */
  speak: (text: string, options?: TTSOptions) => void;
  /** 일시정지 */
  pause: () => void;
  /** 재개 */
  resume: () => void;
  /** 정지 */
  stop: () => void;
  /** 음성 변경 */
  setVoice: (voice: SpeechSynthesisVoice) => void;
  /** 속도 변경 (0.5–2.0) */
  setRate: (rate: number) => void;
  /** 피치 변경 (0.5–2.0) */
  setPitch: (pitch: number) => void;
}

export interface TTSOptions {
  /** 낭독 속도 (0.5–2.0, 기본 1.0) */
  rate?: number;
  /** 음높이 (0.5–2.0, 기본 1.0) */
  pitch?: number;
  /** 음성 이름 (lang 매칭으로 자동 선택) */
  voiceName?: string;
  /** 언어 코드 (예: 'ko-KR', 'en-US') */
  lang?: string;
}

/**
 * Web Speech API TTS 훅.
 * 
 * @example
 * ```tsx
 * const { state, controls } = useTTS();
 * controls.speak('안녕하세요, 이 문장을 읽어드립니다.');
 * ```
 */
export function useTTS(): { state: TTSState; controls: TTSControls } {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [progress, setProgress] = useState(0);

  const selectedVoice = useRef<SpeechSynthesisVoice | null>(null);
  const rateRef = useRef(1.0);
  const pitchRef = useRef(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 음성 목록 로드
  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [isSupported]);

  // 길이 긴 텍스트를 청크로 분할 (브라우저 내장 TTS는 긴 텍스트 끊김 방지)
  const splitIntoChunks = useCallback((text: string, maxLen = 200): string[] => {
    const sentences = text.split(/(?<=[.!?。！？\n])\s*/);
    const chunks: string[] = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + sentence).length > maxLen && current.length > 0) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }, []);

  const speak = useCallback((text: string, options?: TTSOptions) => {
    if (!isSupported || !text.trim()) return;

    // 기존 재생 중지
    speechSynthesis.cancel();

    const chunks = splitIntoChunks(text);
    let currentIndex = 0;

    const speakChunk = (index: number) => {
      if (index >= chunks.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        setProgress(1);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utteranceRef.current = utterance;

      // 음성 선택
      const targetLang = options?.lang || 'ko-KR';
      if (options?.voiceName) {
        const found = voices.find(v => v.name === options.voiceName);
        if (found) utterance.voice = found;
      } else if (selectedVoice.current) {
        utterance.voice = selectedVoice.current;
      } else {
        // 한국어 우선 자동 선택
        const koreanVoice = voices.find(v => v.lang.startsWith('ko'));
        const fallback = voices.find(v => v.lang.startsWith(targetLang.slice(0, 2)));
        if (koreanVoice) utterance.voice = koreanVoice;
        else if (fallback) utterance.voice = fallback;
      }

      utterance.rate = options?.rate ?? rateRef.current;
      utterance.pitch = options?.pitch ?? pitchRef.current;
      utterance.lang = targetLang;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        currentIndex++;
        setProgress(currentIndex / chunks.length);
        speakChunk(currentIndex);
      };

      utterance.onerror = (e) => {
        // 'interrupted'는 사용자가 stop() 호출 시 발생 — 정상 동작
        if (e.error !== 'interrupted') {
          console.warn('[TTS] Speech error:', e.error);
        }
        setIsSpeaking(false);
        setIsPaused(false);
      };

      speechSynthesis.speak(utterance);
    };

    setProgress(0);
    speakChunk(0);
  }, [isSupported, voices, splitIntoChunks]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.pause();
    setIsPaused(true);
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.resume();
    setIsPaused(false);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setProgress(0);
  }, [isSupported]);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    selectedVoice.current = voice;
  }, []);

  const setRate = useCallback((rate: number) => {
    rateRef.current = Math.max(0.5, Math.min(2.0, rate));
  }, []);

  const setPitch = useCallback((pitch: number) => {
    pitchRef.current = Math.max(0.5, Math.min(2.0, pitch));
  }, []);

  return {
    state: { isSpeaking, isPaused, isSupported, voices, progress },
    controls: { speak, pause, resume, stop, setVoice, setRate, setPitch },
  };
}
