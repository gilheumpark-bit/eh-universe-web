"use client";

// ============================================================
// PART 1 — Imports, Types, Constants
// ============================================================

import React from "react";
import { ChevronDown, Timer, Target, Coffee } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { useSessionTimer, type SessionConfig } from "@/hooks/useSessionTimer";

export interface SessionSectionProps {
  language: AppLanguage;
}

// 슬라이더 제약 — 임무 명세와 정렬
const LIMITS = {
  workMin: { min: 15, max: 50 },
  breakMin: { min: 5, max: 15 },
  longBreakMin: { min: 10, max: 30 },
  restAlertMin: { min: 30, max: 90 },
  dailyGoalChars: { min: 1000, max: 20000, step: 500 },
} as const;

// IDENTITY_SEAL: PART-1 | role=types-constants | inputs=language | outputs=props+limits

// ============================================================
// PART 2 — Small primitives (Toggle, Slider row)
// ============================================================

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
}

function ToggleRow({ label, description, checked, onChange, icon }: ToggleRowProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-colors cursor-pointer border border-transparent hover:border-border"
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs md:text-sm font-bold truncate">{label}</div>
          {description && (
            <div className="text-[13px] text-text-tertiary hidden sm:block">{description}</div>
          )}
        </div>
      </div>
      <div
        className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${
          checked ? "bg-blue-600 justify-end" : "bg-bg-tertiary justify-start"
        }`}
      >
        <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1" />
      </div>
    </div>
  );
}

interface SliderRowProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  suffix: string;
}

function SliderRow({ label, min, max, step = 1, value, onChange, suffix }: SliderRowProps) {
  return (
    <label className="flex flex-col gap-2 p-4 md:p-5 bg-bg-secondary/30 rounded-2xl border border-border">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-text-primary">{label}</span>
        <span className="font-mono text-[11px] font-bold text-accent-blue">
          {value.toLocaleString()} {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent-blue focus-visible:ring-2 focus-visible:ring-accent-blue rounded-full"
      />
      <div className="flex justify-between text-[9px] text-text-tertiary font-mono">
        <span>
          {min} {suffix}
        </span>
        <span>
          {max} {suffix}
        </span>
      </div>
    </label>
  );
}

// IDENTITY_SEAL: PART-2 | role=ui-primitives | inputs=props | outputs=ToggleRow+SliderRow

// ============================================================
// PART 3 — Main section (single accordion, 5 settings)
// ============================================================

const SessionSection: React.FC<SessionSectionProps> = ({ language }) => {
  // 섹션은 총 글자수 계산 불필요 — 설정만 관리
  const { config, setConfig } = useSessionTimer({ totalChars: 0 });

  const setField = <K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) => {
    setConfig({ [key]: value } as Partial<SessionConfig>);
  };

  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <Timer className="w-4 h-4 text-accent-green shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, {
            ko: "세션 · 포모도로",
            en: "Session & Pomodoro",
            ja: "セッション・ポモドーロ",
            zh: "会话与番茄钟",
          })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 포모도로 ON/OFF */}
        <div className="md:col-span-2">
          <ToggleRow
            icon={<Coffee className="w-4 h-4 md:w-5 md:h-5 text-accent-green" />}
            label={L4(language, {
              ko: "포모도로 타이머 활성",
              en: "Enable Pomodoro Timer",
              ja: "ポモドーロタイマーを有効化",
              zh: "启用番茄钟",
            })}
            description={L4(language, {
              ko: "작업/휴식 사이클을 자동 전환하여 집중을 유지합니다",
              en: "Auto-cycle work and break intervals for sustained focus",
              ja: "作業と休憩のサイクルを自動切り替えで集中を維持",
              zh: "自动切换工作和休息周期以保持专注",
            })}
            checked={config.pomodoroEnabled}
            onChange={(v) => setField("pomodoroEnabled", v)}
          />
        </div>

        {/* 작업 시간 */}
        <SliderRow
          label={L4(language, {
            ko: "작업 시간",
            en: "Work Duration",
            ja: "作業時間",
            zh: "工作时长",
          })}
          min={LIMITS.workMin.min}
          max={LIMITS.workMin.max}
          value={Math.round(config.pomodoroWorkMs / 60000)}
          onChange={(v) => setField("pomodoroWorkMs", v * 60000)}
          suffix={L4(language, { ko: "분", en: "min", ja: "分", zh: "分钟" })}
        />

        {/* 휴식 시간 */}
        <SliderRow
          label={L4(language, {
            ko: "휴식 시간",
            en: "Short Break",
            ja: "休憩時間",
            zh: "休息时长",
          })}
          min={LIMITS.breakMin.min}
          max={LIMITS.breakMin.max}
          value={Math.round(config.pomodoroBreakMs / 60000)}
          onChange={(v) => setField("pomodoroBreakMs", v * 60000)}
          suffix={L4(language, { ko: "분", en: "min", ja: "分", zh: "分钟" })}
        />

        {/* 긴 휴식 */}
        <SliderRow
          label={L4(language, {
            ko: "긴 휴식",
            en: "Long Break",
            ja: "長い休憩",
            zh: "长休息",
          })}
          min={LIMITS.longBreakMin.min}
          max={LIMITS.longBreakMin.max}
          value={Math.round(config.pomodoroLongBreakMs / 60000)}
          onChange={(v) => setField("pomodoroLongBreakMs", v * 60000)}
          suffix={L4(language, { ko: "분", en: "min", ja: "分", zh: "分钟" })}
        />

        {/* 휴식 알림 시간 */}
        <SliderRow
          label={L4(language, {
            ko: "휴식 알림 시간",
            en: "Rest Reminder After",
            ja: "休憩リマインダー",
            zh: "休息提醒时间",
          })}
          min={LIMITS.restAlertMin.min}
          max={LIMITS.restAlertMin.max}
          value={Math.round(config.restAlertMs / 60000)}
          onChange={(v) => setField("restAlertMs", v * 60000)}
          suffix={L4(language, { ko: "분", en: "min", ja: "分", zh: "分钟" })}
        />

        {/* 일일 목표 */}
        <div className="md:col-span-2 md:col-start-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-accent-purple" />
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {L4(language, {
                ko: "일일 목표",
                en: "Daily Goal",
                ja: "本日の目標",
                zh: "每日目标",
              })}
            </span>
          </div>
          <SliderRow
            label={L4(language, {
              ko: "일일 목표 글자수",
              en: "Daily Character Goal",
              ja: "本日の目標文字数",
              zh: "每日字数目标",
            })}
            min={LIMITS.dailyGoalChars.min}
            max={LIMITS.dailyGoalChars.max}
            step={LIMITS.dailyGoalChars.step}
            value={config.dailyGoalChars}
            onChange={(v) => setField("dailyGoalChars", v)}
            suffix={L4(language, { ko: "자", en: "chars", ja: "字", zh: "字" })}
          />
        </div>
      </div>
    </details>
  );
};

export default SessionSection;

// IDENTITY_SEAL: PART-3 | role=settings-section | inputs=language | outputs=accordion-form
