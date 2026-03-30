"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useLang } from "@/lib/LangContext";
import { TRANSLATIONS } from "@/lib/studio-translations";
import type { AppLanguage } from "@/lib/studio-types";
import { CodeStudioSkeleton } from "@/components/SkeletonLoader";

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
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-text-tertiary">
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
  return (
    <Suspense fallback={<CodeStudioSkeleton />}>
      <div className="h-screen w-screen overflow-hidden bg-bg-primary">
        <CodeStudioShell />
      </div>
    </Suspense>
  );
}
