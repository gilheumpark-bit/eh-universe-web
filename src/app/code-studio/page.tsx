"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { TRANSLATIONS } from "@/lib/studio-translations";
import type { AppLanguage } from "@/lib/studio-types";
import { CodeStudioSkeleton } from "@/components/SkeletonLoader";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileDesktopOnlyGate from "@/components/studio/MobileDesktopOnlyGate";
import { useUserRoleSafe } from "@/contexts/UserRoleContext";

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
  const { lang } = useLang();
  const userRole = useUserRoleSafe();
  const [forceDesktop, setForceDesktop] = useState(false);
  const [bypassRoleGate, setBypassRoleGate] = useState(false);

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

  // 역할 기반 접근 게이트 — Provider 마운트되었고 developer role 또는 developerMode가 아니면 경고.
  // [C] Provider 미마운트(userRole === null)는 안전 fallback으로 통과 (e.g. 테스트/SSR 폴백)
  const canAccess = !userRole || userRole.role === 'developer' || userRole.developerMode;
  if (!canAccess && !bypassRoleGate) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg-primary p-6">
        <div className="max-w-lg w-full p-8 bg-bg-secondary rounded-2xl border border-border text-center">
          <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
          <h1 className="text-2xl font-bold mb-3 text-text-primary">
            {L4(lang, {
              ko: '개발자 전용 기능',
              en: 'Developer Only',
              ja: '開発者専用機能',
              zh: '仅限开发者',
            })}
          </h1>
          <p className="text-text-secondary mb-6 leading-relaxed">
            {L4(lang, {
              ko: 'Code Studio는 코드 생성·검증 도구입니다.\n소설 집필이 목적이라면 Studio를 이용하세요.',
              en: 'Code Studio is a code generation & validation tool.\nIf you came to write novels, head to Studio.',
              ja: 'Code Studio はコード生成・検証ツールです。\n小説執筆が目的なら Studio をご利用ください。',
              zh: 'Code Studio 是代码生成与验证工具。\n如需小说创作请前往 Studio。',
            }).split('\n').map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => {
                userRole?.setDeveloperMode(true);
                setBypassRoleGate(true);
              }}
              className="px-5 py-2.5 bg-accent-blue text-white rounded-lg font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
            >
              {L4(lang, {
                ko: '개발자 모드로 계속',
                en: 'Continue as Developer',
                ja: '開発者モードで続ける',
                zh: '以开发者模式继续',
              })}
            </button>
            <Link
              href="/studio"
              className="px-5 py-2.5 bg-bg-tertiary text-text-primary rounded-lg font-medium hover:bg-bg-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px] inline-flex items-center justify-center"
            >
              {L4(lang, {
                ko: 'Studio로 이동',
                en: 'Go to Studio',
                ja: 'Studio へ移動',
                zh: '前往 Studio',
              })}
            </Link>
          </div>
        </div>
      </main>
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
