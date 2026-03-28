"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { TagInput } from "@/components/network/TagInput";

interface PlanetWizardProps {
  ownerId: string;
  ownerName?: string | null;
  lang: Lang;
  onCreated: (planetId: string) => void;
  availableTags?: string[];
}

const FIRST_LOG_TYPES: FirstLogDraft["reportType"][] = [
  "observation",
  "incident",
  "testimony",
  "recovered",
  "technical",
];

const STEP_TITLES = {
  ko: ["행성 기본 정보", "세부 설정", "대가 구조 정의", "통치 목표 선언", "첫 관측 로그"],
  en: ["Planet Basics", "Detail Settings", "Cost Structure", "Governance Goal", "First Observation Log"],
};

const TRANSCENDENCE_COST_OPTIONS: { value: string; ko: string; en: string }[] = [
  { value: "memory_loss", ko: "기억 상실", en: "Memory Loss" },
  { value: "sense_loss", ko: "감각 소실", en: "Sense Loss" },
  { value: "humanity_decline", ko: "인간성 하락", en: "Humanity Decline" },
  { value: "time_reduction", ko: "시간 단축", en: "Time Reduction" },
  { value: "relationship_collapse", ko: "관계 붕괴", en: "Relationship Collapse" },
];

// ============================================================
// PART 1 - LOCAL STATE AND HELPERS
// ============================================================

export function PlanetWizard({ ownerId, ownerName, lang, onCreated, availableTags = [] }: PlanetWizardProps) {
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [rulesInput, setRulesInput] = useState("");
  const [planetTags, setPlanetTags] = useState<string[]>([]);
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
    transcendenceCosts: [] as string[],
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

  const searchParams = useSearchParams();
  const [importedFromStudio, setImportedFromStudio] = useState(false);

  useEffect(() => {
    const raw = searchParams.get("import");
    if (!raw) return;
    try {
      const json = JSON.parse(decodeURIComponent(escape(atob(raw))));
      setPlanet((prev) => ({
        ...prev,
        name: json.title ?? prev.name,
        summary: json.synopsis ?? prev.summary,
        genre: json.genre ?? prev.genre,
      }));
      const rules: string[] = [];
      if (json.corePremise) rules.push(json.corePremise);
      if (json.powerStructure) rules.push(json.powerStructure);
      if (rules.length > 0) setRulesInput(rules.slice(0, 3).join("\n"));
      if (json.genre) setTagInput(json.genre);
      setImportedFromStudio(true);
    } catch {
      // invalid base64 or JSON — ignore silently
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const suggestedTags = useMemo(() => {
    const base = new Set<string>();
    if (planet.genre.trim()) base.add(planet.genre.trim());
    if (planet.goal) base.add(planet.goal);
    if (planet.status && planet.status !== planet.goal) base.add(planet.status);
    for (const tag of representativeTags) base.add(tag);
    for (const existing of availableTags) base.add(existing);
    for (const current of planetTags) base.delete(current);
    return Array.from(base).slice(0, 20);
  }, [planet.genre, planet.goal, planet.status, representativeTags, availableTags, planetTags]);

  const canMoveNext = useMemo(() => {
    if (step === 0) {
      return Boolean(planet.name.trim() && planet.genre.trim() && planet.civilizationLevel.trim());
    }
    if (step === 1) {
      return Boolean(planet.summary.trim());
    }
    if (step === 4) {
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
          tags: planetTags,
          coreRules,
          transcendenceCosts: planet.transcendenceCosts,
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
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "분류 코드" : "Code"}</div>
          <input
            value={planet.code}
            onChange={(event) => setPlanet((current) => ({ ...current, code: event.target.value }))}
            maxLength={50}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "장르" : "Genre"}</div>
          <input
            value={planet.genre}
            onChange={(event) => setPlanet((current) => ({ ...current, genre: event.target.value }))}
            maxLength={50}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "문명 단계" : "Civilization Level"}</div>
          <input
            value={planet.civilizationLevel}
            onChange={(event) => setPlanet((current) => ({ ...current, civilizationLevel: event.target.value }))}
            maxLength={50}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
      </div>
    ) : step === 1 ? (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "한 줄 소개" : "Summary"}</div>
          <textarea
            value={planet.summary}
            onChange={(event) => setPlanet((current) => ({ ...current, summary: event.target.value }))}
            maxLength={500}
            className="min-h-[160px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{planet.summary.length}/500</div>
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
            maxLength={200}
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
            maxLength={500}
            className="min-h-[120px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
            placeholder={lang === "ko" ? "한 줄에 하나씩 입력" : "One rule per line"}
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{rulesInput.length}/500</div>
        </label>
        <div className="md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "검색용 태그" : "Search Tags"}</div>
          <TagInput
            tags={planetTags}
            onChange={setPlanetTags}
            availableTags={suggestedTags}
            maxTags={10}
            lang={lang}
            placeholder={lang === "ko" ? "장르, 키워드 등 (Enter로 추가)" : "Genre, keywords, etc. (press Enter)"}
          />
        </div>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "대표 세력" : "Featured Faction"}</div>
          <input
            value={planet.featuredFaction}
            onChange={(event) => setPlanet((current) => ({ ...current, featuredFaction: event.target.value }))}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "대표 인물" : "Featured Character"}</div>
          <input
            value={planet.featuredCharacter}
            onChange={(event) => setPlanet((current) => ({ ...current, featuredCharacter: event.target.value }))}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
      </div>
    ) : step === 2 ? (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary">
            {lang === "ko"
              ? "초월 시 상실 요소를 지정하세요. EH 세계관의 대가 구조에 해당합니다."
              : "Designate the cost elements upon transcendence. These map to EH cost structures."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRANSCENDENCE_COST_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                planet.transcendenceCosts.includes(option.value)
                  ? "border-accent-amber/40 bg-accent-amber/10 text-text-primary"
                  : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16"
              }`}
            >
              <input
                type="checkbox"
                checked={planet.transcendenceCosts.includes(option.value)}
                onChange={(event) => {
                  setPlanet((current) => ({
                    ...current,
                    transcendenceCosts: event.target.checked
                      ? [...current.transcendenceCosts, option.value]
                      : current.transcendenceCosts.filter((v) => v !== option.value),
                  }));
                }}
                className="accent-accent-amber"
              />
              {lang === "ko" ? option.ko : option.en}
            </label>
          ))}
        </div>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "추가 대가 설명 (선택)" : "Additional Cost Description (optional)"}</div>
          <textarea
            value={planet.transcendenceCost}
            onChange={(event) => setPlanet((current) => ({ ...current, transcendenceCost: event.target.value }))}
            maxLength={500}
            className="min-h-[100px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
            placeholder={lang === "ko" ? "선택한 대가에 대한 부연 설명" : "Additional notes on selected costs"}
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{planet.transcendenceCost.length}/500</div>
        </label>
      </div>
    ) : step === 3 ? (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary">
            {lang === "ko"
              ? "이 행성의 운영 목표를 선언하세요. NMF는 통치자의 의도를 기록하고, 정산 시 이를 기준으로 평가합니다."
              : "Declare the governance goal for this planet. NMF records the governor's intent and evaluates against it during settlement."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PLANET_GOALS.map((goal) => (
            <label
              key={goal}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 transition ${
                planet.goal === goal
                  ? "border-accent-amber/40 bg-accent-amber/10 text-text-primary"
                  : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16"
              }`}
            >
              <input
                type="radio"
                name="planet-goal"
                value={goal}
                checked={planet.goal === goal}
                onChange={() => setPlanet((current) => ({ ...current, goal }))}
                className="accent-accent-amber"
              />
              <div>
                <div className="text-sm font-medium">{pickNetworkLabel(PLANET_GOAL_LABELS[goal], lang)}</div>
                <div className="mt-1 text-xs text-text-tertiary">
                  {goal === "maintain"
                    ? lang === "ko" ? "현재 상태를 보존하고 안정적으로 운영합니다." : "Preserve current state and operate stably."
                    : goal === "develop"
                      ? lang === "ko" ? "성장과 확장을 목표로 운영합니다." : "Operate toward growth and expansion."
                      : goal === "collapse"
                        ? lang === "ko" ? "의도적 해체 또는 붕괴를 허용합니다." : "Allow intentional dismantling or collapse."
                        : lang === "ko" ? "실험적 운영을 허용합니다. 결과는 미확정입니다." : "Allow experimental operation. Results are undetermined."}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.1em] text-text-tertiary">
            {lang === "ko"
              ? "\"통치자는 신이 아니다. 통치자는 관리자다.\" — NMF 운영 원칙"
              : "\"A governor is not a god. A governor is a manager.\" — NMF Operational Principle"}
          </p>
        </div>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "로그 제목" : "Log Title"}</div>
          <input
            value={firstLog.title}
            onChange={(event) => setFirstLog((current) => ({ ...current, title: event.target.value }))}
            maxLength={200}
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
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{lang === "ko" ? "지역" : "Region"}</div>
          <input
            value={firstLog.region}
            onChange={(event) => setFirstLog((current) => ({ ...current, region: event.target.value }))}
            maxLength={100}
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
            maxLength={10000}
            className="min-h-[320px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{firstLog.content.length}/10000</div>
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
        <div className="flex items-center gap-3">
          {importedFromStudio && (
            <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-accent-amber">
              {lang === "ko" ? "스튜디오에서 불러옴" : "Imported from Studio"}
            </span>
          )}
          <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.18em] text-text-tertiary uppercase">
            STEP {step + 1} / 5
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-5">
        {stepTitles.map((title, index) => {
          const reachable = index <= maxVisitedStep + 1;
          return (
            <button
              key={title}
              type="button"
              disabled={!reachable}
              onClick={() => { if (reachable) setStep(index); }}
              title={!reachable ? (lang === "ko" ? "이전 단계를 먼저 완료하세요" : "Complete previous steps first") : undefined}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                index === step
                  ? "border-accent-amber/40 bg-accent-amber/10 text-text-primary"
                  : reachable
                    ? "border-white/8 bg-white/[0.02] text-text-secondary"
                    : "border-white/5 bg-white/[0.01] text-text-tertiary opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em]">
                STEP {index + 1}
              </div>
              <div className="mt-2 text-sm">{title}</div>
            </button>
          );
        })}
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
          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                const next = Math.min(4, step + 1);
                setStep(next);
                setMaxVisitedStep((prev) => Math.max(prev, next));
              }}
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
