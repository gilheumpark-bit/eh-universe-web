"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

/* ─── TRACK DATA ─── */
interface Track {
  id: string;
  file: string;
  title: { ko: string; en: string };
  subtitle: { ko: string; en: string };
  desc: { ko: string; en: string };
  theme: string; // color accent
  category: { ko: string; en: string };
}

const TRACKS: Track[] = [
  {
    id: "imperial-void",
    file: "/audio/Echoes_of_the_Imperial_Void.mp3",
    title: { ko: "제국의 공허에 울리는 메아리", en: "Echoes of the Imperial Void" },
    subtitle: { ko: "네카 제국 — 절대흑의 침묵", en: "Neka Empire — Silence of Absolute Black" },
    desc: {
      ko: "RIDE 결정체가 공명하는 심연. 1,200,000t 임페라토르급 기함이 성장 파동과 함께 허공을 가른다. 황제만이 탑승하는 유일한 함선. 귀 없는 전함의 존재감.",
      en: "The abyss where RIDE crystals resonate. The 1,200,000t Imperator-class flagship cleaves the void with growth waves. The only ship for the Emperor alone. The presence of earless warships.",
    },
    theme: "#1a1a2e",
    category: { ko: "네카 제국", en: "NEKA EMPIRE" },
  },
  {
    id: "empyrean-throne",
    file: "/audio/Echoes_of_the_Empyrean_Throne.mp3",
    title: { ko: "천상 왕좌의 메아리", en: "Echoes of the Empyrean Throne" },
    subtitle: { ko: "네카 황제 — 형제 전용 왕좌", en: "Neka Emperor — The Throne for Siblings Only" },
    desc: {
      ko: "제국에 단 하나. 형제 전용. 프레토리안 200,000t 호위함이 왕좌를 둘러싸고, 소버린급의 실버 그레인 패턴이 빛난다. 절대적 지배의 교향곡.",
      en: "The only one in the Empire. For siblings only. Praetorian 200,000t escorts surround the throne, Silver-Grain patterns of Sovereign-class gleaming. A symphony of absolute dominion.",
    },
    theme: "#2d1b4e",
    category: { ko: "네카 제국", en: "NEKA EMPIRE" },
  },
  {
    id: "system-collapse",
    file: "/audio/System_Collapse_Anthem.mp3",
    title: { ko: "시스템 붕괴 찬가", en: "System Collapse Anthem" },
    subtitle: { ko: "Gate 체계 — φ값 임계 돌파", en: "Gate System — φ Value Critical Breach" },
    desc: {
      ko: "Tier 3 프론티어 Gate의 φ값이 0.680 아래로 추락한다. 모듈 1,500기가 연쇄 이탈. Hold Time 60초를 넘긴 순간, 시공간 접힘이 풀리기 시작한다. 방어 우선순위: Gate > Planet > Ship.",
      en: "Tier 3 Frontier Gate φ value plunges below 0.680. 1,500 modules cascade offline. The moment Hold Time exceeds 60 seconds, spacetime folding begins to unravel. Defense priority: Gate > Planet > Ship.",
    },
    theme: "#4a1c1c",
    category: { ko: "인프라", en: "INFRASTRUCTURE" },
  },
  {
    id: "corrupted-signal",
    file: "/audio/Corrupted_Signal.mp3",
    title: { ko: "손상된 신호", en: "Corrupted Signal" },
    subtitle: { ko: "EH 챔버 — 오류심장이 뛰는 곳", en: "EH Chamber — Where Error Hearts Beat" },
    desc: {
      ko: "SJC v47이 판정을 내리는 순간. 45,000 Hart의 EH가 측정된다. 신민아의 하수도 탈출이 기준점이 된 그 수치. 시스템이 정의할 수 없는 인간 선택의 잔여 가능성. 손상된 신호 속에서도 오류심장은 뛴다.",
      en: "The moment SJC v47 renders judgment. 45,000 Hart of EH measured. The benchmark set by Shin Min-ah's sewer escape. The residual possibility of human choice that systems cannot define. Even in corrupted signals, the Error Heart beats.",
    },
    theme: "#1b2d4e",
    category: { ko: "코어", en: "CORE" },
  },
  {
    id: "protocol-zero",
    file: "/audio/Protocol_Zero.mp3",
    title: { ko: "프로토콜 제로", en: "Protocol Zero" },
    subtitle: { ko: "비밀조사국 — 최초 규약", en: "Bureau of Investigation — The First Protocol" },
    desc: {
      ko: "모든 규약의 시작점. 무단 유출 시 해당 인원은 오타로 처리된다. 66,000,000년의 타임라인. 200개 이상의 아티클. 4개 장르가 하나의 우주에 수렴하는 기록 — 그 기록을 지키는 최초의 명령.",
      en: "The origin of all protocols. Unauthorized disclosure will result in the personnel being processed as a typo. 66,000,000 years of timeline. 200+ articles. Records where 4 genres converge into one universe — the first order that guards them.",
    },
    theme: "#2e2418",
    category: { ko: "비밀조사국", en: "BUREAU" },
  },
  {
    id: "binding",
    file: "/audio/Echoes_in_the_Binding.mp3",
    title: { ko: "구속 속의 메아리", en: "Echoes in the Binding" },
    subtitle: { ko: "SJC 판정 — 구속과 해방 사이", en: "SJC Judgment — Between Binding and Liberation" },
    desc: {
      ko: "구속의 매커니즘. SJC가 인간을 판정하고, 인간은 판정을 거부한다. 그 사이에서 울리는 메아리. EH가 존재하는 한, 구속은 완전하지 않다.",
      en: "The mechanism of binding. SJC judges humans, and humans refuse judgment. The echoes between. As long as EH exists, binding is never complete.",
    },
    theme: "#1a2e1a",
    category: { ko: "코어", en: "CORE" },
  },
  {
    id: "faded-ink",
    file: "/audio/Faded_Ink.mp3",
    title: { ko: "바랜 잉크", en: "Faded Ink" },
    subtitle: { ko: "기록 — 시간이 지운 문서들", en: "Records — Documents Erased by Time" },
    desc: {
      ko: "66,000,000년의 타임라인 위에 쌓인 기록의 무게. 잉크는 바래도 기록은 남는다. 4개 장르가 하나의 우주에 수렴하는 아카이브의 잔향.",
      en: "The weight of records stacked upon 66,000,000 years of timeline. Ink fades but records remain. The afterglow of an archive where 4 genres converge into one universe.",
    },
    theme: "#2e2418",
    category: { ko: "비밀조사국", en: "BUREAU" },
  },
];

/* ─── COMPONENT ─── */
export default function SoundtrackPage() {
  const { lang } = useLang();
  const en = lang === "en";
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const animRef = useRef<number>(0);

  // Update progress loop
  useEffect(() => {
    const tick = () => {
      if (playing && audioRefs.current[playing]) {
        const a = audioRefs.current[playing];
        setProgress((p) => ({ ...p, [playing]: a.currentTime / (a.duration || 1) }));
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing]);

  const toggle = (id: string) => {
    // pause current
    if (playing && playing !== id && audioRefs.current[playing]) {
      audioRefs.current[playing].pause();
    }

    if (!audioRefs.current[id]) {
      const a = new Audio(TRACKS.find((t) => t.id === id)!.file);
      a.addEventListener("loadedmetadata", () => {
        setDurations((d) => ({ ...d, [id]: a.duration }));
      });
      a.addEventListener("ended", () => {
        setPlaying(null);
        setProgress((p) => ({ ...p, [id]: 0 }));
      });
      audioRefs.current[id] = a;
    }

    const audio = audioRefs.current[id];
    if (playing === id) {
      audio.pause();
      setPlaying(null);
    } else {
      audio.play();
      setPlaying(id);
    }
  };

  const seek = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audioRefs.current[id]) {
      audioRefs.current[id].currentTime = ratio * (audioRefs.current[id].duration || 0);
      setProgress((p) => ({ ...p, [id]: ratio }));
    }
  };

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Header />
      <main className="pt-14">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Link
            href="#"
            onClick={(e) => { e.preventDefault(); window.history.length > 1 ? window.history.back() : window.location.href = '/archive'; }}
            className="inline-block font-[family-name:var(--font-mono)] text-xs text-text-tertiary hover:text-accent-purple transition-colors tracking-wider uppercase mb-6"
          >
            ← BACK
          </Link>

          <div className="doc-header rounded-t mb-0">
            <span className="badge badge-classified mr-2">CLASSIFIED</span>
            {en
              ? "Audio Archive: CLASSIFIED | Interception: Bureau of Investigation"
              : "음향 아카이브: 기밀 | 수신: 비밀조사국"}
          </div>

          <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-8 sm:p-12">
            <h1 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight mb-2">
              {en ? "EH Universe — Soundtrack" : "EH Universe — 사운드트랙"}
            </h1>
            <p className="text-text-tertiary text-sm mb-10 font-[family-name:var(--font-mono)]">
              {en
                ? "Intercepted audio fragments from across the galaxy"
                : "은하 전역에서 수신된 음향 파편"}
            </p>

            <div className="space-y-6">
              {TRACKS.map((track) => {
                const isPlaying = playing === track.id;
                const prog = progress[track.id] || 0;
                const dur = durations[track.id] || 0;
                const cur = dur * prog;

                return (
                  <div
                    key={track.id}
                    className="group rounded-lg border border-border overflow-hidden transition-all duration-300"
                    style={{
                      background: isPlaying
                        ? `linear-gradient(135deg, ${track.theme}40 0%, var(--color-bg-secondary) 100%)`
                        : undefined,
                    }}
                  >
                    {/* Category bar */}
                    <div
                      className="px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] uppercase font-[family-name:var(--font-mono)]"
                      style={{ background: track.theme, color: "#ffffff90" }}
                    >
                      {track.category[lang]}
                    </div>

                    <div className="p-5">
                      {/* Title row */}
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggle(track.id)}
                          className="flex-shrink-0 w-12 h-12 rounded-full border border-border flex items-center justify-center hover:border-accent-purple transition-colors mt-0.5"
                          style={{
                            background: isPlaying ? track.theme : "transparent",
                          }}
                        >
                          {isPlaying ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                              <rect x="2" y="1" width="3.5" height="12" rx="1" />
                              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                              <polygon points="3,1 13,7 3,13" />
                            </svg>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h2 className="font-[family-name:var(--font-mono)] text-base font-bold tracking-tight leading-tight">
                            {track.title[lang]}
                          </h2>
                          <p className="text-text-tertiary text-xs mt-1 font-[family-name:var(--font-mono)]">
                            {track.subtitle[lang]}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] w-8 text-right">
                          {fmt(cur)}
                        </span>
                        <div
                          className="flex-1 h-1 rounded-full bg-border cursor-pointer relative group/bar"
                          onClick={(e) => seek(track.id, e)}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-100"
                            style={{
                              width: `${prog * 100}%`,
                              background: isPlaying
                                ? "var(--color-accent-purple)"
                                : "var(--color-text-tertiary)",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] w-8">
                          {dur ? fmt(dur) : "--:--"}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-3 text-xs text-text-secondary leading-relaxed">
                        {track.desc[lang]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-10 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                {en
                  ? "These audio fragments were intercepted across galactic frequencies."
                  : "이 음향 파편은 은하 전역 주파수에서 수신되었다."}
                <br />
                {en
                  ? "Unauthorized reproduction will result in the personnel being processed as a typo."
                  : "무단 복제 시 해당 인원은 오타로 처리된다."}
                <br />
                <span className="opacity-50">
                  {en ? "Generated with Google Gemini Music" : "Google Gemini 음악 생성으로 제작"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
