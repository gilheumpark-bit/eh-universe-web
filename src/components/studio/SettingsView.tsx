"use client";

// ============================================================
// PART 1 — Imports, Types, Shell Props
// ============================================================

import React, { useEffect, useState } from 'react';
import type { AppLanguage, ChatSession } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import {
  Shield, Zap, BookOpen, Eye, Sun, Languages, Code2, Bug,
} from 'lucide-react';
import { useUserRoleSafe } from '@/contexts/UserRoleContext';
import { TabHeader } from '@/components/studio/TabHeader';
import {
  DeveloperTab,
  DiagnosticsTab,
  NoaOperationsTab,
  RecordsRightsTab,
  ReleaseTranslationTab,
  StatusTab,
  StorageBackupTab,
  WorkspaceTab,
  type VersionedBackup,
} from './SettingsView.panels';

interface SettingsViewProps {
  language: AppLanguage;
  hostedProviders?: Partial<Record<string, boolean>>;
  onClearAll: () => void;
  onManageApiKey: () => void;
  versionedBackups?: VersionedBackup[];
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
  currentSession?: ChatSession | null;
}

type SettingsTab =
  | 'status'
  | 'noa'
  | 'storage'
  | 'workspace'
  | 'records'
  | 'release'
  | 'diagnostics'
  | 'developer';

const TAB_STORAGE_KEY = 'noa_settings_tab';
const DEFAULT_QUICK_TAB_IDS: SettingsTab[] = ['workspace', 'noa', 'storage', 'records'];

function normalizeSettingsTab(value: string | null, showDeveloperTab: boolean): SettingsTab | null {
  switch (value) {
    case 'status':
    case 'noa':
    case 'storage':
    case 'workspace':
    case 'records':
    case 'release':
    case 'diagnostics':
      return value;
    case 'developer':
      return showDeveloperTab ? 'developer' : null;
    case 'easy':
      return 'status';
    case 'writing':
      return 'workspace';
    case 'advanced':
      return 'noa';
    default:
      return null;
  }
}

// ============================================================
// PART 2 — Main Shell: Tab header + Tab panel router
// ============================================================

const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  hostedProviders = {},
  onClearAll,
  onManageApiKey,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
  currentSession = null,
}) => {
  const userRole = useUserRoleSafe();
  const showDeveloperTab = userRole?.developerMode === true;
  const [settingsQuery, setSettingsQuery] = useState('');

  // 마지막 활성 탭 복원 (UX 연속성)
  const [activeTab, setActiveTab] = useState<SettingsTab>('status');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = normalizeSettingsTab(window.localStorage.getItem(TAB_STORAGE_KEY), showDeveloperTab);
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab(saved);
      }
    } catch (err) {
      logger.warn('SettingsView', 'restore tab failed', err);
    }
  }, [showDeveloperTab]);

  const switchTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    try { window.localStorage.setItem(TAB_STORAGE_KEY, tab); } catch (err) {
      logger.warn('SettingsView', 'persist tab failed', err);
    }
  };

  const tabs: Array<{ id: SettingsTab; icon: React.ReactNode; label: string; desc: string; keywords: string[] }> = [
    {
      id: 'status',
      icon: <Sun className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '상태', en: 'Status', ja: '状態', zh: '状态' }),
      desc: L4(language, { ko: '현재 운영 방식과 계정', en: 'Operation mode and account', ja: '運用方式とアカウント', zh: '当前运行方式与账户' }),
      keywords: ['상태', '계정', '운영', 'hosted', 'byok', 'local', 'offline', 'account'],
    },
    {
      id: 'noa',
      icon: <Zap className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '노아 운영', en: 'Noah Ops', ja: 'ノア運用', zh: '诺亚运行' }),
      desc: L4(language, { ko: '모델·키·실행 모드', en: 'Model, key, and runtime mode', ja: 'モデル・キー・実行モード', zh: '模型、密钥与运行模式' }),
      keywords: ['노아', '엔진', '모델', 'api', 'key', 'byok', 'hosted', 'local'],
    },
    {
      id: 'storage',
      icon: <Shield className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '저장·백업', en: 'Save/Backup', ja: '保存・バックアップ', zh: '保存与备份' }),
      desc: L4(language, { ko: '로컬 저장, GitHub, 복원', en: 'Local storage, GitHub, restore', ja: 'ローカル保存、GitHub、復元', zh: '本地保存、GitHub、恢复' }),
      keywords: ['저장', '백업', '복원', 'github', 'drive', 'export', 'import'],
    },
    {
      id: 'workspace',
      icon: <BookOpen className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '창작 작업환경', en: 'Workspace', ja: '創作環境', zh: '创作环境' }),
      desc: L4(language, { ko: '테마·글자·집중·편집 편의', en: 'Theme, text, focus, editing comfort', ja: 'テーマ・文字・集中・編集', zh: '主题、文字、专注、编辑舒适度' }),
      keywords: ['창작', '작업환경', '테마', '언어', '글자', '집중', '편집'],
    },
    {
      id: 'records',
      icon: <Eye className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '과정기록·권리/IP', en: 'Records/IP', ja: '過程記録・権利/IP', zh: '过程记录·权利/IP' }),
      desc: L4(language, { ko: '확인 문서, 권리 점검, 개인정보', en: 'Process documents, rights checks, privacy', ja: '確認文書、権利点検、個人情報', zh: '确认文档、权利检查、隐私' }),
      keywords: ['과정기록', '권리', 'ip', '확인서', '개인정보', 'brand', 'privacy'],
    },
    {
      id: 'release',
      icon: <Languages className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '출고·번역', en: 'Release/Translate', ja: '出荷・翻訳', zh: '出库与翻译' }),
      desc: L4(language, { ko: '출고 고지, 형식 정리, 외부 연동', en: 'Release notice, formatting, external handoff', ja: '出荷告知、整形、外部連携', zh: '出库提示、格式整理、外部交接' }),
      keywords: ['출고', '번역', '현지화', 'format', 'lsp', 'export', 'signoff'],
    },
    {
      id: 'diagnostics',
      icon: <Bug className="w-3.5 h-3.5" />,
      label: L4(language, { ko: '진단', en: 'Diagnostics', ja: '診断', zh: '诊断' }),
      desc: L4(language, { ko: '알림, 초기화, 저장 관측', en: 'Alerts, reset, storage observatory', ja: '通知、初期化、保存観測', zh: '提醒、重置、存储观测' }),
      keywords: ['진단', '알림', '초기화', '리셋', '저장 관측', 'debug', 'storage'],
    },
    ...(showDeveloperTab
      ? [{
          id: 'developer' as const,
          icon: <Code2 className="w-3.5 h-3.5" />,
          label: L4(language, { ko: '고급 진단', en: 'Advanced diagnostics', ja: '高度診断', zh: '高级诊断' }),
          desc: L4(language, { ko: '운영 진단과 실험 플래그', en: 'Operational diagnostics and flags', ja: '運用診断と実験フラグ', zh: '运行诊断与实验标志' }),
          keywords: ['developer', 'flag', 'debug'],
        }]
      : []),
  ];
  const normalizedQuery = settingsQuery.trim().toLowerCase();
  const visibleTabs = normalizedQuery
    ? tabs.filter((tab) =>
        [tab.label, tab.desc, ...tab.keywords].some((value) => value.toLowerCase().includes(normalizedQuery)),
      )
    : tabs;
  const quickTabs = (
    normalizedQuery
      ? visibleTabs
      : DEFAULT_QUICK_TAB_IDS
          .map((id) => tabs.find((tab) => tab.id === id))
          .filter((tab): tab is (typeof tabs)[number] => Boolean(tab))
  ).slice(0, 4);
  const updateSettingsQuery = (value: string) => {
    setSettingsQuery(value);
    const nextQuery = value.trim().toLowerCase();
    if (!nextQuery) return;
    const nextTab = tabs.find((tab) =>
      [tab.label, tab.desc, ...tab.keywords].some((item) => item.toLowerCase().includes(nextQuery)),
    );
    if (nextTab && nextTab.id !== activeTab) switchTab(nextTab.id);
  };
  const focusSettingsTab = (tab: SettingsTab) => {
    if (typeof window === 'undefined') return;
    const schedule = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(callback, 0));
    schedule(() => {
      document.getElementById(`settings-tab-${tab}`)?.focus();
    });
  };
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: SettingsTab) => {
    const currentIndex = visibleTabs.findIndex((item) => item.id === tab);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % visibleTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visibleTabs.length - 1;
    }

    if (nextIndex == null) return;
    event.preventDefault();
    const nextTab = visibleTabs[nextIndex]?.id;
    if (!nextTab) return;
    switchTab(nextTab);
    focusSettingsTab(nextTab);
  };

  return (
    <>
    <TabHeader
      icon="⚙️"
      title={L4(language, { ko: '환경 설정', en: 'Environment Settings', ja: '環境設定', zh: '环境设置' })}
      description={L4(language, {
        ko: '노아·저장·과정기록·출고 설정',
        en: 'Noah, storage, process records, and release settings',
        ja: 'ノア・保存・過程記録・出荷設定',
        zh: '诺亚、保存、过程记录与出库设置',
      })}
    />
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="rounded-2xl border border-border bg-bg-secondary/20 p-3 md:p-4">
        <label htmlFor="settings-search" className="sr-only">
          {L4(language, { ko: '설정명·상태·키워드 검색', en: 'Search settings, status, or keywords', ja: '設定名・状態・キーワード検索', zh: '搜索设置、状态或关键词' })}
        </label>
        <input
          id="settings-search"
          type="search"
          value={settingsQuery}
          onChange={(event) => updateSettingsQuery(event.target.value)}
          placeholder={L4(language, {
            ko: '설정명·상태·키워드 검색',
            en: 'Search settings, status, or keywords',
            ja: '設定名・状態・キーワード検索',
            zh: '搜索设置、状态或关键词',
          })}
          className="w-full rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label={L4(language, { ko: '설정 빠른 길', en: 'Settings shortcuts', ja: '設定ショートカット', zh: '设置快捷入口' })}>
          <span className="px-1 text-[11px] font-semibold text-text-tertiary">
            {normalizedQuery
              ? L4(language, { ko: '검색 결과', en: 'Matches', ja: '検索結果', zh: '搜索结果' })
              : L4(language, { ko: '빠른 길', en: 'Quick path', ja: '近道', zh: '快捷入口' })}
          </span>
          {quickTabs.length > 0 ? quickTabs.map((tab) => (
            <button
              key={`quick-${tab.id}`}
              type="button"
              onClick={() => switchTab(tab.id)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-bg-primary px-3 text-[12px] font-semibold text-text-secondary transition-colors hover:border-accent-blue/35 hover:bg-accent-blue/10 hover:text-accent-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          )) : (
            <span className="text-[12px] text-text-tertiary">
              {L4(language, { ko: '맞는 항목이 없습니다.', en: 'No matching shortcut.', ja: '一致する項目がありません。', zh: '没有匹配的快捷入口。' })}
            </span>
          )}
        </div>
      </div>

      {/* Tab header */}
      <nav role="tablist" aria-label="Environment settings categories" className="flex items-stretch gap-2 border-b border-border overflow-x-auto pb-1">
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`settings-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => switchTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, tab.id)}
              className={`flex min-w-[128px] flex-col items-start gap-1 px-4 py-2.5 text-left text-xs font-black border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded-t-lg shrink-0 ${
                active
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
              <span className="text-[10px] font-medium leading-tight text-text-tertiary normal-case tracking-normal">
                {tab.desc}
              </span>
            </button>
          );
        })}
        {visibleTabs.length === 0 && (
          <div className="px-4 py-3 text-xs text-text-tertiary">
            {L4(language, { ko: '검색 결과가 없습니다.', en: 'No settings match your search.', ja: '一致する設定がありません。', zh: '没有匹配的设置。' })}
          </div>
        )}
      </nav>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`settings-panel-${activeTab}`}
        aria-labelledby={`settings-tab-${activeTab}`}
        className="space-y-4"
      >
        {activeTab === 'status' && (
          <StatusTab
            language={language}
            hostedProviders={hostedProviders}
            onManageApiKey={onManageApiKey}
          />
        )}
        {activeTab === 'noa' && (
          <NoaOperationsTab
            language={language}
            hostedProviders={hostedProviders}
            onManageApiKey={onManageApiKey}
          />
        )}
        {activeTab === 'storage' && (
          <StorageBackupTab
            language={language}
            versionedBackups={versionedBackups}
            onRestoreBackup={onRestoreBackup}
            onRefreshBackups={onRefreshBackups}
          />
        )}
        {activeTab === 'workspace' && (
          <WorkspaceTab language={language} currentSession={currentSession} />
        )}
        {activeTab === 'records' && (
          <RecordsRightsTab language={language} />
        )}
        {activeTab === 'release' && (
          <ReleaseTranslationTab language={language} />
        )}
        {activeTab === 'diagnostics' && (
          <DiagnosticsTab
            language={language}
            onClearAll={onClearAll}
          />
        )}
        {activeTab === 'developer' && showDeveloperTab && (
          <DeveloperTab language={language} />
        )}
      </div>

      {/* Footer */}
      <div className="md:col-span-2 flex flex-col gap-4 md:flex-row justify-between items-center px-2 md:px-10 pt-6 border-t border-border">
        <div className="flex items-center gap-4">
          <Zap className="w-4 h-4 text-text-tertiary" />
          <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Version {ENGINE_VERSION}-NEXUS</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[9px] font-black text-text-tertiary uppercase tracking-widest">
          <a href="/about#privacy" target="_blank" rel="noopener" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 transition-colors hover:bg-bg-tertiary hover:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent-blue">Privacy</a>
          <a href="/about#license" target="_blank" rel="noopener" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 transition-colors hover:bg-bg-tertiary hover:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent-blue">Terms</a>
          <a href="https://github.com/gilheumpark-bit/eh-universe-web/issues/new" target="_blank" rel="noopener" className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded px-2 transition-colors hover:bg-bg-tertiary hover:text-accent-red focus-visible:ring-2 focus-visible:ring-accent-blue">Bug Report</a>
        </div>
      </div>
    </div>
    </>
  );
};

export default SettingsView;
