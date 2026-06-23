"use client";

import Image from 'next/image';
import { type Dispatch, type KeyboardEvent, type MouseEvent, type SetStateAction, useEffect, useState } from 'react';
import { useUserRoleSafe } from '@/contexts/UserRoleContext';
import { useAuth } from '@/lib/AuthContext';
import { getBooleanFeatureFlagKeys, type BooleanFlagKey } from '@/lib/feature-flags';
import { AppLanguage } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { showAlert } from '@/lib/show-alert';
import { SettingCard, Toggle } from './SettingsView.controls';
import {
  Bell,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronRight,
  Code2,
  FlaskConical,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';

export function InternalToolsToggleSection({ language }: { language: AppLanguage }) {
  const ctx = useUserRoleSafe();
  const checked = ctx?.developerMode ?? false;

  return (
    <SettingCard
      icon={<Code2 className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '운영 진단 기능', en: 'Operational diagnostics', ja: '運用診断機能', zh: '运行诊断功能' })}
      description={L4(language, {
        ko: '공개 제품 표면에 노출하지 않는 실험·진단 기능',
        en: 'Experimental and diagnostic functions hidden from the public product surface',
        ja: '公開製品画面には表示しない実験・診断機能',
        zh: '不显示在公开产品界面的实验与诊断功能',
      })}
      onClick={ctx ? () => ctx.setDeveloperMode(!checked) : undefined}
    >
      {ctx ? (
        <Toggle checked={checked} onChange={ctx.setDeveloperMode} label="Operational diagnostics" />
      ) : (
        <span className="text-[10px] text-text-tertiary">N/A</span>
      )}
    </SettingCard>
  );
}

export function DeveloperModeToggle({ language }: { language: AppLanguage }) {
  const ctx = useUserRoleSafe();
  const checked = ctx?.developerMode ?? false;

  return (
    <SettingCard
      icon={<Settings className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '고급 진단 모드', en: 'Advanced diagnostics mode', ja: '高度診断モード', zh: '高级诊断模式' })}
      description={L4(language, {
        ko: '실험 메뉴와 문제 추적 패널 접근 권한',
        en: 'Access to experimental menus and issue-tracing panels',
        ja: '実験メニューとデバッグパネルへのアクセス',
        zh: '访问实验菜单与调试面板',
      })}
      onClick={ctx ? () => ctx.setDeveloperMode(!checked) : undefined}
    >
      {ctx ? (
        <Toggle checked={checked} onChange={ctx.setDeveloperMode} label="Advanced diagnostics mode" />
      ) : (
        <span className="text-[10px] text-text-tertiary">N/A</span>
      )}
    </SettingCard>
  );
}

const LOG_LEVEL_KEY = 'noa_log_level';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function activateOnKey(event: KeyboardEvent<HTMLDivElement>, action: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
}

export function DebugMenuSection({ language }: { language: AppLanguage }) {
  const [level, setLevel] = useState<LogLevel>('info');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LOG_LEVEL_KEY) as LogLevel | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        onChange={(event) => update(event.target.value as LogLevel)}
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

const KNOWN_FLAGS = getBooleanFeatureFlagKeys();
type KnownFlag = BooleanFlagKey;

export function FeatureFlagsSection({ language }: { language: AppLanguage }) {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverrides(next);
  }, []);

  const cycleOverride = (flag: KnownFlag) => {
    const current = overrides[flag] ?? null;
    const nextVal: 'true' | 'false' | null = current === null ? 'true' : current === 'true' ? 'false' : null;
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

interface WriterSettingsGroupProps {
  language: AppLanguage;
  notificationsOn: boolean;
  setNotificationsOn: Dispatch<SetStateAction<boolean>>;
  confirmReset: boolean;
  setConfirmReset: Dispatch<SetStateAction<boolean>>;
  resetCountdown: number;
  setResetCountdown: Dispatch<SetStateAction<number>>;
  onClearAll: () => void;
}

export function WriterSettingsGroup({
  language,
  notificationsOn,
  setNotificationsOn,
  confirmReset,
  setConfirmReset,
  resetCountdown,
  setResetCountdown,
  onClearAll,
}: WriterSettingsGroupProps) {
  const translator = createT(language);

  const shortcutsDisabled = typeof window !== 'undefined' && localStorage.getItem('noa_shortcuts_disabled') === '1';
  const suggestionsDisabled = typeof window !== 'undefined' && localStorage.getItem('noa_suggestions_disabled') === '1';

  const resetOnboarding = () => {
    try { localStorage.removeItem('noa_onboarding_done'); } catch (err) { logger.warn('SettingsView', 'remove noa_onboarding_done failed', err); }
    try { localStorage.removeItem('noa-onboarding-complete'); } catch (err) { logger.warn('SettingsView', 'remove noa-onboarding-complete failed', err); }
    try { localStorage.removeItem('noa-lg-onboarded'); } catch (err) { logger.warn('SettingsView', 'remove noa-lg-onboarded failed', err); }
    try { localStorage.removeItem('noa_shortcuts_hint_shown'); } catch (err) { logger.warn('SettingsView', 'remove noa_shortcuts_hint_shown failed', err); }
    window.dispatchEvent(new CustomEvent('loreguard:replay-onboarding'));
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

  const activateReset = () => {
    if (confirmReset) {
      onClearAll();
      setConfirmReset(false);
    } else {
      setResetCountdown(3);
      setConfirmReset(true);
    }
  };
  const handleResetClick = (event: MouseEvent) => {
    event.stopPropagation();
    activateReset();
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
              onClick={() => setNotificationsOn((prev) => !prev)}
              onKeyDown={(event) => activateOnKey(event, () => setNotificationsOn((prev) => !prev))}
              role="switch"
              aria-checked={notificationsOn}
              tabIndex={0}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-colors cursor-pointer border border-transparent hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0"><Bell className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" /></div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">{translator('settings.notifications')}</div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">{translator('settings.notificationsDesc')}</div>
                </div>
              </div>
              <div className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${notificationsOn ? 'bg-accent-blue justify-end' : 'bg-bg-tertiary justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1"></div>
              </div>
            </div>

            <div
              onClick={resetOnboarding}
              onKeyDown={(event) => activateOnKey(event, resetOnboarding)}
              role="button"
              tabIndex={0}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
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
              onKeyDown={(event) => activateOnKey(event, toggleShortcuts)}
              role="switch"
              aria-checked={!shortcutsDisabled}
              tabIndex={0}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
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
              onKeyDown={(event) => activateOnKey(event, toggleSuggestions)}
              role="switch"
              aria-checked={!suggestionsDisabled}
              tabIndex={0}
              className="flex items-center justify-between gap-3 p-4 md:p-6 hover:bg-bg-secondary/40 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border border-transparent hover:border-border active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="p-2 md:p-3 bg-bg-secondary rounded-2xl shrink-0">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-bold truncate">
                    {L4(language, { ko: '노아 선제 제안', en: 'Noa Proactive Suggestions', ja: 'ノア先制提案', zh: '诺亚主动建议' })}
                  </div>
                  <div className="text-[13px] text-text-tertiary hidden sm:block">
                    {L4(language, {
                      ko: '작가가 쓰는 중 노아가 먼저 조언. 끄면 질문할 때만 응답 (Pull 모드).',
                      en: 'Noa advises while writing. Off = respond only on demand (Pull mode).',
                      ja: '執筆中にノアが先に助言。オフで質問時のみ応答 (Pullモード)。',
                      zh: '写作时诺亚主动提示。关闭后仅响应询问 (Pull 模式)。',
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
              onKeyDown={(event) => activateOnKey(event, activateReset)}
              role="button"
              tabIndex={0}
              className={`flex items-center justify-between gap-3 p-4 md:p-6 rounded-3xl transition-[transform,background-color,border-color,color] cursor-pointer border group active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${confirmReset ? 'bg-accent-red/20 border-accent-red/50 animate-pulse' : 'hover:bg-accent-red/10 border-transparent hover:border-accent-red/30'}`}
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
                      <div className="text-xs md:text-sm font-bold text-accent-red truncate">{translator('settings.resetData')}</div>
                      <div className="text-[13px] text-text-tertiary hidden sm:block">{translator('settings.resetDataDesc')}</div>
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

export function ProfileCard({ language }: { language: AppLanguage }) {
  const translator = createT(language);
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
            <h3 className="font-black text-base md:text-lg">{user.displayName || translator('settings.writer')}</h3>
            <p className="text-text-tertiary text-xs">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-between px-6 py-4 bg-bg-secondary/50 border border-border rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-accent-red/50 hover:text-accent-red transition-[transform,background-color,border-color,color] active:scale-[0.98]"
        >
          {translator('settings.signOut')} <ChevronRight className="w-4 h-4" />
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
          <h3 className="font-black text-base md:text-lg">{translator('settings.guest')}</h3>
          <p className="text-text-tertiary text-xs">{translator('settings.guestDesc')}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!isConfigured) {
            showAlert(translator('settings.firebaseRequired'));
            return;
          }
          signInWithGoogle();
        }}
        className="w-full flex items-center justify-between px-6 py-4 bg-accent-blue/10 border border-accent-blue/30 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-accent-blue/20 transition-[transform,background-color,border-color,color] active:scale-[0.98] text-accent-blue"
      >
        {translator('settings.googleSignIn')} <ChevronRight className="w-4 h-4" />
      </button>
      {error && (
        <p className="text-accent-red text-xs px-2">{error}</p>
      )}
    </div>
  );
}
