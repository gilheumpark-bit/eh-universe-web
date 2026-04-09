// @ts-nocheck
"use client";

import { Suspense } from "react";
import { useLang } from "@/lib/LangContext";
import { TRANSLATIONS } from "@/lib/studio-translations";
import type { AppLanguage } from "@/types/i18n";
import { CodeStudioSkeleton } from "@/components/SkeletonLoader";
import ScopeShell from "@/components/code-studio/ScopeShell";

function CodeStudioLoading() {
  const { lang } = useLang();
  const langKey = ((lang ?? "ko").toString().toUpperCase() as AppLanguage);
  const tcs =
    TRANSLATIONS[langKey]?.codeStudio ??
    TRANSLATIONS.KO?.codeStudio ??
    ({ loading: "Loading..." } as { loading: string });
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

export default function CodeStudioPage() {
  return (
    <Suspense fallback={<CodeStudioSkeleton />}>
      <div className="h-screen w-screen overflow-hidden bg-bg-primary">
        <Suspense fallback={<CodeStudioLoading />}>
          <ScopeShell />
        </Suspense>
      </div>
    </Suspense>
  );
}
