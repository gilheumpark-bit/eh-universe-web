"use client";

// ============================================================
// PART 1 — Imports, Types, Constants
// ============================================================

import React, { useEffect, useState } from "react";
import { ChevronDown, Timer, Target, Coffee, Type, Eye, Activity, Hand, RefreshCw } from "lucide-react";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { useSessionTimer, type SessionConfig } from "@/hooks/useSessionTimer";
import {
  DEFAULT_ERGONOMICS_SETTINGS,
  loadErgonomicsSettings,
  updateErgonomicsSettings,
  type ErgonomicsSettings,
} from "@/lib/ergonomics/ergonomics-settings";
import { applyTypography, type TypographyPreset } from "@/lib/ergonomics/typography";

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
          checked ? "bg-accent-blue justify-end" : "bg-bg-tertiary justify-start"
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

  // M6 — 인체공학 토글 그룹
  const [ergo, setErgo] = useState<ErgonomicsSettings>(DEFAULT_ERGONOMICS_SETTINGS);
  useEffect(() => {
    setErgo(loadErgonomicsSettings());
  }, []);

  const setErgoField = <K extends keyof ErgonomicsSettings>(
    key: K,
    value: ErgonomicsSettings[K],
  ) => {
    const next = updateErgonomicsSettings({ [key]: value } as Partial<ErgonomicsSettings>);
    setErgo(next);
    if (key === "typographyPreset") {
      applyTypography(value as TypographyPreset);
    }
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

        {/* ============================================================
            M6 — 장기 사용 편의 (Ergonomics)
            작가가 2-10시간 집필 시 체력 부담 감쇄용 옵션군
            ============================================================ */}
        <div className="md:col-span-2 md:col-start-1 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent-amber" />
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {L4(language, {
                ko: "장기 사용 편의 (Ergonomics)",
                en: "Ergonomics (Long-Session Comfort)",
                ja: "長時間使用の快適性 (エルゴノミクス)",
                zh: "长时间使用舒适性 (人体工学)",
              })}
            </span>
          </div>

          {/* 타이포그래피 프리셋 */}
          <div className="p-4 md:p-5 bg-bg-secondary/30 rounded-2xl border border-border mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-accent-blue" />
              <span className="text-xs font-bold text-text-primary">
                {L4(language, {
                  ko: "타이포그래피 프리셋",
                  en: "Typography preset",
                  ja: "タイポグラフィプリセット",
                  zh: "排版预设",
                })}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["comfort", "compact", "large"] as TypographyPreset[]).map((p) => {
                const active = ergo.typographyPreset === p;
                const labelMap: Record<TypographyPreset, {
                  ko: string; en: string; ja: string; zh: string;
                }> = {
                  comfort: {
                    ko: "컴포트 (17px)",
                    en: "Comfort (17px)",
                    ja: "コンフォート (17px)",
                    zh: "舒适 (17px)",
                  },
                  compact: {
                    ko: "컴팩트 (14px)",
                    en: "Compact (14px)",
                    ja: "コンパクト (14px)",
                    zh: "紧凑 (14px)",
                  },
                  large: {
                    ko: "라지 (20px)",
                    en: "Large (20px)",
                    ja: "ラージ (20px)",
                    zh: "大号 (20px)",
                  },
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setErgoField("typographyPreset", p)}
                    aria-pressed={active}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue ${
                      active
                        ? "bg-accent-blue/20 border border-accent-blue/40 text-accent-blue"
                        : "bg-bg-tertiary border border-border text-text-secondary hover:border-accent-blue/30"
                    }`}
                  >
                    {L4(language, labelMap[p])}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-text-tertiary leading-relaxed">
              {L4(language, {
                ko: "장시간 집필엔 컴포트, 통독엔 컴팩트, 접근성엔 라지를 추천합니다.",
                en: "Comfort for long sessions, Compact for overview, Large for accessibility.",
                ja: "長時間はコンフォート、通読はコンパクト、アクセシビリティにはラージ推奨。",
                zh: "长时间创作推荐舒适，通读推荐紧凑,无障碍使用推荐大号。",
              })}
            </p>
          </div>

          {/* 자세 nudge */}
          <ToggleRow
            icon={<RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-accent-green" />}
            label={L4(language, {
              ko: "자세 점검 알림 (30분마다)",
              en: "Posture nudge (every 30 min)",
              ja: "姿勢チェック通知 (30分ごと)",
              zh: "姿势提醒 (每 30 分钟)",
            })}
            description={L4(language, {
              ko: "연속 타이핑 30분 후 허리·어깨 스트레칭을 권장합니다",
              en: "Suggests back and shoulder stretches after 30 min of typing",
              ja: "連続入力30分後に背中と肩のストレッチを提案",
              zh: "连续打字 30 分钟后建议伸展腰背和肩膀",
            })}
            checked={ergo.postureNudgeEnabled}
            onChange={(v) => setErgoField("postureNudgeEnabled", v)}
          />

          {/* 눈 피로 자동 다이머 */}
          <ToggleRow
            icon={<Eye className="w-4 h-4 md:w-5 md:h-5 text-accent-amber" />}
            label={L4(language, {
              ko: "눈 피로 자동 완화 (90분 후)",
              en: "Eye-strain auto-dimmer (after 90 min)",
              ja: "目の疲労自動軽減 (90分後)",
              zh: "眼部疲劳自动缓解 (90 分钟后)",
            })}
            description={L4(language, {
              ko: "90분 후 따뜻한 톤, 180분 후 추가 밝기 감쇄를 적용합니다",
              en: "Warm tone after 90 min; extra dim after 180 min",
              ja: "90分後に暖色、180分後に追加の減光を適用",
              zh: "90 分钟后暖色调,180 分钟后进一步减光",
            })}
            checked={ergo.eyeStrainDimmerEnabled}
            onChange={(v) => setErgoField("eyeStrainDimmerEnabled", v)}
          />

          {/* 키스트로크 히트맵 표시 */}
          <ToggleRow
            icon={<Activity className="w-4 h-4 md:w-5 md:h-5 text-accent-purple" />}
            label={L4(language, {
              ko: "인체공학 통계 표시 (KPM)",
              en: "Show ergonomics stats (KPM)",
              ja: "人間工学統計表示 (KPM)",
              zh: "显示人体工学统计 (KPM)",
            })}
            description={L4(language, {
              ko: "상태바에 분당 키스트로크를 표시합니다 (기기에만 저장·비영속)",
              en: "Shows keystrokes-per-minute in status bar (local only, not persisted)",
              ja: "ステータスバーにKPMを表示 (ローカルのみ、非永続)",
              zh: "在状态栏显示每分钟键击次数 (仅本机,不持久化)",
            })}
            checked={ergo.keystrokeHeatmapVisible}
            onChange={(v) => setErgoField("keystrokeHeatmapVisible", v)}
          />

          {/* 손목 힌트 */}
          <ToggleRow
            icon={<Hand className="w-4 h-4 md:w-5 md:h-5 text-accent-amber" />}
            label={L4(language, {
              ko: "AI 대기 중 손목 풀기 힌트",
              en: "Wrist-rest hint during AI wait",
              ja: "AI待機中の手首ストレッチヒント",
              zh: "AI 生成等待时的手腕放松提示",
            })}
            description={L4(language, {
              ko: "AI 생성이 10초 이상 걸릴 때 손목 회전 애니메이션을 보여줍니다",
              en: "Shows wrist-circle animation when AI takes 10s or more",
              ja: "AI生成が10秒以上かかる時に手首回転アニメーションを表示",
              zh: "AI 生成超过 10 秒时显示手腕画圆动画",
            })}
            checked={ergo.wristRestHintEnabled}
            onChange={(v) => setErgoField("wristRestHintEnabled", v)}
          />

          {/* Focus drift nudge */}
          <ToggleRow
            icon={<Timer className="w-4 h-4 md:w-5 md:h-5 text-accent-blue" />}
            label={L4(language, {
              ko: "탭 복귀 안내 (15분 이탈 후)",
              en: "Return nudge (after 15 min away)",
              ja: "復帰ナッジ (15分以上離席後)",
              zh: "返回提示 (离开 15 分钟后)",
            })}
            description={L4(language, {
              ko: "다른 탭에서 15분+ 후 복귀 시 마지막 커서 위치로 이동 안내를 보여줍니다",
              en: "When returning after 15 min+, shows a button to jump to last cursor",
              ja: "他タブから15分+経過後の復帰時、最終カーソル位置への復帰を案内",
              zh: "从其他标签页 15 分钟+ 后返回时,提示跳至上次光标位置",
            })}
            checked={ergo.focusDriftEnabled}
            onChange={(v) => setErgoField("focusDriftEnabled", v)}
          />
        </div>
      </div>
    </details>
  );
};

export default SessionSection;

// IDENTITY_SEAL: PART-3 | role=settings-section | inputs=language | outputs=accordion-form
