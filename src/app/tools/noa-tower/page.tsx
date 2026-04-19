"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import { useLang, type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import ToolNav from "@/components/tools/ToolNav";
import { logger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { GamePayload, GameState, ReplyPayload } from "@/lib/tools/noa-tower/types";
import { bootstrap, respond } from "@/lib/tools/noa-tower/engine";
import { ConditionBadge } from "@/components/tools/noa-tower/ConditionBadge";

// ============================================================
// PART 1 — UI Labels & i18n (4-Lang Policy)
// ============================================================

const T: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  pageTitle: { ko: "NOA TOWER", en: "NOA TOWER", ja: "NOA TOWER", zh: "NOA TOWER" },
  pageSubtitle: { ko: "텍스트 추리 게임", en: "Text Investigation Game", ja: "テキスト推理ゲーム", zh: "文本推理解谜" },
  progress: { ko: "진행도", en: "Progress", ja: "進行度", zh: "进度" },
  vectorAnalysis: { ko: "벡터 분석", en: "Vector Analysis", ja: "ベクトル分析", zh: "向量分析" },
  floorSense: { ko: "층 감각", en: "Floor Sense", ja: "階層感覚", zh: "楼层感官" },
  recordStatus: { ko: "기록 상태", en: "Record Status", ja: "記録状態", zh: "记录状态" },
  objectives: { ko: "목표", en: "Objectives", ja: "目標", zh: "目标" },
  clues: { ko: "단서", en: "Clues", ja: "手がかり", zh: "线索" },
  fragments: { ko: "이론 조각", en: "Theory Fragments", ja: "理論の断片", zh: "理论碎片" },
  placeholder: { ko: "당신의 추론을 입력하십시오...", en: "Enter your deduction...", ja: "推理を入力してください...", zh: "请输入您的推论..." },
  submit: { ko: "기록 전송", en: "Submit", ja: "記録送信", zh: "传送记录" },
  submitVerdict: { ko: "최종 기록 제출", en: "Submit Verdict", ja: "最終記録提出", zh: "提交最终记录" },
  silence: { ko: "숨 고르기", en: "Silence", ja: "一息つく", zh: "深呼吸" },
  probe: { ko: "구조 탐색", en: "Probe", ja: "構造探索", zh: "结构探测" },
  hardMode: { ko: "하드 모드", en: "Hard Mode", ja: "ハードモード", zh: "硬核模式" },
  giveUp: { ko: "포기 선언", en: "Give Up", ja: "放棄宣言", zh: "宣告放弃" },
  restart: { ko: "재시작", en: "Restart", ja: "再起動", zh: "重新开始" },
  loading: { ko: "NOA 타워 초기화 중...", en: "NOA TOWER initializing...", ja: "NOAタワー初期化中...", zh: "NOA 塔正在初始化..." },
  noClues: { ko: "아직 발견된 단서가 없습니다", en: "No clues discovered yet", ja: "まだ手がかりが見つかっていません", zh: "尚未发现线索" },
};

function t(key: string, lang: Lang): string {
  const entry = T[key];
  if (!entry) return key;
  return L4(lang, entry);
}

// IDENTITY_SEAL: PART-1 | role=i18n-dictionary | inputs=key,lang | outputs=localized-string

// ============================================================
// PART 2 — State Management & Hydration Safety
// ============================================================

const STORAGE_KEY = "noa-tower-state-v1";

export default function NoaTowerPage() {
  const { lang } = useLang();
  const [payload, setPayload] = useState<GamePayload>(() => {
    try {
      if (typeof window === "undefined") return bootstrap("ko");
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return bootstrap("ko");
      const parsed = JSON.parse(saved) as unknown;
      if (parsed && typeof parsed === "object") {
        const maybe = parsed as Partial<GamePayload>;
        if (maybe.state && maybe.reply && maybe.case) return maybe as GamePayload;
      }
    } catch {
      // ignore — fallback to bootstrap in effect
    }
    return bootstrap(lang);
  });
  const [input, setInput] = useState("");
  const [sidePanel, setSidePanel] = useState<"status" | "case">("status");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- Persistence ---
  useEffect(() => {
    if (payload) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        logger.error("NoaTower", "Quota exceeded or storage failed", e);
      }
    }
  }, [payload]);

  // --- Scroll Logic ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [payload?.state?.history?.length]);

  // --- Actions ---
  const doAction = useCallback(
    (action: string, msg?: string) => {
      if (!payload) return;
      logger.debug("NoaTower", "Action trigger", { action, msg_len: msg?.length ?? input.length });
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

  const { reply, state } = payload;
  const caseData = payload.case;
  const isEnded = state.gameStatus !== "active";
  const conditionColor = state.distortion >= 0.82 ? "from-accent-red/40" : state.distortion >= 0.46 ? "from-amber-900/20" : "from-cyan-900/10";

  return (
    <ErrorBoundary variant="full-page">
      <Header />
      <main className={`min-h-screen bg-bg-primary pt-28 pb-8 transition-colors duration-1000 bg-linear-to-b ${conditionColor} to-transparent`}>
        <div className="mx-auto max-w-7xl px-4">
          <ToolNav
            toolName={L4(lang, { ko: "NOA 타워", en: "NOA Tower", ja: "NOA Tower", zh: "NOA Tower" })}
            isKO={lang === "ko"}
            relatedTools={[
              { href: '/tools/warp-gate', label: L4(lang, { ko: '워프 게이트', en: 'Warp Gate', ja: 'Warp Gate', zh: 'Warp Gate' }) },
              { href: '/tools/neka-sound', label: L4(lang, { ko: '네카 사운드', en: 'NEKA Sound', ja: 'NEKA Sound', zh: 'NEKA Sound' }) },
            ]}
          />
          
          <PART3_Header 
            lang={lang} 
            isEnded={isEnded} 
            caseData={caseData} 
            doAction={doAction} 
          />

          {/* --- Mobile: Dashboard Toggle --- */}
          <div className="mb-4 lg:hidden">
            <button
              onClick={() => setSidePanel(sidePanel === "status" ? "case" : "status")}
              className="w-full rounded-xl border bg-white/2 px-3 py-2 font-[--font-mono] text-[12px] tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {sidePanel === "status" ? L4(lang, { ko: "▲ 대시보드 닫기", en: "▲ Hide Dashboard", ja: "▲ ダッシュボードを閉じる", zh: "▲ 关闭仪表盘" }) : L4(lang, { ko: "▼ 대시보드 보기", en: "▼ Show Dashboard", ja: "▼ ダッシュボードを表示", zh: "▼ 显示仪表盘" })}
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <PART4_Sidebar 
              lang={lang} 
              sidePanel={sidePanel} 
              state={state} 
              caseData={caseData} 
              reply={reply} 
            />

            <PART5_Content 
              lang={lang} 
              state={state} 
              reply={reply} 
              caseData={caseData} 
              input={input}
              setInput={setInput}
              inputRef={inputRef}
              chatEndRef={chatEndRef}
              isEnded={isEnded}
              doAction={doAction}
              handleSubmit={handleSubmit}
            />
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-2 | role=state-orchestration | inputs=none | outputs=JSX

// ============================================================
// PART 3 — UI Sub-Component: Top Header
// ============================================================

interface SubComponentProps {
  lang: Lang;
  state: GameState;
  reply: ReplyPayload;
  caseData: GamePayload["case"];
  doAction: (action: string, msg?: string) => void;
  isEnded: boolean;
}

function PART3_Header({ lang, isEnded, caseData, doAction }: Pick<SubComponentProps, "lang" | "isEnded" | "caseData" | "doAction">) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="animate-in fade-in slide-in-from-left-4 duration-700">
        <h1 className="font-display text-3xl font-bold tracking-[0.15em] text-text-primary drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          {t("pageTitle", lang)}
        </h1>
        <p className="font-[--font-mono] text-[12px] tracking-[0.3em] text-text-tertiary uppercase mt-1">
          {t("pageSubtitle", lang)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <ConditionBadge condition={caseData.towerCondition} label={caseData.towerConditionLabel} />
        {isEnded && (
          <button
            onClick={() => doAction("restart")}
            className="rounded-full border border-accent-amber/50 bg-accent-amber/10 px-4 py-2 font-[--font-mono] text-[13px] font-bold tracking-wider text-accent-amber shadow-[0_0_20px_rgba(245,158,11,0.1)] transition-[transform,background-color,border-color,box-shadow,color] hover:bg-accent-amber/20 hover:scale-105"
          >
            {t("restart", lang)}
          </button>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-3 | role=top-header | inputs=props | outputs=header-jsx

// ============================================================
// PART 4 — UI Sub-Component: Compact Dashboard
// ============================================================

interface SidebarProps extends Pick<SubComponentProps, "lang" | "state" | "caseData" | "reply"> {
  sidePanel: "status" | "case";
}

function PART4_Sidebar({ lang, sidePanel, state, caseData, reply }: SidebarProps) {
  return (
    <aside className={`space-y-3 ${sidePanel !== "status" ? "hidden lg:block transition-[transform,opacity,background-color,border-color,color]" : ""}`}>
      {/* Progress & Persistence */}
      <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-3 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <span className="font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase">{t("progress", lang)}</span>
          <span className="font-[--font-mono] text-[10px] text-accent-amber">{state.hardMode ? "HARD_INIT" : "NORMAL_STABLE"}</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/5">
          <div 
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-accent-amber/60 to-accent-amber shadow-[0_0_10px_rgba(245,158,11,0.3)] transition-[box-shadow] duration-1000" 
            style={{ width: `${Math.min(caseData.progress * 100, 100)}%` }} 
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-[--font-mono] text-[11px] text-text-tertiary">{(caseData.progress * 100).toFixed(0)}%</span>
          <span className="font-[--font-mono] text-[11px] text-text-tertiary/40">v1.2.a</span>
        </div>
      </div>

      {/* Vectors Panel */}
      <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-3">
        <h3 className="mb-3 font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase">{t("vectorAnalysis", lang)}</h3>
        {(["insight", "consistency", "delusion", "risk"] as const).map(k => (
          <div key={k} className="flex items-center gap-2 mb-2">
            <span className="w-14 font-[--font-mono] text-[9px] text-text-tertiary uppercase tracking-tighter">{k}</span>
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full transition-[transform,opacity,background-color,border-color,color] duration-700 ${k === "risk" ? "bg-accent-red/60" : k === "delusion" ? "bg-purple-500/60" : "bg-cyan-500/60"}`}
                style={{ width: `${(reply.vectorScores[k] * 100)}%` }} />
            </div>
            <span className="w-7 font-[--font-mono] text-[9px] text-text-secondary text-right">{(reply.vectorScores[k] * 100).toFixed(0)}</span>
          </div>
        ))}
        {reply.vectorCopy && (
          <div className="mt-3 border-t border-white/5 pt-2">
            <p className="font-[--font-mono] text-[10px] italic leading-relaxed text-text-tertiary">{reply.vectorCopy}</p>
          </div>
        )}
      </div>

      {/* Sensory & Records */}
      <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-3 space-y-3">
        <section>
          <span className="font-[--font-mono] text-[9px] font-bold tracking-[0.15em] text-text-tertiary uppercase">{t("floorSense", lang)}</span>
          <p className="font-[--font-mono] text-[11px] leading-snug text-text-secondary mt-1">{reply.floorHint}</p>
        </section>
        <div className="h-px bg-white/5" />
        <section>
          <span className="font-[--font-mono] text-[9px] font-bold tracking-[0.15em] text-text-tertiary uppercase">{t("recordStatus", lang)}</span>
          <p className="font-[--font-mono] text-[11px] leading-snug text-text-secondary mt-1">{reply.recordStatus}</p>
        </section>
      </div>

      {/* Objectives */}
      <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md p-3">
        <h3 className="mb-2.5 font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase">{t("objectives", lang)}</h3>
        <div className="space-y-1.5">
          {caseData.objectives.map((obj) => (
            <div key={obj.id} className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${obj.complete ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" : obj.active ? "bg-accent-amber animate-pulse" : "bg-white/10"}`} />
              <span className={`font-[--font-mono] text-[11px] leading-relaxed transition-[transform,opacity,background-color,border-color,color] ${obj.complete ? "text-cyan-400/50 line-through" : obj.active ? "text-text-secondary" : "text-text-tertiary/40"}`}>
                {obj.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Clues & Fragments */}
      <details className="group rounded-2xl border border-white/10 bg-white/3 backdrop-blur-md transition-[transform,opacity,background-color,border-color,color] open:bg-white/5">
        <summary className="p-3 cursor-pointer font-[--font-mono] text-[10px] font-bold tracking-[0.2em] text-text-tertiary uppercase flex items-center justify-between group-hover:text-text-secondary transition-colors">
          <span>{t("clues", lang)} ({caseData.clueCount})</span>
          <span className="text-white/20 transition-transform group-open:rotate-180">↓</span>
        </summary>
        <div className="px-3 pb-3 space-y-2">
          {caseData.clues.filter((c) => c.unlocked).map((clue) => (
            <div key={clue.id} className="rounded-lg border border-white/10 bg-white/2 p-2 hover:bg-white/5 transition-colors">
              <p className="font-[--font-mono] text-[11px] font-bold text-text-secondary">{clue.title}</p>
              {clue.body && <p className="font-[--font-mono] text-[10px] text-text-tertiary mt-1 leading-relaxed">{clue.body}</p>}
            </div>
          ))}
          {caseData.fragments.filter((f) => f.unlocked).map((frag) => (
            <div key={frag.id} className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2 shadow-inner">
              <p className="font-[--font-mono] text-[11px] font-bold text-purple-300/80">{frag.title}</p>
              {frag.body && <p className="font-[--font-mono] text-[10px] text-text-tertiary mt-1 leading-relaxed">{frag.body}</p>}
            </div>
          ))}
          {caseData.clueCount === 0 && caseData.fragmentCount === 0 && (
            <p className="font-[--font-mono] text-[10px] text-text-tertiary italic text-center py-2">{t("noClues", lang)}</p>
          )}
        </div>
      </details>
    </aside>
  );
}

// IDENTITY_SEAL: PART-4 | role=sidebar-dashboard | inputs=props | outputs=sidebar-jsx

// ============================================================
// PART 5 — UI Sub-Component: Chat & Interactive Flow
// ============================================================

interface ContentProps extends SubComponentProps {
  input: string;
  setInput: (val: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleSubmit: (e: React.FormEvent) => void;
}

function PART5_Content({ lang, state, reply, caseData, input, setInput, inputRef, chatEndRef, isEnded, doAction, handleSubmit }: ContentProps) {
  return (
    <section className="flex flex-col min-w-0">
      {/* Dialogue Stream */}
      <div 
        className="mb-4 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/2 backdrop-blur-sm p-4 scrollbar-thin scrollbar-thumb-white/10" 
        style={{ maxHeight: "calc(100vh - 360px)", minHeight: "450px" }}
      >
        <div className="space-y-6">
          {state.history.map((entry, i) => (
            <div key={i} className={`flex ${entry.role === "player" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              {entry.role === "player" ? (
                <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-accent-amber/20 bg-accent-amber/8 px-4 py-3 shadow-[0_4px_15px_-3px_rgba(245,158,11,0.1)]">
                  <p className="whitespace-pre-wrap font-[--font-mono] text-sm leading-relaxed text-accent-amber/90">
                    {entry.text}
                  </p>
                </div>
              ) : entry.role === "tower" ? (
                <div className="max-w-[85%] group">
                  <div className="mb-1.5 flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="font-[--font-mono] text-[11px] font-bold tracking-widest text-cyan-400">
                      [{entry.code}] {entry.title}
                    </span>
                  </div>
                  <div className="rounded-2xl rounded-bl-sm border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 shadow-[0_4px_15px_-3px_rgba(34,211,238,0.1)]">
                    <p className="whitespace-pre-wrap font-[--font-mono] text-sm leading-relaxed text-text-secondary selection:bg-cyan-400/30">
                      {entry.text}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-[85%] rounded-xl border border-white/5 bg-white/3 px-6 py-2.5">
                  <p className="whitespace-pre-wrap text-center font-[--font-mono] text-[12px] leading-relaxed text-text-tertiary/70 italic">
                    {entry.text}
                  </p>
                </div>
              )}
            </div>
          ))}
          
          {reply.event && (
            <div className="text-center py-2 animate-pulse">
              <p className="inline-block rounded-full border border-cyan-400/20 bg-cyan-400/5 px-6 py-2 font-[--font-mono] text-[13px] font-medium tracking-wide text-cyan-300/80 italic">
                {reply.event}
              </p>
            </div>
          )}
        </div>
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Input Seeds */}
      {!isEnded && caseData.promptSeeds.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 transition-[transform,opacity,background-color,border-color,color]">
          {caseData.promptSeeds.map((seed) => (
            <button
              key={seed.id}
              onClick={() => {
                setInput(seed.body);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-white/10 bg-white/3 px-3 py-1.5 font-[--font-mono] text-[12px] text-text-tertiary transition-[transform,background-color,border-color,color] hover:border-white/20 hover:bg-white/8 hover:text-text-secondary active:scale-95"
              title={seed.body}
            >
              # {seed.title}
            </button>
          ))}
        </div>
      )}

      {/* Input Module */}
      <div className="relative group">
        <form onSubmit={handleSubmit} className="relative flex gap-3 p-1 rounded-2xl border border-white/10 bg-white/3 focus-within:border-accent-amber/30 transition-[box-shadow] duration-300 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)]">
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
            aria-label={t("placeholder", lang)}
            disabled={isEnded}
            rows={1}
            className="flex-1 resize-none bg-transparent px-4 py-4 font-[--font-mono] text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 disabled:opacity-40"
          />
          <div className="flex items-center pr-2 gap-2">
            <button
              type="submit"
              disabled={isEnded || !input.trim()}
              className="rounded-xl bg-accent-amber/10 border border-accent-amber/30 px-5 py-2.5 font-[--font-mono] text-[12px] font-bold text-accent-amber transition-[transform,background-color,border-color,color] hover:bg-accent-amber/20 disabled:opacity-20 active:scale-95"
            >
              {t("submit", lang)}
            </button>
            {caseData.canSubmitVerdict && !isEnded && (
              <button
                type="button"
                onClick={() => { if (input.trim()) doAction("submit_verdict", input); }}
                disabled={!input.trim()}
                className="rounded-xl bg-cyan-400/10 border border-cyan-400/30 px-5 py-2.5 font-[--font-mono] text-[12px] font-bold text-cyan-400 transition-[transform,background-color,border-color,color] hover:bg-cyan-400/20 disabled:opacity-20 active:scale-95"
              >
                {t("submitVerdict", lang)}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tactical Quick Actions */}
      {!isEnded && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <QuickActionBtn onClick={() => doAction("silence")} active={false}>{t("silence", lang)}</QuickActionBtn>
          <QuickActionBtn onClick={() => doAction("probe")} active={false}>{t("probe", lang)}</QuickActionBtn>
          {!state.hardMode && (
            <QuickActionBtn onClick={() => doAction("hard_mode")} active={false} className="border-accent-amber/20 text-accent-amber/60">{t("hardMode", lang)}</QuickActionBtn>
          )}
          <div className="flex-1" />
          <button 
            onClick={() => doAction("give_up")} 
            className="rounded-lg px-4 py-2 font-[--font-mono] text-[12px] text-accent-red/40 hover:text-accent-red/80 transition-colors"
          >
            {t("giveUp", lang)}
          </button>
        </div>
      )}
    </section>
  );
}

interface QuickActionProps {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean; // Reserved for stateful actions
  className?: string;
}

function QuickActionBtn({ children, onClick, className = "" }: QuickActionProps) {
  return (
    <button 
      onClick={onClick}
      className={`rounded-xl border border-white/10 bg-white/2 px-4 py-2 font-[--font-mono] text-[11px] font-medium tracking-wide text-text-tertiary transition-[transform,background-color,border-color,color] hover:border-white/30 hover:bg-white/8 hover:text-text-secondary active:translate-y-0.5 ${className}`}
    >
      {children}
    </button>
  );
}

// IDENTITY_SEAL: PART-5 | role=dialogue-engine-ui | inputs=props | outputs=chat-section-jsx
