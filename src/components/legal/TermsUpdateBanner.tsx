"use client";

// ============================================================
// PART 1 — Imports & Constants
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// 약관이 실제로 바뀌면 이 값만 bump — Footer/법적 페이지와 동기화
// YYYY-MM-DDTHH:mm:ssZ 형식 유지 (비교 안정성)
export const TERMS_UPDATED_AT = "2026-04-18T00:00:00Z";

const STORAGE_KEY = "noa_terms_accepted_at";

// ============================================================
// PART 2 — Banner Component
// 로그인 여부 무관: localStorage 기준으로 업데이트 감지
// 이전 확인 시각 < TERMS_UPDATED_AT 이면 노출, 확인 누르면 갱신
// ============================================================

export default function TermsUpdateBanner() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const updatedAt = new Date(TERMS_UPDATED_AT).getTime();
      if (!Number.isFinite(updatedAt)) return;

      if (!saved) {
        // [C] 첫 방문 — 배너 노출은 생략(과도한 팝업 방지). 초기값만 기록.
        localStorage.setItem(STORAGE_KEY, TERMS_UPDATED_AT);
        return;
      }
      const savedTs = new Date(saved).getTime();
      if (!Number.isFinite(savedTs) || savedTs < updatedAt) {
        // LCP 방해 방지: 1.2초 지연 후 표시
        const timer = setTimeout(() => setShowBanner(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // [C] private browsing / storage 접근 불가 — 조용히 skip
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, TERMS_UPDATED_AT);
    } catch {
      /* private browsing */
    }
    setShowBanner(false);
  };

  if (!mounted || !showBanner) return null;

  const updatedLabel = (() => {
    try {
      return new Date(TERMS_UPDATED_AT).toLocaleDateString(
        lang === "en" ? "en-US" : lang === "ja" ? "ja-JP" : lang === "zh" ? "zh-CN" : "ko-KR",
      );
    } catch {
      return TERMS_UPDATED_AT.slice(0, 10);
    }
  })();

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label={T({
        ko: "약관 업데이트 알림",
        en: "Terms update notice",
        ja: "規約更新のお知らせ",
        zh: "条款更新提示",
      })}
      className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-sm p-4 bg-bg-primary border border-border rounded-xl shadow-2xl"
      style={{ zIndex: 9997 }}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-accent-purple mb-2">
        {T({
          ko: "서비스 약관 업데이트",
          en: "Terms Update",
          ja: "利用規約の更新",
          zh: "服务条款更新",
        })}
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">
        {T({
          ko: `서비스 약관이 업데이트되었습니다. (${updatedLabel})`,
          en: `Our terms of service have been updated. (${updatedLabel})`,
          ja: `利用規約が更新されました。(${updatedLabel})`,
          zh: `服务条款已更新。(${updatedLabel})`,
        })}
      </p>
      <div className="flex gap-3 items-center mt-3">
        <Link
          href="/terms"
          className="text-xs text-accent-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[32px] inline-flex items-center"
        >
          {T({ ko: "약관 보기", en: "View Terms", ja: "規約を見る", zh: "查看条款" })}
        </Link>
        <button
          type="button"
          onClick={handleAccept}
          className="ml-auto bg-accent-blue text-white px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[40px]"
        >
          {T({ ko: "확인", en: "Acknowledge", ja: "確認", zh: "确认" })}
        </button>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: TermsUpdateBanner | role=terms-update-notifier | inputs=localStorage | outputs=banner
