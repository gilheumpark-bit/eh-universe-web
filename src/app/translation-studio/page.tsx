"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLang } from "@/lib/LangContext";
import MobileDesktopOnlyGate from "@/components/studio/MobileDesktopOnlyGate";
import { SampleTranslationDemo } from "@/components/translator/SampleTranslationDemo";

const TranslatorStudioApp = dynamic(
  () => import("@/components/translator/TranslatorStudioApp"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[70vh] items-center justify-center font-mono text-sm text-text-tertiary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-accent-amber/30 border-t-accent-amber rounded-full animate-spin" />
          <span>Translation Studio</span>
        </div>
      </div>
    ),
  },
);

const VISITED_KEY = "noa_translation_studio_visited";

const DEMO_SUMMARY_LABEL: Record<string, string> = {
  ko: "30초 체험 (샘플 번역)",
  en: "30-Second Demo (Sample Translation)",
  ja: "30秒体験 (サンプル翻訳)",
  zh: "30 秒体验 (示例翻译)",
};

export default function TranslationStudioPage() {
  const isMobile = useIsMobile();
  const { lang } = useLang();
  const [forceDesktop, setForceDesktop] = useState(false);
  // [C] SSR-safe: 서버 렌더 시 null, 클라이언트 hydration 후 결정
  const [hasVisited, setHasVisited] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForceDesktop(
      p.get("force") === "desktop" || localStorage.getItem("noa_force_desktop") === "1",
    );
    try {
      setHasVisited(localStorage.getItem(VISITED_KEY) === "1");
    } catch {
      // localStorage 접근 실패 (private mode 등) → 첫 방문 취급
      setHasVisited(false);
    }
  }, []);

  // 데모 펼침 시 방문 플래그 기록 (한 번만)
  const handleDemoToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open && hasVisited === false) {
      try {
        localStorage.setItem(VISITED_KEY, "1");
        setHasVisited(true);
      } catch {
        /* ignore — 쿠키/스토리지 차단 환경 */
      }
    }
  };

  if (isMobile && !forceDesktop) {
    return (
      <MobileDesktopOnlyGate
        featureNameKo="번역 스튜디오"
        featureNameEn="Translation Studio"
        featureNameJa="翻訳スタジオ"
        featureNameZh="翻译工作室"
        reasonKo="원문/번역 듀얼 에디터, 세그먼트 편집, 6축 채점 대시보드가 모바일 화면에 맞지 않습니다. 데스크톱에서 이용해주세요."
        reasonEn="Source/target dual editor, segment editing, and 6-axis scoring dashboard require desktop screens."
        reasonJa="原文/訳文デュアルエディター、セグメント編集、6軸評価ダッシュボードはモバイル画面に適していません。デスクトップでご利用ください。"
        reasonZh="原文/译文双编辑器、片段编辑、6 轴评分仪表盘不适合移动端。请在桌面端使用。"
      />
    );
  }

  // hasVisited === null (SSR or initial): 데모 섹션은 collapsed 초기 렌더 (hydration mismatch 방지)
  // hasVisited === false: 첫 방문 → open
  // hasVisited === true: 재방문 → closed, 필요 시 수동 확장
  const summaryLabel = DEMO_SUMMARY_LABEL[lang] ?? DEMO_SUMMARY_LABEL.ko;

  // [Tier 1 fix — 2026-05-08] Fiction-native Translation Studio 카피 4언어 — 시장 분석 2차/3차/4차 반영
  // 4차: "Source-faithful + Market-ready 2개 출력" — "원문은 지키고, 시장에는 맞춘다."
  const HEADER_COPY = {
    ko: {
      eyebrow: 'FICTION-NATIVE TRANSLATION STUDIO · CROSS-BORDER NOVEL IDE',
      title: '소설 전문 번역 스튜디오',
      sub: '문장이 아니라 작품을 번역합니다. 세계관·캐릭터·용어집·회차 맥락을 한 번에.',
      dualOutput: '원문 보존 번역 + 현지화 번역 — 두 결과를 함께 받습니다',
      dualSlogan: '원문은 지키고, 시장에는 맞춘다.',
      bidir: '한국 작가는 세계로 · 해외 작가는 한국·아시아로',
      philosophy: 'AI prepares · Translators elevate · Authors go global',
    },
    en: {
      eyebrow: 'FICTION-NATIVE TRANSLATION STUDIO · CROSS-BORDER NOVEL IDE',
      title: 'Fiction-native Translation Studio',
      sub: 'Not text translation. Fiction localization with story context preserved.',
      dualOutput: 'Source-faithful Translation + Market-ready Localization — get both',
      dualSlogan: 'Faithful where it matters. Localized where it counts.',
      bidir: 'Korean writers → world · Global writers → Korea & Asia',
      philosophy: 'AI prepares · Translators elevate · Authors go global',
    },
    ja: {
      eyebrow: 'FICTION-NATIVE TRANSLATION STUDIO · CROSS-BORDER NOVEL IDE',
      title: '小説専門 翻訳スタジオ',
      sub: '文章ではなく作品を翻訳。世界観・キャラ・用語集・話数文脈を一括反映。',
      dualOutput: '原文保存翻訳 + 現地化翻訳 — 2 つの結果を同時に',
      dualSlogan: '原文は守り、市場には合わせる。',
      bidir: '韓国の作家は世界へ · 海外の作家は韓国・アジアへ',
      philosophy: 'AI prepares · Translators elevate · Authors go global',
    },
    zh: {
      eyebrow: 'FICTION-NATIVE TRANSLATION STUDIO · CROSS-BORDER NOVEL IDE',
      title: '小说专业翻译工作室',
      sub: '不是句子翻译,而是作品翻译。世界观、角色、术语、章节脉络全部融入。',
      dualOutput: '原文保留翻译 + 本地化翻译 — 同时输出两个结果',
      dualSlogan: '守住原文,贴合市场。',
      bidir: '韩国作家走向世界 · 海外作家进入韩国与亚洲',
      philosophy: 'AI prepares · Translators elevate · Authors go global',
    },
  } as const;
  const copy = HEADER_COPY[(lang as keyof typeof HEADER_COPY)] ?? HEADER_COPY.ko;

  return (
    <main aria-label="Fiction-native Translation Studio · Cross-border Novel IDE">
      {/* [Tier 1 fix — 2026-05-08] Fiction-native 헤더 카피 — 시장 분석 2차/3차 양방향 메시지 */}
      <header className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <p className="font-mono text-[9px] tracking-[0.22em] text-accent-purple uppercase mb-2">
          {copy.eyebrow}
        </p>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-text-primary leading-tight">
          {copy.title}
          <span
            className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-[0.2em] bg-accent-purple/15 text-accent-purple border border-accent-purple/25 align-middle"
            aria-label="Cross-border Novel IDE 카테고리"
          >
            Novel IDE
          </span>
        </h1>
        <p className="text-[13px] text-text-secondary leading-relaxed mt-1.5">{copy.sub}</p>
        {/* [시장 분석 4차] 2개 출력 모델 명시 — 원문 보존 + 현지화 동시 제공 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent-green/10 border border-accent-green/30 text-accent-green font-bold">
            <span className="font-mono">FAITHFUL</span>
            <span className="text-accent-green/70">+</span>
            <span className="font-mono">MARKET</span>
          </span>
          <span className="text-text-secondary font-medium">{copy.dualOutput}</span>
        </div>
        <p className="text-[12px] text-accent-purple/90 italic mt-1">&ldquo;{copy.dualSlogan}&rdquo;</p>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
          <span className="text-text-tertiary">{copy.bidir}</span>
          <span className="text-text-tertiary/40">·</span>
          <span className="font-mono text-accent-amber/90 uppercase tracking-wider">{copy.philosophy}</span>
        </div>
      </header>

      {hasVisited !== null && (
        <details
          open={hasVisited === false}
          onToggle={handleDemoToggle}
          className="group max-w-3xl mx-auto mt-4 px-4"
        >
          <summary className="cursor-pointer list-none flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded transition focus-visible:ring-2 focus-visible:ring-accent-amber outline-none">
            <ChevronDown
              className="w-4 h-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
            {summaryLabel}
          </summary>
          <SampleTranslationDemo />
        </details>
      )}
      <TranslatorStudioApp />
    </main>
  );
}
