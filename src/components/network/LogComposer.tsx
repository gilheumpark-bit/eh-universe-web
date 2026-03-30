"use client";

import type { Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import type { PlanetStatus, ReportType } from "@/lib/network-types";
import {
  PLANET_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  pickNetworkLabel,
} from "@/lib/network-labels";

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
  const handleField = <K extends keyof LogComposerValue>(key: K, nextValue: LogComposerValue[K]) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  return (
    <div className="premium-panel-soft p-5 md:p-6">
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
                event.target.value === "" ? null : Number.parseInt(event.target.value, 10),
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
