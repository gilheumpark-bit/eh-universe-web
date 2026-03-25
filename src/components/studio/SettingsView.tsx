"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AppLanguage } from '@/lib/studio-types';
import { ENGINE_VERSION } from '@/lib/studio-constants';
import { createT } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import {
  User, Shield, Cpu, Trash2,
  ChevronRight, Zap, Bell, Key, Monitor, Smartphone, Hash, Thermometer
} from 'lucide-react';
import { getActiveProvider, getActiveModel, getApiKey, setApiKey, PROVIDERS, PROVIDER_LIST } from '@/lib/ai-providers';
import { getStorageUsageBytes } from '@/lib/project-migration';

interface SettingsViewProps {
  language: AppLanguage;
  hostedProviders?: Partial<Record<string, boolean>>;
  onClearAll: () => void;
  onManageApiKey: () => void;
}

// Engine settings labels are now in TRANSLATIONS.settingsEngine

const OBFUSCATION_PREFIXES = ['noa:1:', 'noa:2:'];

function migrateAllKeysToObfuscated(): number {
  let migrated = 0;
  for (const provider of PROVIDER_LIST) {
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

const SettingsView: React.FC<SettingsViewProps> = ({ language, hostedProviders = {}, onClearAll, onManageApiKey }) => {
  const t = createT(language);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [obfuscateDone, setObfuscateDone] = useState<number | null>(null);
  const [defaultPlatform, setDefaultPlatform] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem('noa_default_platform') : null) || 'MOBILE');
  const [defaultEpisodes, setDefaultEpisodes] = useState<number>(() => parseInt((typeof window !== 'undefined' ? localStorage.getItem('noa_default_episodes') : null) || '25'));
  const [temperature, setTemperature] = useState<number>(() => parseFloat((typeof window !== 'undefined' ? localStorage.getItem('noa_temperature') : null) || '0.9'));

  const activeProvider = typeof window !== 'undefined' ? getActiveProvider() : 'gemini';
  const activeModel = typeof window !== 'undefined' ? getActiveModel() : '';
  const providerName = PROVIDERS[activeProvider]?.name ?? activeProvider;

  const [apiKeyStatus, setApiKeyStatus] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return !!getApiKey(activeProvider) || !!hostedProviders[activeProvider];
  });

  const checkApiKeys = useCallback(() => {
    const currentProvider = getActiveProvider();
    setApiKeyStatus(!!getApiKey(currentProvider) || !!hostedProviders[currentProvider]);
  }, [hostedProviders]);

  useEffect(() => {
    window.addEventListener('storage', checkApiKeys);
    return () => window.removeEventListener('storage', checkApiKeys);
  }, [checkApiKeys]);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-32">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t('settings.settingsAccount')}</h2>
        <p className="text-zinc-600 text-[10px] font-bold tracking-widest uppercase">System Control Center</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Profile Card */}
        <ProfileCard language={language} />

        {/* Engine Status Card */}
        <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-500" /> Narrative Engine
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">{t('settings.engineVersion')}</span>
              <span className="text-xs font-black text-blue-400">ANS {ENGINE_VERSION}</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">{t('settings.aiModel')}</span>
              <span className="text-xs font-black text-white">{providerName} — {activeModel}</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="text-xs text-zinc-400">{t('settings.latency')}</span>
              <span className="text-xs font-black text-green-500">OPTIMAL</span>
            </div>
            <div className="bg-black/40 p-4 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400">{language === 'KO' ? '로컬 저장 용량' : 'Local Storage'}</span>
                <span className={`text-xs font-black ${(() => { const mb = getStorageUsageBytes() / 1024 / 1024; return mb > 4 ? 'text-red-400' : mb > 2 ? 'text-yellow-400' : 'text-green-500'; })()}`}>
                  {(getStorageUsageBytes() / 1024 / 1024).toFixed(1)} MB / 5 MB
                </span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${(() => { const pct = (getStorageUsageBytes() / (5 * 1024 * 1024)) * 100; return pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500'; })()}`}
                  style={{ width: `${Math.min(100, (getStorageUsageBytes() / (5 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
              {getStorageUsageBytes() > 4 * 1024 * 1024 && (
                <p className="text-[10px] text-red-400">{language === 'KO' ? '용량이 부족합니다. 오래된 세션을 삭제하거나 백업 후 정리하세요.' : 'Storage nearly full. Delete old sessions or export a backup.'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" /> {t('settings.generalPreferences')}
          </h3>

          <div className="space-y-2">
            <div
              onClick={onManageApiKey}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-zinc-900/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Key className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{t('settings.apiKeyManagement')}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{t('settings.apiKeyDesc')}</div>
                </div>
              </div>
              <div className="text-[10px] font-black text-blue-500 uppercase shrink-0 ml-2">
                {apiKeyStatus ? t('settings.apiKeySet') : t('settings.apiKeyNotSet')}
              </div>
            </div>

            <div
              onClick={() => {
                const count = migrateAllKeysToObfuscated();
                setObfuscateDone(count);
                setTimeout(() => setObfuscateDone(null), 3000);
              }}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-zinc-900/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-zinc-800 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Shield className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">
                    {language === 'KO' ? '저장된 키 암호화' : 'Encrypt Saved Keys'}
                  </div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">
                    {language === 'KO'
                      ? '평문으로 저장된 API 키를 난독화 포맷으로 재저장합니다'
                      : 'Re-saves any plain-text API keys in obfuscated format'}
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-black uppercase shrink-0 ml-2">
                {obfuscateDone === null ? (
                  <span className="text-zinc-600">RUN</span>
                ) : obfuscateDone === 0 ? (
                  <span className="text-green-500">ALL SECURE</span>
                ) : (
                  <span className="text-blue-400">{obfuscateDone} MIGRATED</span>
                )}
              </div>
            </div>

            <div
              onClick={() => setNotificationsOn(prev => !prev)}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-zinc-900/40 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Bell className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{t('settings.notifications')}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{t('settings.notificationsDesc')}</div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${notificationsOn ? 'bg-blue-600 justify-end' : 'bg-zinc-700 justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={(e) => { e.stopPropagation(); onClearAll(); }}
              className="flex items-center justify-between p-4 md:p-6 hover:bg-red-500/10 rounded-3xl transition-all cursor-pointer border border-transparent hover:border-red-500/30 group active:scale-[0.98] active:bg-red-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl group-hover:bg-red-500/20 transition-colors"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <div>
                  <div className="text-sm font-bold text-red-500">{t('settings.resetData')}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{t('settings.resetDataDesc')}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-red-500" />
            </div>
          </div>
        </div>

        {/* Engine Settings */}
        <div className="md:col-span-2 bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10">
          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-8 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" /> {t('settingsEngine.engineSettings')}
          </h3>
          <div className="space-y-2">
            {/* Default Platform */}
            <div className="flex items-center justify-between p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl">
                  {defaultPlatform === 'MOBILE' ? <Smartphone className="w-5 h-5 text-zinc-500" /> : <Monitor className="w-5 h-5 text-zinc-500" />}
                </div>
                <div>
                  <div className="text-sm font-bold">{t('settingsEngine.defaultPlatform')}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{t('settingsEngine.defaultPlatformDesc')}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {(['MOBILE', 'WEB'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setDefaultPlatform(p); localStorage.setItem('noa_default_platform', p); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${defaultPlatform === p ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:text-white'}`}
                  >
                    {p === 'MOBILE' ? t('settingsEngine.mobile') : t('settingsEngine.web')}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Episodes */}
            <div className="flex items-center justify-between p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Hash className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{t('settingsEngine.defaultEpisodes')}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{t('settingsEngine.defaultEpisodesDesc')}</div>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={200}
                value={defaultEpisodes}
                onChange={e => { const v = parseInt(e.target.value) || 25; setDefaultEpisodes(v); localStorage.setItem('noa_default_episodes', String(v)); }}
                className="w-20 bg-black/50 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-black text-center text-blue-400 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Temperature */}
            <div className="flex items-center justify-between p-4 md:p-6 rounded-3xl border border-transparent">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-2xl"><Thermometer className="w-5 h-5 text-zinc-500" /></div>
                <div>
                  <div className="text-sm font-bold">{t('settingsEngine.temperature')}</div>
                  <div className="text-[11px] text-zinc-500 hidden sm:block">{t('settingsEngine.temperatureDesc')}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={e => { const v = parseFloat(e.target.value); setTemperature(v); localStorage.setItem('noa_temperature', String(v)); }}
                  className="w-24 accent-blue-600 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer"
                />
                <span className="text-sm font-black text-blue-400 w-8 text-right">{temperature.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="md:col-span-2 flex flex-col gap-4 md:flex-row justify-between items-center px-2 md:px-10">
          <div className="flex items-center gap-4">
            <Zap className="w-4 h-4 text-zinc-800" />
            <span className="text-[9px] font-black text-zinc-800 uppercase tracking-widest">Version {ENGINE_VERSION}-NEXUS</span>
          </div>
          <div className="flex gap-6 text-[9px] font-black text-zinc-700 uppercase tracking-widest">
            <button className="hover:text-zinc-500 transition-colors">Privacy</button>
            <button className="hover:text-zinc-500 transition-colors">Terms</button>
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
      <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl overflow-hidden shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
            {user.photoURL ? (
              <Image src={user.photoURL} alt="" width={64} height={64} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl font-black">{user.displayName?.[0] || '?'}</span>
            )}
          </div>
          <div>
            <h3 className="font-black text-base md:text-lg">{user.displayName || t('settings.writer')}</h3>
            <p className="text-zinc-500 text-xs">{user.email}</p>
          </div>
        </div>
        <button onClick={signOut}
          className="w-full flex items-center justify-between px-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all active:scale-[0.98]">
          {t('settings.signOut')} <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/20 border border-zinc-800 rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0">
          <User className="w-6 h-6 md:w-8 md:h-8 text-zinc-500" />
        </div>
        <div>
          <h3 className="font-black text-base md:text-lg">{t('settings.guest')}</h3>
          <p className="text-zinc-600 text-xs">{t('settings.guestDesc')}</p>
        </div>
      </div>
      <button onClick={() => {
        if (!isConfigured) {
          alert(t('settings.firebaseRequired'));
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
