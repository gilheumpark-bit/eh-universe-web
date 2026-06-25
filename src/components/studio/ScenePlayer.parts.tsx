"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { ChevronLeft } from "lucide-react";
import { getDominantEmotion, type AudioEngine } from "@/engine/scene-audio";
import type { ParticleType, SceneBeat, TTSController } from "@/engine/scene-parser";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { logger } from "@/lib/logger";
import { CharacterDisplay } from "@/components/studio/ScenePlayer.visuals";

const IS_DEV = process.env.NODE_ENV === "development";

export function ParticleLayer({ type }: { type: ParticleType }) {
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

        if (type === "rain") { p.y += p.speed * 4; p.x -= p.speed * 0.5; }
        else if (type === "snow") { p.y += p.speed * 0.8; p.x += Math.sin(p.y * 0.01) * 0.5; }
        else if (type === "petals") { p.y += p.speed * 0.5; p.x += Math.sin(p.y * 0.02) * 1.5; }
        else if (type === "sparks") { p.y -= p.speed * 2; p.x += (Math.random() - 0.5) * 2; p.opacity -= 0.005; }
        else { p.y += p.speed * 0.3; p.x += (Math.random() - 0.5) * 0.5; }

        if (p.y > H || p.y < 0 || p.opacity <= 0) {
          p.y = type === "sparks" ? H : 0;
          p.x = Math.random() * W;
          p.opacity = 0.3 + Math.random() * 0.5;
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [type]);

  if (type === "none") return null;
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

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
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
        onDoneRef.current?.();
      }
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

export function DialogueBox({
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
    dialogue: L4(language, { ko: "대사", en: "Dialogue", ja: "Dialogue", zh: "Dialogue" }),
    narration: L4(language, { ko: "서술", en: "Narration", ja: "Narration", zh: "Narration" }),
    action: L4(language, { ko: "행동", en: "Action", ja: "Action", zh: "Action" }),
    thought: L4(language, { ko: "내면", en: "Thought", ja: "Thought", zh: "Thought" }),
    description: L4(language, { ko: "묘사", en: "Description", ja: "Description", zh: "Description" }),
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="max-w-3xl mx-auto bg-bg-primary/90 backdrop-blur-md border border-border/40 rounded-2xl p-5 shadow-luxury">
        {beat.speaker && (
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-accent-green">{beat.speaker}</span>
            <span className="text-[9px] text-text-tertiary bg-bg-tertiary/50 rounded px-1.5 py-0.5">
              {typeLabel[beat.type]}
            </span>
          </div>
        )}

        <div className={`text-text-primary leading-relaxed ${beat.type === "thought" ? "italic text-text-secondary" : ""} ${beat.type === "description" ? "text-text-secondary text-sm" : "text-base"}`}>
          <TypingText text={beat.text} speed={typingSpeed} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          {showMetrics ? (
            <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
              <span>{L4(language, { ko: "텐션", en: "Tension", ja: "Tension", zh: "Tension" })} <span className={tension > 70 ? "text-accent-red" : tension > 40 ? "text-accent-amber" : "text-accent-green"}>{tension}</span></span>
              <span>{L4(language, { ko: "템포", en: "Tempo", ja: "Tempo", zh: "Tempo" })} {beat.tempo === "fast" ? "⚡" : beat.tempo === "slow" ? "🐌" : "▶"}</span>
              <span>{L4(language, { ko: "카메라", en: "Camera", ja: "Camera", zh: "Camera" })} {beat.camera}</span>
            </div>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button onClick={onPrev} disabled={!canPrev} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors" aria-label={L4(language, { ko: "이전", en: "Previous", ja: "前へ", zh: "上一页" })}>
              <ChevronLeft className="h-4 w-4 text-text-secondary" />
            </button>
            <button onClick={onNext} className="px-4 py-1.5 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple rounded-lg text-xs font-mono transition-colors" aria-label={L4(language, { ko: "다음", en: "Next", ja: "次へ", zh: "下一页" })}>
              {L4(language, { ko: "다음", en: "Next", ja: "次へ", zh: "下一页" })} ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CharacterLayer({
  beat,
  characterImages,
}: {
  beat: SceneBeat;
  characterImages?: Map<string, Map<string, string>>;
}) {
  if (!beat.speaker) return null;
  const imageUrl = characterImages?.get(beat.speaker)?.get(getDominantEmotion(beat.emotion));

  if (!imageUrl) return <CharacterDisplay name={beat.speaker} emotion={beat.emotion} side="left" />;

  return (
    <div className="absolute bottom-32 left-8 transition-[transform,opacity,background-color,border-color,color] duration-500">
      {/* 캐릭터 이미지 — 동적 URL(data URI / 원격) 모두 지원. next/image는 data URI loader 우회 필요 → 의도적으로 <img> 유지. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={beat.speaker}
        width={256}
        height={256}
        loading="lazy"
        decoding="async"
        className="h-64 w-auto object-contain drop-shadow-2xl"
      />
      <div className="text-center mt-1 bg-bg-secondary/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-border/30">
        <span className="text-xs font-mono text-accent-purple">{beat.speaker}</span>
      </div>
    </div>
  );
}

export function useMemoryMonitor(
  audioRef: MutableRefObject<AudioEngine | null>,
  particleType: ParticleType,
) {
  const warnedRef = useRef({ particles: false, audio: false });

  useEffect(() => {
    if (!IS_DEV) return;

    const interval = setInterval(() => {
      const audioActive = audioRef.current ? 1 : 0;
      if (audioActive > 3 && !warnedRef.current.audio) {
        logger.warn("ScenePlayer Memory", "Active audio contexts over threshold", { audioActive, threshold: 3 });
        warnedRef.current.audio = true;
      }

      const estimatedParticles = particleType === "rain" ? 120
        : particleType === "snow" ? 80
        : particleType === "petals" ? 30
        : particleType === "sparks" ? 50
        : 0;
      if (estimatedParticles > 1000 && !warnedRef.current.particles) {
        logger.warn("ScenePlayer Memory", "Particle count over threshold", { estimatedParticles, threshold: 1000 });
        warnedRef.current.particles = true;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [audioRef, particleType]);
}

export function disposeScene(
  ttsRef: MutableRefObject<TTSController | null>,
  audioRef: MutableRefObject<AudioEngine | null>,
  autoPlayRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
) {
  ttsRef.current?.stop();
  audioRef.current?.stopAmbient();

  if (autoPlayRef.current !== undefined) {
    clearTimeout(autoPlayRef.current);
    autoPlayRef.current = undefined;
  }
}

export function useDebouncedSceneIndex(rawIndex: number, delay = 150): number {
  const [debouncedIndex, setDebouncedIndex] = useState(rawIndex);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedIndex(rawIndex), delay);
    return () => clearTimeout(timer);
  }, [rawIndex, delay]);

  return debouncedIndex;
}
