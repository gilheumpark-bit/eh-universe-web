"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

/**
 * 앱(몰입) 경로 — 이곳에서는 Footer 미렌더.
 * 집필·번역·코드 스튜디오는 상태바(fixed bottom-0)를 사용하므로
 * 법적 링크 푸터가 시각적으로 충돌·몰입 방해를 일으킨다.
 * 공개 페이지(/, /archive, /privacy …)는 그대로 Footer 노출.
 */
const APP_ROUTE_PREFIXES: readonly string[] = [
  "/studio",
  "/translation-studio",
  "/code-studio",
  "/welcome",
  "/network",
];

// ============================================================
// PART 2 — Footer Component — 법적 링크 + 브랜드 표시
// 전역 layout.tsx에 mount — 공개 페이지에서만 노출 (앱 경로 제외)
// ============================================================

export default function Footer() {
  const { lang } = useLang();
  const pathname = usePathname();
  // 앱 경로에선 null 반환 — layout.tsx는 전역 mount 유지하되 컴포넌트가 스스로 차단
  if (pathname && APP_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-bg-primary" role="contentinfo">
      <div className="site-shell py-8 md:py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex flex-col gap-1">
            <div className="font-bold text-text-primary text-sm tracking-tight">
              Loreguard
              <span className="text-text-tertiary font-normal ml-2">
                ({T({ ko: "로어가드", en: "Loreguard", ja: "ロアガード", zh: "守卷者" })})
              </span>
            </div>
            <div className="text-xs text-text-tertiary">
              {T({
                ko: `© ${year} EH Universe · 작가 주도형 집필 IDE`,
                en: `© ${year} EH Universe · Writer-first Novel IDE`,
                ja: `© ${year} EH Universe · 作家主導型執筆IDE`,
                zh: `© ${year} EH Universe · 作家主导型写作 IDE`,
              })}
            </div>
          </div>

          {/* Legal Links */}
          <nav
            aria-label={T({ ko: "법적 고지", en: "Legal", ja: "法的告知", zh: "法律声明" })}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs"
          >
            <Link
              href="/privacy"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "개인정보처리방침", en: "Privacy", ja: "プライバシー", zh: "隐私政策" })}
            </Link>
            <Link
              href="/terms"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "이용약관", en: "Terms", ja: "利用規約", zh: "服务条款" })}
            </Link>
            <Link
              href="/copyright"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "저작권", en: "Copyright", ja: "著作権", zh: "著作权" })}
            </Link>
            <Link
              href="/ai-disclosure"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "AI 고지", en: "AI Disclosure", ja: "AI告知", zh: "AI 告知" })}
            </Link>
            <Link
              href="/about"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "소개", en: "About", ja: "紹介", zh: "关于" })}
            </Link>
            <Link
              href="/changelog"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "변경 이력", en: "Changelog", ja: "変更履歴", zh: "更新日志" })}
            </Link>
            <a
              href="mailto:gilheumpark@gmail.com"
              className="text-text-secondary hover:text-text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded px-1 py-0.5 min-h-[44px] inline-flex items-center"
            >
              {T({ ko: "문의", en: "Contact", ja: "お問い合わせ", zh: "联系" })}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

// IDENTITY_SEAL: Footer | role=legal-footer | inputs=lang | outputs=footer-nav
