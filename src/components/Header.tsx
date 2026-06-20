"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
// 2026-04-21 [PERF] firebase-env에서 직접 import (Firebase SDK 100KB 비번들).
import { isTestEnvironment } from "@/lib/firebase-env";
import { getNovelStudioHref, getTranslatorStudioHref, NOVEL_STUDIO_PATH, TRANSLATION_STUDIO_PATH } from "@/lib/studio-entry-links";

type NavKey = "home" | "studio" | "translate";

type NavEntry = {
  key: NavKey;
  href: string;
  label: string;
  external?: boolean;
};

function usePrimaryNavActive(pathname: string): (item: NavEntry) => boolean {
  return (item: NavEntry) => {
    switch (item.key) {
      case "home":
        return pathname === "/";
      case "studio":
        return pathname === NOVEL_STUDIO_PATH || pathname.startsWith(`${NOVEL_STUDIO_PATH}/`);
      case "translate":
        if (item.external) return false;
        return pathname === TRANSLATION_STUDIO_PATH || pathname.startsWith(`${TRANSLATION_STUDIO_PATH}/`);
      default:
        return false;
    }
  };
}

type HeaderInnerProps = { stellarWhite?: boolean };

function HeaderInner({ stellarWhite = false }: HeaderInnerProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsFocusIdx, setToolsFocusIdx] = useState(-1);
  const { lang, toggleLang } = useLang();

  const translatorHref = useMemo(() => getTranslatorStudioHref(), []);
  const translatorExternal = translatorHref.startsWith("http");

  const navItems = useMemo((): NavEntry[] => {
    const all: NavEntry[] = [
      { key: "home", href: "/", label: L4(lang, { ko: "홈", en: "HOME", ja: "ホーム", zh: "首页" }) },
      { key: "studio", href: getNovelStudioHref("create"), label: L4(lang, { ko: "스튜디오", en: "STUDIO", ja: "スタジオ", zh: "工作室" }) },
      {
        key: "translate",
        href: translatorHref,
        label: L4(lang, { ko: "번역", en: "TRANS", ja: "翻訳", zh: "翻译" }),
        external: translatorExternal,
      },
    ];
    return all;
  }, [lang, translatorHref, translatorExternal]);

  const isNavActive = usePrimaryNavActive(pathname);

  const exploreItems = useMemo(
    () => [
      { href: "/docs", label: L4(lang, { ko: "문서", en: "DOCS", ja: "ドキュメント", zh: "文档" }) },
      { href: "/verify", label: L4(lang, { ko: "확인", en: "VERIFY", ja: "確認", zh: "确认" }) },
      { href: "/status", label: L4(lang, { ko: "상태", en: "STATUS", ja: "状態", zh: "状态" }) },
    ],
    [lang],
  );

  const toolItems = useMemo(
    () => [
      { href: "/about", label: L4(lang, { ko: "소개", en: "ABOUT", ja: "紹介", zh: "关于" }) },
      { href: "/changelog", label: L4(lang, { ko: "변경 이력", en: "CHANGELOG", ja: "変更履歴", zh: "更新日志" }) },
      { href: "/privacy", label: L4(lang, { ko: "개인정보", en: "PRIVACY", ja: "プライバシー", zh: "隐私" }) },
      { href: "/terms", label: L4(lang, { ko: "이용약관", en: "TERMS", ja: "利用規約", zh: "条款" }) },
    ],
    [lang],
  );

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMenuOpen(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleEscape);
      };
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const toolMenuRef = useRef<HTMLDivElement>(null);
  const toolItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const closeToolsMenu = useCallback(() => {
    setToolsOpen(false);
    setToolsFocusIdx(-1);
  }, []);

  const toolItemCount = toolItems.length;

  useEffect(() => {
    if (toolsOpen && toolsFocusIdx >= 0 && toolItemRefs.current[toolsFocusIdx]) {
      toolItemRefs.current[toolsFocusIdx]?.focus();
    }
  }, [toolsOpen, toolsFocusIdx]);

  const handleToolsKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!toolsOpen) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setToolsFocusIdx((prev) => (prev + 1) % toolItemCount);
          break;
        case "ArrowUp":
          e.preventDefault();
          setToolsFocusIdx((prev) => (prev - 1 + toolItemCount) % toolItemCount);
          break;
        case "Escape":
          e.preventDefault();
          closeToolsMenu();
          break;
        case "Home":
          e.preventDefault();
          setToolsFocusIdx(0);
          break;
        case "End":
          e.preventDefault();
          setToolsFocusIdx(toolItemCount - 1);
          break;
      }
    },
    [toolsOpen, closeToolsMenu, toolItemCount],
  );

  const closeExploreMenu = useCallback(() => {
    setExploreOpen(false);
  }, []);

  const navLinkClass = (active: boolean) =>
    stellarWhite
      ? `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-none border-0 border-b-2 px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-[transform,opacity,background-color,border-color,color] duration-150 ${
          active
            ? "border-amber-200 font-bold !text-amber-200"
            : "border-transparent font-medium !text-stone-300 hover:bg-white/5 hover:!text-stone-100"
        }`
      : `rounded-full border px-3.5 py-2 min-h-[44px] inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-[transform,opacity,background-color,border-color,color] duration-150 ${
          active
            ? "border-accent-amber/25 bg-accent-amber/8 text-accent-amber font-bold border-b-2 border-b-accent-amber"
            : "font-medium border-transparent text-text-secondary hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
        }`;

  const renderDesktopNavItem = (item: NavEntry) => {
    const active = isNavActive(item);
    const testId = `${item.key}-nav-link`;
    if (item.external) {
      return (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={testId}
          className={navLinkClass(active)}
        >
          {item.label}
        </a>
      );
    }
    return (
      <Link
        key={item.key}
        href={item.href}
        data-testid={testId}
        aria-current={active ? "page" : undefined}
        className={navLinkClass(active)}
      >
        {item.label}
      </Link>
    );
  };

  const barShell = stellarWhite
    ? "flex w-full min-h-16 items-center justify-between border-b border-white/10 bg-stone-950/75 px-5 py-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl md:px-8"
    : "premium-panel-soft flex min-h-16 items-center justify-between px-4 py-3 md:px-5";

  const exploreBtnClass = (active: boolean) =>
    stellarWhite
      ? `inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-0 px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-[transform,opacity,background-color,border-color,color] duration-150 ${
          active
            ? "font-bold !text-amber-200 underline decoration-amber-200/80 decoration-2 underline-offset-8"
            : "font-medium !text-stone-300 hover:bg-white/5 hover:!text-stone-100"
        }`
      : `rounded-full border px-3.5 py-2 min-h-[44px] inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-[transform,opacity,background-color,border-color,color] duration-150 ${
          active
            ? "border-accent-amber/25 bg-accent-amber/8 text-accent-amber font-bold"
            : "font-medium border-transparent text-text-secondary hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
        }`;

  // [D] 지원 버튼 — WCAG 터치타겟 44px (탐색 버튼과 동일)
  const toolsBtnClass = stellarWhite
    ? "rounded-full border border-transparent px-3.5 py-2 min-h-[44px] inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.06em] !text-stone-300 transition-colors hover:bg-white/5 hover:!text-stone-100"
    : "rounded-full border border-transparent px-3.5 py-2 min-h-[44px] inline-flex items-center font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.06em] text-text-secondary transition-colors hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary";

  return (
    <header
      data-testid="home-header"
      data-stellar-white={stellarWhite ? "true" : undefined}
      className={`fixed inset-x-0 top-0 z-50 ${stellarWhite ? "px-0 pt-0" : "px-3 md:px-5"}`}
      style={stellarWhite ? undefined : { paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <div className={stellarWhite ? "w-full" : "site-shell"}>
        <div className={barShell}>
          <Link
            href="/"
            aria-label="로어가드 (Loreguard) — Home"
            className="group flex items-center gap-3 rounded-full pr-2"
          >
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 items-center justify-center rounded-full border font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] transition-transform group-hover:scale-[1.04] ${
                stellarWhite
                  ? "border-amber-200/35 bg-amber-200/10 text-amber-200"
                  : "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
              }`}
            >
              LG
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-2">
                <span
                  className={`font-[family-name:var(--font-display)] text-[1.02rem] font-semibold tracking-[0.16em] transition-colors ${
                    stellarWhite
                      ? "text-amber-200 group-hover:text-amber-100"
                      : "text-text-primary group-hover:text-accent-amber"
                  }`}
                >
                  로어가드
                </span>
                {isTestEnvironment && (
                  <span aria-hidden="true" className="rounded-md border border-accent-red/30 bg-accent-red/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold tracking-[0.18em] text-accent-red uppercase">
                    TEST
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={`hidden sm:inline font-[family-name:var(--font-mono)] text-[10px] tracking-[0.24em] uppercase ${
                  stellarWhite ? "text-stone-400" : "text-text-tertiary"
                }`}
              >
                {L4(lang, {
                  ko: "Loreguard · 창작 전문 IDE",
                  en: "Loreguard · Creative IDE",
                  ja: "Loreguard · 創作専門IDE",
                  zh: "Loreguard · 创作专业 IDE",
                })}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-wrap items-center justify-end gap-1.5 lg:gap-2 md:flex" role="navigation" aria-label="Main navigation">
            {navItems.map(renderDesktopNavItem)}
            {/* Explore dropdown: current Loreguard support pages only. */}
            <div className="relative" onMouseEnter={() => setExploreOpen(true)} onMouseLeave={closeExploreMenu}>
              <button
                type="button"
                onClick={() => {
                  setExploreOpen((p) => !p);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" && !exploreOpen) {
                    e.preventDefault();
                    setExploreOpen(true);
                  }
                  if (e.key === "Escape" && exploreOpen) {
                    e.preventDefault();
                    setExploreOpen(false);
                  }
                }}
                aria-expanded={exploreOpen}
                aria-haspopup="menu"
                aria-label="Explore menu"
                className={exploreBtnClass(exploreItems.some((item) => pathname.startsWith(item.href)))}
              >
                {L4(lang, { ko: "탐색", en: "EXPLORE", ja: "探索", zh: "探索" })}
              </button>
              {exploreOpen && (
                <div className="absolute left-0 top-full z-[var(--z-dropdown)] pt-3">
                  <div
                    className="premium-panel-soft min-w-[180px] overflow-hidden rounded-3xl border border-white/8 p-2"
                    role="menu"
                    aria-label="Explore"
                  >
                    {exploreItems.map((ei) => {
                      const isExActive = pathname.startsWith(ei.href);
                      return (
                        <Link
                          key={ei.href}
                          href={ei.href}
                          role="menuitem"
                          onClick={closeExploreMenu}
                          className={`block rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs tracking-[0.04em] transition-colors ${
                            isExActive
                              ? "bg-accent-amber/8 text-accent-amber font-bold"
                              : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
                          }`}
                        >
                          {ei.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div
              className="relative"
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={closeToolsMenu}
              onKeyDown={handleToolsKeyDown}
              ref={toolMenuRef}
            >
              <button
                type="button"
                onClick={() => {
                  setToolsOpen((p) => !p);
                  setToolsFocusIdx(-1);
                }}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-label="Support menu"
                className={toolsBtnClass}
              >
                {L4(lang, { ko: "지원", en: "SUPPORT", ja: "サポート", zh: "支持" })}
              </button>
              {toolsOpen && (
                <div className="absolute right-0 top-full z-[var(--z-dropdown)] pt-3">
                  <div className="premium-panel-soft min-w-[220px] overflow-hidden rounded-3xl border border-white/8 p-2" role="menu" aria-label="Support">
                    {toolItems.map((ti, idx) => (
                      <Link
                        key={ti.href}
                        href={ti.href}
                        ref={(el) => {
                          toolItemRefs.current[idx] = el;
                        }}
                        role="menuitem"
                        tabIndex={toolsFocusIdx === idx ? 0 : -1}
                        onClick={closeToolsMenu}
                        className="block rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs tracking-[0.04em] text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                      >
                        {ti.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleLang}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] transition-colors ${
                stellarWhite
                  ? "border-amber-200/40 bg-amber-200/10 !text-amber-200 hover:bg-amber-200/15"
                  : "border-accent-amber/20 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/15"
              }`}
              aria-label={`${lang.toUpperCase()} — Toggle language`}
            >
              {lang.toUpperCase()}
            </button>
          </nav>

          {/* Mobile right controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleLang}
              aria-label={`${lang.toUpperCase()} — Toggle language`}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] ${
                stellarWhite
                  ? "border-amber-200/40 bg-amber-200/10 !text-amber-200"
                  : "border-accent-amber/20 bg-accent-amber/10 text-accent-amber"
              }`}
            >
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              className={`rounded-full border p-2.5 ${
                stellarWhite
                  ? "border-white/15 bg-white/5 text-stone-300"
                  : "border-white/8 bg-white/[0.03] text-text-secondary"
              }`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                {menuOpen ? (
                  <path d="M4 4L16 16M16 4L4 16" />
                ) : (
                  <>
                    <path d="M3 5H17" />
                    <path d="M3 10H17" />
                    <path d="M3 15H17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — overflow-y-auto로 모든 링크 스크롤 접근 보장 */}
      <div
        aria-hidden={!menuOpen}
        className={`site-shell md:hidden transition-[transform,opacity,background-color,border-color,color] duration-200 ease-out ${
          menuOpen ? "max-h-[75dvh] overflow-y-auto overflow-x-hidden opacity-100" : "max-h-0 overflow-hidden opacity-0 pointer-events-none"
        }`}
      >
        <nav className="premium-panel-soft mt-3 rounded-[28px] border border-white/8 p-3" role="navigation" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const active = isNavActive(item);
            // [D] 모바일 메뉴 아이템 — WCAG 터치타겟 44px 보장 (block + min-h-[44px] flex items-center)
            const cls = `flex items-center min-h-[44px] rounded-2xl px-4 py-3.5 font-[family-name:var(--font-mono)] text-xs tracking-[0.06em] transition-colors duration-150 ${
              active
                ? "bg-accent-amber/8 text-accent-amber font-bold border-l-2 border-accent-amber"
                : "font-medium text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
            }`;
            if (item.external) {
              return (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className={cls}
                >
                  {item.label}
                </a>
              );
            }
            return (
              <Link key={item.key} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={cls}>
                {item.label}
              </Link>
            );
          })}
          <div className="px-4 pb-2 pt-4 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.06em] text-text-tertiary uppercase">
            {L4(lang, { ko: "탐색", en: "EXPLORE", ja: "探索", zh: "探索" })}
          </div>
          {exploreItems.map((item) => {
            const isExActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center min-h-[44px] rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.06em] transition-colors duration-150 ${
                  isExActive
                    ? "bg-accent-amber/8 text-accent-amber font-bold"
                    : "text-text-tertiary hover:bg-white/[0.04] hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="px-4 pb-2 pt-4 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.06em] text-text-tertiary uppercase">
            {L4(lang, { ko: "지원", en: "SUPPORT", ja: "サポート", zh: "支持" })}
          </div>
          {toolItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.06em] text-text-tertiary transition-colors duration-150 hover:bg-white/[0.04] hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function HeaderFallback() {
  return (
    <header data-testid="home-header" className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5">
      <div className="site-shell">
        <div className="premium-panel-soft flex min-h-16 items-center justify-between px-4 py-3 md:px-5 opacity-80">
          <div className="h-10 w-32 animate-pulse rounded-full bg-white/5" aria-hidden />
          <div className="hidden h-8 w-64 animate-pulse rounded-full bg-white/5 md:block" aria-hidden />
        </div>
      </div>
    </header>
  );
}

export type HeaderProps = { stellarWhite?: boolean };

export default function Header(props: HeaderProps = {}) {
  const { stellarWhite } = props;
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner stellarWhite={stellarWhite} />
    </Suspense>
  );
}
