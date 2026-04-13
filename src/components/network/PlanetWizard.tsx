"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
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
import { useNetworkAgent } from "@/lib/hooks/useNetworkAgent";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";

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
// PART 0 - PLANET TEMPLATES
// ============================================================

interface PlanetTemplate {
  id: string;
  icon: string;
  label: { ko: string; en: string };
  name: string;
  genre: string;
  civilizationLevel: string;
  summary: { ko: string; en: string };
  tags: string[];
  goal: PlanetGoal;
  status: PlanetStatus;
}

const PLANET_TEMPLATES: PlanetTemplate[] = [
  {
    id: "fantasy",
    icon: "\u2694\uFE0F",
    label: { ko: "\uD310\uD0C0\uC9C0 \uC655\uAD6D", en: "Fantasy Kingdom" },
    name: "",
    genre: "Fantasy",
    civilizationLevel: "Medieval",
    summary: {
      ko: "\uB9C8\uBC95\uACFC \uAC80\uC774 \uC9C0\uBC30\uD558\uB294 \uC911\uC138 \uC655\uAD6D. \uADC0\uC871 \uAC04 \uAD8C\uB825 \uD22C\uC7C1\uACFC \uACE0\uB300 \uC720\uC801\uC758 \uBE44\uBC00\uC774 \uC5BD\uD600 \uC788\uB2E4.",
      en: "A medieval kingdom ruled by magic and steel. Noble power struggles intertwine with ancient ruin secrets.",
    },
    tags: ["fantasy", "kingdom", "magic"],
    goal: "maintain",
    status: "maintain",
  },
  {
    id: "modern",
    icon: "\uD83C\uDFD9\uFE0F",
    label: { ko: "\uD604\uB300 \uB3C4\uC2DC", en: "Modern City" },
    name: "",
    genre: "Urban",
    civilizationLevel: "Modern",
    summary: {
      ko: "\uCD08\uB2A5\uB825\uC790\uC640 \uBE44\uBC00 \uC870\uC9C1\uC774 \uACF5\uC874\uD558\uB294 \uD604\uB300 \uB300\uB3C4\uC2DC. \uD45C\uBA74 \uC544\uB798 \uC228\uACA8\uC9C4 \uC804\uC7C1\uC774 \uC9C4\uD589 \uC911\uC774\uB2E4.",
      en: "A modern metropolis where supernatural beings and secret organizations coexist. Hidden wars rage beneath the surface.",
    },
    tags: ["urban", "modern", "supernatural"],
    goal: "develop",
    status: "maintain",
  },
  {
    id: "scifi",
    icon: "\uD83D\uDE80",
    label: { ko: "SF \uD589\uC131", en: "Sci-Fi Planet" },
    name: "",
    genre: "Sci-Fi",
    civilizationLevel: "Interstellar",
    summary: {
      ko: "\uC131\uAC04 \uBB38\uBA85\uC774 \uBC1C\uB2EC\uD55C \uBBF8\uB798 \uD589\uC131. \uC778\uACF5\uC9C0\uB2A5\uACFC \uC678\uACC4 \uC885\uC758 \uC704\uD611\uC774 \uACF5\uC874\uD55C\uB2E4.",
      en: "A future planet with interstellar civilization. AI threats and alien species coexist in uneasy balance.",
    },
    tags: ["scifi", "space", "AI"],
    goal: "experiment",
    status: "develop",
  },
];

// ============================================================
// PART 1 - LOCAL STATE AND HELPERS
// ============================================================

export function PlanetWizard({ ownerId, ownerName, lang, onCreated, availableTags = [] }: PlanetWizardProps) {
  const { user } = useAuth();
  const { ingestAgent } = useNetworkAgent();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
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
    content: L4(lang, REPORT_TYPE_TEMPLATES.observation),
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

  const stepTitles = STEP_TITLES[lang === "ko" ? "ko" : "en"];
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
      content: L4(lang, REPORT_TYPE_TEMPLATES[current.reportType]),
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

      // 구글 Agent Builder 엔진에 방금 만든 행성 정보 밀어넣기!
      const contentString = [
        `장르: ${planet.genre}`,
        `문명 단계: ${planet.civilizationLevel}`,
        `한 줄 소개: ${planet.summary}`,
        `핵심 규칙:\n${coreRules.join('\n')}`,
      ].join('\n\n');

      const idToken = user ? await user.getIdToken() : null;
      if (idToken) {
        ingestAgent({
          documentId: createdPlanet.id,
          title: `행성: ${planet.name}`,
          content: contentString,
          planetId: createdPlanet.id,
          isPublic: true,
        }, idToken).catch((err: unknown) => {
          logger.warn('PlanetWizard', 'ingestAgent failed', err);
        });
      } else {
        logger.warn('PlanetWizard', 'ingestAgent skipped: no Firebase session');
      }

      onCreated(createdPlanet.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : L4(lang, { ko: "생성에 실패했습니다.", en: "Creation failed." }));
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
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "행성명", en: "Planet Name" })}</div>
          <input
            value={planet.name}
            onChange={(event) => setPlanet((current) => ({ ...current, name: event.target.value }))}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "분류 코드", en: "Code" })}</div>
          <input
            value={planet.code}
            onChange={(event) => setPlanet((current) => ({ ...current, code: event.target.value }))}
            maxLength={50}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "장르", en: "Genre" })}</div>
          <input
            value={planet.genre}
            onChange={(event) => setPlanet((current) => ({ ...current, genre: event.target.value }))}
            maxLength={50}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "문명 단계", en: "Civilization Level" })}</div>
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
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "한 줄 소개", en: "Summary" })}</div>
          <textarea
            value={planet.summary}
            onChange={(event) => setPlanet((current) => ({ ...current, summary: event.target.value }))}
            maxLength={500}
            className="min-h-[160px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{planet.summary.length}/500</div>
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "현재 상태", en: "Current Status" })}</div>
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
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "대표 태그", en: "Representative Tags" })}</div>
          <input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            maxLength={200}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
            placeholder={L4(lang, { ko: "쉼표로 구분", en: "Comma-separated" })}
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "EH 위험도", en: "EH Risk" })}</div>
          <input
            type="number"
            min={0}
            max={100}
            value={planet.ehRisk ?? ""}
            onChange={(event) =>
              setPlanet((current) => ({
                ...current,
                ehRisk: event.target.value === "" ? null : (Number.parseInt(event.target.value, 10) || 0),
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "시스템 노출 강도", en: "System Exposure" })}</div>
          <input
            type="number"
            min={0}
            max={100}
            value={planet.systemExposure ?? ""}
            onChange={(event) =>
              setPlanet((current) => ({
                ...current,
                systemExposure: event.target.value === "" ? null : (Number.parseInt(event.target.value, 10) || 0),
              }))
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "핵심 규칙 3개", en: "Core Rules (up to 3)" })}</div>
          <textarea
            value={rulesInput}
            onChange={(event) => setRulesInput(event.target.value)}
            maxLength={500}
            className="min-h-[120px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
            placeholder={L4(lang, { ko: "한 줄에 하나씩 입력", en: "One rule per line" })}
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{rulesInput.length}/500</div>
        </label>
        <div className="md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "검색용 태그", en: "Search Tags" })}</div>
          <TagInput
            tags={planetTags}
            onChange={setPlanetTags}
            availableTags={suggestedTags}
            maxTags={10}
            lang={lang}
            placeholder={L4(lang, { ko: "장르, 키워드 등 (Enter로 추가)", en: "Genre, keywords, etc. (press Enter)" })}
          />
        </div>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "대표 세력", en: "Featured Faction" })}</div>
          <input
            value={planet.featuredFaction}
            onChange={(event) => setPlanet((current) => ({ ...current, featuredFaction: event.target.value }))}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "대표 인물", en: "Featured Character" })}</div>
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
            {L4(lang, { ko: "초월 시 상실 요소를 지정하세요. EH 세계관의 대가 구조에 해당합니다.", en: "Designate the cost elements upon transcendence. These map to EH cost structures." })}
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
              {L4(lang, option)}
            </label>
          ))}
        </div>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "추가 대가 설명 (선택)", en: "Additional Cost Description (optional)" })}</div>
          <textarea
            value={planet.transcendenceCost}
            onChange={(event) => setPlanet((current) => ({ ...current, transcendenceCost: event.target.value }))}
            maxLength={500}
            className="min-h-[100px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
            placeholder={L4(lang, { ko: "선택한 대가에 대한 부연 설명", en: "Additional notes on selected costs" })}
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{planet.transcendenceCost.length}/500</div>
        </label>
      </div>
    ) : step === 3 ? (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-text-secondary">
            {L4(lang, { ko: "이 행성의 운영 목표를 선언하세요. NMF는 통치자의 의도를 기록하고, 정산 시 이를 기준으로 평가합니다.", en: "Declare the governance goal for this planet. NMF records the governor's intent and evaluates against it during settlement." })}
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
                    ? L4(lang, { ko: "현재 상태를 보존하고 안정적으로 운영합니다.", en: "Preserve current state and operate stably." })
                    : goal === "develop"
                      ? L4(lang, { ko: "성장과 확장을 목표로 운영합니다.", en: "Operate toward growth and expansion." })
                      : goal === "collapse"
                        ? L4(lang, { ko: "의도적 해체 또는 붕괴를 허용합니다.", en: "Allow intentional dismantling or collapse." })
                        : L4(lang, { ko: "실험적 운영을 허용합니다. 결과는 미확정입니다.", en: "Allow experimental operation. Results are undetermined." })}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.1em] text-text-tertiary">
            {L4(lang, { ko: "\"통치자는 신이 아니다. 통치자는 관리자다.\" — NMF 운영 원칙", en: "\"A governor is not a god. A governor is a manager.\" — NMF Operational Principle" })}
          </p>
        </div>
      </div>
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "로그 제목", en: "Log Title" })}</div>
          <input
            value={firstLog.title}
            onChange={(event) => setFirstLog((current) => ({ ...current, title: event.target.value }))}
            maxLength={200}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "문서 형식", en: "Report Type" })}</div>
          <select
            value={firstLog.reportType}
            onChange={(event) =>
              setFirstLog((current) => ({
                ...current,
                reportType: event.target.value as FirstLogDraft["reportType"],
                content: L4(lang, REPORT_TYPE_TEMPLATES[event.target.value as FirstLogDraft["reportType"]]),
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
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "사건 분류", en: "Event Type" })}</div>
          <input
            value={firstLog.eventCategory}
            onChange={(event) => setFirstLog((current) => ({ ...current, eventCategory: event.target.value }))}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "지역", en: "Region" })}</div>
          <input
            value={firstLog.region}
            onChange={(event) => setFirstLog((current) => ({ ...current, region: event.target.value }))}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "후속 상태", en: "Follow-up Status" })}</div>
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
            <option value="">{L4(lang, { ko: "선택 안 함", en: "No verdict" })}</option>
            {PLANET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {pickNetworkLabel(PLANET_STATUS_LABELS[status], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "EH 영향도", en: "EH Impact" })}</div>
          <input
            type="number"
            min={-100}
            max={100}
            value={firstLog.ehImpact ?? ""}
            onChange={(event) =>
              setFirstLog((current) => ({
                ...current,
                ehImpact: event.target.value === "" ? null : (Number.parseInt(event.target.value, 10) || 0),
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
          {L4(lang, { ko: "직접 개입이 있었음", en: "Direct intervention occurred" })}
        </label>
        <div className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between text-sm text-text-secondary">
            <span>{L4(lang, { ko: "본문", en: "Body" })}</span>
            <button
              type="button"
              onClick={insertTemplate}
              className="rounded-full border border-accent-amber/25 bg-accent-amber/10 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-accent-amber uppercase"
            >
              {L4(lang, { ko: "템플릿 삽입", en: "Insert Template" })}
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
          <div className="site-kicker">{L4(lang, { ko: "행성 등록 위저드", en: "Planet Registration Wizard" })}</div>
          <h1 className="site-title mt-2 text-3xl font-semibold">
            {L4(lang, { ko: "행성을 만들고 첫 관측 로그를 남기세요.", en: "Register a planet and publish its first observation." })}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {importedFromStudio && (
            <span className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-accent-amber">
              {L4(lang, { ko: "스튜디오에서 불러옴", en: "Imported from Studio" })}
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
              title={!reachable ? L4(lang, { ko: "이전 단계를 먼저 완료하세요", en: "Complete previous steps first" }) : undefined}
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

      {/* Template Selection (shown on step 0 only) */}
      {step === 0 && !selectedTemplate && (
        <div className="mt-8 space-y-3">
          <div className="text-sm text-text-secondary">
            {L4(lang, { ko: "템플릿으로 빠르게 시작하기", en: "Quick start with a template" })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {PLANET_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setSelectedTemplate(tpl.id);
                  setPlanet((prev) => ({
                    ...prev,
                    genre: tpl.genre,
                    civilizationLevel: tpl.civilizationLevel,
                    summary: L4(lang, tpl.summary),
                    goal: tpl.goal,
                    status: tpl.status,
                  }));
                  setTagInput(tpl.tags.join(", "));
                  setPlanetTags(tpl.tags);
                }}
                className="flex flex-col items-start gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-left transition hover:border-accent-amber/30 hover:bg-accent-amber/5"
              >
                <span className="text-2xl">{tpl.icon}</span>
                <span className="text-sm font-semibold text-text-primary">{L4(lang, tpl.label)}</span>
                <span className="text-xs text-text-tertiary leading-relaxed">{L4(lang, tpl.summary).slice(0, 60)}...</span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {tpl.tags.map((t) => (
                    <span key={t} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-text-tertiary">{t}</span>
                  ))}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSelectedTemplate("custom")}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors underline underline-offset-2"
          >
            {L4(lang, { ko: "직접 만들기", en: "Custom" })}
          </button>
        </div>
      )}

      <div className="mt-8">{stepPanel}</div>
      {error ? <p className="mt-5 text-sm text-accent-red">{error}</p> : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || submitting}
          className="premium-button secondary"
        >
          {L4(lang, { ko: "이전", en: "Back" })}
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
              {L4(lang, { ko: "다음 단계", en: "Next Step" })}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canMoveNext || submitting}
              className="premium-button"
            >
              {submitting
                ? L4(lang, { ko: "생성 중...", en: "Creating..." })
                : L4(lang, { ko: "행성 등록 + 첫 로그 생성", en: "Create Planet + First Log" })}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// IDENTITY_SEAL: PART-3 | role=wizard renderer | inputs=step panel and navigation state | outputs=interactive wizard
