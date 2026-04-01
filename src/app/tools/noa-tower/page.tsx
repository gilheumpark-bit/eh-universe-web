"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useLang, type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import ToolNav from "@/components/tools/ToolNav";

import { GamePayload } from "@/lib/tools/noa-tower/types";
import { bootstrap, respond } from "@/lib/tools/noa-tower/engine";
import { CLUES, FRAGMENTS } from "@/lib/tools/noa-tower/scenario";
import { ConditionBadge } from "@/components/tools/noa-tower/ConditionBadge";

// ============================================================
// PART 1 — UI Labels (KO / EN)
// ============================================================

const T: Record<string, { ko: string; en: string }> = {
  pageTitle: { ko: "NOA TOWER", en: "NOA TOWER" },
  pageSubtitle: { ko: "텍스트 추리 게임", en: "Text Investigation Game" },
  progress: { ko: "진행도", en: "Progress" },
  vectorAnalysis: { ko: "벡터 분석", en: "Vector Analysis" },
  floorSense: { ko: "층 감각", en: "Floor Sense" },
  recordStatus: { ko: "기록 상태", en: "Record Status" },
  objectives: { ko: "목표", en: "Objectives" },
  clues: { ko: "단서", en: "Clues" },
  fragments: { ko: "이론 조각", en: "Theory Fragments" },
  placeholder: { ko: "당신의 추론을 입력하십시오...", en: "Enter your deduction..." },
  submit: { ko: "기록 전송", en: "Submit" },
  submitVerdict: { ko: "최종 기록 제출", en: "Submit Verdict" },
  silence: { ko: "숨 고르기", en: "Silence" },
  probe: { ko: "구조 탐색", en: "Probe" },
  hardMode: { ko: "하드 모드", en: "Hard Mode" },
  giveUp: { ko: "포기 선언", en: "Give Up" },
  restart: { ko: "재시작", en: "Restart" },
};

function t(key: string, lang: Lang): string {
  const entry = T[key];
  if (!entry) return key;
  return L4(lang, entry);
}

// IDENTITY_SEAL: PART-1 | role=i18n | inputs=key,lang | outputs=string

// ============================================================
// PART 2 — Main Page Component
// ============================================================

const STORAGE_KEY = "noa-tower-state-v1";

export default function NoaTowerPage() {
  const { lang } = useLang();
  const [payload, setPayload] = useState<GamePayload | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GamePayload;
        if (parsed?.state && parsed?.reply && parsed?.case) return parsed;
      }
    } catch { /* ignore */ }
    return bootstrap(lang);
  });
  const [prevLang, setPrevLang] = useState(lang);
  const [input, setInput] = useState("");
  const [sidePanel, setSidePanel] = useState<"status" | "case">("status");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Reinit on lang change ---
  if (prevLang !== lang) {
    setPrevLang(lang);
    setPayload(bootstrap(lang));
  }

  // --- Persist ---
  useEffect(() => {
    if (payload) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch { /* quota exceeded fallback */ }
    }
  }, [payload]);

  // --- Scroll to bottom ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [payload?.state?.history?.length]);

  // --- Actions ---
  const doAction = useCallback(
    (action: string, msg?: string) => {
      if (!payload) return;
      const result = respond(msg ?? input, payload.state, action, lang);
      setPayload(result);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [payload, input, lang]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      doAction("submit");
    },
    [doAction, input]
  );

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <p className="font-[--font-mono] text-sm text-text-tertiary animate-pulse">
          NOA TOWER initializing...
        </p>
      </div>
    );
  }

  const { reply, state } = payload;
  const caseData = payload.case;
  const isEnded = state.gameStatus !== "active";
  const conditionColor = state.distortion >= 0.82 ? "from-red-900/20" : state.distortion >= 0.46 ? "from-amber-900/10" : "from-transparent";

  return (
    <>
      <Header />
      <main className={`min-h-screen bg-bg-primary pt-28 pb-8 bg-gradient-to-b ${conditionColor} to-transparent`}>
        <div className="mx-auto max-w-7xl px-4">
          <ToolNav
            toolName={L4(lang, { ko: "NOA 타워", en: "NOA Tower" })}
            isKO={lang === "ko"}
            relatedTools={[
              { href: '/tools/warp-gate', label: L4(lang, { ko: '워프 게이트', en: 'Warp Gate' }) },
              { href: '/tools/neka-sound', label: L4(lang, { ko: '네카 사운드', en: 'NEKA Sound' }) },
            ]}
          />
          {/* --- Top Bar --- */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[0.12em] text-text-primary">
                {t("pageTitle", lang)}
              </h1>
              <p className="font-[--font-mono] text-[12px] tracking-[0.2em] text-text-tertiary uppercase mt-1">
                {t("pageSubtitle", lang)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ConditionBadge condition={caseData.towerCondition} label={caseData.towerConditionLabel} />
              {isEnded && (
                <button
                  onClick={() => doAction("restart")}
                  className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 font-[--font-mono] text-[13px] tracking-wider text-accent-amber transition-colors hover:bg-accent-amber/20"
                >
                  {t("restart", lang)}
                </button>
              )}
            </div>
          </div>

          {/* --- Mobile: 대시보드 토글 --- */}
          <div className="mb-4 lg:hidden">
            <button
              onClick={() => setSidePanel(sidePanel === "status" ? "case" : "status")}
              className="w-full rounded-xl border border-white/8 px-3 py-2 font-[--font-mono] text-[12px] tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {sidePanel === "status" ? L4(lang, { ko: "▲ 대시보드 닫기", en: "▲ Hide Dashboard" }) : L4(lang, { ko: "▼ 대시보드 보기", en: "▼ Show Dashboard" })}
            </button>
          </div>

          {/* --- 2-Column Layout (compact sidebar + main) --- */}
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            {/* LEFT: Compact Dashboard */}
            <aside className={`space-y-3 ${sidePanel !== "status" ? "hidden lg:block" : ""}`}>
              {/* Progress + Mode — 한 줄 */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase">{t("progress", lang)}</span>
                  <span className="font-[--font-mono] text-[10px] text-accent-amber">{state.hardMode ? "HARD" : "NORMAL"}</span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-accent-amber/60 transition-all duration-700" style={{ width: `${Math.min(caseData.progress * 100, 100)}%` }} />
                </div>
                <span className="font-[--font-mono] text-[11px] text-text-tertiary mt-1 block">{(caseData.progress * 100).toFixed(0)}%</span>
              </div>

              {/* Vectors — 인라인 4줄 */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <h3 className="mb-2 font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase">{t("vectorAnalysis", lang)}</h3>
                {(["insight", "consistency", "delusion", "risk"] as const).map(k => (
                  <div key={k} className="flex items-center gap-2 mb-1">
                    <span className="w-14 font-[--font-mono] text-[9px] text-text-tertiary uppercase">{k.slice(0,4)}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${k === "risk" ? "bg-red-400/60" : k === "delusion" ? "bg-purple-400/60" : "bg-cyan-400/60"}`}
                        style={{ width: `${(reply.vectorScores[k] * 100)}%` }} />
                    </div>
                    <span className="w-7 font-[--font-mono] text-[9px] text-text-tertiary text-right">{(reply.vectorScores[k] * 100).toFixed(0)}</span>
                  </div>
                ))}
                {reply.vectorCopy && <p className="mt-2 font-[--font-mono] text-[10px] italic text-text-tertiary leading-snug">{reply.vectorCopy}</p>}
              </div>

              {/* Floor + Record — 합축 */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3 space-y-2">
                <div>
                  <span className="font-[--font-mono] text-[9px] font-bold tracking-[0.15em] text-text-tertiary uppercase">{t("floorSense", lang)}</span>
                  <p className="font-[--font-mono] text-[11px] leading-snug text-text-secondary mt-0.5">{reply.floorHint}</p>
                </div>
                <div className="border-t border-white/5 pt-2">
                  <span className="font-[--font-mono] text-[9px] font-bold tracking-[0.15em] text-text-tertiary uppercase">{t("recordStatus", lang)}</span>
                  <p className="font-[--font-mono] text-[11px] leading-snug text-text-secondary mt-0.5">{reply.recordStatus}</p>
                </div>
              </div>

              {/* Objectives — 컴팩트 리스트 */}
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
                <h3 className="mb-2 font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase">{t("objectives", lang)}</h3>
                <div className="space-y-1">
                  {caseData.objectives.map((obj) => (
                    <div key={obj.id} className="flex items-start gap-1.5">
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${obj.complete ? "bg-cyan-400" : obj.active ? "bg-accent-amber" : "bg-white/10"}`} />
                      <span className={`font-[--font-mono] text-[11px] leading-snug ${obj.complete ? "text-cyan-400/70 line-through" : obj.active ? "text-text-secondary" : "text-text-tertiary/50"}`}>{obj.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clues + Fragments — 접기식 */}
              <details className="rounded-2xl border border-white/6 bg-white/[0.02]">
                <summary className="p-3 cursor-pointer font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase hover:text-text-secondary">
                  {t("clues", lang)} {caseData.clueCount}/{CLUES.length} · {t("fragments", lang)} {caseData.fragmentCount}/{FRAGMENTS.length}
                </summary>
                <div className="px-3 pb-3 space-y-1.5">
                  {caseData.clues.filter((c) => c.unlocked).map((clue) => (
                    <div key={clue.id} className="rounded-lg border border-white/5 bg-white/[0.01] p-2">
                      <p className="font-[--font-mono] text-[11px] font-medium text-text-secondary">{clue.title}</p>
                      {clue.body && <p className="font-[--font-mono] text-[10px] text-text-tertiary mt-0.5 leading-snug">{clue.body}</p>}
                    </div>
                  ))}
                  {caseData.fragments.filter((f) => f.unlocked).map((frag) => (
                    <div key={frag.id} className="rounded-lg border border-purple-400/10 bg-purple-400/[0.02] p-2">
                      <p className="font-[--font-mono] text-[11px] font-medium text-purple-300/80">{frag.title}</p>
                      {frag.body && <p className="font-[--font-mono] text-[10px] text-text-tertiary mt-0.5 leading-snug">{frag.body}</p>}
                    </div>
                  ))}
                  {caseData.clueCount === 0 && caseData.fragmentCount === 0 && (
                    <p className="font-[--font-mono] text-[10px] text-text-tertiary italic">{L4(lang, { ko: "아직 발견된 단서가 없습니다", en: "No clues discovered yet" })}</p>
                  )}
                </div>
              </details>
            </aside>

            {/* CENTER: Chat / Dialogue */}
            <section className="flex flex-col">
              {/* Chat Area */}
              <div className="mb-4 flex-1 overflow-y-auto rounded-2xl border border-white/6 bg-white/[0.015] p-4" style={{ maxHeight: "calc(100vh - 340px)", minHeight: "400px" }}>
                {state.history.map((entry, i) => (
                  <div key={i} className={`mb-4 ${entry.role === "player" ? "flex justify-end" : ""}`}>
                    {entry.role === "player" ? (
                      <div className="max-w-[80%] rounded-2xl rounded-br-md border border-accent-amber/15 bg-accent-amber/5 px-4 py-3">
                        <p className="whitespace-pre-wrap font-[--font-mono] text-sm leading-relaxed text-accent-amber/90">
                          {entry.text}
                        </p>
                      </div>
                    ) : entry.role === "tower" ? (
                      <div className="max-w-[85%]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-[--font-mono] text-[12px] tracking-wider text-cyan-400/60">
                            [{entry.code}] {entry.title}
                          </span>
                        </div>
                        <div className="rounded-2xl rounded-bl-md border border-cyan-400/10 bg-cyan-400/[0.03] px-4 py-3">
                          <p className="whitespace-pre-wrap font-[--font-mono] text-sm leading-relaxed text-text-secondary">
                            {entry.text}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-[90%] rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                        <p className="whitespace-pre-wrap text-center font-[--font-mono] text-[12px] leading-relaxed text-text-tertiary">
                          {entry.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Event line */}
                {reply.event && (
                  <div className="mb-2 text-center">
                    <p className="inline-block rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 font-[--font-mono] text-[12px] italic text-text-tertiary">
                      {reply.event}
                    </p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Prompt Seeds */}
              {!isEnded && caseData.promptSeeds.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {caseData.promptSeeds.map((seed) => (
                    <button
                      key={seed.id}
                      onClick={() => {
                        setInput(seed.body);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 font-[--font-mono] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary"
                      title={seed.body}
                    >
                      {seed.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={t("placeholder", lang)}
                  disabled={isEnded}
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 font-[--font-mono] text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary/50 focus:border-accent-amber/30 focus:outline-none disabled:opacity-40"
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    type="submit"
                    disabled={isEnded || !input.trim()}
                    className="rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-2 font-[--font-mono] text-[12px] font-bold tracking-wider text-accent-amber transition-colors hover:bg-accent-amber/20 disabled:opacity-30"
                  >
                    {t("submit", lang)}
                  </button>
                  {caseData.canSubmitVerdict && !isEnded && (
                    <button
                      type="button"
                      onClick={() => { if (input.trim()) doAction("submit_verdict", input); }}
                      disabled={!input.trim()}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 font-[--font-mono] text-[12px] font-bold tracking-wider text-cyan-400 transition-colors hover:bg-cyan-400/20 disabled:opacity-30"
                    >
                      {t("submitVerdict", lang)}
                    </button>
                  )}
                </div>
              </form>

              {/* Action Buttons */}
              {!isEnded && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => doAction("silence")} className="rounded-full border border-white/8 px-3 py-1.5 font-[--font-mono] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                    {t("silence", lang)}
                  </button>
                  <button onClick={() => doAction("probe")} className="rounded-full border border-white/8 px-3 py-1.5 font-[--font-mono] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                    {t("probe", lang)}
                  </button>
                  {!state.hardMode && (
                    <button onClick={() => doAction("hard_mode")} className="rounded-full border border-white/8 px-3 py-1.5 font-[--font-mono] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                      {t("hardMode", lang)}
                    </button>
                  )}
                  <button onClick={() => doAction("give_up")} className="rounded-full border border-red-400/15 px-3 py-1.5 font-[--font-mono] text-[12px] text-red-400/60 transition-colors hover:border-red-400/30 hover:text-red-400/80">
                    {t("giveUp", lang)}
                  </button>
                  <button onClick={() => doAction("restart")} className="ml-auto rounded-full border border-white/8 px-3 py-1.5 font-[--font-mono] text-[12px] text-text-tertiary transition-colors hover:border-white/15 hover:text-text-secondary">
                    {t("restart", lang)}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: PART-2 | role=page-component | inputs=none | outputs=JSX
