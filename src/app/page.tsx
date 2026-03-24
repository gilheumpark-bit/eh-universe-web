"use client";

import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import StarField from "@/components/StarField";
import { useLang, L2A } from "@/lib/LangContext";

const stats = {
  ko: [
    { value: "3", unit: "분", label: "첫 장면 체감" },
    { value: "1", unit: "줄", label: "아이디어 입력" },
    { value: "3", unit: "단계", label: "초안부터 원고까지" },
    { value: "200+", unit: "", label: "레퍼런스 아카이브" },
  ],
  en: [
    { value: "3", unit: " min", label: "First scene" },
    { value: "1", unit: " line", label: "Idea input" },
    { value: "3", unit: " steps", label: "Draft to manuscript" },
    { value: "200+", unit: "", label: "Reference archive" },
  ],
};

const onboardingSteps = {
  ko: [
    { href: "/studio", icon: "01", title: "한 줄로 시작", desc: "장르와 한 줄 아이디어만 넣고 바로 첫 장면을 받습니다." },
    { href: "/studio", icon: "02", title: "글쓰기에서 이어 쓰기", desc: "AI 초안과 직접 수정을 같은 화면에서 오가며 다듬습니다." },
    { href: "/studio", icon: "03", title: "원고로 키우기", desc: "에피소드 저장, 버전 비교, 원고 관리 흐름으로 자연스럽게 이어집니다." },
  ],
  en: [
    { href: "/studio", icon: "01", title: "Start with one line", desc: "Enter a genre and one idea, then receive your first scene right away." },
    { href: "/studio", icon: "02", title: "Keep writing in Studio", desc: "Move between AI draft and manual editing in the same workspace." },
    { href: "/studio", icon: "03", title: "Grow it into a manuscript", desc: "Episode saves, version compare, and manuscript management stay in one flow." },
  ],
};

const exploreLinks = {
  ko: [
    { href: "/reference", icon: "RF", title: "EH Open Reference", desc: "프로젝트 전체를 빠르게 훑는 4페이지 요약." },
    { href: "/rulebook", icon: "RB", title: "EH Rulebook v1.0", desc: "서사 엔진의 구조와 원리를 문서로 확인." },
    { href: "/archive", icon: "AR", title: "설정집 아카이브", desc: "세계관 문서와 레퍼런스를 한곳에서 탐색." },
    { href: "https://github.com/gilheumpark-bit/eh-universe-web", icon: "GH", title: "GitHub", desc: "오픈소스 진행 상황과 코드베이스 확인." },
  ],
  en: [
    { href: "/reference", icon: "RF", title: "EH Open Reference", desc: "A fast 4-page summary of the whole project." },
    { href: "/rulebook", icon: "RB", title: "EH Rulebook v1.0", desc: "Read the narrative engine as a proper document." },
    { href: "/archive", icon: "AR", title: "Lore Archive", desc: "Browse worldbuilding notes and references in one place." },
    { href: "https://github.com/gilheumpark-bit/eh-universe-web", icon: "GH", title: "GitHub", desc: "See the open-source code and current progress." },
  ],
};

export default function Home() {
  const { lang } = useLang();
  const isEN = lang === "en";

  const t = {
    kicker: isEN ? "Story Studio for Fast First Scenes" : "첫 장면까지 빠르게 도달하는 스토리 스튜디오",
    hero: isEN
      ? "Turn one line of inspiration into a world seed, key cast, and a writable first scene."
      : "한 줄 아이디어를 세계관 씨앗, 핵심 인물, 바로 이어 쓸 수 있는 첫 장면으로 연결합니다.",
    meta: isEN
      ? "Quick Start · Writing Flow · Consistency Support · Manuscript Growth"
      : "쾌속 시작 · 글쓰기 흐름 · 설정 일관성 보조 · 원고 성장",
    briefTitle: isEN ? "Activation Brief" : "시작 흐름",
    briefBody: isEN
      ? "EH Universe is designed to get writers to a usable first scene quickly, then stay out of the way while they shape the draft."
      : "EH Universe는 작가가 빠르게 첫 장면에 도달한 뒤, 자기 문장을 다듬는 흐름에 계속 집중하도록 설계되어 있습니다.",
    pipelineTitle: isEN ? "Flow" : "진행 순서",
    pipeline: isEN
      ? ["Quick Start", "Shape the draft", "Grow the manuscript"]
      : ["쾌속 시작", "초안 다듬기", "원고로 키우기"],
    statusTitle: isEN ? "Studio Promise" : "스튜디오 약속",
    statusBody: isEN
      ? "Start fast, keep context, and protect the shape of your story while you write."
      : "빠르게 시작하고, 맥락을 잃지 않고, 쓰는 동안 이야기의 형태를 지켜줍니다.",
    whatIs: isEN ? "WHY EH" : "왜 EH인가",
    ehDef: isEN ? "A co-pilot for writers, not a noisy control panel." : "복잡한 제어판이 아니라, 작가를 돕는 코파일럿.",
    ehDesc: isEN
      ? "EH Universe keeps world design, drafting, and manuscript growth on one editorial surface so writers can focus on the story itself."
      : "EH Universe는 세계관 설계, 초안 작성, 원고 관리 흐름을 한 화면에 이어서 작가가 이야기 자체에 집중하게 돕습니다.",
    ehHigh: isEN
      ? "Writer-first: quick starts, editable drafts, and support that appears when needed."
      : "작가 우선: 빠른 시작, 바로 수정 가능한 초안, 필요할 때만 나타나는 보조.",
    ehLow: isEN
      ? "System-first: too many settings, too much explanation, and the first sentence arrives too late."
      : "시스템 우선: 설정이 너무 많고 설명이 길어서 첫 문장이 늦게 나오는 상태.",
    principleTitle: isEN ? "Design Principle" : "설계 원칙",
    principleBody: isEN
      ? "The best writing tool makes the next action obvious: start, shape, save, continue."
      : "좋은 글쓰기 도구는 다음 행동이 바로 보여야 합니다. 시작하고, 다듬고, 저장하고, 이어 쓰는 흐름입니다.",
    numbersTitle: isEN ? "Built for the writing loop" : "글쓰기 루프에 맞춘 구조",
    numbersHeadline: isEN ? "Less setup friction, more time in the scene." : "설정 마찰은 줄이고, 장면 안에 머무는 시간은 늘립니다.",
    numbersBody: isEN
      ? "The archive is deep, but the surface stays focused on action: get in, write, compare, and continue."
      : "아카이브는 깊게 가져가되, 첫 화면은 행동에 집중합니다. 들어오고, 쓰고, 비교하고, 이어 가는 구조입니다.",
    activationTitle: isEN ? "Start in 3 moves" : "3번의 행동으로 시작",
    activationHeadline: isEN
      ? "Get from concept to manuscript without leaving the studio."
      : "아이디어에서 원고 관리까지, 스튜디오 안에서 끊기지 않게.",
    activationBody: isEN
      ? "Quick Start creates momentum first. The rest of the studio helps you keep it."
      : "쾌속 시작으로 먼저 감탄을 만들고, 이후 스튜디오가 그 흐름을 이어줍니다.",
    exploreTitle: isEN ? "Explore the universe" : "세계관 탐색",
    exploreHeadline: isEN
      ? "Reference, archive, and rulebook still stay one click away."
      : "레퍼런스, 아카이브, 룰북도 한 번에 닿는 거리에 둡니다.",
    ctaTitle: isEN ? "Ready for your next first scene?" : "다음 첫 장면을 써볼 시간",
    ctaBody: isEN
      ? "Open the studio, drop in one line, and keep the draft moving while the world stays consistent."
      : "스튜디오를 열고 한 줄을 넣으면, 세계관의 맥락을 지키면서 초안을 계속 앞으로 밀 수 있습니다.",
    openStudio: isEN ? "Open Studio" : "스튜디오 열기",
    seeFlow: isEN ? "See the 3-step flow" : "3단계 흐름 보기",
    browseReference: isEN ? "Read Reference" : "레퍼런스 보기",
    footer: isEN ? "Start fast. Stay in the story." : "빠르게 시작하고, 이야기 안에 머문다.",
  };

  return (
    <>
      <Header />
      <section className="relative overflow-hidden pb-20 pt-28 md:pb-28 md:pt-32">
        <StarField />
        <div className="site-shell relative z-10">
          <div className="premium-panel premium-grid-accent px-6 py-8 md:px-10 md:py-12 xl:px-14">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-end">
              <div className="relative z-10">
                <p className="site-kicker">{t.kicker}</p>
                <h1 className="site-title mt-5 text-5xl font-bold leading-[0.94] sm:text-6xl md:text-7xl xl:text-[5.4rem]">
                  EH UNIVERSE
                </h1>
                <p className="mt-6 max-w-2xl font-[family-name:var(--font-document)] text-lg leading-[1.95] text-text-secondary md:text-[1.24rem]">
                  {t.hero}
                </p>
                <p className="mt-5 max-w-2xl font-[family-name:var(--font-mono)] text-[0.82rem] uppercase leading-8 tracking-[0.16em] text-text-tertiary md:text-sm">
                  {t.meta}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/studio" aria-label={t.openStudio} className="premium-button">
                    {t.openStudio}
                  </Link>
                  <Link href="#activation" aria-label={t.seeFlow} className="premium-button secondary">
                    {t.seeFlow}
                  </Link>
                  <a
                    href="https://github.com/gilheumpark-bit/eh-universe-web"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub repository (opens in new tab)"
                    className="premium-button secondary"
                  >
                    GitHub
                  </a>
                </div>

                <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {L2A(stats, lang).map((item) => (
                    <div key={item.label} className="card-glow premium-panel-soft rounded-[22px] px-5 py-5">
                      <div className="font-[family-name:var(--font-display)] text-[1.9rem] font-bold leading-none text-text-primary">
                        {item.value}
                        <span className="ml-1 text-sm font-normal text-text-tertiary">{item.unit}</span>
                      </div>
                      <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-text-secondary">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[420px] overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,27,0.6),rgba(7,9,13,0.12))]">
                <div className="absolute inset-x-6 top-6 z-10 flex items-start justify-between gap-4">
                  <div className="premium-panel-soft rounded-[20px] px-4 py-3">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-accent-amber">
                      {t.briefTitle}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{t.briefBody}</p>
                  </div>
                  <div className="hidden w-[220px] rounded-[22px] border border-accent-blue/20 bg-accent-blue/10 p-4 backdrop-blur md:block">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-accent-blue">
                      {t.pipelineTitle}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      {t.pipeline.map((item, index) => (
                        <p key={item}>
                          {String(index + 1).padStart(2, "0")}. {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-10 top-8 h-52 w-52 rounded-full bg-accent-blue/12 blur-3xl" />
                  <div className="absolute bottom-6 right-0 h-56 w-56 rounded-full bg-accent-amber/12 blur-3xl" />
                </div>

                <div className="absolute bottom-0 right-0 z-[1] select-none opacity-80">
                  <Image
                    src="/images/hero-mina.jpg"
                    alt={isEN ? "Writer using the EH Universe studio" : "EH Universe 스튜디오를 상징하는 캐릭터 이미지"}
                    width={560}
                    height={760}
                    priority={true}
                    className="h-[360px] w-auto object-contain object-bottom md:h-[500px]"
                    style={{
                      maskImage: "linear-gradient(to top, transparent 2%, black 24%), linear-gradient(to left, transparent 0%, black 58%)",
                      WebkitMaskImage: "linear-gradient(to top, transparent 2%, black 24%), linear-gradient(to left, transparent 0%, black 58%)",
                      maskComposite: "intersect",
                      WebkitMaskComposite: "source-in",
                    }}
                  />
                </div>

                <div className="absolute bottom-6 left-6 z-10 max-w-[280px] rounded-[22px] border border-accent-amber/20 bg-[rgba(16,18,23,0.78)] p-4 backdrop-blur">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-accent-amber">
                    {t.statusTitle}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">{t.statusBody}</p>
                  <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
                    Quick Start · Writing · Manuscript
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-divider py-24">
        <div className="site-shell">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
              <div className="doc-header mb-7 rounded-[18px]">
                <span className="badge badge-blue mr-2">INFO</span>
                {t.whatIs}
              </div>
              <p className="site-kicker">{t.whatIs}</p>
              <h2 className="site-title mt-4 text-3xl font-semibold sm:text-4xl">{t.ehDef}</h2>
              <p className="site-lede mt-6 text-base sm:text-lg">{t.ehDesc}</p>
            </div>

            <div className="grid gap-4">
              <div className="premium-link-card p-6 md:p-7">
                <span className="badge badge-amber">WRITER-FIRST</span>
                <p className="mt-4 text-base leading-8 text-text-secondary sm:text-lg">{t.ehHigh}</p>
              </div>
              <div className="premium-link-card p-6 md:p-7">
                <span className="badge badge-blue">FRICTION CHECK</span>
                <p className="mt-4 text-base leading-8 text-text-secondary sm:text-lg">{t.ehLow}</p>
              </div>
              <div className="premium-panel-soft rounded-[24px] px-6 py-6">
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
                  {t.principleTitle}
                </p>
                <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">{t.principleBody}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-divider py-24">
        <div className="site-shell">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="site-kicker">{t.numbersTitle}</p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">{t.numbersHeadline}</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-text-tertiary md:text-right">{t.numbersBody}</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {L2A(stats, lang).map((item) => (
                <div key={item.label} className="premium-link-card p-5 sm:p-6">
                  <div className="whitespace-nowrap font-[family-name:var(--font-display)] text-[2rem] font-bold text-text-primary">
                    {item.value}
                    <span className="ml-1 text-base font-normal text-text-tertiary">{item.unit}</span>
                  </div>
                  <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-text-secondary">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="activation" className="section-divider py-24">
        <div className="site-shell grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <p className="site-kicker">{t.activationTitle}</p>
            <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">{t.activationHeadline}</h2>
            <p className="mt-4 text-sm leading-7 text-text-tertiary sm:text-base">{t.activationBody}</p>
            <div className="mt-8 grid gap-4">
              {L2A(onboardingSteps, lang).map((item) => (
                <Link key={item.title} href={item.href} className="premium-link-card group flex items-start gap-4 p-5 md:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-amber/20 bg-accent-amber/10 font-[family-name:var(--font-mono)] text-sm tracking-[0.16em] text-accent-amber">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.1em] text-text-primary transition-colors group-hover:text-accent-amber">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <p className="site-kicker">{t.exploreTitle}</p>
            <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">{t.exploreHeadline}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {L2A(exploreLinks, lang).map((item) => {
                const isExternal = item.href.startsWith("http");
                const inner = (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] font-[family-name:var(--font-mono)] text-sm tracking-[0.14em] text-text-secondary">
                      {item.icon}
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold uppercase tracking-[0.1em] text-text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-text-secondary">{item.desc}</p>
                    </div>
                  </>
                );

                return isExternal ? (
                  <a
                    key={item.title}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="premium-link-card group flex items-start gap-4 p-5"
                    aria-label={`${item.title} (opens in new tab)`}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link key={item.title} href={item.href} className="premium-link-card group flex items-start gap-4 p-5">
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="section-divider pb-24 pt-8">
        <div className="site-shell">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="site-kicker">{t.ctaTitle}</p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">{t.ctaBody}</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/studio" className="premium-button">
                  {t.openStudio}
                </Link>
                <Link href="/reference" className="premium-button secondary">
                  {t.browseReference}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-10">
        <div className="site-shell">
          <div className="premium-panel-soft flex flex-col items-center justify-between gap-4 rounded-[24px] px-6 py-5 sm:flex-row">
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.16em] text-text-tertiary">EH UNIVERSE · CC-BY-NC-4.0</p>
            <p className="font-[family-name:var(--font-document)] text-xs italic text-text-tertiary">{t.footer}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
