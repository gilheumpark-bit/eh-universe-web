"use client";

// ============================================================
// PART 1 — Imports, Types, Shell Props
// ============================================================

import { showAlert } from '@/lib/show-alert';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AppLanguage } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT, L4 } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { logger } from '@/lib/logger';
import {
  User, Shield, Trash2, Settings,
  ChevronRight, ChevronDown, Zap, Bell, BookOpen, Sparkles, Eye,
  Sun, Moon, Languages, Type, Code2, FlaskConical, Bug,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useUnifiedSettings } from '@/lib/UnifiedSettingsContext';
import { useUserRoleSafe } from '@/contexts/UserRoleContext';
import { TabHeader } from '@/components/studio/TabHeader';

const WriterProfileCard = dynamic(() => import('@/components/studio/WriterProfileCard'), { ssr: false });
const ProvidersSection = dynamic(() => import('@/components/studio/settings/ProvidersSection'), { ssr: false });
const BackupsSection = dynamic(() => import('@/components/studio/settings/BackupsSection'), { ssr: false });
const AdvancedSection = dynamic(() => import('@/components/studio/settings/AdvancedSection'), { ssr: false });
const PluginsSection = dynamic(() => import('@/components/studio/settings/PluginsSection'), { ssr: false });
const SessionSection = dynamic(() => import('@/components/studio/settings/SessionSection'), { ssr: false });
const ComplianceSection = dynamic(() => import('@/components/studio/settings/ComplianceSection'), { ssr: false });
// [M1.7] ShadowDiffDashboard 는 이제 StorageObservatoryDashboard 내부에서 재사용됨.
const StorageObservatoryDashboard = dynamic(() => import('@/components/studio/settings/StorageObservatoryDashboard'), { ssr: false });

interface VersionedBackup {
  timestamp: number;
  label: string;
}

interface SettingsViewProps {
  language: AppLanguage;
  hostedProviders?: Partial<Record<string, boolean>>;
  onClearAll: () => void;
  onManageApiKey: () => void;
  versionedBackups?: VersionedBackup[];
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}

type SettingsTab = 'easy' | 'writing' | 'advanced' | 'developer';

const TAB_STORAGE_KEY = 'noa_settings_tab';

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
}) => {
  const t = createT(language);
  const userRole = useUserRoleSafe();
  const showDeveloperTab = userRole?.developerMode === true;

  // 마지막 활성 탭 복원 (UX 연속성)
  const [activeTab, setActiveTab] = useState<SettingsTab>('easy');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY) as SettingsTab | null;
      if (saved === 'easy' || saved === 'writing' || saved === 'advanced' || saved === 'developer') {
        // developer 탭 저장됐는데 권한 없으면 easy로 폴백
        if (saved === 'developer' && !showDeveloperTab) {
          setActiveTab('easy');
        } else {
          setActiveTab(saved);
        }
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

  const tabs: Array<{ id: SettingsTab; icon: React.ReactNode; label: string }> = [
    { id: 'easy',     icon: <Sun className="w-3.5 h-3.5" />,        label: L4(language, { ko: '기본',     en: 'Easy',      ja: '基本',      zh: '基础' }) },
    { id: 'writing',  icon: <BookOpen className="w-3.5 h-3.5" />,    label: L4(language, { ko: '집필',     en: 'Writing',   ja: '執筆',      zh: '写作' }) },
    { id: 'advanced', icon: <Settings className="w-3.5 h-3.5" />,    label: L4(language, { ko: '고급',     en: 'Advanced',  ja: '詳細',      zh: '高级' }) },
    ...(showDeveloperTab
      ? [{ id: 'developer' as const, icon: <Code2 className="w-3.5 h-3.5" />, label: L4(language, { ko: '개발자', en: 'Developer', ja: '開発者', zh: '开发者' }) }]
      : []),
  ];

  return (
    <>
    <TabHeader
      icon="⚙️"
      title={L4(language, { ko: '설정', en: 'Settings', ja: '設定', zh: '设置' })}
      description={L4(language, {
        ko: '탭을 선택해 세부 설정 — 기본/집필/고급/개발자',
        en: 'Pick a tab for detailed settings — Easy/Writing/Advanced/Developer',
        ja: 'タブで詳細設定 — 基本/執筆/高度/開発者',
        zh: '选择标签查看详细设置 — 基本/写作/高级/开发者',
      })}
    />
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6 animate-in fade-in duration-500 pb-32">
      {/* Tab header */}
      <nav role="tablist" aria-label="Settings tier" className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
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
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded-t-lg shrink-0 ${
                active
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-tertiary hover:text-text-primary hover:bg-bg-secondary/40'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}

        {/* 개발자 탭 활성화 단축 — userRole context 있을 때만 노출 */}
        {!showDeveloperTab && userRole && (
          <button
            type="button"
            onClick={() => userRole.setDeveloperMode(true)}
            className="ml-auto px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-text-tertiary hover:text-accent-blue transition-colors shrink-0"
            title={L4(language, {
              ko: '개발자 탭 활성화',
              en: 'Enable developer tab',
              ja: '開発者タブを有効化',
              zh: '启用开发者标签',
            })}
          >
            + {L4(language, { ko: '개발자 모드', en: 'Developer Mode', ja: '開発者モード', zh: '开发者模式' })}
          </button>
        )}
      </nav>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`settings-panel-${activeTab}`}
        aria-labelledby={`settings-tab-${activeTab}`}
        className="space-y-4"
      >
        {activeTab === 'easy' && (
          <EasyTab language={language} />
        )}
        {activeTab === 'writing' && (
          <WritingTab language={language} />
        )}
        {activeTab === 'advanced' && (
          <AdvancedTab
            language={language}
            hostedProviders={hostedProviders}
            onManageApiKey={onManageApiKey}
            onClearAll={onClearAll}
            versionedBackups={versionedBackups}
            onRestoreBackup={onRestoreBackup}
            onRefreshBackups={onRefreshBackups}
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
        <div className="flex gap-6 text-[9px] font-black text-text-tertiary uppercase tracking-widest">
          <a href="/about#privacy" target="_blank" rel="noopener" className="hover:text-text-tertiary transition-colors">Privacy</a>
          <a href="/about#license" target="_blank" rel="noopener" className="hover:text-text-tertiary transition-colors">Terms</a>
          <a href="https://github.com/gilheumpark-bit/eh-universe-web/issues/new" target="_blank" rel="noopener" className="hover:text-accent-red transition-colors">Bug Report</a>
        </div>
      </div>
    </div>
    </>
  );
};

// ============================================================
// PART 3 — Easy Tab (테마 / 블루라이트 / 언어 / 폰트 / 세션)
// ============================================================

function EasyTab({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-4">
      {/* 계정 — 가장 먼저 노출 */}
      <AccordionGroup
        icon={<User className="w-4 h-4 text-accent-purple shrink-0" />}
        title={L4(language, { ko: '계정', en: 'Account', ja: 'アカウント', zh: '账户' })}
        defaultOpen
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProfileCard language={language} />
          <div className="md:col-span-2 ds-card-lg">
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
              <User className="w-4 h-4 text-accent-purple" />
              {L4(language, { ko: '작가 프로파일', en: 'Writer Profile', ja: 'ライタープロフィール', zh: '作者档案' })}
            </h3>
            <WriterProfileCard language={language} />
          </div>
        </div>
      </AccordionGroup>

      {/* 외관 — 테마 + 블루라이트 */}
      <AccordionGroup
        icon={<Sun className="w-4 h-4 text-accent-amber shrink-0" />}
        title={L4(language, { ko: '외관', en: 'Appearance', ja: '外観', zh: '外观' })}
        defaultOpen
      >
        <ThemeSection language={language} />
      </AccordionGroup>

      {/* 언어 + 폰트 크기 */}
      <AccordionGroup
        icon={<Languages className="w-4 h-4 text-accent-blue shrink-0" />}
        title={L4(language, { ko: '언어 · 글자', en: 'Language & Text', ja: '言語・文字', zh: '语言与文字' })}
      >
        <LanguageSection language={language} />
        <FontSizeSection language={language} />
      </AccordionGroup>

      {/* 세션 타이머 (F1) */}
      <SessionSection language={language} />
    </div>
  );
}

// ============================================================
// PART 4 — Writing Tab (집필 모드 / 컴플라이언스)
// ============================================================

function WritingTab({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-4">
      <AccordionGroup
        icon={<Sparkles className="w-4 h-4 text-accent-purple shrink-0" />}
        title={L4(language, { ko: '집필 모드', en: 'Writing Mode', ja: '執筆モード', zh: '写作模式' })}
        defaultOpen
      >
        <AdvancedWritingModeToggle language={language} />
      </AccordionGroup>

      {/* 컴플라이언스 — AI 사용 고지 + 19+ 분기 */}
      <ComplianceSection language={language} />
    </div>
  );
}

// ============================================================
// PART 5 — Advanced Tab (Provider / Backup / API / 플러그인)
// ============================================================

interface AdvancedTabProps {
  language: AppLanguage;
  hostedProviders: Partial<Record<string, boolean>>;
  onManageApiKey: () => void;
  onClearAll: () => void;
  versionedBackups?: VersionedBackup[];
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}

function AdvancedTab({
  language,
  hostedProviders,
  onManageApiKey,
  onClearAll,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
}: AdvancedTabProps) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);

  useEffect(() => {
    if (!confirmReset) return;
    const interval = setInterval(() => {
      setResetCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setConfirmReset(false); return 3; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmReset]);

  return (
    <div className="space-y-4">
      {/* AI 엔진 (Provider) */}
      <ProvidersSection language={language} />

      {/* 백업: GitHub + Firebase + 전체번들 */}
      <BackupsSection
        language={language}
        versionedBackups={versionedBackups}
        onRestoreBackup={onRestoreBackup}
        onRefreshBackups={onRefreshBackups}
      />

      {/* 고급 — DGX Fallback + ApiKeysSection 내장 */}
      <AdvancedSection
        language={language}
        hostedProviders={hostedProviders}
        onManageApiKey={onManageApiKey}
      />

      {/* 플러그인 마켓 */}
      <PluginsSection language={language} />

      {/* 알림 + 데이터 리셋 */}
      <WriterSettingsGroup
        language={language}
        notificationsOn={notificationsOn}
        setNotificationsOn={setNotificationsOn}
        confirmReset={confirmReset}
        setConfirmReset={setConfirmReset}
        resetCountdown={resetCountdown}
        setResetCountdown={setResetCountdown}
        onClearAll={onClearAll}
      />
    </div>
  );
}

// ============================================================
// PART 6 — Developer Tab (Code Studio / Debug / Feature Flags)
// ============================================================

function DeveloperTab({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-4">
      <AccordionGroup
        icon={<Code2 className="w-4 h-4 text-accent-blue shrink-0" />}
        title={L4(language, { ko: '개발자 도구', en: 'Developer Tools', ja: '開発者ツール', zh: '开发者工具' })}
        defaultOpen
      >
        <CodeStudioToggleSection language={language} />
        <DeveloperModeToggle language={language} />
      </AccordionGroup>

      <AccordionGroup
        icon={<Bug className="w-4 h-4 text-accent-amber shrink-0" />}
        title={L4(language, { ko: '디버그', en: 'Debug', ja: 'デバッグ', zh: '调试' })}
      >
        <DebugMenuSection language={language} />
      </AccordionGroup>

      <AccordionGroup
        icon={<FlaskConical className="w-4 h-4 text-accent-purple shrink-0" />}
        title={L4(language, { ko: '실험 기능 플래그', en: 'Feature Flags', ja: '実験機能フラグ', zh: '实验功能标志' })}
      >
        <FeatureFlagsSection language={language} />
      </AccordionGroup>

      {/* M1.7 Storage Observatory — 7섹션 통합 대시보드 (저널 엔진 검증 + 경로 분포 + 감사 Export) */}
      <StorageObservatoryDashboard language={language} />
    </div>
  );
}

// ============================================================
// PART 7 — Reusable Building Blocks (Accordion / SettingCard / Toggle)
// ============================================================

interface AccordionGroupProps {
  icon: React.ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function AccordionGroup({ icon, title, defaultOpen, children }: AccordionGroupProps) {
  return (
    <details
      open={defaultOpen}
      className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group"
    >
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        {icon}
        <span className="text-sm font-black text-text-primary flex-1">{title}</span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 space-y-3">{children}</div>
    </details>
  );
}

interface SettingCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function SettingCard({ icon, title, description, children, onClick, danger }: SettingCardProps) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between gap-3 p-4 md:p-5 rounded-3xl border border-transparent transition-[transform,background-color,border-color,color] ${
        interactive ? 'cursor-pointer hover:bg-bg-secondary/40 hover:border-border active:scale-[0.98]' : ''
      } ${danger ? 'hover:bg-accent-red/10 hover:border-accent-red/30' : ''}`}
    >
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {icon && <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">{icon}</div>}
        <div className="min-w-0">
          <div className={`text-xs md:text-sm font-bold truncate ${danger ? 'text-accent-red' : ''}`}>{title}</div>
          {description && <div className="text-[12px] text-text-tertiary hidden sm:block">{description}</div>}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
        checked ? 'bg-accent-blue justify-end' : 'bg-bg-tertiary justify-start'
      }`}
    >
      <span className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1" />
    </button>
  );
}

// ============================================================
// PART 8 — Easy: ThemeSection / LanguageSection / FontSizeSection
// ============================================================

function ThemeSection({ language }: { language: AppLanguage }) {
  const { theme, setTheme, blueLightFilter, toggleBlueLightFilter } = useUnifiedSettings();

  return (
    <div className="space-y-2">
      <SettingCard
        icon={theme === 'dark' ? <Moon className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /> : <Sun className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
        title={L4(language, { ko: '테마', en: 'Theme', ja: 'テーマ', zh: '主题' })}
        description={
          theme === 'dark'
            ? L4(language, { ko: '다크 모드', en: 'Dark mode', ja: 'ダークモード', zh: '深色模式' })
            : L4(language, { ko: '라이트 모드', en: 'Light mode', ja: 'ライトモード', zh: '浅色模式' })
        }
      >
        <div role="radiogroup" className="flex gap-1 bg-bg-tertiary rounded-xl p-1">
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'light'}
            onClick={() => setTheme('light')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
              theme === 'light' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <Sun className="w-3.5 h-3.5 inline mr-1" />
            {L4(language, { ko: '라이트', en: 'Light', ja: 'ライト', zh: '浅色' })}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'dark'}
            onClick={() => setTheme('dark')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
              theme === 'dark' ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <Moon className="w-3.5 h-3.5 inline mr-1" />
            {L4(language, { ko: '다크', en: 'Dark', ja: 'ダーク', zh: '深色' })}
          </button>
        </div>
      </SettingCard>

      <SettingCard
        icon={<Eye className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
        title={L4(language, { ko: '블루라이트 필터', en: 'Blue Light Filter', ja: 'ブルーライトフィルター', zh: '蓝光过滤' })}
        description={L4(language, {
          ko: '세피아 12% + 밝기 저감으로 야간 눈 피로 감소',
          en: 'Sepia 12% + brightness cut to reduce eye fatigue at night',
          ja: 'セピア12% + 明度低減で夜間の目の疲れを軽減',
          zh: '应用 12% 棕褐色与亮度削减以减少夜间眼疲劳',
        })}
        onClick={toggleBlueLightFilter}
      >
        <Toggle checked={blueLightFilter} onChange={toggleBlueLightFilter} label="Blue light filter" />
      </SettingCard>
    </div>
  );
}

function LanguageSection({ language }: { language: AppLanguage }) {
  // 실제 언어 변경은 상위 레이아웃(StudioShell)에서 처리.
  // 여기서는 현재 언어 표기만 + 변경 안내. (다른 에이전트 영역 침범 금지)
  const labelMap: Record<AppLanguage, string> = {
    KO: '한국어',
    EN: 'English',
    JP: '日本語',
    CN: '中文',
  };
  return (
    <SettingCard
      icon={<Languages className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '언어', en: 'Language', ja: '言語', zh: '语言' })}
      description={L4(language, {
        ko: '상단 메뉴에서 변경할 수 있습니다',
        en: 'Switch from the top menu',
        ja: '上部メニューから変更できます',
        zh: '可在顶部菜单切换',
      })}
    >
      <span className="text-[11px] font-bold text-text-tertiary px-3 py-1.5 bg-bg-tertiary rounded-lg">
        {labelMap[language] ?? 'KO'}
      </span>
    </SettingCard>
  );
}

const FONT_SIZE_KEY = 'noa_chat_font_size';
const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 20;
const FONT_SIZE_DEFAULT = 14;

function FontSizeSection({ language }: { language: AppLanguage }) {
  const [size, setSize] = useState<number>(FONT_SIZE_DEFAULT);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(FONT_SIZE_KEY);
      const parsed = raw ? Number.parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX) {
        setSize(parsed);
      }
    } catch (err) {
      logger.warn('SettingsView', 'load font size failed', err);
    }
  }, []);

  const update = (next: number) => {
    const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(next)));
    setSize(clamped);
    try {
      window.localStorage.setItem(FONT_SIZE_KEY, String(clamped));
      window.dispatchEvent(new CustomEvent('noa:font-size-changed', { detail: clamped }));
    } catch (err) {
      logger.warn('SettingsView', 'persist font size failed', err);
    }
  };

  return (
    <SettingCard
      icon={<Type className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '폰트 크기', en: 'Font Size', ja: 'フォントサイズ', zh: '字体大小' })}
      description={L4(language, {
        ko: '우측 채팅·정보 패널 텍스트 크기',
        en: 'Right-side chat & info panel text size',
        ja: '右側チャット・情報パネルの文字サイズ',
        zh: '右侧聊天与信息面板文字大小',
      })}
    >
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          value={size}
          onChange={(e) => update(Number.parseInt(e.target.value, 10))}
          className="w-32 accent-accent-blue"
          aria-label={L4(language, { ko: '폰트 크기 슬라이더', en: 'Font size slider', ja: 'フォントサイズスライダー', zh: '字体大小滑块' })}
        />
        <span className="text-[11px] font-bold text-text-tertiary tabular-nums w-8 text-right">{size}px</span>
      </div>
    </SettingCard>
  );
}

// ============================================================
// PART 9 — Writing: AdvancedWritingModeToggle
// ============================================================

function AdvancedWritingModeToggle({ language }: { language: AppLanguage }) {
  const ctx = useUserRoleSafe();
  const checked = ctx?.advancedWritingMode ?? false;

  return (
    <SettingCard
      icon={<Sparkles className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '고급 집필 모드', en: 'Advanced Writing Mode', ja: '高度執筆モード', zh: '高级写作模式' })}
      description={L4(language, {
        ko: 'NOA 생성 / 수동 편집 / 3단계 캔버스 / 자동 30% 리파인 / 고급 — 5모드 활성화',
        en: 'NOA / Manual / 3-step Canvas / 30% Auto-refine / Advanced — enable 5 modes',
        ja: 'NOA生成・手動編集・3段階キャンバス・自動30%リファイン・高度 — 5モード有効化',
        zh: 'NOA生成 / 手动编辑 / 3阶段画布 / 自动30%精修 / 高级 — 启用5种模式',
      })}
      onClick={ctx ? () => ctx.setAdvancedWritingMode(!checked) : undefined}
    >
      {ctx ? (
        <Toggle checked={checked} onChange={ctx.setAdvancedWritingMode} label="Advanced writing mode" />
      ) : (
        <span className="text-[10px] text-text-tertiary">N/A</span>
      )}
    </SettingCard>
  );
}

// ============================================================
// PART 10 — Developer: CodeStudioToggle / DeveloperMode / Debug / Flags
// ============================================================

function CodeStudioToggleSection({ language }: { language: AppLanguage }) {
  const ctx = useUserRoleSafe();
  // Code Studio 접근은 developerMode와 동일한 게이트 사용 (UserRoleContext.useCanAccessCodeStudio)
  const checked = ctx?.developerMode ?? false;

  return (
    <SettingCard
      icon={<Code2 className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: 'Code Studio', en: 'Code Studio', ja: 'Code Studio', zh: 'Code Studio' })}
      description={L4(language, {
        ko: '코드 생성·검증 도구 (개발자 전용)',
        en: 'Code generation & validation toolkit (developers only)',
        ja: 'コード生成・検証ツール（開発者専用）',
        zh: '代码生成与验证工具（仅限开发者）',
      })}
      onClick={ctx ? () => ctx.setDeveloperMode(!checked) : undefined}
    >
      {ctx ? (
        <Toggle checked={checked} onChange={ctx.setDeveloperMode} label="Code Studio" />
      ) : (
        <span className="text-[10px] text-text-tertiary">N/A</span>
      )}
    </SettingCard>
  );
}

function DeveloperModeToggle({ language }: { language: AppLanguage }) {
  const ctx = useUserRoleSafe();
  const checked = ctx?.developerMode ?? false;

  return (
    <SettingCard
      icon={<Settings className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '개발자 모드', en: 'Developer Mode', ja: '開発者モード', zh: '开发者模式' })}
      description={L4(language, {
        ko: '실험 메뉴, 디버그 패널, Code Studio 접근 권한',
        en: 'Experimental menus, debug panels, Code Studio access',
        ja: '実験メニュー・デバッグパネル・Code Studio アクセス',
        zh: '实验菜单、调试面板、Code Studio 访问权限',
      })}
      onClick={ctx ? () => ctx.setDeveloperMode(!checked) : undefined}
    >
      {ctx ? (
        <Toggle checked={checked} onChange={ctx.setDeveloperMode} label="Developer mode" />
      ) : (
        <span className="text-[10px] text-text-tertiary">N/A</span>
      )}
    </SettingCard>
  );
}

const LOG_LEVEL_KEY = 'noa_log_level';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function DebugMenuSection({ language }: { language: AppLanguage }) {
  const [level, setLevel] = useState<LogLevel>('info');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LOG_LEVEL_KEY) as LogLevel | null;
      if (raw && LOG_LEVELS.includes(raw)) setLevel(raw);
    } catch (err) {
      logger.warn('SettingsView', 'load log level failed', err);
    }
  }, []);

  const update = (next: LogLevel) => {
    setLevel(next);
    try {
      window.localStorage.setItem(LOG_LEVEL_KEY, next);
      window.dispatchEvent(new CustomEvent('noa:log-level-changed', { detail: next }));
    } catch (err) {
      logger.warn('SettingsView', 'persist log level failed', err);
    }
  };

  return (
    <SettingCard
      icon={<Bug className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '로그 레벨', en: 'Log Level', ja: 'ログレベル', zh: '日志级别' })}
      description={L4(language, {
        ko: '콘솔에 출력할 로그의 최소 레벨',
        en: 'Minimum log level emitted to console',
        ja: 'コンソールに出力する最小ログレベル',
        zh: '控制台输出的最低日志级别',
      })}
    >
      <select
        value={level}
        onChange={(e) => update(e.target.value as LogLevel)}
        className="text-[11px] font-bold bg-bg-tertiary text-text-primary px-3 py-1.5 rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        aria-label="Log level"
      >
        {LOG_LEVELS.map((lvl) => (
          <option key={lvl} value={lvl}>{lvl.toUpperCase()}</option>
        ))}
      </select>
    </SettingCard>
  );
}

// 알려진 feature flag 키 — feature-flags.ts와 정렬
const KNOWN_FLAGS = [
  'IMAGE_GENERATION', 'GOOGLE_DRIVE_BACKUP', 'NETWORK_COMMUNITY', 'OFFLINE_CACHE',
  'CODE_STUDIO', 'EPISODE_COMPARE', 'CLOUD_SYNC', 'GITHUB_SYNC',
  'SECURITY_GATE', 'MULTI_FILE_AGENT', 'GITHUB_ETAG_CACHE', 'ARI_ENHANCED',
] as const;
type KnownFlag = typeof KNOWN_FLAGS[number];

function FeatureFlagsSection({ language }: { language: AppLanguage }) {
  // localStorage override 표시·편집만. 기본값은 feature-flags.ts에서 결정 — 여기서는 override 토글만 노출.
  const [overrides, setOverrides] = useState<Record<string, 'true' | 'false' | null>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const next: Record<string, 'true' | 'false' | null> = {};
    for (const flag of KNOWN_FLAGS) {
      try {
        const raw = window.localStorage.getItem(`ff_${flag}`);
        next[flag] = raw === 'true' || raw === 'false' ? raw : null;
      } catch {
        next[flag] = null;
      }
    }
    setOverrides(next);
  }, []);

  const cycleOverride = (flag: KnownFlag) => {
    // null → true → false → null
    const cur = overrides[flag] ?? null;
    const nextVal: 'true' | 'false' | null = cur === null ? 'true' : cur === 'true' ? 'false' : null;
    try {
      if (nextVal === null) {
        window.localStorage.removeItem(`ff_${flag}`);
      } else {
        window.localStorage.setItem(`ff_${flag}`, nextVal);
      }
      setOverrides((prev) => ({ ...prev, [flag]: nextVal }));
      window.dispatchEvent(new CustomEvent('noa:feature-flag-changed', { detail: { flag, value: nextVal } }));
    } catch (err) {
      logger.warn('SettingsView', 'persist feature flag failed', err);
    }
  };

  const reloadHint = L4(language, {
    ko: '변경 후 새로고침이 필요할 수 있습니다',
    en: 'Reload may be required after changes',
    ja: '変更後にリロードが必要な場合があります',
    zh: '更改后可能需要刷新',
  });

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-text-tertiary px-2">{reloadHint}</p>
      {KNOWN_FLAGS.map((flag) => {
        const state = overrides[flag] ?? null;
        const stateLabel =
          state === 'true' ? L4(language, { ko: '강제 ON', en: 'Force ON', ja: '強制ON', zh: '强制开' })
          : state === 'false' ? L4(language, { ko: '강제 OFF', en: 'Force OFF', ja: '強制OFF', zh: '强制关' })
          : L4(language, { ko: '기본값', en: 'Default', ja: '既定', zh: '默认' });
        const stateColor =
          state === 'true' ? 'bg-accent-green/20 text-accent-green'
          : state === 'false' ? 'bg-accent-red/20 text-accent-red'
          : 'bg-bg-tertiary text-text-tertiary';
        return (
          <SettingCard
            key={flag}
            icon={<FlaskConical className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
            title={flag}
            description={`ff_${flag}`}
            onClick={() => cycleOverride(flag)}
          >
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${stateColor}`}>
              {stateLabel}
            </span>
          </SettingCard>
        );
      })}
    </div>
  );
}

// ============================================================
// PART 11 — Advanced: Notifications · Reset · Profile (보존)
// ============================================================

interface WriterSettingsGroupProps {
  language: AppLanguage;
  notificationsOn: boolean;
  setNotificationsOn: React.Dispatch<React.SetStateAction<boolean>>;
  confirmReset: boolean;
  setConfirmReset: React.Dispatch<React.SetStateAction<boolean>>;
  resetCountdown: number;
  setResetCountdown: React.Dispatch<React.SetStateAction<number>>;
  onClearAll: () => void;
}

function WriterSettingsGroup({
  language,
  notificationsOn,
  setNotificationsOn,
  confirmReset,
  setConfirmReset,
  resetCountdown,
  setResetCountdown,
  onClearAll,
}: WriterSettingsGroupProps) {
  const t = createT(language);

  const shortcutsDisabled = typeof window !== 'undefined' && localStorage.getItem('noa_shortcuts_disabled') === '1';
  const suggestionsDisabled = typeof window !== 'undefined' && localStorage.getItem('noa_suggestions_disabled') === '1';

  const resetOnboarding = () => {
    try { localStorage.removeItem('noa_onboarding_done'); } catch (err) { logger.warn('SettingsView', 'remove noa_onboarding_done failed', err); }
    try { localStorage.removeItem('noa-onboarding-complete'); } catch (err) { logger.warn('SettingsView', 'remove noa-onboarding-complete failed', err); }
    try { localStorage.removeItem('noa_shortcuts_hint_shown'); } catch (err) { logger.warn('SettingsView', 'remove noa_shortcuts_hint_shown failed', err); }
    window.location.reload();
  };

  const toggleShortcuts = () => {
    try {
      if (shortcutsDisabled) localStorage.removeItem('noa_shortcuts_disabled');
      else localStorage.setItem('noa_shortcuts_disabled', '1');
    } catch (err) { logger.warn('SettingsView', 'toggle noa_shortcuts_disabled failed (quota?)', err); }
    window.dispatchEvent(new Event('noa:settings-changed'));
    window.location.reload();
  };

  const toggleSuggestions = () => {
    try {
      if (suggestionsDisabled) localStorage.removeItem('noa_suggestions_disabled');
      else localStorage.setItem('noa_suggestions_disabled', '1');
    } catch (err) { logger.warn('SettingsView', 'toggle noa_suggestions_disabled failed (quota?)', err); }
    window.dispatchEvent(new Event('noa:settings-changed'));
    window.location.reload();
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmReset) { onClearAll(); setConfirmReset(false); }
    else { setResetCountdown(3); setConfirmReset(true); }
  };

  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <Bell className="w-4 h-4 text-accent-amber shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, { ko: '알림 · 기본값', en: 'Notifications & Defaults', ja: '通知・既定値', zh: '通知与默认值' })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 ds-card-lg">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-blue" /> {L4(language, { ko: '작가 설정', en: 'Writer Settings', ja: '作家設定', zh: '作家设置' })}
          </h3>

          <div className="space-y-2">
            <div
              onClick={() => setNotificationsOn(prev => !prev)}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-colors cursor-pointer border border-transparent hover:border-border"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Bell className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settings.notifications')}</div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{t('settings.notificationsDesc')}</div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${notificationsOn ? 'bg-accent-blue justify-end' : 'bg-bg-tertiary justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={resetOnboarding}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><BookOpen className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{L4(language, { ko: '온보딩 다시 보기', en: 'Replay Onboarding', ja: 'オンボーディング再表示', zh: '重新显示引导' })}</div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{L4(language, { ko: '처음 시작 가이드를 다시 표시합니다', en: 'Show the getting started guide again', ja: 'スタートガイドを再表示します', zh: '重新显示入门指南' })}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
            </div>

            <div
              onClick={toggleShortcuts}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  <Settings className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">
                    {L4(language, { ko: '키보드 단축키', en: 'Keyboard Shortcuts', ja: 'キーボードショートカット', zh: '键盘快捷键' })}
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: 'Ctrl+E/P 등 브라우저와 충돌하는 단축키 활성/비활성',
                      en: 'Toggle shortcuts that conflict with browser defaults (Ctrl+E/P)',
                      ja: 'ブラウザと競合するショートカット(Ctrl+E/P)の有効/無効',
                      zh: '切换与浏览器冲突的快捷键 (Ctrl+E/P)',
                    })}
                  </div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${shortcutsDisabled ? 'bg-bg-tertiary justify-start' : 'bg-accent-blue justify-end'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={toggleSuggestions}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">
                    {L4(language, { ko: 'NOA 선제 제안', en: 'NOA Proactive Suggestions', ja: 'NOA先制提案', zh: 'NOA 主动建议' })}
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '작가가 쓰는 중 NOA가 먼저 조언. 끄면 질문할 때만 응답 (Pull 모드).',
                      en: 'NOA advises while writing. Off = respond only on demand (Pull mode).',
                      ja: '執筆中にNOAが先に助言。オフで質問時のみ応答 (Pullモード)。',
                      zh: '写作时NOA主动提示。关闭后仅响应询问 (Pull 模式)。',
                    })}
                  </div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${suggestionsDisabled ? 'bg-bg-tertiary justify-start' : 'bg-accent-blue justify-end'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={handleResetClick}
              className={`flex items-center justify-between gap-3 p-4 md:p-6 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border group active:scale-[0.98] ${confirmReset ? 'bg-accent-red/20 border-accent-red/50 animate-pulse' : 'hover:bg-accent-red/10 border-transparent hover:border-accent-red/30'}`}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className={`p-2 md:p-3 rounded-2xl transition-colors shrink-0 ${confirmReset ? 'bg-accent-red/30' : 'bg-bg-secondary group-hover:bg-accent-red/20'}`}><Trash2 className="w-4 h-4 md:w-5 md:h-5 text-accent-red" /></div>
                <div className="min-w-0">
                  {confirmReset ? (
                    <>
                      <div className="text-xs md:text-sm font-bold text-accent-red truncate">
                        {L4(language, { ko: `정말 삭제하시겠습니까? (${resetCountdown}초)`, en: `Are you sure? This cannot be undone. (${resetCountdown}s)`, ja: `本当に削除しますか？ (${resetCountdown}秒)`, zh: `确定要删除吗？ (${resetCountdown}秒)` })}
                      </div>
                      <div className="text-[13px] text-accent-red hidden sm:block">
                        {L4(language, { ko: '한 번 더 클릭하면 모든 데이터가 삭제됩니다', en: 'Click again to permanently delete all data', ja: 'もう一度クリックすると全データが削除されます', zh: '再次点击将永久删除所有数据' })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs md:text-sm font-bold text-accent-red truncate">{t('settings.resetData')}</div>
                      <div className="text-[13px] text-text-tertiary hidden sm:block">{t('settings.resetDataDesc')}</div>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${confirmReset ? 'text-accent-red' : 'text-text-tertiary group-hover:text-accent-red'}`} />
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

// ============================================================
// PART 12 — Profile Card (Firebase Auth status + sign-in CTA)
// ============================================================

function ProfileCard({ language }: { language: AppLanguage }) {
  const t = createT(language);
  const { user, signInWithGoogle, signOut, isConfigured, error } = useAuth();

  if (user) {
    return (
      <div className="bg-bg-secondary/20 border border-border rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl overflow-hidden shrink-0 bg-gradient-to-br from-amber-800 to-stone-900 flex items-center justify-center">
            {user.photoURL ? (
              <Image src={user.photoURL} alt="" width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="text-text-primary text-xl font-black">{user.displayName?.[0] || '?'}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-base md:text-lg">{user.displayName || t('settings.writer')}</h3>
            <p className="text-text-tertiary text-xs">{user.email}</p>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full flex items-center justify-between px-6 py-4 bg-bg-secondary/50 border border-border rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-accent-red/50 hover:text-accent-red transition-[transform,background-color,border-color,color] active:scale-[0.98]">
          {t('settings.signOut')} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary/20 border border-border rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0">
          <User className="w-6 h-6 md:w-8 md:h-8 text-text-tertiary" />
        </div>
        <div>
          <h3 className="font-black text-base md:text-lg">{t('settings.guest')}</h3>
          <p className="text-text-tertiary text-xs">{t('settings.guestDesc')}</p>
        </div>
      </div>
      <button onClick={() => {
        if (!isConfigured) {
          showAlert(t('settings.firebaseRequired'));
          return;
        }
        signInWithGoogle();
      }}
        className="w-full flex items-center justify-between px-6 py-4 bg-accent-blue/10 border border-accent-blue/30 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-accent-blue/20 transition-[transform,background-color,border-color,color] active:scale-[0.98] text-accent-blue">
        {t('settings.googleSignIn')} <ChevronRight className="w-4 h-4" />
      </button>
      {error && (
        <p className="text-accent-red text-xs px-2">{error}</p>
      )}
    </div>
  );
}

export default SettingsView;
