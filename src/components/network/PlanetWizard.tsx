"use client";

import { useMemo, useState } from "react";
import type { Lang } from "@/lib/LangContext";
import {
  createPlanetWithFirstLog,
  ensureNetworkUserRecord,
} from "@/lib/network-firestore";
import {
  PLANET_GOALS,
  PLANET_STATUSES,
  type FirstLogDraft,
  type PlanetGoal,
  type PlanetStatus,
} from "@/lib/network-types";
import {
  PLANET_GOAL_LABELS,
  PLANET_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  REPORT_TYPE_TEMPLATES,
  pickNetworkLabel,
} from "@/lib/network-labels";

interface PlanetWizardProps {
  ownerId: string;
  ownerName?: string | null;
  lang: Lang;
  onCreated: (planetId: string) => void;
}

const FIRST_LOG_TYPES: FirstLogDraft["reportType"][] = [
  "observation",
  "incident",
  "testimony",
  "recovered",
  "technical",
];

const STEP_TITLES = {
  ko: ["행성 기본 정보", "현재 상태", "대표 설정", "첫 관측 로그"],
  en: ["Planet Basics", "Current State", "Signature Setting", "First Observation Log"],
};

// ============================================================
// PART 1 - LOCAL STATE AND HELPERS
// ============================================================

export function PlanetWizard({ ownerId, ownerName, lang, onCreated }: PlanetWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [rulesInput, setRulesInput] = useState("");
  const [planet, setPlanet] = useState({
    name: "",
    code: "",
    genre: "",
    civilizationLevel: "",
    goal: "maintain" as PlanetGoal,
    status: "maintain" as PlanetStatus,
    summary: "",
    ehRisk: null as number | null,
    systemExposure: null as number | null,
    featuredFaction: "",
    featuredCharacter: "",
    transcendenceCost: "",
  });
  const [firstLog, setFirstLog] = useState<FirstLogDraft>({
    title: "",
    reportType: "observation",
    eventCategory: "",
    content: REPORT_TYPE_TEMPLATES.observation[lang === "ko" ? "ko" : "en"],
    region: "",
    intervention: false,
    ehImpact: null as number | null,
    followupStatus: null as PlanetStatus | null,
  });

  const stepTitles = lang === "ko" ? STEP_TITLES.ko : STEP_TITLES.en;
  const representativeTags = useMemo(
    () =>
      Array.from(
        new Set(
          tagInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ).slice(0, 6),
    [tagInput],
  );
  const coreRules = useMemo(
    () =>
      rulesInput
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3),
    [rulesInput],
  );

  const canMoveNext = useMemo(() => {
    if (step === 0) {
      return Boolean(planet.name.trim() && planet.genre.trim() && planet.civilizationLevel.trim());
    }
    if (step === 1) {
      return Boolean(planet.summary.trim());
    }
    if (step === 3) {
      return Boolean(firstLog.title.trim() && firstLog.eventCategory.trim() && firstLog.content.trim());
    }
    return true;
  }, [
    firstLog.content,
    firstLog.eventCategory,
    firstLog.title,
    planet.civilizationLevel,
    planet.genre,
    planet.name,
    planet.summary,
    step,
  ]);

  const insertTemplate = () => {
    setFirstLog((current) => ({
      ...current,
      content: REPORT_TYPE_TEMPLATES[current.reportType][lang === "ko" ? "ko" : "en"],
    }));
  };

  const handleSubmit = async () => {
    if (!canMoveNext || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await ensureNetworkUserRecord({
        uid: ownerId,
        displayName: ownerName ?? null,
      });

      const { planet: createdPlanet } = await createPlanetWithFirstLog({
        ownerId,
        visibility: "public",
        planet: {
          ...planet,
          representativeTags,
          coreRules,
        },
        firstLog,
      });

      onCreated(createdPlanet.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : lang === "ko" ? "생성에 실패했습니다." : "Creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // IDENTITY_SEAL: PART-1 | role=wizard state machine | inputs=form interaction | outputs=validated local state

  // ============================================================
  // PART 2 - STEP PANELS
  // ============================================================

  const stepPanel =
    step === 0 ? (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "행성명" : "Planet Name"}</div>
          <input
            value={planet.name}
            onChange={(event) => setPlanet((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "분류 코드" : "Code"}</div>
          <input
            value={planet.code}
            onChange={(event) => setPlanet((current) => ({ ...current, code: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "장르" : "Genre"}</div>
          <input
            value={planet.genre}
            onChange={(event) => setPlanet((current) => ({ ...current, genre: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "문명 단계" : "Civilization Level"}</div>
          <input
            value={planet.civilizationLevel}
            onChange={(event) => setPlanet((current) => ({ ...current, civilizationLevel: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "운영 목표" : "Goal"}</div>
          <select
            value={planet.goal}
            onChange={(event) => setPlanet((current) => ({ ...current, goal: event.target.value as PlanetGoal }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          >
            {PLANET_GOALS.map((goal) => (
              <option key={goal} value={goal}>
                {pickNetworkLabel(PLANET_GOAL_LABELS[goal], lang)}
              </option>
            ))}
          </select>
        </label>
      </div>
    ) : step === 1 ? (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "한 줄 소개" : "Summary"}</div>
          <textarea
            value={planet.summary}
            onChange={(event) => setPlanet((current) => ({ ...current, summary: event.target.value }))}
            className="min-h-[160px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "현재 상태" : "Current Status"}</div>
          <select
            value={planet.status}
            onChange={(event) => setPlanet((current) => ({ ...current, status: event.target.value as PlanetStatus }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          >
            {PLANET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {pickNetworkLabel(PLANET_STATUS_LABELS[status], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "대표 태그" : "Representative Tags"}</div>
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
            placeholder={lang === "ko" ? "쉼표로 구분" : "Comma-separated"}
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "EH 위험도" : "EH Risk"}</div>
          <input
            type="number"
            min={0}
            max={100}
            value={planet.ehRisk ?? ""}
            onChange={(event) =>
              setPlanet((current) => ({
                ...current,
                ehRisk: event.target.value === "" ? null : Number.parseInt(event.target.value, 10),
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "시스템 노출 강도" : "System Exposure"}</div>
          <input
            type="number"
            min={0}
            max={100}
            value={planet.systemExposure ?? ""}
            onChange={(event) =>
              setPlanet((current) => ({
                ...current,
                systemExposure: event.target.value === "" ? null : Number.parseInt(event.target.value, 10),
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "핵심 규칙 3개" : "Core Rules (up to 3)"}</div>
          <textarea
            value={rulesInput}
            onChange={(event) => setRulesInput(event.target.value)}
            className="min-h-[120px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
            placeholder={lang === "ko" ? "한 줄에 하나씩 입력" : "One rule per line"}
          />
        </label>
      </div>
    ) : step === 2 ? (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "대표 세력" : "Featured Faction"}</div>
          <input
            value={planet.featuredFaction}
            onChange={(event) => setPlanet((current) => ({ ...current, featuredFaction: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "대표 인물" : "Featured Character"}</div>
          <input
            value={planet.featuredCharacter}
            onChange={(event) => setPlanet((current) => ({ ...current, featuredCharacter: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "초월 대가" : "Transcendence Cost"}</div>
          <textarea
            value={planet.transcendenceCost}
            onChange={(event) => setPlanet((current) => ({ ...current, transcendenceCost: event.target.value }))}
            className="min-h-[120px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
          />
        </label>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "로그 제목" : "Log Title"}</div>
          <input
            value={firstLog.title}
            onChange={(event) => setFirstLog((current) => ({ ...current, title: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "문서 형식" : "Report Type"}</div>
          <select
            value={firstLog.reportType}
            onChange={(event) =>
              setFirstLog((current) => ({
                ...current,
                reportType: event.target.value as FirstLogDraft["reportType"],
                content:
                  REPORT_TYPE_TEMPLATES[event.target.value as FirstLogDraft["reportType"]][
                    lang === "ko" ? "ko" : "en"
                  ],
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          >
            {FIRST_LOG_TYPES.map((type) => (
              <option key={type} value={type}>
                {pickNetworkLabel(REPORT_TYPE_LABELS[type], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "사건 분류" : "Event Type"}</div>
          <input
            value={firstLog.eventCategory}
            onChange={(event) => setFirstLog((current) => ({ ...current, eventCategory: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "지역" : "Region"}</div>
          <input
            value={firstLog.region}
            onChange={(event) => setFirstLog((current) => ({ ...current, region: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "후속 상태" : "Follow-up Status"}</div>
          <select
            value={firstLog.followupStatus ?? ""}
            onChange={(event) =>
              setFirstLog((current) => ({
                ...current,
                followupStatus: event.target.value === "" ? null : (event.target.value as PlanetStatus),
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          >
            <option value="">{lang === "ko" ? "선택 안 함" : "No verdict"}</option>
            {PLANET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {pickNetworkLabel(PLANET_STATUS_LABELS[status], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "EH 영향도" : "EH Impact"}</div>
          <input
            type="number"
            min={-100}
            max={100}
            value={firstLog.ehImpact ?? ""}
            onChange={(event) =>
              setFirstLog((current) => ({
                ...current,
                ehImpact: event.target.value === "" ? null : Number.parseInt(event.target.value, 10),
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-text-secondary md:col-span-2">
          <input
            type="checkbox"
            checked={firstLog.intervention}
            onChange={(event) => setFirstLog((current) => ({ ...current, intervention: event.target.checked }))}
          />
          {lang === "ko" ? "직접 개입이 있었음" : "Direct intervention occurred"}
        </label>
        <div className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between text-sm text-text-secondary">
            <span>{lang === "ko" ? "본문" : "Body"}</span>
            <button
              type="button"
              onClick={insertTemplate}
              className="rounded-full border border-accent-amber/25 bg-accent-amber/10 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-accent-amber uppercase"
            >
              {lang === "ko" ? "템플릿 삽입" : "Insert Template"}
            </button>
          </div>
          <textarea
            value={firstLog.content}
            onChange={(event) => setFirstLog((current) => ({ ...current, content: event.target.value }))}
            className="min-h-[320px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
          />
        </div>
      </div>
    );

  // IDENTITY_SEAL: PART-2 | role=step panels | inputs=wizard state | outputs=step-specific form UI

  // ============================================================
  // PART 3 - RENDER
  // ============================================================

  return (
    <section className="premium-panel p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="site-kicker">{lang === "ko" ? "행성 등록 위저드" : "Planet Registration Wizard"}</div>
          <h1 className="site-title mt-2 text-3xl font-semibold">
            {lang === "ko" ? "행성을 만들고 첫 관측 로그를 남기세요." : "Register a planet and publish its first observation."}
          </h1>
        </div>
        <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.18em] text-text-tertiary uppercase">
          STEP {step + 1} / 4
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-4">
        {stepTitles.map((title, index) => (
          <button
            key={title}
            type="button"
            onClick={() => setStep(index)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              index === step
                ? "border-accent-amber/40 bg-accent-amber/10 text-text-primary"
                : "border-white/8 bg-white/[0.02] text-text-secondary"
            }`}
          >
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em]">
              STEP {index + 1}
            </div>
            <div className="mt-2 text-sm">{title}</div>
          </button>
        ))}
      </div>

      <div className="mt-8">{stepPanel}</div>
      {error ? <p className="mt-5 text-sm text-accent-red">{error}</p> : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || submitting}
          className="premium-button secondary"
        >
          {lang === "ko" ? "이전" : "Back"}
        </button>
        <div className="flex flex-wrap gap-3">
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((current) => Math.min(3, current + 1))}
              disabled={!canMoveNext || submitting}
              className="premium-button"
            >
              {lang === "ko" ? "다음 단계" : "Next Step"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canMoveNext || submitting}
              className="premium-button"
            >
              {submitting
                ? lang === "ko"
                  ? "생성 중..."
                  : "Creating..."
                : lang === "ko"
                  ? "행성 등록 + 첫 로그 생성"
                  : "Create Planet + First Log"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// IDENTITY_SEAL: PART-3 | role=wizard renderer | inputs=step panel and navigation state | outputs=interactive wizard
