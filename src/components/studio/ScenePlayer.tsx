"use client";

// ============================================================
// ScenePlayer — 3단계 프리뷰 시스템
// ============================================================
// Step 1: 편집 모드 → SceneTimeline (별도 컴포넌트)
// Step 2: 라디오 드라마 → 어둠 + 음성 + 환경음 + 효과음 (상상)
// Step 3: 비주얼 노벨 → 캐릭터 + 배경 + 음성 + 연출 (존재)

import { useState, useCallback, useEffect, useRef, useMemo, type MutableRefObject } from "react";
import {
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Maximize2, Minimize2, BarChart3, X, ChevronLeft, ChevronRight,
  Headphones, Film,
} from "lucide-react";
import type {
  ParsedScene, SceneBeat, VoiceMapping, ParticleType,
  TTSController, Emotion,
} from "@/engine/scene-parser";
import { createTTSController, adjustVoiceForEmotion } from "@/engine/scene-parser";
import { createAudioEngine, detectAmbient, detectSFX, getDominantEmotion } from "@/engine/scene-audio";
import type { AudioEngine } from "@/engine/scene-audio";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 1 — Props & State Types
// ============================================================

/** 프리뷰 모드: radio(라디오 드라마) | visual(비주얼 노벨) */
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
// PART 2 — 연출 이펙트 CSS
// ============================================================

function getMoodFilter(mood?: string): string {
  switch (mood) {
    case "dark": return "brightness(0.6) contrast(1.1)";
    case "bright": return "brightness(1.1) saturate(1.2)";
    case "rainy": return "brightness(0.7) saturate(0.8) hue-rotate(10deg)";
    case "snowy": return "brightness(1.15) saturate(0.6)";
    case "misty": return "brightness(0.85) contrast(0.85) blur(1px)";
    case "eerie": return "brightness(0.5) saturate(0.4) hue-rotate(20deg)";
    case "warm": return "brightness(1.05) saturate(1.1) sepia(0.15)";
    case "cold": return "brightness(0.9) saturate(0.7) hue-rotate(-10deg)";
    case "peaceful": return "brightness(1.05) saturate(1.1)";
    default: return "none";
  }
}

function getMoodGradient(mood?: string, timeOfDay?: string): string {
  if (timeOfDay === "밤" || timeOfDay === "night") return "linear-gradient(180deg, #0a0e1a 0%, #1a1f3a 50%, #0d1220 100%)";
  if (timeOfDay === "새벽" || timeOfDay === "dawn") return "linear-gradient(180deg, #1a1040 0%, #4a2060 30%, #d45050 70%, #f0a050 100%)";
  if (timeOfDay === "저녁" || timeOfDay === "evening" || timeOfDay === "해질녘" || timeOfDay === "dusk") return "linear-gradient(180deg, #2a1a3a 0%, #c04040 40%, #f09040 80%, #f0d080 100%)";
  switch (mood) {
    case "dark": return "linear-gradient(180deg, #0a0a14 0%, #1a1a28 100%)";
    case "eerie": return "linear-gradient(180deg, #0a1018 0%, #1a2030 100%)";
    case "peaceful": return "linear-gradient(180deg, #1a2a3a 0%, #2a4a5a 50%, #3a6a7a 100%)";
    default: return "linear-gradient(180deg, #0d1117 0%, #161b22 50%, #21262d 100%)";
  }
}

// IDENTITY_SEAL: PART-2 | role=effects | inputs=mood,timeOfDay | outputs=CSS-filters,gradients

// ============================================================
// PART 3 — 파티클 렌더러
// ============================================================

function ParticleLayer({ type }: { type: ParticleType }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || type === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const particles: { x: number; y: number; speed: number; size: number; opacity: number }[] = [];
    const count = type === "rain" ? 120 : type === "snow" ? 80 : type === "petals" ? 30 : 50;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 1 + Math.random() * 3,
        size: type === "rain" ? 1.5 : type === "snow" ? 2 + Math.random() * 2 : 3 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx!.globalAlpha = p.opacity;
        if (type === "rain") {
          ctx!.strokeStyle = "#8ab4f8";
          ctx!.lineWidth = p.size * 0.5;
          ctx!.beginPath();
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x - 1, p.y + 8);
          ctx!.stroke();
        } else if (type === "snow" || type === "petals") {
          ctx!.fillStyle = type === "snow" ? "#e0e8f0" : "#ffb0c0";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        } else if (type === "sparks") {
          ctx!.fillStyle = "#ffa040";
          ctx!.fillRect(p.x, p.y, p.size, p.size);
        } else {
          ctx!.fillStyle = "#a09080";
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx!.fill();
        }

        // 이동
        if (type === "rain") { p.y += p.speed * 4; p.x -= p.speed * 0.5; }
        else if (type === "snow") { p.y += p.speed * 0.8; p.x += Math.sin(p.y * 0.01) * 0.5; }
        else if (type === "petals") { p.y += p.speed * 0.5; p.x += Math.sin(p.y * 0.02) * 1.5; }
        else if (type === "sparks") { p.y -= p.speed * 2; p.x += (Math.random() - 0.5) * 2; p.opacity -= 0.005; }
        else { p.y += p.speed * 0.3; p.x += (Math.random() - 0.5) * 0.5; }

        if (p.y > H || p.y < 0 || p.opacity <= 0) { p.y = type === "sparks" ? H : 0; p.x = Math.random() * W; p.opacity = 0.3 + Math.random() * 0.5; }
      }
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [type]);

  if (type === "none") return null;
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

// IDENTITY_SEAL: PART-3 | role=particles | inputs=ParticleType | outputs=Canvas-animation

// ============================================================
// PART 4 — 타이핑 이펙트
// ============================================================

function TypingText({ text, speed = 40, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); onDoneRef.current?.(); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse text-accent-purple">▌</span>}
    </span>
  );
}

// IDENTITY_SEAL: PART-4 | role=typing-effect | inputs=text,speed | outputs=animated-text

// ============================================================
// PART 5 — 캐릭터 표시
// ============================================================

function getEmotionEmoji(emotion?: Emotion): string {
  if (!emotion) return "😐";
  const entries = Object.entries(emotion) as [keyof Emotion, number][];
  const dominant = entries.sort((a, b) => b[1] - a[1])[0];
  if (!dominant || dominant[1] < 0.2) return "😐"; // 평온
  switch (dominant[0]) {
    case "joy": return "😊";
    case "sadness": return "😢";
    case "anger": return "😠";
    case "fear": return dominant[1] > 0.7 ? "😱" : "😨"; // 공포 강도별
    case "surprise": return "😲";
  }
  // 복합 감정: 결의 = anger + joy, 혐오 = anger + sadness
  const anger = emotion.anger ?? 0;
  const joy = emotion.joy ?? 0;
  const sadness = emotion.sadness ?? 0;
  if (anger > 0.3 && joy > 0.3) return "😤"; // 결의
  if (anger > 0.3 && sadness > 0.3) return "😒"; // 혐오
  return "😐"; // 평온
}

function CharacterDisplay({ name, emotion, side }: { name: string; emotion?: Emotion; side: "left" | "right" }) {
  return (
    <div className={`absolute bottom-32 ${side === "left" ? "left-8" : "right-8"} flex flex-col items-center gap-1 transition-all duration-300`}>
      <div className="text-3xl">{getEmotionEmoji(emotion)}</div>
      <div className="bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-border/30">
        <span className="text-xs font-mono text-accent-purple">{name}</span>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-5 | role=character-display | inputs=name,emotion | outputs=character-avatar

// ============================================================
// PART 6 — 대사창
// ============================================================

function DialogueBox({
  beat,
  speed,
  onNext,
  onPrev,
  canPrev,
  showMetrics,
  tension,
  language,
}: {
  beat: SceneBeat;
  speed: number;
  onNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  showMetrics: boolean;
  tension: number;
  language: AppLanguage;
}) {
  const typingSpeed = Math.round(40 / speed);

  const typeLabel: Record<SceneBeat["type"], string> = {
    dialogue: L4(language, { ko: "대사", en: "Dialogue" }),
    narration: L4(language, { ko: "서술", en: "Narration" }),
    action: L4(language, { ko: "행동", en: "Action" }),
    thought: L4(language, { ko: "내면", en: "Thought" }),
    description: L4(language, { ko: "묘사", en: "Description" }),
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="max-w-3xl mx-auto bg-bg-primary/90 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-luxury">
        {/* 화자 이름 */}
        {beat.speaker && (
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-accent-green">
              {beat.speaker}
            </span>
            <span className="text-[9px] text-text-tertiary bg-bg-tertiary/50 rounded px-1.5 py-0.5">
              {typeLabel[beat.type]}
            </span>
          </div>
        )}

        {/* 내용 */}
        <div className={`text-text-primary leading-relaxed ${beat.type === "thought" ? "italic text-text-secondary" : ""} ${beat.type === "description" ? "text-text-secondary text-sm" : "text-base"}`}>
          <TypingText text={beat.text} speed={typingSpeed} />
        </div>

        {/* 하단: 메트릭 + 네비 */}
        <div className="mt-3 flex items-center justify-between">
          {showMetrics ? (
            <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
              <span>{L4(language, { ko: '텐션', en: 'Tension' })} <span className={tension > 70 ? "text-accent-red" : tension > 40 ? "text-accent-amber" : "text-accent-green"}>{tension}</span></span>
              <span>{L4(language, { ko: '템포', en: 'Tempo' })} {beat.tempo === "fast" ? "⚡" : beat.tempo === "slow" ? "🐌" : "▶"}</span>
              <span>{L4(language, { ko: '카메라', en: 'Camera' })} {beat.camera}</span>
            </div>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button onClick={onPrev} disabled={!canPrev} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors" aria-label={L4(language, { ko: '이전', en: 'Previous' })}>
              <ChevronLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <button onClick={onNext} className="px-4 py-1.5 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-lg text-xs font-mono transition-colors" aria-label={L4(language, { ko: '다음', en: 'Next' })}>
              {L4(language, { ko: '다음', en: 'Next' })} ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-6 | role=dialogue-box | inputs=SceneBeat,callbacks | outputs=dialogue-UI

// ============================================================
// PART 6.5 — 메모리 관리 유틸리티
// ============================================================

const IS_DEV = process.env.NODE_ENV === "development";

/** Dev-mode memory monitor: tracks particle counts and audio contexts */
function useMemoryMonitor(
  audioRef: MutableRefObject<AudioEngine | null>,
  particleType: ParticleType,
) {
  const warnedRef = useRef({ particles: false, audio: false });

  useEffect(() => {
    if (!IS_DEV) return;

    const interval = setInterval(() => {
      // Track active audio contexts (check via BaseAudioContext count heuristic)
      const audioActive = audioRef.current ? 1 : 0;
      if (audioActive > 3 && !warnedRef.current.audio) {
        console.warn("[ScenePlayer Memory] Active audio contexts:", audioActive, "> 3 threshold");
        warnedRef.current.audio = true;
      }

      // Particle count warning (based on type)
      const estimatedParticles = particleType === "rain" ? 120
        : particleType === "snow" ? 80
        : particleType === "petals" ? 30
        : particleType === "sparks" ? 50
        : 0;
      if (estimatedParticles > 1000 && !warnedRef.current.particles) {
        console.warn("[ScenePlayer Memory] Particle count:", estimatedParticles, "> 1000 threshold");
        warnedRef.current.particles = true;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [audioRef, particleType]);
}

/** Dispose all scene resources: TTS, audio, timers */
function disposeScene(
  ttsRef: MutableRefObject<TTSController | null>,
  audioRef: MutableRefObject<AudioEngine | null>,
  autoPlayRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
) {
  // Cancel TTS speech
  ttsRef.current?.stop();

  // Stop ambient audio (without disposing the engine — it's reused)
  audioRef.current?.stopAmbient();

  // Clear autoplay timer
  if (autoPlayRef.current !== undefined) {
    clearTimeout(autoPlayRef.current);
    autoPlayRef.current = undefined;
  }
}

/** Debounce rapid scene index changes */
function useDebouncedSceneIndex(rawIndex: number, delay = 150): number {
  const [debouncedIndex, setDebouncedIndex] = useState(rawIndex);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedIndex(rawIndex), delay);
    return () => clearTimeout(timer);
  }, [rawIndex, delay]);

  return debouncedIndex;
}

// IDENTITY_SEAL: PART-6.5 | role=memory-management | inputs=refs | outputs=cleanup-utils

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

      if (IS_DEV) console.log("[ScenePlayer] Unmount cleanup complete");
    };
  }, []);

  // 장면 전환 시: 이전 리소스 정리 → 새 환경음 로드
  useEffect(() => {
    if (!currentScene || !audioRef.current) return;

    // Dispose previous scene resources BEFORE loading new ones
    if (prevSceneIndexRef.current !== debouncedSceneIndex) {
      disposeScene(ttsRef, audioRef, autoPlayRef);
      prevSceneIndexRef.current = debouncedSceneIndex;
      if (IS_DEV) console.log("[ScenePlayer] Scene transition cleanup:", debouncedSceneIndex);
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

  // 장면 전환 페이드 효과
  const [fadeKey, setFadeKey] = useState(0);
  useEffect(() => { setFadeKey(k => k + 1); }, [state.sceneIndex]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden select-none ${sceneTransition === 'fade-out' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} style={{ background: bgGradient }}>
      {/* 장면 전환 페이드 오버레이 */}
      <div key={fadeKey} className="absolute inset-0 bg-black pointer-events-none z-50 animate-[fadeOut_0.6s_ease-out_forwards]" />
      {/* ── 라디오 모드: 어둠 + 최소 비주얼 ── */}
      {isRadio && (
        <>
          <div className="absolute inset-0 bg-black" />
          {/* 중앙 파동 이펙트 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`rounded-full border border-accent-purple/20 ${state.isPlaying && !state.isPaused ? 'animate-ping' : ''}`} style={{ width: 120, height: 120 }} />
            <div className="absolute rounded-full border border-accent-purple/10" style={{ width: 200, height: 200 }} />
            <Headphones className="absolute h-8 w-8 text-accent-purple/40" />
          </div>
          {/* 라디오 모드에서도 비트 텍스트 페이드인 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-16">
            <p className={`text-center leading-loose transition-opacity duration-1000 max-w-xl ${
              currentBeat.type === 'dialogue' ? 'text-lg text-text-primary font-medium' :
              currentBeat.type === 'thought' ? 'text-base text-accent-purple/80 italic' :
              currentBeat.type === 'description' ? 'text-sm text-text-tertiary' :
              'text-base text-text-secondary'
            }`} style={{ opacity: 0.8 }}>
              {currentBeat.speaker && currentBeat.type === 'dialogue' && (
                <span className="block text-xs text-accent-green/60 font-mono mb-2">{currentBeat.speaker}</span>
              )}
              {currentBeat.text}
            </p>
          </div>
        </>
      )}

      {/* ── 비주얼 노벨 모드: 풀 비주얼 ── */}
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
            className="bg-transparent text-[10px] text-text-tertiary border-none outline-none cursor-pointer"
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

      {/* 캐릭터 표시 (비주얼 모드만) */}
      {!isRadio && currentBeat.speaker && (
        <>
          {/* 캐릭터 이미지 (있으면) */}
          {characterImages?.get(currentBeat.speaker)?.get(getDominantEmotion(currentBeat.emotion)) ? (
            <div className="absolute bottom-32 left-8 transition-all duration-500">
              <img
                src={characterImages?.get(currentBeat.speaker)?.get(getDominantEmotion(currentBeat.emotion)) ?? ''}
                alt={currentBeat.speaker}
                className="h-64 object-contain drop-shadow-2xl"
              />
              <div className="text-center mt-1 bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-border/30">
                <span className="text-xs font-mono text-accent-purple">{currentBeat.speaker}</span>
              </div>
            </div>
          ) : (
            <CharacterDisplay name={currentBeat.speaker} emotion={currentBeat.emotion} side="left" />
          )}
        </>
      )}

      {/* 전체 진행률 */}
      <div className="absolute bottom-[140px] left-4 right-4 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary font-mono">{currentGlobalBeat}/{totalBeats}</span>
          <div className="flex-1 h-1 bg-bg-tertiary/50 rounded-full overflow-hidden">
            <div className="h-full bg-accent-purple rounded-full transition-all duration-300" style={{ width: `${(currentGlobalBeat / totalBeats) * 100}%` }} />
          </div>
          <span className="text-[9px] text-text-tertiary font-mono">{Math.round((currentGlobalBeat / totalBeats) * 100)}%</span>
        </div>
      </div>

      {/* 대사창 (비주얼 모드), 라디오는 중앙 텍스트로 대체 */}
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

      {/* 라디오 모드 하단: 간단한 다음 버튼 */}
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
        <div
          className="h-full bg-accent-purple/60 transition-all duration-300"
          style={{ width: `${(currentGlobalBeat / totalBeats) * 100}%` }}
        />
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-7 | role=main-player | inputs=ScenePlayerProps | outputs=visual-novel-UI
