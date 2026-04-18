"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { X, Sparkles, Wand2, Loader2, BookOpen, Zap, ExternalLink, Key, Check } from "lucide-react";
import { Genre, type AppLanguage } from "@/lib/studio-types";
import { GENRE_LABELS } from "@/lib/studio-constants";
import { createT, L4 } from "@/lib/i18n";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// ============================================================
// PART 1 — 타입 + Provider 감지
// ============================================================

type ProviderChoice = "dgx" | "gemini" | "byok";

interface QuickStartModalProps {
  language: AppLanguage;
  isOpen: boolean;
  onClose: () => void;
  onStart: (genre: Genre, prompt: string) => Promise<void>;
  isGenerating: boolean;
  /** "다른 키 있어요" 선택 시 APIKey 매니저 열기 */
  onOpenApiKeys?: () => void;
}

/**
 * 클라이언트에서 DGX Spark 서버 URL이 설정되었는지 감지.
 * NEXT_PUBLIC_ 접두어가 붙은 변수만 클라이언트 번들에 주입됨.
 */
function detectDgxAvailable(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  const url = process.env.NEXT_PUBLIC_SPARK_SERVER_URL || "";
  return url.trim().length > 0;
}

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

export default function QuickStartModal({
  language,
  isOpen,
  onClose,
  onStart,
  isGenerating,
  onOpenApiKeys,
}: QuickStartModalProps) {
  const dgxAvailable = useMemo(() => detectDgxAvailable(), []);
  const [provider, setProvider] = useState<ProviderChoice>(dgxAvailable ? "dgx" : "gemini");
  const [selectedGenre, setSelectedGenre] = useState<Genre>(Genre.FANTASY);
  const [prompt, setPrompt] = useState("");
  const t = createT(language);
  const trimmedPrompt = prompt.trim();

  // [C] WCAG 2.1 AA focus-trap — 모달 내부 Tab 순환 + Escape 닫기 + 이전 focus 복원.
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedPrompt || isGenerating) {
      return;
    }
    // [C] provider별 분기 — byok은 키 매니저로, gemini 키 발급은 새 탭, dgx/gemini-ready는 정상 플로우
    if (provider === "byok") {
      onOpenApiKeys?.();
      return;
    }
    void onStart(selectedGenre, trimmedPrompt);
  };

  const openGeminiKeyGuide = () => {
    if (typeof window === "undefined") return;
    window.open("https://aistudio.google.com/apikey", "_blank", "noopener,noreferrer");
  };

  // ============================================================
  // PART 3 — 라벨(i18n)
  // ============================================================

  const L = {
    providerHeading: L4(language, {
      ko: "당신의 집필을 도와줄 AI를 선택하세요",
      en: "Choose the AI to assist your writing",
      ja: "執筆を助けるAIを選択してください",
      zh: "选择辅助写作的AI",
    }),
    dgxTitle: L4(language, {
      ko: "로어가드 자체 엔진 (DGX Spark)",
      en: "Loreguard Built-in Engine (DGX Spark)",
      ja: "Loreguard 内蔵エンジン (DGX Spark)",
      zh: "Loreguard 自建引擎 (DGX Spark)",
    }),
    dgxDesc: L4(language, {
      ko: "키 없이 바로 시작. 자체 서버라 무료.",
      en: "No key needed. Free self-hosted server.",
      ja: "キー不要で即開始。自社サーバーなので無料。",
      zh: "无需密钥即可开始。自建服务器免费。",
    }),
    dgxReady: L4(language, {
      ko: "사용 가능",
      en: "Available",
      ja: "利用可能",
      zh: "可用",
    }),
    dgxUnavailable: L4(language, {
      ko: "현재 서버 미설정",
      en: "Server not configured",
      ja: "サーバー未設定",
      zh: "服务器未配置",
    }),
    geminiTitle: L4(language, {
      ko: "Gemini 무료 키 사용 (권장)",
      en: "Use free Gemini API key (recommended)",
      ja: "Gemini 無料キーを使用 (推奨)",
      zh: "使用 Gemini 免费密钥 (推荐)",
    }),
    geminiDesc: L4(language, {
      ko: "1분 만에 무료로 시작. Google 계정만 있으면 됨.",
      en: "Start free in 1 minute. Only a Google account needed.",
      ja: "1分で無料開始。Googleアカウントがあれば十分。",
      zh: "1分钟免费开始。只需 Google 账号。",
    }),
    geminiGuide: L4(language, {
      ko: "키 발급 가이드",
      en: "Get a key",
      ja: "キー発行ガイド",
      zh: "密钥申请指南",
    }),
    byokTitle: L4(language, {
      ko: "다른 키 있어요 (OpenAI / Claude 등)",
      en: "I have another key (OpenAI / Claude, etc.)",
      ja: "他のキーを持っています (OpenAI / Claude 等)",
      zh: "我有其他密钥 (OpenAI / Claude 等)",
    }),
    byokDesc: L4(language, {
      ko: "설정에서 키를 등록하세요.",
      en: "Register your key in settings.",
      ja: "設定でキーを登録してください。",
      zh: "请在设置中注册密钥。",
    }),
    byokCta: L4(language, {
      ko: "설정 열기",
      en: "Open settings",
      ja: "設定を開く",
      zh: "打开设置",
    }),
    footerFlow: L4(language, {
      ko: "제목 · 세계관 · 주인공 · 첫 장면",
      en: "Title · World · Protagonist · First Scene",
      ja: "タイトル · 世界観 · 主人公 · 最初のシーン",
      zh: "标题 · 世界观 · 主角 · 首个场景",
    }),
  };

  // ============================================================
  // PART 4 — 렌더
  // ============================================================

  return (
    <div className="animate-in fade-in zoom-in fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md duration-300">
      <div
        ref={panelRef}
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-[2rem] border border-border/80 bg-bg-primary shadow-2xl shadow-accent-purple/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickstart-modal-title"
        aria-describedby="quickstart-modal-desc"
      >
        <div className="relative px-8 pb-4 pt-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            aria-label={t('quickStartModal.closeQuickStart')}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-purple/10" aria-hidden="true">
              <Sparkles className="h-6 w-6 text-accent-purple" />
            </div>
            <h2 id="quickstart-modal-title" className="font-mono text-2xl font-black italic tracking-tighter">
              {t('quickStartModal.title')}
            </h2>
          </div>

          <p id="quickstart-modal-desc" className="text-sm leading-relaxed text-text-tertiary">
            {t('quickStartModal.desc')}
          </p>

          <div className="mt-4 rounded-2xl border border-white/6 bg-bg-secondary/70 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-purple">
              {t('quickStartModal.flowLabel')}
            </p>
            <p className="mt-2 text-xs leading-6 text-text-secondary">
              {t('quickStartModal.flowDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 pb-8" aria-busy={isGenerating}>
          {/* Provider 선택 섹션 — QuickStartModal 최상단 */}
          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {L.providerHeading}
            </label>
            <div className="space-y-2" role="radiogroup" aria-label={L.providerHeading}>
              {/* DGX 옵션 */}
              <button
                type="button"
                role="radio"
                aria-checked={provider === "dgx"}
                onClick={() => dgxAvailable && setProvider("dgx")}
                disabled={!dgxAvailable}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition-[transform,opacity,background-color,border-color,color] ${
                  provider === "dgx" && dgxAvailable
                    ? "border-emerald-500/70 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                    : dgxAvailable
                      ? "border-border bg-bg-secondary hover:border-emerald-500/40"
                      : "cursor-not-allowed border-border/40 bg-bg-secondary/40 opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Zap className={`mt-0.5 h-5 w-5 shrink-0 ${dgxAvailable ? "text-emerald-400" : "text-text-tertiary"}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{L.dgxTitle}</span>
                      {dgxAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <Check className="h-3 w-3" aria-hidden="true" />
                          {L.dgxReady}
                        </span>
                      ) : (
                        <span className="rounded-md bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-tertiary">
                          {L.dgxUnavailable}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{L.dgxDesc}</p>
                  </div>
                </div>
              </button>

              {/* Gemini 옵션 */}
              <button
                type="button"
                role="radio"
                aria-checked={provider === "gemini"}
                onClick={() => setProvider("gemini")}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition-[transform,opacity,background-color,border-color,color] ${
                  provider === "gemini"
                    ? "border-accent-purple bg-accent-purple/10 shadow-lg shadow-accent-purple/10"
                    : "border-border bg-bg-secondary hover:border-accent-purple/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent-purple" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text-primary">{L.geminiTitle}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{L.geminiDesc}</p>
                    <span
                      role="link"
                      tabIndex={provider === "gemini" ? 0 : -1}
                      onClick={(e) => { e.stopPropagation(); openGeminiKeyGuide(); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          openGeminiKeyGuide();
                        }
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-md bg-accent-purple/15 px-2 py-1 text-[11px] font-semibold text-accent-purple hover:bg-accent-purple/25 focus-visible:ring-2 focus-visible:ring-accent-blue/50 outline-none"
                    >
                      {L.geminiGuide}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </button>

              {/* BYOK 옵션 */}
              <button
                type="button"
                role="radio"
                aria-checked={provider === "byok"}
                onClick={() => setProvider("byok")}
                className={`group w-full rounded-2xl border px-4 py-3 text-left transition-[transform,opacity,background-color,border-color,color] ${
                  provider === "byok"
                    ? "border-accent-blue bg-accent-blue/10 shadow-lg shadow-accent-blue/10"
                    : "border-border bg-bg-secondary hover:border-accent-blue/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Key className="mt-0.5 h-5 w-5 shrink-0 text-accent-blue" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-text-primary">{L.byokTitle}</span>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{L.byokDesc}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {t('quickStartModal.selectGenre')}
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.values(Genre).map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`rounded-xl border px-4 min-h-[40px] text-[13px] font-bold transition-[transform,opacity,background-color,border-color,color] ${
                    selectedGenre === genre
                      ? "border-accent-purple bg-accent-purple text-white shadow-lg shadow-accent-purple/20"
                      : "border-border bg-bg-secondary text-text-secondary hover:border-text-tertiary"
                  }`}
                >
                  {GENRE_LABELS[language][genre]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="px-1 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {t('quickStartModal.storyPrompt')}
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('quickStartModal.placeholder')}
                className="h-32 w-full resize-none rounded-2xl border border-border bg-bg-secondary p-4 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color] placeholder:text-text-tertiary focus:border-accent-purple"
                disabled={isGenerating}
                maxLength={240}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-[11px] font-mono text-text-tertiary tabular-nums">{prompt.length}/240</span>
                <BookOpen className="h-5 w-5 text-text-tertiary opacity-20" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { ko: '회귀한 공작이 망해가는 가문을 구한다', en: 'A regressed duke saves his crumbling family', ja: '回帰した公爵が没落する家門を救う', zh: '回归的公爵拯救没落的家族' },
                { ko: '시스템 능력을 얻은 평범한 고등학생', en: 'An ordinary student gains a System ability', ja: 'システム能力を得た普通の高校生', zh: '获得系统能力的普通高中生' },
                { ko: '마왕을 쓰러뜨린 용사의 일상', en: 'The daily life of a hero who defeated the Demon King', ja: '魔王を倒した勇者の日常', zh: '打败魔王的勇者的日常' },
              ].map((ex, i) => (
                <button key={i} type="button" onClick={() => setPrompt(L4(language, ex))}
                  className="px-3 min-h-[36px] rounded-lg border border-border/50 text-[12px] text-text-tertiary hover:text-text-secondary hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-colors">
                  {L4(language, ex)}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={(provider !== "byok" && !trimmedPrompt) || isGenerating}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-[0.2em] transition-[transform,opacity,background-color,border-color,color] ${
              (provider !== "byok" && !trimmedPrompt) || isGenerating
                ? "cursor-not-allowed bg-bg-secondary text-text-tertiary"
                : "bg-accent-purple text-white shadow-xl shadow-accent-purple/20 hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('quickStartModal.generating')}
              </>
            ) : provider === "byok" ? (
              <>
                <Key className="h-4 w-4" aria-hidden="true" />
                {L.byokCta}
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                {t('quickStartModal.submit')}
              </>
            )}
          </button>

          <p className="text-center font-mono text-[10px] uppercase tracking-tight text-text-tertiary/60">
            {L.footerFlow}
          </p>
        </form>
      </div>
    </div>
  );
}
