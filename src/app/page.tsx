"use client";

import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import StarField from "@/components/StarField";
import { useLang } from "@/lib/LangContext";

const stats = {
  ko: [
    { value: "7000", unit: "년", label: "타임라인" },
    { value: "4", unit: "개 장르", label: "하나의 우주" },
    { value: "200+", unit: "", label: "아티클 아카이브" },
    { value: "1", unit: "", label: "엔진 — EH Rulebook v1.0" },
  ],
  en: [
    { value: "7000", unit: " yrs", label: "Timeline" },
    { value: "4", unit: " genres", label: "One Universe" },
    { value: "200+", unit: "", label: "Article Archive" },
    { value: "1", unit: "", label: "Engine — EH Rulebook v1.0" },
  ],
};

const onboardingSteps = {
  ko: [
    { href: "/studio", icon: "1️⃣", title: "세계관 설계", desc: "AI가 장르에 맞는 세계관을 생성합니다." },
    { href: "/studio", icon: "2️⃣", title: "첫 에피소드 집필", desc: "AI와 함께 첫 화를 완성하세요." },
    { href: "/studio", icon: "3️⃣", title: "EPUB/DOCX 내보내기", desc: "완성된 원고를 바로 출판 형식으로." },
  ],
  en: [
    { href: "/studio", icon: "1️⃣", title: "Design Your World", desc: "AI generates a world matching your genre." },
    { href: "/studio", icon: "2️⃣", title: "Write Your First Episode", desc: "Complete your first chapter with AI." },
    { href: "/studio", icon: "3️⃣", title: "Export EPUB/DOCX", desc: "Publish-ready format in one click." },
  ],
};

const exploreLinks = {
  ko: [
    { href: "/reference", icon: "📖", title: "EH Open Reference", desc: "4페이지 요약. 여기서 시작." },
    { href: "/rulebook", icon: "📜", title: "EH Rulebook v1.0", desc: "서사 엔진 전문." },
    { href: "/archive", icon: "🔬", title: "설정집 아카이브", desc: "세계관 위키." },
    { href: "https://github.com/gilheumpark-bit/eh-universe-web", icon: "💻", title: "GitHub", desc: "오픈소스." },
  ],
  en: [
    { href: "/reference", icon: "📖", title: "EH Open Reference", desc: "4-page summary. Start here." },
    { href: "/rulebook", icon: "📜", title: "EH Rulebook v1.0", desc: "Full narrative engine." },
    { href: "/archive", icon: "🔬", title: "Lore Archive", desc: "World-building wiki." },
    { href: "https://github.com/gilheumpark-bit/eh-universe-web", icon: "💻", title: "GitHub", desc: "Open source." },
  ],
};

export default function Home() {
  const { lang } = useLang();
  const t = {
    hero: lang === "en"
      ? "Records the moment your story tells a lie."
      : "당신의 이야기가 거짓말을 하는 순간을 기록한다.",
    whatIs: lang === "en" ? "WHAT IS EH?" : "WHAT IS EH?",
    ehDef: lang === "en" ? "EH = Error Heart = Human Error" : "EH = Error Heart = Human Error",
    ehDesc: lang === "en"
      ? "The residual probability of irrational human choices that no system can define."
      : "인간이 비합리적 선택을 할 수 있는 잔여 가능성의 총량.",
    ehHigh: lang === "en"
      ? "High EH = More human = Narrative becomes unstable"
      : "EH가 높다 = 인간답다 = 서사는 불안정하다",
    ehLow: lang === "en"
      ? "Low EH = More precise = Narrative withers"
      : "EH가 낮다 = 정확하다 = 서사는 메말라간다",
    docLevel: lang === "en" ? "Document Level: PUBLIC — Level 0" : "문서 등급: PUBLIC — Level 0",
    allSystems: lang === "en" ? "All systems operational." : "All systems operational.",
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
                <p className="site-kicker">
                  {lang === "en" ? "Narrative Engine for Story Worlds" : "세계관과 서사를 위한 내러티브 엔진"}
                </p>
                <h1 className="site-title mt-5 text-5xl font-bold leading-[0.94] sm:text-6xl md:text-7xl xl:text-[5.4rem]">
                  EH UNIVERSE
                </h1>
                <p className="mt-6 max-w-2xl font-[family-name:var(--font-document)] text-lg leading-[1.95] text-text-secondary md:text-[1.24rem]">
                  &ldquo;{t.hero}&rdquo;
                </p>
                <p className="mt-5 max-w-2xl font-[family-name:var(--font-mono)] text-[0.82rem] leading-8 tracking-[0.16em] text-text-tertiary uppercase md:text-sm">
                  {lang === "en"
                    ? "World Design → AI Writing → Engine Verification → Export"
                    : "세계관 설계 → AI 집필 → 엔진 검증 → 출판"}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/studio" aria-label="Start Writing — open NOA Studio" className="premium-button">
                    {lang === "en" ? "Start Writing" : "집필 시작"}
                  </Link>
                  <Link href="/archive" aria-label="Explore the Universe — browse the archive" className="premium-button secondary">
                    {lang === "en" ? "Explore Universe" : "세계관 탐색"}
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
                  {stats[lang].map((s) => (
                    <div key={s.label} className="premium-panel-soft card-glow rounded-[22px] px-5 py-5">
                      <div className="font-[family-name:var(--font-display)] text-[1.9rem] font-bold leading-none text-text-primary">
                        {s.value}
                        <span className="ml-1 text-sm font-normal text-text-tertiary">{s.unit}</span>
                      </div>
                      <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.16em] text-text-secondary uppercase">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[420px] overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,27,0.6),rgba(7,9,13,0.12))]">
                <div className="absolute inset-x-6 top-6 z-10 flex items-start justify-between gap-4">
                  <div className="premium-panel-soft rounded-[20px] px-4 py-3">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-accent-amber uppercase">
                      {lang === "en" ? "Operational Brief" : "운용 브리프"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">
                      {lang === "en"
                        ? "A story world that looks archival, writes alive, and verifies itself."
                        : "기록물처럼 보이고, 살아 있는 문장으로 쓰이며, 스스로 검증하는 서사 시스템."}
                    </p>
                  </div>
                  <div className="hidden w-[210px] rounded-[22px] border border-accent-blue/20 bg-accent-blue/10 p-4 backdrop-blur md:block">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-accent-blue uppercase">
                      {lang === "en" ? "Pipeline" : "집필 파이프라인"}
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-text-secondary">
                      <p>01. {lang === "en" ? "World Build" : "세계관 설계"}</p>
                      <p>02. {lang === "en" ? "Draft & Verify" : "초안과 검증"}</p>
                      <p>03. {lang === "en" ? "Refine & Export" : "다듬기와 내보내기"}</p>
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
                    alt=""
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

                <div className="absolute bottom-6 left-6 z-10 max-w-[270px] rounded-[22px] border border-accent-amber/20 bg-[rgba(16,18,23,0.78)] p-4 backdrop-blur">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.18em] text-accent-amber uppercase">
                    {lang === "en" ? "System Status" : "시스템 상태"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-text-secondary">{t.allSystems}</p>
                  <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.14em] text-text-tertiary uppercase">
                    EH Rulebook · NOA Studio · Archive
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
                {t.docLevel}
              </div>
              <p className="site-kicker">{t.whatIs}</p>
              <h2 className="site-title mt-4 text-3xl font-semibold sm:text-4xl">{t.ehDef}</h2>
              <p className="site-lede mt-6 text-base sm:text-lg">{t.ehDesc}</p>
            </div>

            <div className="grid gap-4">
              <div className="premium-link-card p-6 md:p-7">
                <span className="badge badge-amber">HIGH EH</span>
                <p className="mt-4 text-base leading-8 text-text-secondary sm:text-lg">{t.ehHigh}</p>
              </div>
              <div className="premium-link-card p-6 md:p-7">
                <span className="badge badge-blue">LOW EH</span>
                <p className="mt-4 text-base leading-8 text-text-secondary sm:text-lg">{t.ehLow}</p>
              </div>
              <div className="premium-panel-soft rounded-[24px] px-6 py-6">
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-text-tertiary">
                  {lang === "en" ? "Design Principle" : "설계 원칙"}
                </p>
                <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">
                  {lang === "en"
                    ? "EH Universe treats worldbuilding, writing, and verification as one continuous editorial surface."
                    : "EH Universe는 세계관 설계, 집필, 검증을 분리된 기능이 아니라 하나의 편집 표면으로 다룹니다."}
                </p>
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
                <p className="site-kicker">{lang === "en" ? "Numbers of the Universe" : "우주의 수치들"}</p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {lang === "en" ? "A world measured with story-grade precision." : "서사 단위로 계측된 세계."}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-text-tertiary md:text-right">
                {lang === "en"
                  ? "From timeline scale to archive density, the project reads like a system instead of a loose collection."
                  : "타임라인 규모부터 아카이브 밀도까지, 느슨한 자료 모음이 아니라 실제 시스템처럼 읽히도록 설계했습니다."}
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats[lang].map((s) => (
                <div key={s.label} className="premium-link-card p-5 sm:p-6">
                  <div className="font-[family-name:var(--font-display)] text-[2rem] font-bold text-text-primary whitespace-nowrap">
                    {s.value}
                    <span className="ml-1 text-base font-normal text-text-tertiary">{s.unit}</span>
                  </div>
                  <p className="mt-3 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.16em] text-text-secondary uppercase">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-divider py-24">
        <div className="site-shell grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <p className="site-kicker">{lang === "en" ? "Start in 3 Steps" : "3단계로 시작"}</p>
            <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
              {lang === "en" ? "Move from concept to manuscript without leaving the studio." : "설정부터 원고까지, 스튜디오 안에서 끝내기."}
            </h2>
            <p className="mt-4 text-sm leading-7 text-text-tertiary sm:text-base">
              {lang === "en" ? "From world design to published manuscript — all in NOA Studio." : "세계관 설계부터 출판까지 — NOA Studio 하나로."}
            </p>
            <div className="mt-8 grid gap-4">
              {onboardingSteps[lang].map((item) => (
                <Link key={item.title} href={item.href} className="premium-link-card group flex items-start gap-4 p-5 md:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-amber/20 bg-accent-amber/10 text-xl">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold tracking-[0.1em] text-text-primary transition-colors group-hover:text-accent-amber uppercase">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="premium-panel px-6 py-8 md:px-8 md:py-10">
            <p className="site-kicker">{lang === "en" ? "Explore the Universe" : "세계관 탐색"}</p>
            <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
              {lang === "en" ? "Archive, reference, and rulebook in one editorial surface." : "아카이브, 레퍼런스, 룰북을 하나의 편집 표면으로."}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {exploreLinks[lang].map((item) => {
                const isExternal = item.href.startsWith("http");
                const inner = (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-xl">
                      {item.icon}
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold tracking-[0.1em] text-text-primary uppercase">
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
                <p className="site-kicker">{lang === "en" ? "Ready to Build" : "이제 시작할 시간"}</p>
                <h2 className="site-title mt-3 text-3xl font-semibold sm:text-4xl">
                  {lang === "en" ? "Open the studio and start building a world that holds together." : "붕괴하지 않는 세계를 쓰기 위한 스튜디오를 열어보세요."}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/studio" className="premium-button">
                  {lang === "en" ? "Open Studio" : "스튜디오 열기"}
                </Link>
                <Link href="/reference" className="premium-button secondary">
                  {lang === "en" ? "Read Reference" : "레퍼런스 보기"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-10">
        <div className="site-shell">
          <div className="premium-panel-soft flex flex-col items-center justify-between gap-4 rounded-[24px] px-6 py-5 sm:flex-row">
            <p className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-[0.16em]">EH UNIVERSE — CC-BY-NC-4.0</p>
            <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic">&ldquo;{t.allSystems}&rdquo;</p>
          </div>
        </div>
      </footer>
    </>
  );
}
