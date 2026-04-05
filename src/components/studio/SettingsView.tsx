"use client";

import { showAlert } from '@/lib/show-alert';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AppLanguage } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import {
  User, Shield, Cpu, Trash2,
  ChevronRight, Zap, Bell, Key, Monitor, Smartphone, Hash, Thermometer, BookOpen
} from 'lucide-react';
import { getActiveProvider, getActiveModel, setApiKey, PROVIDERS, PROVIDER_LIST_UI, isKeyExpiringSoon, getKeyAge, hasStoredApiKey } from '@/lib/ai-providers';
import { getStorageUsageBytes } from '@/lib/project-migration';
import { idbEstimateSize } from '@/lib/browser/idb-store';
import { setNarrativeDepth as narrativeDepthSetter, _getNarrativeDepth } from '@/lib/noa/lora-swap';

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

function migrateAllKeysToObfuscated(): number {
  let migrated = 0;
  for (const provider of PROVIDER_LIST_UI) {
    const raw = localStorage.getItem(provider.storageKey);
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
  const [obfuscateDone, setObfuscateDone] = useState<number | null>(null);
  const [defaultPlatform, setDefaultPlatform] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('noa_default_platform') : null) || 'MOBILE');
  const [defaultEpisodes, setDefaultEpisodes] = useState<number>(() => parseInt((typeof window !== 'undefined' ? localStorage.getItem('noa_default_episodes') : null) || '25'));
  const [temperature, setTemperature] = useState<number>(() => parseFloat((typeof window !== 'undefined' ? localStorage.getItem('noa_temperature') : null) || '0.9'));
  const [narrativeDepth, setNarrativeDepthState] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    const stored = localStorage.getItem('noa_narrative_depth');
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
            <Cpu className="w-4 h-4 text-blue-500" /> Narrative Engine
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.engineVersion')}</span>
              <span className="text-xs font-black text-blue-400">ANS {ENGINE_VERSION}</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.aiModel')}</span>
              <span className="text-xs font-black text-white">{providerName} — {activeModel}</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-border">
              <span className="text-xs text-text-secondary">{t('settings.latency')}</span>
              <span className="text-xs font-black text-green-500">OPTIMAL</span>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-border space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-secondary">{language === 'KO' ? '로컬 저장 용량' : 'Local Storage'}</span>
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
                <p className="text-[10px] text-red-400">{language === 'KO' ? '용량이 부족합니다. 오래된 세션을 삭제하거나 백업 후 정리하세요.' : 'Storage nearly full. Delete old sessions or export a backup.'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="md:col-span-2 ds-card-lg">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" /> {t('settings.generalPreferences')}
          </h3>

          <div className="space-y-2">
            <div
              data-testid="settings-api-key-row"
              onClick={onManageApiKey}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Key className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settings.apiKeyManagement')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settings.apiKeyDesc')}</div>
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
                    {language === 'KO'
                      ? `키 갱신 권장 (${getKeyAge(apiProvider)}일)`
                      : `Rotate key (${getKeyAge(apiProvider)}d old)`}
                  </div>
                )}
              </div>
            </div>

            <div
              onClick={() => {
                const count = migrateAllKeysToObfuscated();
                setObfuscateDone(count);
                setTimeout(() => setObfuscateDone(null), 3000);
              }}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-border active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Shield className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">
                    {language === 'KO' ? '저장된 키 암호화' : 'Encrypt Saved Keys'}
                  </div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">
                    {language === 'KO'
                      ? '평문으로 저장된 API 키를 난독화 포맷으로 재저장합니다'
                      : 'Re-saves any plain-text API keys in obfuscated format'}
                  </div>
                </div>
              </div>
              <div className="text-[9px] md:text-[10px] font-black uppercase shrink-0">
                {obfuscateDone === null ? (
                  <span className="text-text-tertiary">RUN</span>
                ) : obfuscateDone === 0 ? (
                  <span className="text-green-500">ALL SECURE</span>
                ) : (
                  <span className="text-blue-400">{obfuscateDone} MIGRATED</span>
                )}
              </div>
            </div>

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
              onClick={(e) => { e.stopPropagation(); onClearAll(); }}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-red-500/10 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-red-500/30 group active:scale-[0.98] active:bg-red-500/20"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl group-hover:bg-red-500/20 transition-colors shrink-0"><Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-500" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold text-red-500 truncate">{t('settings.resetData')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settings.resetDataDesc')}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-tertiary group-hover:text-red-500 shrink-0" />
            </div>
          </div>
        </div>

        {/* Versioned Backup Section */}
        {versionedBackups && onRestoreBackup && (
          <div className="md:col-span-2 ds-card-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" /> {language === 'KO' ? '자동 백업 (10분 간격)' : 'Auto Backup (every 10 min)'}
              </h3>
              {onRefreshBackups && (
                <button onClick={onRefreshBackups} className="text-[10px] text-text-tertiary hover:text-text-primary font-mono uppercase tracking-wider transition-colors" title={language === 'KO' ? '목록 새로고침' : 'Refresh list'}>
                  {language === 'KO' ? '새로고침' : 'Refresh'}
                </button>
              )}
            </div>
            {versionedBackups.length === 0 ? (
              <div className="text-sm text-text-tertiary py-4 text-center">
                {language === 'KO' ? '저장된 백업이 없습니다. 10분 후 자동 백업됩니다.' : 'No backups yet. Auto-backup runs every 10 minutes.'}
              </div>
            ) : (
              <div className="space-y-2">
                {versionedBackups.map((b) => (
                  <div key={b.timestamp} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-border">
                    <div>
                      <div className="text-xs font-bold text-text-primary">{new Date(b.timestamp).toLocaleString()}</div>
                      <div className="text-[10px] text-text-tertiary font-mono">
                        {language === 'KO' ? '자동 백업' : 'Auto backup'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await onRestoreBackup(b.timestamp);
                        if (ok) {
                          showAlert(language === 'KO' ? '백업에서 복원되었습니다.' : 'Restored from backup.');
                        } else {
                          showAlert(language === 'KO' ? '복원에 실패했습니다.' : 'Restore failed.');
                        }
                      }}
                      className="text-[10px] font-bold font-mono uppercase tracking-wider text-blue-400 hover:text-blue-300 transition-colors px-3 py-1.5 border border-blue-500/30 rounded-lg hover:bg-blue-500/10"
                      title={language === 'KO' ? '이 백업으로 복원' : 'Restore from this backup'}
                    >
                      {language === 'KO' ? '복원' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Engine Settings */}
        <div className="md:col-span-2 ds-card-lg">
          <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-8 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> {t('settingsEngine.engineSettings')}
          </h3>
          <div className="space-y-2">
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
                    onClick={() => { setDefaultPlatform(p); localStorage.setItem('noa_default_platform', p); }}
                    className={`px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${defaultPlatform === p ? 'bg-blue-600 text-white' : 'bg-bg-secondary text-text-tertiary hover:text-white'}`}
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
                onChange={e => { const v = parseInt(e.target.value) || 25; setDefaultEpisodes(v); localStorage.setItem('noa_default_episodes', String(v)); }}
                className="w-16 md:w-20 bg-black/50 border border-border rounded-xl px-2 md:px-3 py-2 text-xs md:text-sm font-black text-center text-blue-400 focus:border-blue-500 outline-none shrink-0"
              />
            </div>

            {/* Temperature */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Thermometer className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{t('settingsEngine.temperature')}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">{t('settingsEngine.temperatureDesc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={e => { const v = parseFloat(e.target.value); setTemperature(v); localStorage.setItem('noa_temperature', String(v)); }}
                  className="w-20 md:w-24 accent-blue-600 h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className="text-xs md:text-sm font-black text-blue-400 w-7 md:w-8 text-right">{temperature.toFixed(1)}</span>
              </div>
            </div>

            {/* Narrative Depth Slider */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-accent-purple shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{language === 'KO' ? '서사 깊이' : 'Narrative Depth'}</div>
                  <div className="text-[10px] md:text-[11px] text-text-tertiary hidden sm:block">
                    {narrativeDepth <= 0.9 ? (language === 'KO' ? '평작 — 가독성 우선' : 'Light — Readability first') :
                     narrativeDepth <= 1.0 ? (language === 'KO' ? '기본 — 장르 균형' : 'Standard — Genre balance') :
                     narrativeDepth <= 1.2 ? (language === 'KO' ? '심화 — 비유/상징 활용' : 'Deep — Metaphor/symbolism') :
                     (language === 'KO' ? '최대 — 문예 수준 밀도' : 'Maximum — Literary density')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <input
                  type="range"
                  min="0.9"
                  max="1.5"
                  step="0.1"
                  value={narrativeDepth}
                  onChange={e => { const v = parseFloat(e.target.value); setNarrativeDepthState(v); localStorage.setItem('noa_narrative_depth', String(v)); narrativeDepthSetter(v); }}
                  className="w-20 md:w-24 accent-purple-500 h-1.5 bg-bg-tertiary rounded-full appearance-none cursor-pointer"
                />
                <span className="text-xs md:text-sm font-black text-accent-purple w-7 md:w-8 text-right">{narrativeDepth.toFixed(1)}</span>
              </div>
            </div>

          </div>
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
              <span className="text-white text-xl font-black">{user.displayName?.[0] || '?'}</span>
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
