"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useLang } from "@/lib/LangContext";
import { TRANSLATIONS } from "@/lib/studio-translations";
import type { AppLanguage } from "@/lib/studio-types";
import { CodeStudioSkeleton } from "@/components/SkeletonLoader";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileDesktopOnlyGate from "@/components/studio/MobileDesktopOnlyGate";

function CodeStudioLoading() {
  const { lang } = useLang();
  const tcs = TRANSLATIONS[lang.toUpperCase() as AppLanguage]?.codeStudio ?? TRANSLATIONS.KO.codeStudio;
  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <div className="text-center">
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-t-transparent mb-4"
          style={{ borderColor: "var(--color-accent-green)", borderTopColor: "transparent" }}
        />
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          {tcs.loading}
        </p>
      </div>
    </div>
  );
}

// Monaco 에디터 포함 → SSR 불가, 반드시 dynamic import
const CodeStudioShell = dynamic(
  () => import("@/components/code-studio/CodeStudioShell"),
  {
    ssr: false,
    loading: () => <CodeStudioLoading />,
  }
);

export default function CodeStudioPage() {
  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    setForceDesktop(p.get('force') === 'desktop' || localStorage.getItem('noa_force_desktop') === '1');
  }, []);

  // 모바일 게이트 — Monaco 에디터는 모바일에서 사실상 사용 불가
  if (isMobile && !forceDesktop) {
    return (
      <MobileDesktopOnlyGate
        featureNameKo="코드 스튜디오"
        featureNameEn="Code Studio"
        featureNameJa="コードスタジオ"
        featureNameZh="代码工作室"
        reasonKo="Monaco 에디터, 터미널, 파일 트리, 9-team 파이프라인 등 복잡한 IDE UX가 모바일 화면에 맞지 않습니다. 데스크톱(1280px+)에서 이용해주세요."
        reasonEn="Monaco editor, terminal, file tree, and 9-team pipeline require desktop-sized screens (1280px+)."
        reasonJa="Monacoエディター、ターミナル、ファイルツリー、9-teamパイプラインなどの複雑なIDE UXはモバイル画面に適していません。デスクトップ(1280px+)でご利用ください。"
        reasonZh="Monaco 编辑器、终端、文件树、9 团队流水线等复杂 IDE UX 不适合移动端。请在桌面端(1280px+)使用。"
      />
    );
  }

  return (
    <Suspense fallback={<CodeStudioSkeleton />}>
      <div className="h-screen w-screen overflow-hidden bg-bg-primary">
        <CodeStudioShell />
      </div>
    </Suspense>
  );
}
