"use client";

// ============================================================
// ScenePlayer — 3단계 프리뷰 시스템
// ============================================================
// Step 1: 편집 모드 → SceneTimeline (별도 컴포넌트)
// Step 2: 음성 확인 → 어둠 + 음성 + 환경음 + 효과음
// Step 3: 시각 미리보기 → 캐릭터 + 배경 + 음성 + 연출

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Maximize2, Minimize2, BarChart3, X, ChevronLeft, 
  Headphones, 
} from "lucide-react";
import type { ParsedScene, VoiceMapping, ParticleType, TTSController } from "@/engine/scene-parser";
import { createTTSController } from "@/engine/scene-parser";
import { createAudioEngine, detectAmbient, detectSFX } from "@/engine/scene-audio";
import type { AudioEngine } from "@/engine/scene-audio";
import type { AppLanguage } from "@/lib/studio-types";
import { logger } from "@/lib/logger";
import { getMoodFilter, getMoodGradient } from "@/components/studio/ScenePlayer.visuals";
import { ProgressFill } from "@/components/studio/ProgressFill";
import {
  CharacterLayer,
  DialogueBox,
  ParticleLayer,
  disposeScene,
  useDebouncedSceneIndex,
  useMemoryMonitor,
} from "@/components/studio/ScenePlayer.parts";

// ============================================================
// PART 1 — Props & State Types
// ============================================================

/** 프리뷰 모드: radio(음성 확인) | visual(시각 미리보기) */
export type PreviewMode = 'radio' | 'visual';

interface ScenePlayerProps {
  scenes: ParsedScene[];
  voiceMappings: VoiceMapping[];
  language: AppLanguage;
  mode?: PreviewMode;           // 기본: 'visual'
  onClose?: () => void;
  showMetrics?: boolean;        // 텐션/EOS 오버레이
  autoPlay?: boolean;
  backgroundUrls?: Map<string, string>; // sceneId → image URL
  characterImages?: Map<string, Map<string, string>>; // name → emotion → url
}

interface PlaybackState {
  sceneIndex: number;
  beatIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;            // 0.5 | 0.75 | 1 | 1.5 | 2
  voiceEnabled: boolean;
  fullscreen: boolean;
  showOverlay: boolean;     // 메트릭 오버레이
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ScenePlayerProps,PlaybackState

// ============================================================
// PART 7 — 메인 플레이어
// ============================================================

export default function ScenePlayer({
  scenes,
  voiceMappings,
  language,
  mode = 'visual',
  onClose,
  showMetrics = false,
  autoPlay = false,
  backgroundUrls,
  characterImages,
}: ScenePlayerProps) {
  const isRadio = mode === 'radio';
  const [state, setState] = useState<PlaybackState>({
    sceneIndex: 0,
    beatIndex: 0,
    isPlaying: autoPlay,
    isPaused: false,
    speed: 1,
    voiceEnabled: true,
    fullscreen: false,
    showOverlay: showMetrics,
  });

  const [sceneTransition, setSceneTransition] = useState<'none' | 'fade-out' | 'fade-in'>('none');

  const ttsRef = useRef<TTSController | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const prevSceneIndexRef = useRef<number>(state.sceneIndex);

  // Debounce rapid scene switching (user clicking fast)
  const debouncedSceneIndex = useDebouncedSceneIndex(state.sceneIndex);

  // P0#1 fix: 선언을 useEffect 위로 이동 (TDZ 방지)
  const currentScene = scenes[debouncedSceneIndex];
  const currentBeat = currentScene?.beats[state.beatIndex];

  const totalBeats = useMemo(() => scenes.reduce((s, sc) => s + sc.beats.length, 0), [scenes]);
  const currentGlobalBeat = useMemo(() => {
    let count = 0;
    for (let i = 0; i < state.sceneIndex; i++) count += scenes[i].beats.length;
    return count + state.beatIndex + 1;
  }, [scenes, state.sceneIndex, state.beatIndex]);

  // TTS + Audio 초기화 + 완전 정리
  useEffect(() => {
    ttsRef.current = createTTSController();
    audioRef.current = createAudioEngine();

    return () => {
      // Dispose all scene resources on unmount
      disposeScene(ttsRef, audioRef, autoPlayRef);

      // Fully dispose audio engine (closes AudioContext)
      audioRef.current?.dispose();
      audioRef.current = null;

      // Cancel any in-flight TTS abort controller
      ttsAbortRef.current?.abort();
      ttsAbortRef.current = null;

      // Null out TTS ref
      ttsRef.current = null;

      logger.debug("ScenePlayer", "Unmount cleanup complete");
    };
  }, []);

  // 장면 전환 시: 이전 리소스 정리 → 새 환경음 로드
  useEffect(() => {
    if (!currentScene || !audioRef.current) return;

    // Dispose previous scene resources BEFORE loading new ones
    if (prevSceneIndexRef.current !== debouncedSceneIndex) {
      disposeScene(ttsRef, audioRef, autoPlayRef);
      prevSceneIndexRef.current = debouncedSceneIndex;
      logger.debug("ScenePlayer", "Scene transition cleanup:", debouncedSceneIndex);
    }

    const ambient = detectAmbient(currentScene.mood, currentScene.timeOfDay);
    audioRef.current.playAmbient(ambient, isRadio ? 0.25 : 0.1);

    return () => {
      // Stop ambient when scene changes or unmounts
      audioRef.current?.stopAmbient();
    };
  }, [currentScene, isRadio, debouncedSceneIndex]);

  // 비트 전환 시 효과음
  useEffect(() => {
    if (!currentBeat || !audioRef.current) return;
    const sfxList = detectSFX(currentBeat.text);
    for (const sfx of sfxList) audioRef.current.playSFX(sfx);
  }, [currentBeat]);

  // P0#3 fix: voice null 가드 추가
  // TTS 재생 — AbortController로 비동기 취소
  useEffect(() => {
    if (!currentBeat || !state.voiceEnabled || !ttsRef.current) return;
    if (state.isPaused) return;

    // Cancel previous TTS operation
    ttsAbortRef.current?.abort();
    const abort = new AbortController();
    ttsAbortRef.current = abort;

    const voice = voiceMappings.find((v) => v.characterName === (currentBeat.speaker ?? "__narrator__"))
      ?? voiceMappings.find((v) => v.characterName === "__narrator__");

    if (!voice) return; // P0#3: voice가 없으면 무시

    // Guard: if aborted before speak starts, skip
    if (abort.signal.aborted) return;

    ttsRef.current.speak(currentBeat.text, voice, currentBeat.emotion).catch(() => {});

    return () => {
      // Cancel TTS when beat changes or component unmounts
      abort.abort();
      ttsRef.current?.stop();
    };
  }, [currentBeat, state.voiceEnabled, state.isPaused, voiceMappings]);

  // P0#2 + P1#10 fix: currentBeat + goNext 의존성 추가
  // 자동 재생
  const goNext = useCallback(() => {
    ttsRef.current?.stop();
    setState((prev) => {
      const scene = scenes[prev.sceneIndex];
      if (!scene) return prev;
      if (prev.beatIndex < scene.beats.length - 1) {
        return { ...prev, beatIndex: prev.beatIndex + 1 };
      }
      if (prev.sceneIndex < scenes.length - 1) {
        // 장면 전환: fade-out → 씬 변경 → fade-in
        setSceneTransition('fade-out');
        setTimeout(() => {
          setState(p => ({ ...p, sceneIndex: p.sceneIndex + 1, beatIndex: 0 }));
          setSceneTransition('fade-in');
          setTimeout(() => setSceneTransition('none'), 300);
        }, 300);
        return prev; // 즉시 상태 변경하지 않음
      }
      return { ...prev, isPlaying: false }; // 끝
    });
  }, [scenes]);

  useEffect(() => {
    if (!state.isPlaying || state.isPaused || !currentBeat) return;

    const duration = (currentBeat.text.length / 8) * 1000 / state.speed + 1500;
    autoPlayRef.current = setTimeout(() => goNext(), duration);
    return () => clearTimeout(autoPlayRef.current);
  }, [state.isPlaying, state.isPaused, state.sceneIndex, state.beatIndex, state.speed, currentBeat, goNext]);

  const goPrev = useCallback(() => {
    ttsRef.current?.stop();
    setState((prev) => {
      if (prev.beatIndex > 0) {
        return { ...prev, beatIndex: prev.beatIndex - 1 };
      }
      if (prev.sceneIndex > 0) {
        // 장면 전환: fade-out → 씬 변경 → fade-in
        setSceneTransition('fade-out');
        setTimeout(() => {
          setState(p => {
            const prevScene = scenes[p.sceneIndex - 1];
            return { ...p, sceneIndex: p.sceneIndex - 1, beatIndex: prevScene.beats.length - 1 };
          });
          setSceneTransition('fade-in');
          setTimeout(() => setSceneTransition('none'), 300);
        }, 300);
        return prev; // 즉시 상태 변경하지 않음
      }
      return prev;
    });
  }, [scenes]);

  const togglePlay = useCallback(() => {
    setState((prev) => {
      if (prev.isPaused) return { ...prev, isPaused: false };
      if (prev.isPlaying) return { ...prev, isPaused: true };
      return { ...prev, isPlaying: true, isPaused: false };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
    setState((p) => ({ ...p, fullscreen: !p.fullscreen }));
  }, []);

  // Sync fullscreen state with browser (user may press Esc to exit)
  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement;
      setState((p) => (p.fullscreen !== isFs ? { ...p, fullscreen: isFs } : p));
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Dev-mode memory monitoring
  const particlesForMonitor = currentScene?.mood
    ? (currentScene.mood === "rainy" ? "rain" : currentScene.mood === "snowy" ? "snow" : "none") as ParticleType
    : "none";
  useMemoryMonitor(audioRef, particlesForMonitor);

  const canPrev = state.sceneIndex > 0 || state.beatIndex > 0;
  const particles = currentScene?.mood
    ? (currentScene.mood === "rainy" ? "rain" : currentScene.mood === "snowy" ? "snow" : "none") as ParticleType
    : "none";

  // 장면 전환 페이드 효과 (hooks must be before any early return)
  // Use sceneIndex directly as key to avoid setState-in-effect
  const fadeKey = state.sceneIndex;

  // 키보드
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "Escape" && onClose) onClose();
      if (e.key === "p") togglePlay();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose, togglePlay]);

  if (!currentScene || !currentBeat) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-primary text-text-secondary">
        {scenes.length === 0 ? "파싱된 장면이 없습니다." : "재생 완료"}
      </div>
    );
  }

  const bgUrl = backgroundUrls?.get(currentScene.id);
  const bgGradient = getMoodGradient(currentScene.mood, currentScene.timeOfDay);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden select-none ${sceneTransition === 'fade-out' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} style={{ background: bgGradient }}>
      {/* 장면 전환 페이드 오버레이 */}
      <div key={fadeKey} className="absolute inset-0 bg-black pointer-events-none z-50 animate-[fadeOut_0.6s_ease-out_forwards]" />
      {/* ── 음성 확인 모드: 어둠 + 최소 비주얼 ── */}
      {isRadio && (
        <>
          <div className="absolute inset-0 bg-black" />
          {/* 중앙 파동 이펙트 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`rounded-full border border-accent-purple/20 scene-player-wave-sm ${state.isPlaying && !state.isPaused ? 'animate-ping' : ''}`} />
            <div className="absolute rounded-full border border-accent-purple/10 scene-player-wave-lg" />
            <Headphones className="absolute h-8 w-8 text-accent-purple/40" />
          </div>
          {/* 음성 확인 모드에서도 비트 텍스트 페이드인 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16">
            <p className={`text-center leading-loose transition-opacity duration-1000 max-w-xl ${
              currentBeat.type === 'dialogue' ? 'text-lg text-text-primary font-medium' :
              currentBeat.type === 'thought' ? 'text-base text-accent-purple/80 italic' :
              currentBeat.type === 'description' ? 'text-sm text-text-tertiary' :
              'text-base text-text-secondary'
            } opacity-80`}>
              {currentBeat.speaker && currentBeat.type === 'dialogue' && (
                <span className="block text-xs text-accent-green/60 font-mono mb-2">{currentBeat.speaker}</span>
              )}
              {currentBeat.text}
            </p>
          </div>
        </>
      )}

      {/* ── 시각 미리보기 모드: 풀 비주얼 ── */}
      {!isRadio && (
        <>
          {/* 배경 이미지 */}
          {bgUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{ backgroundImage: `url(${bgUrl})`, filter: getMoodFilter(currentScene.mood), opacity: 0.6 }}
            />
          )}

          {/* 파티클 */}
          <ParticleLayer type={particles} />
        </>
      )}

      {/* 비네팅 (양쪽 모드) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: isRadio ? "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)" : "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)" }} />

      {/* 장면 타이틀 (전환 시) */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono bg-bg-primary/40 backdrop-blur-sm rounded px-2 py-0.5 ${isRadio ? 'text-accent-purple' : 'text-text-tertiary'}`}>
            {isRadio ? '🎧' : '🎬'} {currentScene.title} {currentScene.timeOfDay ? `· ${currentScene.timeOfDay}` : ""}
          </span>
          <span className="text-[9px] text-text-tertiary">
            {currentGlobalBeat}/{totalBeats}
          </span>
        </div>

        {/* 컨트롤 */}
        <div className="flex items-center gap-1">
          <button onClick={() => setState((p) => ({ ...p, voiceEnabled: !p.voiceEnabled }))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="음성 토글">
            {state.voiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-text-secondary" /> : <VolumeX className="h-3.5 w-3.5 text-text-tertiary" />}
          </button>
          <button onClick={() => setState((p) => ({ ...p, showOverlay: !p.showOverlay }))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="메트릭 토글">
            <BarChart3 className="h-3.5 w-3.5 text-text-secondary" />
          </button>
          <select
            value={state.speed}
            onChange={(e) => setState((p) => ({ ...p, speed: Number(e.target.value) }))}
            className="bg-transparent text-[10px] text-text-tertiary border-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="전체화면">
            {state.fullscreen ? <Minimize2 className="h-3.5 w-3.5 text-text-secondary" /> : <Maximize2 className="h-3.5 w-3.5 text-text-secondary" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" aria-label="닫기">
              <X className="h-3.5 w-3.5 text-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* 재생 컨트롤 (하단 중앙) — 속도 + 장면/비트 정보 */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        {/* 속도 선택 */}
        <div className="flex items-center gap-0.5 bg-bg-primary/30 backdrop-blur-sm rounded-full px-1 py-0.5">
          {[0.5, 1, 1.5, 2].map(s => (
            <button
              key={s}
              onClick={() => setState(p => ({ ...p, speed: s }))}
              className={`px-2 py-1 rounded-full text-[9px] font-mono transition-colors ${
                state.speed === s ? 'bg-accent-purple/40 text-accent-purple' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <button onClick={goPrev} disabled={!canPrev} className="p-2 rounded-full bg-bg-primary/30 backdrop-blur-sm hover:bg-white/10 disabled:opacity-40 transition-colors" aria-label="이전 비트">
          <SkipBack className="h-4 w-4 text-text-secondary" />
        </button>
        <button onClick={togglePlay} className="p-3 rounded-full bg-accent-purple/30 backdrop-blur-sm hover:bg-accent-purple/50 transition-colors" aria-label={state.isPlaying && !state.isPaused ? "일시정지" : "재생"}>
          {state.isPlaying && !state.isPaused ? <Pause className="h-5 w-5 text-accent-purple" /> : <Play className="h-5 w-5 text-accent-purple" />}
        </button>
        <button onClick={goNext} className="p-2 rounded-full bg-bg-primary/30 backdrop-blur-sm hover:bg-white/10 transition-colors" aria-label="다음 비트">
          <SkipForward className="h-4 w-4 text-text-secondary" />
        </button>

        {/* 장면/비트 카운터 */}
        <span className="text-[9px] font-mono text-text-tertiary bg-bg-primary/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          {state.sceneIndex + 1}/{scenes.length} · {state.beatIndex + 1}/{currentScene.beats.length}
        </span>

        {/* 타이핑 속도 */}
        <div className="flex items-center gap-1 bg-bg-primary/30 backdrop-blur-sm rounded-full px-1 py-0.5">
          {[0.5, 1, 1.5, 2, 999].map((s) => (
            <button
              key={s}
              onClick={() => setState(p => ({ ...p, speed: s }))}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors ${state.speed === s ? 'bg-accent-purple/25 text-accent-purple' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              {s === 999 ? '즉시' : s === 0.5 ? '느림' : s === 1 ? '보통' : s === 1.5 ? '빠름' : '최고'}
            </button>
          ))}
        </div>
      </div>

      {!isRadio && <CharacterLayer beat={currentBeat} characterImages={characterImages} />}

      {/* 전체 진행률 */}
      <div className="absolute bottom-[140px] left-4 right-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary font-mono">{currentGlobalBeat}/{totalBeats}</span>
          <div className="flex-1 h-1 bg-bg-tertiary/50 rounded-full overflow-hidden">
            <ProgressFill value={currentGlobalBeat} max={totalBeats} className="h-full bg-accent-purple rounded-full transition-[transform,opacity,background-color,border-color,color] duration-300" />
          </div>
          <span className="text-[9px] text-text-tertiary font-mono">{Math.round((currentGlobalBeat / totalBeats) * 100)}%</span>
        </div>
      </div>

      {/* 대사창 (시각 미리보기 모드), 음성 확인은 중앙 텍스트로 대체 */}
      {!isRadio && <DialogueBox
        beat={currentBeat}
        speed={state.speed}
        onNext={goNext}
        onPrev={goPrev}
        canPrev={canPrev}
        showMetrics={state.showOverlay}
        tension={currentScene.tension}
        language={language}
      />}

      {/* 음성 확인 모드 하단: 간단한 다음 버튼 */}
      {isRadio && (
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-4">
          <button onClick={goPrev} disabled={!canPrev} className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors" aria-label="이전">
            <ChevronLeft className="h-5 w-5 text-text-secondary" />
          </button>
          <button onClick={goNext} className="px-6 py-2 bg-accent-purple/15 hover:bg-accent-purple/25 text-accent-purple rounded-full text-sm font-mono transition-colors">
            다음
          </button>
        </div>
      )}

      {/* 진행률 바 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-primary/30">
        <ProgressFill
          value={currentGlobalBeat}
          max={totalBeats}
          className="h-full bg-accent-purple/60 transition-[transform,opacity,background-color,border-color,color] duration-300"
        />
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-7 | role=main-player | inputs=ScenePlayerProps | outputs=scene-preview-UI
