"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import Link from "next/link";

export type HubItem = {
  href: string;
  badge: string;
  color: "amber" | "blue" | "green" | "purple";
  title: string;
  desc: string;
  meta: string;
  external?: boolean;
};

export type ColorToken = {
  border: string;
  bg: string;
  text: string;
  hoverText: string;
  glow: string;
};

export type ColorMap = Record<HubItem["color"], ColorToken>;

export function useFadeIn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function useHeroScrollShrink(
  panelRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = panelRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = el.closest("section");
    if (!section) return;

    let raf = 0;
    const tick = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = Math.min(96, vh * 0.12);
      const range = Math.max(220, vh * 0.38);
      const raw = Math.max(0, start - rect.top);
      const t = Math.min(1, raw / range);
      const eased = t * (2 - t);
      const scale = 1 - 0.048 * eased;
      el.style.transform = `scale(${scale})`;
      el.style.transformOrigin = "center top";
      el.style.willChange = t > 0 && t < 1 ? "transform" : "auto";
    };

    const onScrollOrResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    onScrollOrResize();

    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = "";
      el.style.transformOrigin = "";
      el.style.willChange = "";
    };
  }, [panelRef, enabled]);
}

export function HomePageFallback() {
  return (
    <main className="relative min-h-dvh w-full eh-page-canvas overflow-hidden flex items-center justify-center" aria-label="Loreguard 홈 로딩">
      <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in duration-700">
        <div className="flex h-10 items-center justify-center rounded-full border border-accent-indigo/40 bg-accent-indigo px-4 font-mono text-[10px] font-bold !text-white animate-pulse">
          Loreguard
        </div>
        <div className="font-mono text-[9px] tracking-[0.3em] text-text-tertiary uppercase">
          Loreguard
        </div>
      </div>
    </main>
  );
}

export function HubGrid({
  hubs,
  colorMap,
  T,
}: {
  hubs: HubItem[];
  colorMap: ColorMap;
  T: <V,>(v: { ko: V; en: V; ja?: V; zh?: V }) => V;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("home_apps_expanded");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw === "1") setExpanded(true);
    } catch {
      // Private browsing may block storage.
    }
  }, []);
  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        if (next) localStorage.setItem("home_apps_expanded", "1");
        else localStorage.removeItem("home_apps_expanded");
      } catch {
        // Storage is non-critical.
      }
      return next;
    });
  }, []);

  const heroPrimary = hubs.find((hub) => hub.badge === "NS");
  const heroSecondary = hubs.find((hub) => hub.badge === "TR");
  const rest = hubs.filter((hub) => hub.badge !== "NS" && hub.badge !== "TR");
  const startHereLabel = T({
    ko: "여기서 시작",
    en: "START HERE",
    ja: "ここから始める",
    zh: "从这里开始",
  });

  const renderCard = (hub: HubItem, variant: "hero-primary" | "hero-secondary" | "rest") => {
    const c = colorMap[hub.color];
    const isExternal = Boolean(hub.external || hub.href.startsWith("http"));
    const isPrimary = variant === "hero-primary";
    const sizeCls =
      variant === "hero-primary"
        ? "md:col-span-2 md:row-span-2 p-8 md:p-10 min-h-[220px] ring-2 ring-accent-amber/50 ring-offset-2 ring-offset-bg-primary"
        : variant === "hero-secondary"
          ? "md:col-span-2 p-6 md:p-8 min-h-[180px]"
          : "p-6";
    const badgeCls =
      variant === "hero-primary"
        ? "h-14 w-14 text-sm"
        : variant === "hero-secondary"
          ? "h-12 w-12 text-xs"
          : "h-11 w-11 text-xs";
    const titleCls =
      variant === "hero-primary"
        ? "text-2xl md:text-3xl tracking-wide normal-case font-display"
        : variant === "hero-secondary"
          ? "text-lg md:text-xl tracking-wide normal-case font-display"
          : "font-[--font-mono] text-sm font-semibold uppercase tracking-widest";

    const inner = (
      <>
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${c.glow} blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
        </div>
        {isPrimary && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-accent-amber !text-white font-[--font-mono] text-[10px] font-bold tracking-[0.16em] uppercase shadow-md"
            aria-label={startHereLabel}
          >
            {startHereLabel}
          </span>
        )}
        <span className={`flex items-center justify-center rounded-full border ${c.border} ${c.bg} font-[--font-mono] tracking-[0.14em] ${c.text} ${badgeCls}`}>
          {hub.badge}
        </span>
        <div className="mt-4">
          <h3 className={`font-semibold text-text-primary transition-colors ${c.hoverText} ${titleCls}`}>
            {hub.title}
          </h3>
          <p className={`mt-2 ${variant === "hero-primary" ? "text-base leading-8" : "text-sm leading-7"} text-text-secondary`}>{hub.desc}</p>
        </div>
        <div className={`mt-4 font-[--font-mono] text-[11px] uppercase tracking-[0.14em] text-text-tertiary transition-colors ${c.hoverText} inline-flex items-center gap-1`}>
          {hub.meta}
          <span aria-hidden="true">→</span>
        </div>
      </>
    );
    const cls = `group relative overflow-hidden premium-link-card flex flex-col ${sizeCls}`;
    return isExternal ? (
      <a key={hub.title} href={hub.href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${hub.title} (opens in new tab)`}>
        {inner}
      </a>
    ) : (
      <Link key={hub.title} href={hub.href} className={cls}>
        {inner}
      </Link>
    );
  };

  return (
    <div className="site-shell">
      <div className="mb-8 px-1">
        <p className="site-kicker">
          {T({ ko: "탐색 허브", en: "Explore Hubs", ja: "探索ハブ", zh: "探索中心" })}
        </p>
        <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
          {T({ ko: "지금 시작하세요", en: "Start now", ja: "今すぐ始める", zh: "立即开始" })}
        </h2>
        <p className="mt-3 text-sm text-text-secondary max-w-2xl">
          {T({
            ko: "모든 작업은 스튜디오에서 시작합니다. 번역·출판은 그 다음입니다.",
            en: "All workflows begin in the Studio. Translate and publish later.",
            ja: "すべての作業はスタジオから始まります。翻訳・出版はその後です。",
            zh: "所有工作流程都从工作室开始。翻译和出版稍后进行。",
          })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {heroPrimary && renderCard(heroPrimary, "hero-primary")}
        {heroSecondary && renderCard(heroSecondary, "hero-secondary")}
      </div>

      {rest.length > 0 && (
        <div className="mt-10">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-bg-secondary/40 hover:bg-bg-secondary text-text-secondary hover:text-text-primary font-[--font-mono] text-xs tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-accent-amber"
          >
            <span>
              {T({
                ko: expanded ? "모든 앱 닫기" : "모든 앱 보기",
                en: expanded ? "Hide all apps" : "Show all apps",
                ja: expanded ? "すべてのアプリを閉じる" : "すべてのアプリを表示",
                zh: expanded ? "收起所有应用" : "查看所有应用",
              })}
            </span>
            <span className="opacity-60">({rest.length})</span>
            <span className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden="true">▾</span>
          </button>

          {expanded && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
              {rest.map((hub) => renderCard(hub, "rest"))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
