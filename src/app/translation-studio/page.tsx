"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileDesktopOnlyGate from "@/components/studio/MobileDesktopOnlyGate";

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

export default function TranslationStudioPage() {
  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    setForceDesktop(p.get('force') === 'desktop' || localStorage.getItem('noa_force_desktop') === '1');
  }, []);

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

  return <TranslatorStudioApp />;
}
