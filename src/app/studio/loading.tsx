"use client";

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export default function StudioLoading() {
  const { lang } = useLang();

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="text-center">
        <div
          className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--color-accent-purple)", borderTopColor: "transparent" }}
        />
        <p className="font-mono text-xs text-text-tertiary tracking-wider uppercase">
          {L4(lang, {
            ko: '스튜디오 초기화 중...',
            en: 'INITIALIZING STUDIO...',
            jp: 'スタジオを初期化中...',
            cn: '正在初始化工作室...',
          })}
        </p>
      </div>
    </div>
  );
}
