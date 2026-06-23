"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { User, Shield, Sun, Languages, Sparkles, Code2, FlaskConical, Bug, Key } from 'lucide-react';
import type { AppLanguage, ChatSession, StoryConfig } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { useStudioConfig } from '@/contexts/StudioContext';
import { getActiveProvider, getActiveModel, hasStoredApiKey, PROVIDERS } from '@/lib/ai-providers';
import { resolveActiveLocalAI } from '@/lib/local-ai/local-ai-config';
import {
  buildNoaRuntimeBoundary,
  buildNoaRuntimeModeCards,
  type NoaRuntimeBoundaryStatus,
} from '@/lib/noa/runtime-mode';
import {
  AccordionGroup,
  AdvancedWritingModeToggle,
  FontSizeSection,
  InstallAppSection,
  LanguageSection,
  ThemeSection,
} from './SettingsView.controls';
import {
  DebugMenuSection,
  DeveloperModeToggle,
  FeatureFlagsSection,
  InternalToolsToggleSection,
  ProfileCard,
  WriterSettingsGroup,
} from './SettingsView.diagnostics';

const WriterProfileCard = dynamic(() => import('@/components/studio/WriterProfileCard'), { ssr: false });
const ApiKeysSection = dynamic(() => import('@/components/studio/settings/ApiKeysSection'), { ssr: false });
const ProvidersSection = dynamic(() => import('@/components/studio/settings/ProvidersSection'), { ssr: false });
const BackupsSection = dynamic(() => import('@/components/studio/settings/BackupsSection'), { ssr: false });
const AdvancedSection = dynamic(() => import('@/components/studio/settings/AdvancedSection'), { ssr: false });
const PluginsSection = dynamic(() => import('@/components/studio/settings/PluginsSection'), { ssr: false });
const BrandGuardSection = dynamic(() => import('@/components/studio/settings/BrandGuardSection'), { ssr: false });
const SessionSection = dynamic(() => import('@/components/studio/settings/SessionSection'), { ssr: false });
const ComplianceSection = dynamic(() => import('@/components/studio/settings/ComplianceSection'), { ssr: false });
const CreativeProcessSection = dynamic(() => import('@/components/studio/settings/CreativeProcessSection'), { ssr: false });
const PrivacySection = dynamic(() => import('@/components/studio/settings/PrivacySection'), { ssr: false });
const LSPTokenSection = dynamic(() => import('@/components/studio/settings/LSPTokenSection').then((m) => m.LSPTokenSection), { ssr: false });
const FormatOnSaveSection = dynamic(() => import('@/components/studio/settings/FormatOnSaveSection').then((m) => m.FormatOnSaveSection), { ssr: false });
const SeriesDNASection = dynamic(() => import('@/components/studio/settings/SeriesDNASection'), { ssr: false });
const StorageObservatoryDashboard = dynamic(() => import('@/components/studio/settings/StorageObservatoryDashboard'), { ssr: false });

export interface VersionedBackup {
  timestamp: number;
  label: string;
}

interface ProviderSettingsProps {
  language: AppLanguage;
  hostedProviders: Partial<Record<string, boolean>>;
  onManageApiKey: () => void;
}

export function StatusTab({ language, hostedProviders, onManageApiKey }: ProviderSettingsProps) {
  return (
    <div className="space-y-4">
      <EnvironmentStatusOverview
        language={language}
        hostedProviders={hostedProviders}
        onManageApiKey={onManageApiKey}
      />
      <AccordionGroup
        icon={<Key className="w-4 h-4 text-accent-blue shrink-0" />}
        title={L4(language, { ko: '연결 키', en: 'Connection Key', ja: '接続キー', zh: '连接密钥' })}
        defaultOpen
      >
        <div className="rounded-2xl border border-border bg-bg-primary/60 p-2">
          <ApiKeysSection
            language={language}
            hostedProviders={hostedProviders}
            onManageApiKey={onManageApiKey}
          />
        </div>
      </AccordionGroup>
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
    </div>
  );
}

function EnvironmentStatusOverview({ language, hostedProviders, onManageApiKey }: ProviderSettingsProps) {
  const activeProvider = typeof window !== 'undefined' ? getActiveProvider() : 'gemini';
  const activeModel = typeof window !== 'undefined' ? getActiveModel() : '';
  const providerDef = PROVIDERS[activeProvider];
  const providerName = providerDef?.name ?? activeProvider;
  const hasHostedAccess = Boolean(hostedProviders[activeProvider]);
  const hasUserKey = typeof window !== 'undefined' ? hasStoredApiKey(activeProvider) : false;
  const isLocalProvider = Boolean(providerDef?.capabilities?.isLocal) || activeProvider === 'ollama' || activeProvider === 'lmstudio';
  const hasLocalEndpoint = typeof window !== 'undefined' ? Boolean(resolveActiveLocalAI()) : false;
  const localEndpointConfigured = hasLocalEndpoint || (isLocalProvider && hasUserKey);
  const runtimeInput = {
    providerId: activeProvider,
    providerName,
    providerIsLocal: isLocalProvider,
    providerHasUserKey: hasUserKey,
    hostedAvailable: hasHostedAccess,
    localEndpointConfigured,
    structuredOutputSupported: Boolean(providerDef?.capabilities?.structuredOutput),
  };
  const runtimeBoundary = buildNoaRuntimeBoundary(runtimeInput);
  const modes = buildNoaRuntimeModeCards(runtimeInput);
  const boundaryRows = [
    { label: '창작 본문 경로', value: runtimeBoundary.creativePathKo },
    { label: '시스템 보조 경계', value: runtimeBoundary.systemPathKo },
    { label: '비용·프라이버시', value: `${runtimeBoundary.costKo} ${runtimeBoundary.privacyKo}` },
    { label: '제한·다음 조치', value: `${runtimeBoundary.limitsKo} ${runtimeBoundary.requiredActionKo}` },
  ];
  const statusLabel = (status: NoaRuntimeBoundaryStatus, active: boolean) => {
    if (active) return L4(language, { ko: '사용 중', en: 'Active', ja: '使用中', zh: '使用中' });
    if (status === 'ready') return L4(language, { ko: '준비', en: 'Ready', ja: '準備', zh: '就绪' });
    if (status === 'review') return L4(language, { ko: '점검', en: 'Review', ja: '点検', zh: '检查' });
    return L4(language, { ko: '설정 필요', en: 'Needs setup', ja: '設定必要', zh: '需设置' });
  };
  const runtimeSourceLabel =
    hasHostedAccess || hasUserKey || localEndpointConfigured
      ? `${providerName} · ${activeModel || providerDef?.models?.[0] || 'model pending'}`
      : L4(language, {
          ko: '연결 준비 전 · 모델 미선택',
          en: 'Connection not ready · no model selected',
          ja: '接続準備前 · モデル未選択',
          zh: '连接未就绪 · 未选择模型',
        });

  return (
    <AccordionGroup
      icon={<Shield className="w-4 h-4 text-accent-blue shrink-0" />}
      title={L4(language, { ko: '환경 상태판', en: 'Environment Status', ja: '環境ステータス', zh: '环境状态板' })}
      defaultOpen
    >
      <div className="rounded-2xl border border-border bg-bg-primary/60 p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-text-tertiary">
              {L4(language, { ko: '현재 노아 운영', en: 'Current Noah Runtime', ja: '現在のノア運用', zh: '当前诺亚运行' })}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-black text-text-primary">{runtimeBoundary.modeLabelKo}</h3>
              <span className="rounded-full border border-border bg-bg-secondary/50 px-2.5 py-1 text-[10px] font-black text-text-secondary">
                {runtimeBoundary.statusLabelKo}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-tertiary">{runtimeSourceLabel}</p>
          </div>
          <button
            type="button"
            onClick={onManageApiKey}
            className="min-h-[44px] rounded-xl bg-accent-blue px-4 py-2 text-sm font-black text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            {L4(language, { ko: '키·엔드포인트 관리', en: 'Manage Key/Endpoint', ja: 'キー・エンドポイント管理', zh: '管理密钥/端点' })}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {modes.map((mode) => (
            <div
              key={mode.label}
              className={`rounded-2xl border p-4 ${
                mode.active
                  ? 'border-accent-blue bg-accent-blue/10'
                  : mode.status === 'ready'
                    ? 'border-border bg-bg-secondary/20'
                    : 'border-accent-amber/40 bg-accent-amber/10'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">{mode.label}</span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                  mode.active ? 'bg-accent-blue text-white' : mode.status === 'ready' ? 'bg-bg-tertiary text-text-secondary' : 'bg-accent-amber/20 text-accent-amber'
                }`}>
                  {statusLabel(mode.status, mode.active)}
                </span>
              </div>
              <h4 className="mt-3 text-sm font-black text-text-primary">{mode.titleKo}</h4>
              <p className="mt-2 text-[12px] leading-relaxed text-text-tertiary">{mode.descriptionKo}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {boundaryRows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-bg-secondary/20 p-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">{row.label}</h4>
              <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">{row.value}</p>
            </div>
          ))}
        </div>
      </div>
    </AccordionGroup>
  );
}

export function NoaOperationsTab({ language, hostedProviders, onManageApiKey }: ProviderSettingsProps) {
  return (
    <div className="space-y-4">
      <ProvidersSection language={language} />
      <AdvancedSection
        language={language}
        hostedProviders={hostedProviders}
        onManageApiKey={onManageApiKey}
      />
    </div>
  );
}

interface StorageBackupTabProps {
  language: AppLanguage;
  versionedBackups?: VersionedBackup[];
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}

export function StorageBackupTab({
  language,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
}: StorageBackupTabProps) {
  return (
    <div className="space-y-4">
      <BackupsSection
        language={language}
        versionedBackups={versionedBackups}
        onRestoreBackup={onRestoreBackup}
        onRefreshBackups={onRefreshBackups}
      />
    </div>
  );
}

function readActiveManuscriptFromConfig(config: StoryConfig | null | undefined): string {
  if (!config) return '';
  const activeEpisode = config.episode ?? 1;
  const manuscripts = config.manuscripts ?? [];
  return (
    manuscripts.find((entry) => entry.episode === activeEpisode)?.content ??
    manuscripts[0]?.content ??
    ''
  );
}

export function WorkspaceTab({
  language,
  currentSession,
}: {
  language: AppLanguage;
  currentSession?: ChatSession | null;
}) {
  const { config } = useStudioConfig();
  const activeConfig = config ?? currentSession?.config ?? null;
  const episodeSceneSheets = activeConfig?.episodeSceneSheets ?? [];

  return (
    <div className="space-y-4">
      <AccordionGroup
        icon={<Sun className="w-4 h-4 text-accent-amber shrink-0" />}
        title={L4(language, { ko: '외관', en: 'Appearance', ja: '外観', zh: '外观' })}
        defaultOpen
      >
        <ThemeSection language={language} />
      </AccordionGroup>
      <AccordionGroup
        icon={<Languages className="w-4 h-4 text-accent-blue shrink-0" />}
        title={L4(language, { ko: '언어 · 글자', en: 'Language & Text', ja: '言語・文字', zh: '语言与文字' })}
      >
        <LanguageSection language={language} />
        <FontSizeSection language={language} />
      </AccordionGroup>
      <InstallAppSection language={language} />
      <SessionSection language={language} />
      <PluginsSection
        language={language}
        currentSession={currentSession ?? null}
        readManuscript={() => readActiveManuscriptFromConfig(activeConfig)}
      />
      <AccordionGroup
        icon={<Sparkles className="w-4 h-4 text-accent-purple shrink-0" />}
        title={L4(language, { ko: '집필 편의', en: 'Writing Comfort', ja: '執筆補助', zh: '写作舒适度' })}
      >
        <AdvancedWritingModeToggle language={language} />
      </AccordionGroup>
      <SeriesDNASection language={language} episodeSceneSheets={episodeSceneSheets} />
    </div>
  );
}

export function RecordsRightsTab({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-4">
      <BrandGuardSection language={language} />
      <CreativeProcessSection language={language} />
      <PrivacySection language={language} />
    </div>
  );
}

export function ReleaseTranslationTab({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-4">
      <ComplianceSection language={language} />
      <FormatOnSaveSection language={language} activeManuscript={null} />
      <LSPTokenSection language={language} />
    </div>
  );
}

interface DiagnosticsTabProps {
  language: AppLanguage;
  onClearAll: () => void;
}

export function DiagnosticsTab({ language, onClearAll }: DiagnosticsTabProps) {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);

  useEffect(() => {
    if (!confirmReset) return;
    const interval = setInterval(() => {
      setResetCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(interval);
          setConfirmReset(false);
          return 3;
        }
        return previous - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmReset]);

  return (
    <div className="space-y-4">
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
      <StorageObservatoryDashboard language={language} />
    </div>
  );
}

export function DeveloperTab({ language }: { language: AppLanguage }) {
  return (
    <div className="space-y-4">
      <AccordionGroup
        icon={<Code2 className="w-4 h-4 text-accent-blue shrink-0" />}
        title={L4(language, { ko: '운영 진단', en: 'Operational Diagnostics', ja: '運用診断', zh: '运行诊断' })}
        defaultOpen
      >
        <InternalToolsToggleSection language={language} />
        <DeveloperModeToggle language={language} />
      </AccordionGroup>

      <AccordionGroup
        icon={<Bug className="w-4 h-4 text-accent-amber shrink-0" />}
        title={L4(language, { ko: '문제 추적', en: 'Issue tracing', ja: '問題追跡', zh: '问题追踪' })}
      >
        <DebugMenuSection language={language} />
      </AccordionGroup>

      <AccordionGroup
        icon={<FlaskConical className="w-4 h-4 text-accent-purple shrink-0" />}
        title={L4(language, { ko: '실험 기능 플래그', en: 'Feature Flags', ja: '実験機能フラグ', zh: '实验功能标志' })}
      >
        <FeatureFlagsSection language={language} />
      </AccordionGroup>

      <StorageObservatoryDashboard language={language} />
    </div>
  );
}
