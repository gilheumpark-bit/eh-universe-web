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

  return (
    <main aria-label="Translation Studio">
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
