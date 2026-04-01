"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export default function NetworkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useLang();

  useEffect(() => {
    logger.error("Network", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center space-y-4 p-8 max-w-md" role="alert">
        <h2 className="text-lg font-black tracking-tighter uppercase font-mono text-red-400">
          {L4(lang, {
            ko: '네트워크 오류',
            en: 'Network Error',
            jp: 'ネットワークエラー',
            cn: '网络错误',
          })}
        </h2>
        <p className="text-sm text-text-secondary">
          {L4(lang, {
            ko: '문제가 발생했습니다. 다시 시도해 주세요.',
            en: 'Something went wrong. Please try again.',
            jp: '問題が発生しました。もう一度お試しください。',
            cn: '出现了问题，请重试。',
          })}
        </p>
        <p className="text-xs text-text-tertiary">
          {error.message || L4(lang, {
            ko: '예상치 못한 오류가 발생했습니다.',
            en: 'An unexpected error occurred.',
            jp: '予期しないエラーが発生しました。',
            cn: '发生了意外错误。',
          })}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity"
        >
          {L4(lang, {
            ko: '다시 시도',
            en: 'Retry',
            jp: '再試行',
            cn: '重试',
          })}
        </button>
      </div>
    </div>
  );
}
