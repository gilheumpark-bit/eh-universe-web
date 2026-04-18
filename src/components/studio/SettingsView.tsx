"use client";

// ============================================================
// PART 1 — Imports, Types, and Shell Props
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
  ChevronRight, ChevronDown, Zap, Bell, BookOpen, Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const WriterProfileCard = dynamic(() => import('@/components/studio/WriterProfileCard'), { ssr: false });
const ProvidersSection = dynamic(() => import('@/components/studio/settings/ProvidersSection'), { ssr: false });
const BackupsSection = dynamic(() => import('@/components/studio/settings/BackupsSection'), { ssr: false });
const AdvancedSection = dynamic(() => import('@/components/studio/settings/AdvancedSection'), { ssr: false });
const PluginsSection = dynamic(() => import('@/components/studio/settings/PluginsSection'), { ssr: false });

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

// ============================================================
// PART 2 — Main Shell: composes 5 accordion groups
// ============================================================

const SettingsView: React.FC<SettingsViewProps> = ({ language, hostedProviders = {}, onClearAll, onManageApiKey, versionedBackups, onRestoreBackup, onRefreshBackups }) => {
  const t = createT(language);
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
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-12 animate-in fade-in duration-500 pb-32">
      <div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">{t('settings.settingsAccount')}</h2>
        <p className="text-text-tertiary text-[10px] font-bold tracking-widest uppercase">System Control Center</p>
      </div>

      <div className="space-y-4">
        {/* Group 1: Account */}
        <details open className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden">
          <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
            <User className="w-4 h-4 text-accent-purple shrink-0" />
            <span className="text-sm font-black text-text-primary flex-1">
              {L4(language, { ko: '계정', en: 'Account', ja: 'アカウント', zh: '账户' })}
            </span>
            <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
          </summary>
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProfileCard language={language} />
            <div className="md:col-span-2 ds-card-lg">
              <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
                <User className="w-4 h-4 text-accent-purple" />
                {L4(language, { ko: '작가 프로파일', en: 'Writer Profile', ja: 'ライタープロフィール', zh: '作者档案' })}
              </h3>
              <WriterProfileCard language={language} />
            </div>
          </div>
        </details>

        {/* Group 2: AI Engine (extracted) */}
        <ProvidersSection language={language} />

        {/* Group 3: Notifications & Writer Settings */}
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

        {/* Group 4: Backups (extracted) */}
        <BackupsSection
          language={language}
          versionedBackups={versionedBackups}
          onRestoreBackup={onRestoreBackup}
          onRefreshBackups={onRefreshBackups}
        />

        {/* Group 5: Advanced (extracted) */}
        <AdvancedSection
          language={language}
          hostedProviders={hostedProviders}
          onManageApiKey={onManageApiKey}
        />

        {/* Group 6: Plugins (Marketplace entry point) */}
        <PluginsSection language={language} />

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
// PART 3 — Writer Settings Group (notifications + reset)
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
            <Shield className="w-4 h-4 text-blue-500" /> {L4(language, { ko: '작가 설정', en: 'Writer Settings', ja: '作家設定', zh: '作家设置' })}
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
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${notificationsOn ? 'bg-blue-600 justify-end' : 'bg-bg-tertiary justify-start'}`}>
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
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${shortcutsDisabled ? 'bg-bg-tertiary justify-start' : 'bg-blue-600 justify-end'}`}>
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
                    {L4(language, { ko: 'AI 선제 제안', en: 'AI Proactive Suggestions', ja: 'AI先制提案', zh: 'AI 主动建议' })}
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '작가가 쓰는 중 AI가 먼저 조언. 끄면 질문할 때만 응답 (Pull 모드).',
                      en: 'AI advises while writing. Off = respond only on demand (Pull mode).',
                      ja: '執筆中にAIが先に助言。オフで質問時のみ応答 (Pullモード)。',
                      zh: '写作时AI主动提示。关闭后仅响应询问 (Pull 模式)。',
                    })}
                  </div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${suggestionsDisabled ? 'bg-bg-tertiary justify-start' : 'bg-blue-600 justify-end'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={handleResetClick}
              className={`flex items-center justify-between gap-3 p-4 md:p-6 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border group active:scale-[0.98] ${confirmReset ? 'bg-red-500/20 border-red-500/50 animate-pulse' : 'hover:bg-red-500/10 border-transparent hover:border-red-500/30'}`}
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className={`p-2 md:p-3 rounded-2xl transition-colors shrink-0 ${confirmReset ? 'bg-red-500/30' : 'bg-bg-secondary group-hover:bg-red-500/20'}`}><Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-500" /></div>
                <div className="min-w-0">
                  {confirmReset ? (
                    <>
                      <div className="text-xs md:text-sm font-bold text-red-500 truncate">
                        {L4(language, { ko: `정말 삭제하시겠습니까? (${resetCountdown}초)`, en: `Are you sure? This cannot be undone. (${resetCountdown}s)`, ja: `本当に削除しますか？ (${resetCountdown}秒)`, zh: `确定要删除吗？ (${resetCountdown}秒)` })}
                      </div>
                      <div className="text-[13px] text-red-400 hidden sm:block">
                        {L4(language, { ko: '한 번 더 클릭하면 모든 데이터가 삭제됩니다', en: 'Click again to permanently delete all data', ja: 'もう一度クリックすると全データが削除されます', zh: '再次点击将永久删除所有数据' })}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs md:text-sm font-bold text-red-500 truncate">{t('settings.resetData')}</div>
                      <div className="text-[13px] text-text-tertiary hidden sm:block">{t('settings.resetDataDesc')}</div>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${confirmReset ? 'text-red-500' : 'text-text-tertiary group-hover:text-red-500'}`} />
            </div>
          </div>
        </div>
      </div>
    </details>
  );
}

// ============================================================
// PART 4 — Profile Card (Firebase Auth status + sign-in CTA)
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
          className="w-full flex items-center justify-between px-6 py-4 bg-bg-secondary/50 border border-border rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-[transform,background-color,border-color,color] active:scale-[0.98]">
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
        className="w-full flex items-center justify-between px-6 py-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-[transform,background-color,border-color,color] active:scale-[0.98] text-blue-400">
        🔑 {t('settings.googleSignIn')} <ChevronRight className="w-4 h-4" />
      </button>
      {error && (
        <p className="text-red-400 text-xs px-2">{error}</p>
      )}
    </div>
  );
}

export default SettingsView;
