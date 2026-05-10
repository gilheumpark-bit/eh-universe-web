"use client";
// ============================================================
// NovelIDESettingsPanel — 마스터 토글 시각 노출.
//
// 사상: "우리는 선생이 아니다." — 끄기 스위치를 작가가 1클릭으로 찾을 수 있게.
// 위치: NovelIDELauncher Drawer footer 옆 또는 IDE 설정 별도 진입.
// ============================================================

import React from 'react';
import { Settings2, Eye, Activity, Wand2, MessageSquareWarning, BookmarkCheck, Bug, Brain, Layers, ShieldCheck, GitBranch } from 'lucide-react';
import { useNovelIDESettings } from '@/hooks/useNovelIDESettings';
import type { NovelIDESettings } from '@/lib/novel-ide-settings/store';

interface ToggleRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  enabled: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon: Icon, label, hint, enabled, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-bg-tertiary/40 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
    role="switch"
    aria-checked={enabled}
  >
    <Icon className={`w-4 h-4 flex-shrink-0 ${enabled ? 'text-accent-purple' : 'text-text-tertiary'}`} />
    <div className="flex-1 min-w-0">
      <div className={`text-xs font-medium ${enabled ? 'text-text-primary' : 'text-text-secondary'}`}>
        {label}
      </div>
      {hint && <div className="text-[10px] text-text-tertiary truncate">{hint}</div>}
    </div>
    {/* 스위치 — 시각적으로 명확하게 */}
    <div
      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${
        enabled ? 'bg-accent-purple' : 'bg-bg-tertiary'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-md ${
          enabled ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </div>
  </button>
);

export interface NovelIDESettingsPanelProps {
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const NovelIDESettingsPanel: React.FC<NovelIDESettingsPanelProps> = ({ language = 'KO' }) => {
  const { settings, toggle } = useNovelIDESettings();
  const isKO = language === 'KO';

  // [사상 정합] 4 그룹:
  //   1. 시각 — 본문에 표시되는 것 (decoration / hover / BP)
  //   2. 자동 — 백그라운드 자동 동작 (long-arc / reader-sim)
  //   3. 알림 — 정보 메시지 (anti-sycophancy)
  //   4. 작가 의도 영역 — 자동 변경 (format on save) — 기본 OFF
  const groups: Array<{
    title: { ko: string; en: string };
    items: Array<{
      key: keyof NovelIDESettings;
      icon: React.ComponentType<{ className?: string }>;
      label: { ko: string; en: string };
      hint: { ko: string; en: string };
    }>;
  }> = [
    {
      title: { ko: '시각 표시', en: 'Visual' },
      items: [
        {
          key: 'symbolDecorationVisible',
          icon: Eye,
          label: { ko: '본문 Symbol underline', en: 'Symbol underline in text' },
          hint: { ko: '캐릭터·지명·소품 점선 표시', en: 'Dotted underline for character/place/item' },
        },
        {
          key: 'symbolHoverEnabled',
          icon: Eye,
          label: { ko: 'Symbol hover 카드', en: 'Symbol hover card' },
          hint: { ko: 'mouseover → DNA + 등장 화수', en: 'mouseover → DNA + recent episodes' },
        },
        {
          key: 'bpGutterVisible',
          icon: Bug,
          label: { ko: 'Breakpoint 거터', en: 'Breakpoint gutter' },
          hint: { ko: 'BP 표시 + 클릭 토글', en: 'BP display + click toggle' },
        },
      ],
    },
    {
      title: { ko: '자동 검증', en: 'Automation' },
      items: [
        {
          key: 'longArcAutoTrigger',
          icon: Activity,
          label: { ko: 'Long-Arc 10화마다 자동', en: 'Long-Arc every 10 episodes' },
          hint: { ko: 'background, 알림 X', en: 'background, no popup' },
        },
      ],
    },
    {
      title: { ko: '알림', en: 'Notifications' },
      items: [
        {
          key: 'antiSycophancyAlerts',
          icon: MessageSquareWarning,
          label: { ko: '안티-시코판시 알림', en: 'Anti-sycophancy alerts' },
          hint: { ko: '정보 only, 차단 X', en: 'info only, no blocking' },
        },
      ],
    },
    {
      title: { ko: 'AI 맥락 이탈 방어', en: 'AI Context Drift Defense' },
      items: [
        {
          key: 'storyContextAware',
          icon: Brain,
          label: { ko: '작품 맥락 AI 주입 (L1)', en: 'Story Context to AI (L1)' },
          hint: { ko: '캐릭터·떡밥·룰·텐션 → 채팅 prompt', en: 'Characters/foreshadow → chat prompt' },
        },
        {
          key: 'intentMemoryAware',
          icon: Layers,
          label: { ko: '대화 의도 누적 (L2)', en: 'Intent Memory (L2)' },
          hint: { ko: '직전 N turn 작가 결정 요약', en: 'Last N turn intent digest' },
        },
        {
          key: 'completionGapDetect',
          icon: ShieldCheck,
          label: { ko: 'AI 완료 자동 검증 (L3)', en: 'AI Completion Gap (L3)' },
          hint: { ko: '"완료" ≠ "wired" 자동 grep', en: 'AI claims vs actual wiring' },
        },
        {
          key: 'metaContextTrack',
          icon: GitBranch,
          label: { ko: '위계·범위 누적 (L4)', en: 'Meta-Context (L4)' },
          hint: { ko: '내부/외부, 회사·제품·기술 정의 누적', en: 'Hierarchy/scope/category persist' },
        },
      ],
    },
    {
      title: { ko: '작가 의도 영역', en: 'Author intent zone' },
      items: [
        {
          key: 'formatOnSaveAutoApply',
          icon: Wand2,
          label: { ko: 'Format on Save 자동 적용', en: 'Auto Format on Save' },
          hint: { ko: '따옴표·줄바꿈 자동 변경 (기본 OFF)', en: 'Auto change quotes/spaces (default OFF)' },
        },
      ],
    },
  ];

  return (
    <section className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-tertiary/30">
        <Settings2 className="w-4 h-4 text-accent-purple" />
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
          {isKO ? 'IDE 설정' : 'IDE Settings'}
        </h3>
        <span className="ml-auto text-[10px] text-text-tertiary italic">
          {isKO ? '우리는 선생이 아닙니다' : 'We are not your teacher'}
        </span>
      </header>

      <div className="p-2 space-y-3">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 mb-1">
              {isKO ? group.title.ko : group.title.en}
            </div>
            {group.items.map((item) => (
              <ToggleRow
                key={item.key}
                icon={item.icon}
                label={isKO ? item.label.ko : item.label.en}
                hint={isKO ? item.hint.ko : item.hint.en}
                enabled={settings[item.key]}
                onToggle={() => toggle(item.key)}
              />
            ))}
          </div>
        ))}
      </div>

      <footer className="px-4 py-2 border-t border-border bg-bg-tertiary/30 text-[10px] text-text-tertiary font-mono flex items-center gap-2">
        <BookmarkCheck className="w-3 h-3" />
        <span>{isKO ? '설정 자동 저장' : 'Auto-saved'}</span>
      </footer>
    </section>
  );
};

export default NovelIDESettingsPanel;
