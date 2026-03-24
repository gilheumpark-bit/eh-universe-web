"use client";

import Link from "next/link";
import { useLang, L2 } from "@/lib/LangContext";

// ============================================================
// PART 1 - GUIDELINE DATA
// ============================================================

const SECTION_ALLOWED = {
  title: { ko: "허용", en: "Allowed" },
  items: [
    { ko: "비상업적 2차 창작", en: "Non-commercial derivative works" },
    { ko: "IF 행성 생성", en: "IF planet creation" },
    { ko: "외전, 단편, 실험 서사", en: "Side stories, short fiction, experimental narratives" },
  ],
};

const SECTION_PROHIBITED = {
  title: { ko: "금지", en: "Prohibited" },
  items: [
    { ko: "불변 규칙 수정", en: "Modification of immutable rules" },
    { ko: "중앙 규칙 재판매", en: "Resale of central rules" },
    { ko: "핵심 구조의 임의 변경", en: "Arbitrary changes to core structures" },
  ],
};

const SECTION_COMMERCIAL = {
  title: { ko: "상업적 활용", en: "Commercial Use" },
  items: [
    { ko: "별도 협의 대상", en: "Subject to separate negotiation" },
    { ko: "규칙 구조는 원전 기준을 따른다", en: "Rule structures follow the original canon" },
  ],
};

const DECLARATION = {
  ko: "통치자는 신이 아니다. 통치자는 관리자다.\n규칙을 준수하는 한, 세계는 자유롭게 운용될 수 있다.",
  en: "A governor is not a god. A governor is a manager.\nAs long as the rules are observed, a world may be operated freely.",
};

// IDENTITY_SEAL: PART-1 | role=guideline content data | inputs=none | outputs=bilingual guideline sections

// ============================================================
// PART 2 - RENDER
// ============================================================

function GuidelineSection({
  title,
  items,
  lang,
  variant,
}: {
  title: { ko: string; en: string };
  items: { ko: string; en: string }[];
  lang: string;
  variant: "allowed" | "prohibited" | "neutral";
}) {
  const borderColor =
    variant === "allowed"
      ? "border-green-400/30"
      : variant === "prohibited"
        ? "border-accent-red/30"
        : "border-accent-amber/30";

  return (
    <div className={`rounded-2xl border ${borderColor} bg-white/[0.02] p-5`}>
      <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber">
        {L2(title, lang as "ko" | "en")}
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
            <span className="mt-0.5 text-text-tertiary">{variant === "prohibited" ? "\u2715" : "\u2713"}</span>
            {L2(item, lang as "ko" | "en")}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GuidelinesPage() {
  const { lang } = useLang();

  return (
    <main className="pt-14 pb-20">
      <div className="site-shell space-y-8 py-8 md:space-y-10 md:py-10">
        <Link
          href="/network"
          className="inline-block font-[family-name:var(--font-mono)] text-xs tracking-[0.12em] text-text-tertiary hover:text-accent-amber transition-colors"
        >
          &larr; NETWORK
        </Link>

        <section className="premium-panel p-6 md:p-8">
          <div className="site-kicker">NMF — Narrative Management Foundation</div>
          <h1 className="site-title mt-3 text-3xl font-semibold md:text-4xl">
            {L2({ ko: "NMF 2차 창작 원칙", en: "NMF Creative Guidelines" }, lang)}
          </h1>
          <p className="site-lede mt-4 max-w-2xl text-sm md:text-base">
            {L2(
              {
                ko: "EH 세계관을 기반으로 한 2차 창작 및 행성 운영에 적용되는 규칙입니다.",
                en: "Rules governing derivative works and planet operations within the EH universe.",
              },
              lang,
            )}
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <GuidelineSection
            title={SECTION_ALLOWED.title}
            items={SECTION_ALLOWED.items}
            lang={lang}
            variant="allowed"
          />
          <GuidelineSection
            title={SECTION_PROHIBITED.title}
            items={SECTION_PROHIBITED.items}
            lang={lang}
            variant="prohibited"
          />
          <GuidelineSection
            title={SECTION_COMMERCIAL.title}
            items={SECTION_COMMERCIAL.items}
            lang={lang}
            variant="neutral"
          />
        </div>

        <section className="premium-panel p-6 md:p-8">
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-accent-amber">
            {L2({ ko: "최종 선언", en: "Final Declaration" }, lang)}
          </div>
          <blockquote className="mt-4 whitespace-pre-line text-lg font-medium leading-8 text-text-primary">
            {L2(DECLARATION, lang)}
          </blockquote>
        </section>
      </div>
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=guidelines page renderer | inputs=language context | outputs=NMF creative guidelines UI
