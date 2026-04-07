"use client";

// ============================================================
// TTSPlayerBar — 원고 낭독 플로팅 컨트롤 바
// ============================================================
// WritingTab 또는 ManuscriptView 하단에 표시되는 TTS 컨트롤러.
// 재생/일시정지/정지 + 속도조절 + 진행률 바.

import React, { useState, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Pause, Play, Square, ChevronDown } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

interface Props {
  /** 낭독할 텍스트 (에피소드 본문) */
  text: string;
  /** 한국어 여부 */
  isKO?: boolean;
  /** 닫기 */
  onClose?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function TTSPlayerBar({ text, isKO = true, onClose }: Props) {
  const { state, controls } = useTTS();
  const [speed, setSpeed] = useState(1.0);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);

  const handlePlay = useCallback(() => {
    if (state.isPaused) {
      controls.resume();
    } else if (state.isSpeaking) {
      controls.pause();
    } else {
      controls.setRate(speed);
      controls.speak(text, { lang: isKO ? 'ko-KR' : 'en-US', rate: speed });
    }
  }, [state.isPaused, state.isSpeaking, controls, text, isKO, speed]);

  const handleStop = useCallback(() => {
    controls.stop();
  }, [controls]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    controls.setRate(newSpeed);
    setShowSpeedPicker(false);
  }, [controls]);

  const progressPercent = useMemo(() => Math.round(state.progress * 100), [state.progress]);

  if (!state.isSupported) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-secondary/90 backdrop-blur-md border border-border rounded-xl shadow-lg">
      {/* TTS 아이콘 */}
      <div className="flex items-center gap-1.5">
        {state.isSpeaking ? (
          <Volume2 className="w-4 h-4 text-accent-purple animate-pulse" />
        ) : (
          <VolumeX className="w-4 h-4 text-text-tertiary" />
        )}
        <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
          {isKO ? '낭독' : 'TTS'}
        </span>
      </div>

      {/* 재생/일시정지 버튼 */}
      <button
        onClick={handlePlay}
        className="p-1.5 rounded-lg bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple transition-all active:scale-90"
        title={state.isSpeaking ? (state.isPaused ? (isKO ? '재개' : 'Resume') : (isKO ? '일시정지' : 'Pause')) : (isKO ? '재생' : 'Play')}
      >
        {state.isSpeaking && !state.isPaused ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
      </button>

      {/* 정지 버튼 */}
      <button
        onClick={handleStop}
        disabled={!state.isSpeaking}
        className="p-1.5 rounded-lg hover:bg-white/5 text-text-tertiary disabled:opacity-30 transition-all active:scale-90"
        title={isKO ? '정지' : 'Stop'}
      >
        <Square className="w-3.5 h-3.5" />
      </button>

      {/* 진행률 바 */}
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden min-w-[60px]">
        <div
          className="h-full bg-accent-purple/60 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-[9px] text-text-tertiary font-mono tabular-nums w-8 text-right">
        {progressPercent}%
      </span>

      {/* 속도 조절 */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedPicker(v => !v)}
          className="flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold text-text-secondary hover:bg-white/5 transition"
        >
          {speed}x
          <ChevronDown className="w-3 h-3" />
        </button>
        {showSpeedPicker && (
          <div className="absolute bottom-full mb-1 right-0 bg-bg-primary border border-border rounded-xl shadow-lg overflow-hidden z-20">
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`block w-full px-4 py-1.5 text-[10px] text-left hover:bg-white/5 transition ${
                  speed === s ? 'text-accent-purple font-bold' : 'text-text-secondary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 닫기 */}
      {onClose && (
        <button
          onClick={() => { controls.stop(); onClose(); }}
          className="p-1 rounded text-text-tertiary hover:text-white transition"
          title={isKO ? '닫기' : 'Close'}
        >
          ×
        </button>
      )}
    </div>
  );
}
