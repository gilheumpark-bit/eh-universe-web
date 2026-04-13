"use client";

import { useState } from "react";
import type { Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import type { PlanetStatus, ReportType } from "@/lib/network-types";
import {
  PLANET_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  pickNetworkLabel,
} from "@/lib/network-labels";

// ============================================================
// PART 0 - LOG CATEGORIES
// ============================================================

export type LogCategory = "dev" | "translation" | "worldbuild" | "patch" | "other";

interface LogCategoryDef {
  id: LogCategory;
  icon: string;
  label: { ko: string; en: string };
  template: { ko: string; en: string };
  tag: string;
}

const LOG_CATEGORIES: LogCategoryDef[] = [
  {
    id: "dev",
    icon: "\uD83D\uDEE0\uFE0F",
    label: { ko: "\uAC1C\uBC1C \uB85C\uADF8", en: "Dev Log" },
    template: { ko: "## \uAC1C\uBC1C \uB85C\uADF8\n\n### \uBCC0\uACBD \uC0AC\uD56D\n- \n\n### \uBE44\uACE0\n", en: "## Dev Log\n\n### Changes\n- \n\n### Notes\n" },
    tag: "dev-log",
  },
  {
    id: "translation",
    icon: "\uD83C\uDF10",
    label: { ko: "\uBC88\uC5ED \uB85C\uADF8", en: "Translation Log" },
    template: { ko: "## \uBC88\uC5ED \uB85C\uADF8\n\n### \uBC88\uC5ED \uBC94\uC704\n- \n\n### \uC6A9\uC5B4 \uBCC0\uACBD\n", en: "## Translation Log\n\n### Scope\n- \n\n### Glossary Changes\n" },
    tag: "translation-log",
  },
  {
    id: "worldbuild",
    icon: "\uD83C\uDF0D",
    label: { ko: "\uC138\uACC4\uAD00 \uC5C5\uB370\uC774\uD2B8", en: "Worldbuild Update" },
    template: { ko: "## \uC138\uACC4\uAD00 \uC5C5\uB370\uC774\uD2B8\n\n### \uBCC0\uACBD \uD56D\uBAA9\n- \n\n### \uC601\uD5A5 \uBC94\uC704\n", en: "## Worldbuild Update\n\n### Changes\n- \n\n### Impact Scope\n" },
    tag: "worldbuild",
  },
  {
    id: "patch",
    icon: "\uD83D\uDCCB",
    label: { ko: "\uD328\uCE58 \uB178\uD2B8", en: "Patch Notes" },
    template: { ko: "## \uD328\uCE58 \uB178\uD2B8\n\n### \uC2E0\uADDC\n- \n\n### \uC218\uC815\n- \n\n### \uC54C\uB824\uC9C4 \uBB38\uC81C\n", en: "## Patch Notes\n\n### New\n- \n\n### Fixed\n- \n\n### Known Issues\n" },
    tag: "patch-notes",
  },
  {
    id: "other",
    icon: "\uD83D\uDCDD",
    label: { ko: "\uAE30\uD0C0", en: "Other" },
    template: { ko: "", en: "" },
    tag: "",
  },
];

export interface LogComposerPlanetOption {
  id: string;
  name: string;
}

export interface LogComposerValue {
  planetId: string;
  reportType: ReportType;
  title: string;
  eventCategory: string;
  content: string;
  region: string;
  intervention: boolean;
  ehImpact: number | null;
  followupStatus: PlanetStatus | null;
}

interface LogComposerProps {
  lang: Lang;
  value: LogComposerValue;
  reportTypeOptions: ReportType[];
  planetOptions?: LogComposerPlanetOption[];
  showPlanetSelect?: boolean;
  disabled?: boolean;
  submitting?: boolean;
  submitLabel: string;
  onChange: (next: LogComposerValue) => void;
  onInsertTemplate: () => void;
  onSubmit: () => void;
}

export function LogComposer({
  lang,
  value,
  reportTypeOptions,
  planetOptions = [],
  showPlanetSelect = false,
  disabled = false,
  submitting = false,
  submitLabel,
  onChange,
  onInsertTemplate,
  onSubmit,
}: LogComposerProps) {
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | null>(null);

  const handleField = <K extends keyof LogComposerValue>(key: K, nextValue: LogComposerValue[K]) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  const applyCategory = (catId: LogCategory) => {
    const cat = LOG_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    setSelectedCategory(catId);
    const tplText = L4(lang, cat.template);
    const nextContent = tplText ? tplText : value.content;
    const nextTitle = value.title || L4(lang, cat.label);
    onChange({
      ...value,
      content: nextContent,
      title: nextTitle,
      eventCategory: value.eventCategory || cat.tag,
    });
  };

  return (
    <div className="premium-panel-soft p-5 md:p-6">
      {/* Category Selector */}
      <div className="mb-4">
        <div className="mb-2 text-sm text-text-secondary">
          {L4(lang, { ko: "\uB85C\uADF8 \uCE74\uD14C\uACE0\uB9AC", en: "Log Category" })}
        </div>
        <div className="flex flex-wrap gap-2">
          {LOG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => applyCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === cat.id
                  ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                  : "border-white/8 bg-white/[0.02] text-text-secondary hover:border-white/16 hover:text-text-primary"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{L4(lang, cat.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {showPlanetSelect ? (
          <label className="block">
            <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "소속 행성", en: "Planet" })}</div>
            <select
              value={value.planetId}
              disabled={disabled}
              onChange={(event) => handleField("planetId", event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
            >
              <option value="">{L4(lang, { ko: "행성을 선택하세요", en: "Select a planet" })}</option>
              {planetOptions.map((planet) => (
                <option key={planet.id} value={planet.id}>
                  {planet.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "문서 형식", en: "Report Type" })}</div>
          <select
            value={value.reportType}
            disabled={disabled}
            onChange={(event) => handleField("reportType", event.target.value as ReportType)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          >
            {reportTypeOptions.map((type) => (
              <option key={type} value={type}>
                {pickNetworkLabel(REPORT_TYPE_LABELS[type], lang)}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "제목", en: "Title" })}</div>
          <input
            value={value.title}
            disabled={disabled}
            onChange={(event) => handleField("title", event.target.value)}
            maxLength={200}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
            placeholder={L4(lang, { ko: "관측 로그 제목을 입력하세요", en: "Enter a title" })}
          />
        </label>

        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "사건 분류", en: "Event Type" })}</div>
          <input
            value={value.eventCategory}
            disabled={disabled}
            onChange={(event) => handleField("eventCategory", event.target.value)}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
            placeholder={L4(lang, { ko: "예: 붕괴, 접촉, 회수", en: "e.g. Collapse, Contact, Recovery" })}
          />
        </label>

        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "지역", en: "Region" })}</div>
          <input
            value={value.region}
            disabled={disabled}
            onChange={(event) => handleField("region", event.target.value)}
            maxLength={100}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
            placeholder={L4(lang, { ko: "관측 지역을 입력하세요", en: "Enter a region" })}
          />
        </label>

        <label className="block md:col-span-2">
          <div className="mb-2 flex items-center justify-between text-sm text-text-secondary">
            <span>{L4(lang, { ko: "본문", en: "Body" })}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={onInsertTemplate}
              className="rounded-full border border-accent-amber/25 bg-accent-amber/10 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-accent-amber uppercase"
            >
              {L4(lang, { ko: "템플릿 삽입", en: "Insert Template" })}
            </button>
          </div>
          <textarea
            value={value.content}
            disabled={disabled}
            onChange={(event) => handleField("content", event.target.value)}
            maxLength={10000}
            className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-text-primary outline-none"
            placeholder={L4(lang, { ko: "관측 내용을 기록하세요", en: "Write the observation" })}
          />
          <div className="mt-1 text-right text-[11px] text-text-tertiary">{value.content.length}/10000</div>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={value.intervention}
            disabled={disabled}
            onChange={(event) => handleField("intervention", event.target.checked)}
          />
          {L4(lang, { ko: "직접 개입이 있었음", en: "Direct intervention occurred" })}
        </label>

        <label className="block">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "EH 영향도", en: "EH Impact" })}</div>
          <input
            type="number"
            min={-100}
            max={100}
            value={value.ehImpact ?? ""}
            disabled={disabled}
            onChange={(event) =>
              handleField(
                "ehImpact",
                event.target.value === "" ? null : (Number.parseInt(event.target.value, 10) || 0),
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="mb-2 text-sm text-text-secondary">{L4(lang, { ko: "후속 상태", en: "Follow-up Status" })}</div>
          <select
            value={value.followupStatus ?? ""}
            disabled={disabled}
            onChange={(event) =>
              handleField(
                "followupStatus",
                event.target.value === "" ? null : (event.target.value as PlanetStatus),
              )
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text-primary outline-none"
          >
            <option value="">{L4(lang, { ko: "선택 안 함", en: "No follow-up verdict" })}</option>
            {(Object.keys(PLANET_STATUS_LABELS) as PlanetStatus[]).map((status) => (
              <option key={status} value={status}>
                {pickNetworkLabel(PLANET_STATUS_LABELS[status], lang)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled={disabled || submitting}
          onClick={onSubmit}
          className="premium-button"
        >
          {submitting ? L4(lang, { ko: "저장 중...", en: "Saving..." }) : submitLabel}
        </button>
      </div>
    </div>
  );
}
