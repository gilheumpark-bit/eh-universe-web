"use client";

import { showAlert } from '@/lib/show-alert';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AppLanguage } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT, L4 } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import {
  User, Shield, Cpu, Trash2,
  ChevronRight, ChevronDown, Zap, Bell, Key, Monitor, Smartphone, Hash, Thermometer, BookOpen,
  GitBranch, Check, Unplug, HelpCircle,
} from 'lucide-react';
import { getActiveProvider, getActiveModel, setApiKey, PROVIDERS, PROVIDER_LIST_UI, isKeyExpiringSoon, getKeyAge, hasStoredApiKey } from '@/lib/ai-providers';
import { getStorageUsageBytes } from '@/lib/project-migration';
import { idbEstimateSize } from '@/lib/browser/idb-store';
import { setNarrativeDepth as narrativeDepthSetter } from '@/lib/noa/lora-swap';
import { useGitHubSync } from '@/hooks/useGitHubSync';
import { isFeatureEnabled } from '@/lib/feature-flags';
import dynamic from 'next/dynamic';
const WriterProfileCard = dynamic(() => import('@/components/studio/WriterProfileCard'), { ssr: false });

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

// Engine settings labels are now in TRANSLATIONS.settingsEngine

const OBFUSCATION_PREFIXES = ['noa:1:', 'noa:2:'];

function _migrateAllKeysToObfuscated(): number {
  let migrated = 0;
  for (const provider of PROVIDER_LIST_UI) {
    let raw: string | null = null;
    try { raw = localStorage.getItem(provider.storageKey); } catch { /* private browsing */ }
    if (raw && !OBFUSCATION_PREFIXES.some(p => raw.startsWith(p))) {
      // Plain-text key detected — re-save through setApiKey which obfuscates it
      // deobfuscateKey handles both noa:1: and noa:2: so won't double-encode
      setApiKey(provider.id, raw);
      migrated++;
    }
  }
  return migrated;
}

const SettingsView: React.FC<SettingsViewProps> = ({ language, hostedProviders = {}, onClearAll, onManageApiKey, versionedBackups, onRestoreBackup, onRefreshBackups }) => {
  const t = createT(language);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // P0-1: 2-step reset confirmation with 3-second countdown
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);
  useEffect(() => {
    if (!confirmReset) return;
    // resetCountdown는 confirmReset 토글 시 handleConfirmStart에서 3으로 초기화됨
    const interval = setInterval(() => {
      setResetCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); setConfirmReset(false); return 3; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmReset]);
  const [_obfuscateDone, _setObfuscateDone] = useState<number | null>(null);
  const [defaultPlatform, setDefaultPlatform] = useState<string>(() => { try { return (typeof window !== 'undefined' ? localStorage.getItem('noa_default_platform') : null) || 'MOBILE'; } catch { return 'MOBILE'; } });
  const [defaultEpisodes, setDefaultEpisodes] = useState<number>(() => { try { return parseInt((typeof window !== 'undefined' ? localStorage.getItem('noa_default_episodes') : null) || '25'); } catch { return 25; } });
  const [temperature, setTemperature] = useState<number>(() => { try { return parseFloat((typeof window !== 'undefined' ? localStorage.getItem('noa_temperature') : null) || '0.9'); } catch { return 0.9; } });
  const [narrativeDepth, setNarrativeDepthState] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    let stored: string | null = null;
    try { stored = localStorage.getItem('noa_narrative_depth'); } catch { /* private */ }
    const val = stored ? parseFloat(stored) : 1.0;
    narrativeDepthSetter(val);
    return val;
  });

  const activeProvider = typeof window !== 'undefined' ? getActiveProvider() : 'gemini';
  const activeModel = typeof window !== 'undefined' ? getActiveModel() : '';
  const providerName = PROVIDERS[activeProvider]?.name ?? activeProvider;

  const [apiKeyRefresh, setApiKeyRefresh] = useState(0);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    idbEstimateSize().then(setStorageEstimate);
  }, []);

  const checkApiKeys = useCallback(() => {
    setApiKeyRefresh((n) => n + 1);
  }, []);

  const apiProvider = typeof window !== 'undefined' ? getActiveProvider() : activeProvider;
  void apiKeyRefresh;
  const hasPersonalApiKey = typeof window !== 'undefined' && hasStoredApiKey(apiProvider);
  const hasHostedApi = Boolean(hostedProviders[apiProvider]);


  useEffect(() => {
    window.addEventListener('storage', checkApiKeys);
    window.addEventListener('noa-keys-changed', checkApiKeys);
    return () => {
      window.removeEventListener('storage', checkApiKeys);
      window.removeEventListener('noa-keys-changed', checkApiKeys);
    };
  }, [checkApiKeys]);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-32">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t('settings.settingsAccount')}</h2>
        <p className="text-text-tertiary text-[10px] font-bold tracking-widest uppercase">System Control Center</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Profile Card */}
        <ProfileCard language={language} />

        {/* Engine Status Card */}
        <div className="bg-bg-secondary/20 border border-border rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" /> {L4(language, { ko: '집필 엔진 상태', en: 'Writing Engine Status', ja: '執筆エンジン状態', zh: '写作引擎状态' })}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.engineVersion')}</span>
              <span className="text-xs font-black text-blue-400">ANS {ENGINE_VERSION}</span>
            </div>
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.aiModel')}</span>
              <span className="text-xs font-black text-text-primary">{providerName} — {activeModel}</span>
            </div>
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.latency')}</span>
              <span className="text-xs font-black text-green-500">OPTIMAL</span>
            </div>
            <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{L4(language, { ko: '클라우드 동기화', en: 'Cloud Sync', ja: 'クラウド同期', zh: '云同步' })}</span>
              <span className={`text-xs font-black ${isFeatureEnabled('CLOUD_SYNC') ? 'text-green-500' : 'text-text-tertiary'}`}>
                {isFeatureEnabled('CLOUD_SYNC')
                  ? L4(language, { ko: '활성', en: 'Active', ja: '有効', zh: '启用' })
                  : L4(language, { ko: '비활성', en: 'Disabled', ja: '無効', zh: '停用' })}
              </span>
            </div>
            <div className="bg-bg-secondary p-4 rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">{L4(language, { ko: '로컬 저장 용량', en: 'Local Storage', ja: '로컬 保存 용량', zh: '로컬 保存 용량' })}</span>
                {storageEstimate && storageEstimate.quota > 0 ? (() => {
                  const usageMB = storageEstimate.usage / 1024 / 1024;
                  const quotaMB = storageEstimate.quota / 1024 / 1024;
                  const pct = (storageEstimate.usage / storageEstimate.quota) * 100;
                  const formatSize = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
                  return (
                    <span className={`text-xs font-black ${pct > 80 ? 'text-red-400' : pct > 50 ? 'text-accent-amber' : 'text-green-500'}`}>
                      {formatSize(usageMB)} / {formatSize(quotaMB)}
                    </span>
                  );
                })() : (
                  <span className={`text-xs font-black ${(() => { const mb = getStorageUsageBytes() / 1024 / 1024; return mb > 4 ? 'text-red-400' : mb > 2 ? 'text-accent-amber' : 'text-green-500'; })()}`}>
                    {(getStorageUsageBytes() / 1024 / 1024).toFixed(1)} MB / 5 MB
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                {storageEstimate && storageEstimate.quota > 0 ? (
                  <div
                    className={`h-full rounded-full transition-all ${(() => { const pct = (storageEstimate.usage / storageEstimate.quota) * 100; return pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-accent-amber' : 'bg-green-500'; })()}`}
                    style={{ width: `${Math.min(100, (storageEstimate.usage / storageEstimate.quota) * 100)}%` }}
                  />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all ${(() => { const pct = (getStorageUsageBytes() / (5 * 1024 * 1024)) * 100; return pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-accent-amber' : 'bg-green-500'; })()}`}
                    style={{ width: `${Math.min(100, (getStorageUsageBytes() / (5 * 1024 * 1024)) * 100)}%` }}
                  />
                )}
              </div>
              {storageEstimate && storageEstimate.quota > 0 && (storageEstimate.usage / storageEstimate.quota) > 0.8 && (
                <p className="text-[10px] text-red-400">{L4(language, { ko: '용량이 부족합니다. 오래된 세션을 삭제하거나 백업 후 정리하세요.', en: 'Storage nearly full. Delete old sessions or export a backup.', ja: '용량이 부족합니다. 오래된 세션을 削除하거나 백업 후 정리하세요.', zh: '용량이 부족합니다. 오래된 세션을 删除하거나 백업 후 정리하세요.' })}</p>
              )}
            </div>
          </div>
        </div>

        {/* Writer Profile */}
        <div className="md:col-span-2 ds-card-lg">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
            <User className="w-4 h-4 text-accent-purple" />
            {L4(language, { ko: '작가 프로파일', en: 'Writer Profile', ja: 'ライタープロフィール', zh: '作者档案' })}
          </h3>
          <WriterProfileCard language={language} />
        </div>

        {/* Writer Settings (작가 설정) */}
        <div className="md:col-span-2 ds-card-lg">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" /> {L4(language, { ko: '작가 설정', en: 'Writer Settings', ja: '作家設定', zh: '作家设置' })}
          </h3>

          <div className="space-y-2">
            <div
              onClick={() => setNotificationsOn(prev => !prev)}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-border"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Bell className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settings.notifications')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settings.notificationsDesc')}</div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${notificationsOn ? 'bg-blue-600 justify-end' : 'bg-bg-tertiary justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={() => {
                try { localStorage.removeItem('noa_onboarding_done'); } catch { /* private */ }
                try { localStorage.removeItem('noa-onboarding-complete'); } catch { /* private */ }
                try { localStorage.removeItem('noa_shortcuts_hint_shown'); } catch { /* private */ }
                window.location.reload();
              }}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><BookOpen className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{L4(language, { ko: '온보딩 다시 보기', en: 'Replay Onboarding', ja: 'オンボーディング再表示', zh: '重新显示引导' })}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{L4(language, { ko: '처음 시작 가이드를 다시 표시합니다', en: 'Show the getting started guide again', ja: 'スタートガイドを再表示します', zh: '重新显示入门指南' })}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                if (confirmReset) { onClearAll(); setConfirmReset(false); }
                else { setResetCountdown(3); setConfirmReset(true); }
              }}
              className={`flex items-center justify-between gap-3 p-4 md:p-6 rounded-3xl transition-all cursor-pointer border group active:scale-[0.98] ${confirmReset ? 'bg-red-500/20 border-red-500/50 animate-pulse' : 'hover:bg-red-500/10 border-transparent hover:border-red-500/30'}`}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className={`p-2 md:p-3 rounded-2xl transition-colors shrink-0 ${confirmReset ? 'bg-red-500/30' : 'bg-bg-secondary group-hover:bg-red-500/20'}`}><Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-500" /></div>
                <div className="min-w-0">
                  {confirmReset ? (
                    <>
                      <div className="text-xs md:text-sm font-bold text-red-500 truncate">
                        {L4(language, { ko: `정말 삭제하시겠습니까? (${resetCountdown}초)`, en: `Are you sure? This cannot be undone. (${resetCountdown}s)`, ja: `本当に削除しますか？ (${resetCountdown}秒)`, zh: `确定要删除吗？ (${resetCountdown}秒)` })}
                      </div>
                      <div className="text-[10px] md:text-[11px] text-red-400 hidden sm:block">
                        {L4(language, { ko: '한 번 더 클릭하면 모든 데이터가 삭제됩니다', en: 'Click again to permanently delete all data', ja: 'もう一度クリックすると全データが削除されます', zh: '再次点击将永久删除所有数据' })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs md:text-sm font-bold text-red-500 truncate">{t('settings.resetData')}</div>
                      <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settings.resetDataDesc')}</div>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${confirmReset ? 'text-red-500' : 'text-text-tertiary group-hover:text-red-500'}`} />
            </div>
          </div>
        </div>

        {/* Versioned Backup Section */}
        {versionedBackups && onRestoreBackup && (
          <div className="md:col-span-2 ds-card-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" /> {L4(language, { ko: '자동 백업 (10분 간격)', en: 'Auto Backup (every 10 min)', ja: 'Auto Backup (every 10 min)', zh: 'Auto Backup (every 10 min)' })}
              </h3>
              {onRefreshBackups && (
                <button onClick={onRefreshBackups} className="text-[10px] text-text-tertiary hover:text-text-primary font-mono uppercase tracking-wider transition-colors" title={L4(language, { ko: '목록 새로고침', en: 'Refresh list', ja: '一覧 更新', zh: '列表 刷新' })}>
                  {L4(language, { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' })}
                </button>
              )}
            </div>
            {versionedBackups.length === 0 ? (
              <div className="text-sm text-text-tertiary py-4 text-center">
                {L4(language, { ko: '저장된 백업이 없습니다. 10분 후 자동 백업됩니다.', en: 'No backups yet. Auto-backup runs every 10 minutes.', ja: '保存된 백업이 없습니다. 10분 후 자동 백업됩니다.', zh: '保存된 백업이 없습니다. 10분 후 자동 백업됩니다.' })}
              </div>
            ) : (
              <div className="space-y-2">
                {versionedBackups.map((b) => (
                  <div key={b.timestamp} className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-border">
                    <div>
                      <div className="text-xs font-bold text-text-primary">{new Date(b.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-text-tertiary font-mono">
                        {L4(language, { ko: '자동 백업', en: 'Auto backup', ja: 'Auto backup', zh: 'Auto backup' })}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await onRestoreBackup(b.timestamp);
                        if (ok) {
                          showAlert(L4(language, { ko: '백업에서 복원되었습니다.', en: 'Restored from backup.', ja: 'Restored from backup.', zh: 'Restored from backup.' }));
                        } else {
                          showAlert(L4(language, { ko: '복원에 실패했습니다.', en: 'Restore failed.', ja: 'Restore failed.', zh: 'Restore failed.' }));
                        }
                      }}
                      className="text-[10px] font-bold font-mono uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 border border-blue-500/30 rounded-lg hover:bg-blue-500/10"
                      title={L4(language, { ko: '이 백업으로 복원', en: 'Restore from this backup', ja: 'Restore from this backup', zh: 'Restore from this backup' })}
                    >
                      {L4(language, { ko: '복원', en: 'Restore', ja: 'Restore', zh: 'Restore' })}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Google Drive Backup */}
        {isFeatureEnabled('GOOGLE_DRIVE_BACKUP') && (
          <GoogleDriveSection language={language} />
        )}

        {/* GitHub Cloud Backup */}
        <GitHubSyncSection language={language} />

        {/* Advanced Settings (고급 설정) — Collapsible */}
        <div className="md:col-span-2 ds-card-lg">
          <button
            onClick={() => setAdvancedOpen(prev => !prev)}
            className="w-full flex items-center justify-between mb-4 group cursor-pointer"
          >
            <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" /> {t('settingsEngine.engineSettings')}
            </h3>
            <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
          <p className="text-[10px] text-text-tertiary mb-4">
            {L4(language, { ko: 'AI 서비스 연결, 창의성 조절 등 기술적인 설정입니다.', en: 'Technical settings including AI service connection and creativity tuning.', ja: 'AIサービス接続や創造性調整などの技術設定です。', zh: 'AI服务连接和创造性调整等技术设置。' })}
          </p>
          {advancedOpen && <div className="space-y-2">
            {/* AI Service Connection (API Key) */}
            <div
              data-testid="settings-api-key-row"
              onClick={onManageApiKey}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Key className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settings.apiKeyManagement')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">
                    {t('settings.apiKeyDesc')}
                    <span className="ml-1 opacity-60">(API {L4(language, { ko: '키', en: 'Key', ja: 'Key', zh: 'Key' })})</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <div data-testid="settings-api-key-status" className="text-[9px] md:text-[10px] font-black text-blue-500 uppercase">
                  {hasPersonalApiKey
                    ? t('settings.apiKeySet')
                    : hasHostedApi
                      ? t('settings.apiKeyPlatformOnly')
                      : t('settings.apiKeyNotSet')}
                </div>
                {hasPersonalApiKey && isKeyExpiringSoon(apiProvider) && (
                  <div className="text-[8px] md:text-[9px] text-accent-amber">
                    {L4(language, { ko: `키 갱신 권장 (${getKeyAge(apiProvider)}일)`, en: `Rotate key (${getKeyAge(apiProvider)}d old)`, ja: `Rotate key (${getKeyAge(apiProvider)}d old)`, zh: `Rotate key (${getKeyAge(apiProvider)}d old)` })}
                  </div>
                )}
              </div>
            </div>

            {/* Default Platform */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  {defaultPlatform === 'MOBILE' ? <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /> : <Monitor className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settingsEngine.defaultPlatform')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settingsEngine.defaultPlatformDesc')}</div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {(['MOBILE', 'WEB'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setDefaultPlatform(p); try { localStorage.setItem('noa_default_platform', p); } catch { /* quota/private */ } }}
                    className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${defaultPlatform === p ? 'bg-blue-600 text-text-primary' : 'bg-bg-secondary text-text-tertiary hover:text-text-primary'}`}
                  >
                    {p === 'MOBILE' ? t('settingsEngine.mobile') : t('settingsEngine.web')}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Episodes */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Hash className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settingsEngine.defaultEpisodes')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settingsEngine.defaultEpisodesDesc')}</div>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={200}
                value={defaultEpisodes}
                onChange={e => { const v = parseInt(e.target.value) || 25; setDefaultEpisodes(v); try { localStorage.setItem('noa_default_episodes', String(v)); } catch { /* quota/private */ } }}
                className="w-16 md:w-20 bg-bg-secondary border border-border rounded-xl px-2 md:px-3 py-2 text-xs md:text-sm font-black text-center text-blue-400 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 shrink-0"
              />
            </div>

            {/* Temperature */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Thermometer className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">{t('settingsEngine.temperature')}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, { ko: '낮을수록 안정적이고 예측 가능, 높을수록 독창적이고 예측 불가', en: 'Lower = stable & predictable, Higher = creative & unpredictable', ja: '低いほど安定的で予測可能、高いほど独創的で予測不能', zh: '越低越稳定可预测，越高越独创不可预测' })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settingsEngine.temperatureDesc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={temperature}
                  onChange={e => { const v = parseFloat(e.target.value); setTemperature(v); try { localStorage.setItem('noa_temperature', String(v)); } catch { /* quota/private */ } }}
                  className="w-20 md:w-24 accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className={`text-xs md:text-sm font-black w-7 md:w-8 text-right ${temperature < 0.1 || temperature > 1.5 ? 'text-red-400' : 'text-blue-400'}`}>{temperature.toFixed(1)}</span>
              </div>
            </div>

            {/* Narrative Depth Slider */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-accent-purple shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate flex items-center gap-1.5">{L4(language, { ko: '서사 깊이', en: 'Narrative Depth', ja: 'Narrative Depth', zh: 'Narrative Depth' })}
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-text-tertiary/50 cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-[10px] text-text-secondary whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-50">
                        {L4(language, { ko: '낮을수록 간결하고 빠른 전개, 높을수록 묘사가 풍부', en: 'Lower = concise & fast pacing, Higher = rich descriptions', ja: '低いほど簡潔で速い展開、高いほど描写が豊か', zh: '越低越简洁节奏快，越高描写越丰富' })}
                      </span>
                    </span>
                  </div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">
                    {narrativeDepth <= 0.9 ? L4(language, { ko: '평작 — 가독성 우선', en: 'Light — Readability first', ja: 'Light — Readability first', zh: 'Light — Readability first' }) :
                     narrativeDepth <= 1.0 ? L4(language, { ko: '기본 — 장르 균형', en: 'Standard — Genre balance', ja: '기본 — ジャンル 균형', zh: '기본 — 类型 균형' }) :
                     narrativeDepth <= 1.2 ? L4(language, { ko: '심화 — 비유/상징 활용', en: 'Deep — Metaphor/symbolism', ja: 'Deep — Metaphor/symbolism', zh: 'Deep — Metaphor/symbolism' }) :
                     L4(language, { ko: '최대 — 문예 수준 밀도', en: 'Maximum — Literary density', ja: '最大 — 문예 수준 밀도', zh: '最大 — 문예 수준 밀도' })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={narrativeDepth}
                  onChange={e => { const v = parseFloat(e.target.value); setNarrativeDepthState(v); try { localStorage.setItem('noa_narrative_depth', String(v)); } catch { /* quota/private */ } narrativeDepthSetter(v); }}
                  className="w-20 md:w-24 accent-purple-500 h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className={`text-xs md:text-sm font-black w-7 md:w-8 text-right ${narrativeDepth < 0.5 || narrativeDepth > 2.0 ? 'text-red-400' : 'text-accent-purple'}`}>{narrativeDepth.toFixed(1)}</span>
              </div>
            </div>

          </div>}
        </div>

        {/* Footer */}
        <div className="md:col-span-2 flex flex-col gap-4 md:flex-row justify-between items-center px-2 md:px-10">
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
    </div>
  );
};

// ============================================================
// PART 2 — GitHub Sync Section
// ============================================================

function GitHubSyncSection({ language }: { language: AppLanguage }) {
  const ghEnabled = typeof window !== 'undefined' && isFeatureEnabled('GITHUB_SYNC');
  const gh = useGitHubSync();
  const [tokenInput, setTokenInput] = useState('');
  const [connecting, setConnecting] = useState(false);

  // GitHub OAuth popup handler — with CSRF state parameter
  const handleOAuthLogin = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) return;

    // Generate random state for CSRF protection and store in cookie
    const state = crypto.randomUUID();
    document.cookie = `gh_oauth_state=${state}; path=/; max-age=600; SameSite=Lax; Secure`;

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`;
    const w = 600, h = 700;
    const left = (screen.width - w) / 2, top = (screen.height - h) / 2;
    window.open(authUrl, 'github-oauth', `width=${w},height=${h},left=${left},top=${top}`);
  }, []);

  // Listen for OAuth token from callback redirect hash
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('github_token=')) {
        const token = hash.split('github_token=')[1]?.split('&')[0];
        if (token) {
          gh.connect(token);
          window.location.hash = '';
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [gh]);

  const hasOAuthClientId = typeof process !== 'undefined' && !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!ghEnabled) {
    return (
      <div className="md:col-span-2 ds-card-lg opacity-60">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-text-tertiary" />
          {L4(language, { ko: '클라우드 백업 (GitHub)', en: 'Cloud Backup (GitHub)', ja: 'Cloud Backup (GitHub)', zh: 'Cloud Backup (GitHub)' })}
          <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-bg-tertiary text-text-tertiary font-bold uppercase tracking-wider">
            {L4(language, { ko: '준비 중', en: 'Coming Soon', ja: 'Coming Soon', zh: 'Coming Soon' })}
          </span>
        </h3>
        <p className="text-xs text-text-tertiary">
          {L4(language, { ko: '원고를 GitHub에 백업하고 버전 관리할 수 있습니다. 곧 활성화됩니다.', en: 'Back up manuscripts to GitHub with version control. Coming soon.', ja: '原稿를 GitHub에 백업하고 버전 管理할 수 있습니다. 곧 アクティブ화됩니다.', zh: '稿件를 GitHub에 백업하고 버전 管理할 수 있습니다. 곧 活跃화됩니다.' })}
        </p>
      </div>
    );
  }

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    setConnecting(true);
    try {
      await gh.connect(tokenInput.trim());
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectRepo = (value: string) => {
    const repo = gh.repos.find(r => `${r.owner}/${r.name}` === value);
    if (repo) gh.selectRepo(repo.owner, repo.name);
  };

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-green-500" />
        {L4(language, { ko: '원고 백업 (GitHub)', en: 'Manuscript Backup (GitHub)', ja: '原稿 백업 (GitHub)', zh: '稿件 백업 (GitHub)' })}
      </h3>

      {gh.connected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-border">
            <div className="flex items-center gap-3 min-w-0">
              <GitBranch className="w-4 h-4 text-green-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-text-primary truncate">
                  {gh.config?.owner}/{gh.config?.repo}
                </div>
                <div className="text-[10px] text-text-tertiary">
                  {gh.config?.branch ?? 'main'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[9px] font-bold text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {L4(language, { ko: '연결됨', en: 'Connected', ja: 'Connected', zh: 'Connected' })}
              </span>
              <button
                onClick={gh.disconnect}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title={L4(language, { ko: '연결 해제', en: 'Disconnect', ja: 'Disconnect', zh: 'Disconnect' })}
                aria-label="Disconnect GitHub"
              >
                <Unplug className="w-4 h-4" />
              </button>
            </div>
          </div>
          {gh.lastSyncAt && (
            <div className="text-[10px] text-text-tertiary px-2">
              {L4(language, { ko: '마지막 동기화', en: 'Last sync', ja: 'Last sync', zh: 'Last sync' })}: {new Date(gh.lastSyncAt).toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* OAuth Login Button */}
          {hasOAuthClientId && (
            <button
              onClick={handleOAuthLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#24292f] hover:bg-[#2f363d] text-white text-xs font-bold rounded-xl transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              {L4(language, { ko: 'GitHub으로 로그인', en: 'Sign in with GitHub', ja: 'GitHub으로 ログイン', zh: 'GitHub으로 登录' })}
            </button>
          )}
          {hasOAuthClientId && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-text-tertiary font-mono uppercase">{L4(language, { ko: '또는 PAT 입력', en: 'or enter PAT', ja: '또는 PAT 入力', zh: '또는 PAT 输入' })}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
          <p className="text-xs text-text-tertiary">
            {L4(language, { ko: 'GitHub 접근 토큰(PAT)을 입력하면 원고를 비공개 저장소에 백업할 수 있습니다.', en: 'Enter a GitHub Personal Access Token (PAT) to back up manuscripts to a private repository.', ja: 'GitHub 접근 토큰(PAT)을 入力하면 原稿를 非公開 保存소에 백업할 수 있습니다.', zh: 'GitHub 접근 토큰(PAT)을 输入하면 稿件를 私密 保存소에 백업할 수 있습니다.' })}
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={L4(language, { ko: 'ghp_xxxx...', en: 'ghp_xxxx...', ja: 'ghp_xxxx...', zh: 'ghp_xxxx...' })}
              className="flex-1 bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-text-quaternary focus:border-green-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 font-mono"
              onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
            />
            <button
              onClick={handleConnect}
              disabled={connecting || !tokenInput.trim()}
              className="px-4 py-2.5 bg-green-600/80 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {connecting
                ? L4(language, { ko: '연결 중...', en: 'Connecting...', ja: 'Connecting...', zh: 'Connecting...' })
                : L4(language, { ko: '연결', en: 'Connect', ja: 'Connect', zh: 'Connect' })}
            </button>
          </div>

          {/* Repo selector after token is validated */}
          {gh.repos.length > 0 && !gh.connected && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                {L4(language, { ko: '저장소 선택', en: 'Select Repository', ja: '保存소 選択', zh: '保存소 选择' })}
              </label>
              <select
                onChange={(e) => handleSelectRepo(e.target.value)}
                defaultValue=""
                className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-text-primary focus:border-green-500 outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 cursor-pointer"
              >
                <option value="" disabled>
                  {L4(language, { ko: '저장소를 선택하세요...', en: 'Choose a repository...', ja: '保存소를 選択하세요...', zh: '保存소를 选择하세요...' })}
                </option>
                {gh.repos.map((r) => (
                  <option key={`${r.owner}/${r.name}`} value={`${r.owner}/${r.name}`}>
                    {r.owner}/{r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {gh.error && (
            <p className="text-xs text-red-400 px-2">{gh.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 3 — Google Drive Backup Section
// ============================================================

function GoogleDriveSection({ language }: { language: AppLanguage }) {
  const { user } = useAuth();
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = typeof window !== 'undefined' ? localStorage.getItem('noa_drive_last_sync') : null; } catch { /* private */ }
    if (stored) setLastSync(parseInt(stored));
  }, []);

  let hasToken = false;
  let encActive = false;
  try { hasToken = typeof window !== 'undefined' && !!localStorage.getItem('noa_drive_token'); } catch { /* private */ }
  try { encActive = typeof window !== 'undefined' && !!localStorage.getItem('noa_drive_enc'); } catch { /* private */ }

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      // Dispatch sync event for the main studio to handle
      window.dispatchEvent(new CustomEvent('noa:drive-sync-requested'));
      const now = Date.now();
      setLastSync(now);
      try { localStorage.setItem('noa_drive_last_sync', String(now)); } catch { /* quota/private */ }
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <Shield className="w-4 h-4 text-blue-500" />
        {L4(language, { ko: 'Google Drive 백업', en: 'Google Drive Backup', ja: 'Google Driveバックアップ', zh: 'Google Drive备份' })}
      </h3>
      <div className="space-y-3">
        {/* Connection status */}
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '연결 상태', en: 'Connection', ja: '接続状態', zh: '连接状态' })}</span>
          <span className={`text-xs font-black ${user && hasToken ? 'text-green-500' : 'text-text-tertiary'}`}>
            {user && hasToken
              ? L4(language, { ko: '연결됨', en: 'Connected', ja: '接続済み', zh: '已连接' })
              : L4(language, { ko: '미연결', en: 'Not Connected', ja: '未接続', zh: '未连接' })}
          </span>
        </div>
        {/* Last sync time */}
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '마지막 동기화', en: 'Last Sync', ja: '最終同期', zh: '上次同步' })}</span>
          <span className="text-xs font-black text-text-tertiary">
            {lastSync ? new Date(lastSync).toLocaleString() : L4(language, { ko: '없음', en: 'Never', ja: 'なし', zh: '从未' })}
          </span>
        </div>
        {/* Encryption status */}
        <div className="flex justify-between items-center bg-bg-secondary p-4 rounded-xl border border-border">
          <span className="text-xs text-text-secondary">{L4(language, { ko: '암호화', en: 'Encryption', ja: '暗号化', zh: '加密' })}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${encActive ? 'bg-green-500/15 text-green-500 border border-green-500/30' : 'bg-bg-tertiary text-text-tertiary'}`}>
            {encActive ? 'AES-GCM-256' : L4(language, { ko: '비활성', en: 'Off', ja: '無効', zh: '关闭' })}
          </span>
        </div>
        {/* Manual sync button */}
        <button
          onClick={handleManualSync}
          disabled={syncing || !user}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/10 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-600/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {syncing
            ? L4(language, { ko: '동기화 중...', en: 'Syncing...', ja: '同期中...', zh: '同步中...' })
            : L4(language, { ko: '지금 동기화', en: 'Sync Now', ja: '今すぐ同期', zh: '立即同步' })}
        </button>
      </div>
    </div>
  );
}

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
          className="w-full flex items-center justify-between px-6 py-4 bg-bg-secondary/50 border border-border rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all active:scale-[0.98]">
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
        className="w-full flex items-center justify-between px-6 py-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-all active:scale-[0.98] text-blue-400">
        🔑 {t('settings.googleSignIn')} <ChevronRight className="w-4 h-4" />
      </button>
      {error && (
        <p className="text-red-400 text-xs px-2">{error}</p>
      )}
    </div>
  );
}

export default SettingsView;
