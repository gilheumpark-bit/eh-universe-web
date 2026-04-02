"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { isTestEnvironment } from "@/lib/firebase";
import { TOOL_LINKS_HEADER_DROPDOWN } from "@/lib/tool-links";
import { getTranslatorStudioHref, STYLE_STUDIO_PATH, TRANSLATION_STUDIO_PATH } from "@/lib/studio-entry-links";

type NavKey = "home" | "network" | "studio" | "style" | "translate" | "code";

type NavEntry = {
  key: NavKey;
  href: string;
  label: string;
  external?: boolean;
};

function usePrimaryNavActive(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
): (item: NavEntry) => boolean {
  const tab = searchParams.get("tab");
  return (item: NavEntry) => {
    switch (item.key) {
      case "home":
        return pathname === "/";
      case "network":
        return pathname.startsWith("/network");
      case "studio":
        return pathname.startsWith("/studio") && tab !== "manuscript";
      case "style":
        return pathname.startsWith(STYLE_STUDIO_PATH);
      case "translate":
        if (item.external) return false;
        return (
          pathname.startsWith(TRANSLATION_STUDIO_PATH) ||
          (pathname.startsWith("/studio") && tab === "manuscript")
        );
      case "code":
        return pathname.startsWith("/code-studio");
      default:
        return false;
    }
  };
}

function HeaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsFocusIdx, setToolsFocusIdx] = useState(-1);
  const { lang, toggleLang } = useLang();

  const translatorHref = useMemo(() => getTranslatorStudioHref(), []);
  const translatorExternal = translatorHref.startsWith("http");

  const navItems: NavEntry[] = useMemo(
    () => [
      { key: "home", href: "/", label: L4(lang, { ko: "홈", en: "HOME", jp: "ホーム", cn: "首页" }) },
      { key: "network", href: "/network", label: L4(lang, { ko: "네트워크", en: "NETWORK", jp: "ネットワーク", cn: "网络" }) },
      { key: "studio", href: "/studio", label: L4(lang, { ko: "스튜디오", en: "STUDIO", jp: "スタジオ", cn: "工作室" }) },
      {
        key: "style",
        href: STYLE_STUDIO_PATH,
        label: L4(lang, { ko: "문체", en: "STYLE", jp: "文体", cn: "文体" }),
      },
      {
        key: "translate",
        href: translatorHref,
        label: L4(lang, { ko: "번역", en: "TRANS", jp: "翻訳", cn: "翻译" }),
        external: translatorExternal,
      },
      { key: "code", href: "/code-studio", label: L4(lang, { ko: "코드", en: "CODE", jp: "コード", cn: "代码" }) },
    ],
    [lang, translatorHref, translatorExternal],
  );

  const isNavActive = usePrimaryNavActive(pathname, searchParams);

  const exploreItems = useMemo(
    () => [
      { href: "/archive", label: L4(lang, { ko: "아카이브", en: "ARCHIVE", jp: "アーカイブ", cn: "档案" }) },
      { href: "/reports", label: L4(lang, { ko: "보고서", en: "REPORTS", jp: "報告書", cn: "报告书" }) },
      { href: "/codex", label: L4(lang, { ko: "코덱스", en: "CODEX", jp: "コーデックス", cn: "索引" }) },
    ],
    [lang],
  );

  const toolItems = useMemo(
    () => [
      ...TOOL_LINKS_HEADER_DROPDOWN.map((t) => ({
        href: t.href,
        label: L4(lang, {
          ko: t.ko,
          en: t.en,
          jp: t.jp ?? t.en,
          cn: t.cn ?? t.en,
        }),
      })),
      { href: "/about", label: L4(lang, { ko: "소개", en: "ABOUT", jp: "紹介", cn: "关于" }) },
    ],
    [lang],
  );

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
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
    `rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-all duration-150 ${
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

  return (
    <header data-testid="home-header" className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5">
      <div className="site-shell">
        <div className="premium-panel-soft flex min-h-16 items-center justify-between px-4 py-3 md:px-5">
          <Link
            href="/"
            aria-label="EH Universe — Home"
            className="group flex items-center gap-3 rounded-full pr-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-amber/30 bg-accent-amber/10 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber transition-transform group-hover:scale-[1.04]">
              EH
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-[1.02rem] font-semibold tracking-[0.16em] text-text-primary transition-colors group-hover:text-accent-amber">
                  EH UNIVERSE
                </span>
                {isTestEnvironment && (
                  <span className="rounded-md border border-accent-red/30 bg-accent-red/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold tracking-[0.18em] text-accent-red uppercase">
                    TEST
                  </span>
                )}
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.24em] text-text-tertiary uppercase">
                Narrative Engine
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-wrap items-center justify-end gap-1.5 lg:gap-2 md:flex" role="navigation" aria-label="Main navigation">
            {navItems.map(renderDesktopNavItem)}
            {/* Explore dropdown (아카이브/보고서/코덱스) */}
            <div className="relative" onMouseEnter={() => setExploreOpen(true)} onMouseLeave={closeExploreMenu}>
              <button
                type="button"
                onClick={() => {
                  setExploreOpen((p) => !p);
                }}
                aria-expanded={exploreOpen}
                aria-haspopup="menu"
                aria-label="Explore menu"
                className={`rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-all duration-150 ${
                  ["/archive", "/reports", "/codex"].some((p) => pathname.startsWith(p))
                    ? "border-accent-amber/25 bg-accent-amber/8 text-accent-amber font-bold"
                    : "font-medium border-transparent text-text-secondary hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
                }`}
              >
                {L4(lang, { ko: "탐색", en: "EXPLORE", jp: "探索", cn: "探索" })}
              </button>
              {exploreOpen && (
                <div className="absolute left-0 top-full z-[100] pt-3">
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
                aria-label="Tools menu"
                className="rounded-full border border-transparent px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.06em] text-text-secondary transition-all hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
              >
                {L4(lang, { ko: "도구", en: "TOOLS", jp: "ツール", cn: "工具" })}
              </button>
              {toolsOpen && (
                <div className="absolute right-0 top-full z-[100] pt-3">
                  <div className="premium-panel-soft min-w-[220px] overflow-hidden rounded-3xl border border-white/8 p-2" role="menu" aria-label="Tools">
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
              className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber transition-colors hover:bg-accent-amber/15"
              aria-label="Toggle language"
            >
              {lang.toUpperCase()}
            </button>
          </nav>

          {/* Mobile right controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={toggleLang}
              aria-label="Toggle language"
              className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber"
            >
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/8 bg-white/[0.03] p-2.5 text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary"
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

      {/* Mobile menu */}
      <div
        aria-hidden={!menuOpen}
        className={`site-shell md:hidden transition-all duration-200 ease-out overflow-hidden ${
          menuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <nav className="premium-panel-soft mt-3 overflow-hidden rounded-[28px] border border-white/8 p-3" role="navigation" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const active = isNavActive(item);
            const cls = `block rounded-2xl px-4 py-3.5 font-[family-name:var(--font-mono)] text-xs tracking-[0.06em] transition-colors duration-150 ${
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
            {L4(lang, { ko: "탐색", en: "EXPLORE", jp: "探索", cn: "探索" })}
          </div>
          {exploreItems.map((item) => {
            const isExActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.06em] transition-colors duration-150 ${
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
            {L4(lang, { ko: "도구", en: "TOOLS", jp: "ツール", cn: "工具" })}
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

export default function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner />
    </Suspense>
  );
}
