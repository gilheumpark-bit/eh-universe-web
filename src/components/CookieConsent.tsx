"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 2 — Cookie Consent Banner
// GDPR + ePrivacy + K-PIPA 공통 충족
// localStorage 'eh-cookie-consent' = 'accepted' | 'rejected' | null
// ============================================================

const STORAGE_KEY = "eh-cookie-consent";

export default function CookieConsent() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // 첫 방문 — 배너 표시 (800ms 지연: LCP 방해 방지)
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage 접근 불가 (프라이빗 브라우징 등) — 배너 skip
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      /* private browsing */
    }
    setVisible(false);
  };

  const handleReject = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "rejected");
    } catch {
      /* private browsing */
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={T({ ko: "쿠키 동의", en: "Cookie Consent", ja: "Cookie同意", zh: "Cookie 同意" })}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[9998] bg-bg-primary border border-border rounded-xl shadow-2xl p-4 md:p-5"
      style={{ zIndex: 9998 }}
    >
      <div className="text-xs font-mono uppercase tracking-widest text-accent-purple mb-2">
        {T({ ko: "쿠키 · 로컬 저장", en: "Cookies · Local Storage", ja: "Cookie・ローカル保存", zh: "Cookie · 本地存储" })}
      </div>
      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        {T({
          ko: "로어가드는 필수 기능(로그인, 언어 설정, 원고 저장)과 서비스 품질 개선을 위해 쿠키와 로컬 저장소를 사용합니다. 계속 이용하시면 동의한 것으로 간주됩니다.",
          en: "Loreguard uses cookies and local storage for essential features (login, language, manuscript saving) and service quality. Continuing to use the service implies consent.",
          ja: "Loreguard は必須機能(ログイン、言語設定、原稿保存)とサービス品質改善のため Cookie とローカルストレージを使用します。",
          zh: "Loreguard 使用 Cookie 和本地存储以实现必要功能(登录、语言、原稿保存)及服务改进。",
        })}
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={handleAccept}
          style={{ color: '#ffffff' }}
          className="bg-accent-blue px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
        >
          {T({ ko: "동의", en: "Accept", ja: "同意", zh: "同意" })}
        </button>
        <button
          onClick={handleReject}
          className="bg-transparent border border-border text-text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
        >
          {T({ ko: "필수만", en: "Essential Only", ja: "必須のみ", zh: "仅必需" })}
        </button>
        <Link
          href="/privacy"
          className="text-xs text-text-tertiary hover:text-text-secondary underline ml-auto min-h-[44px] inline-flex items-center"
        >
          {T({ ko: "자세히", en: "Details", ja: "詳細", zh: "详情" })}
        </Link>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: CookieConsent | role=gdpr-cookie-banner | inputs=lang | outputs=banner
