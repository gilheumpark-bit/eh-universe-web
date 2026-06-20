"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useUserRoleSafe } from '@/contexts/UserRoleContext';
import { useUnifiedSettings } from '@/lib/UnifiedSettingsContext';
import { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { canInstall, isInstalled, showInstallPrompt, onInstallStateChange } from '@/lib/web-features/pwa-install';
import { ChevronDown, Eye, Languages, MonitorDown, Moon, Sparkles, Sun, Type } from 'lucide-react';

interface AccordionGroupProps {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AccordionGroup({ icon, title, defaultOpen, children }: AccordionGroupProps) {
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
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export function SettingCard({ icon, title, description, children, onClick, danger }: SettingCardProps) {
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

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => { event.stopPropagation(); onChange(!checked); }}
      className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
        checked ? 'bg-accent-blue justify-end' : 'bg-bg-tertiary justify-start'
      }`}
    >
      <span className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1" />
    </button>
  );
}

export function InstallAppSection({ language }: { language: AppLanguage }) {
  const [state, setState] = useState<'unavailable' | 'installable' | 'installed'>(() =>
    isInstalled() ? 'installed' : canInstall() ? 'installable' : 'unavailable',
  );
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null);

  useEffect(() => {
    const compute = () =>
      setState(isInstalled() ? 'installed' : canInstall() ? 'installable' : 'unavailable');
    const onBip = () => compute();
    window.addEventListener('beforeinstallprompt', onBip);
    const offChange = onInstallStateChange((installed) =>
      setState(installed ? 'installed' : canInstall() ? 'installable' : 'unavailable'),
    );
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      offChange();
    };
  }, []);

  if (state === 'unavailable' && !outcome) return null;

  return (
    <AccordionGroup
      icon={<MonitorDown className="w-4 h-4 text-accent-green shrink-0" />}
      title={L4(language, { ko: '앱 설치', en: 'Install App', ja: 'アプリのインストール', zh: '安装应用' })}
    >
      <SettingCard
        icon={<MonitorDown className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
        title={
          state === 'installed'
            ? L4(language, { ko: '설치됨 — 앱 모드 실행 중', en: 'Installed — running in app mode', ja: 'インストール済み — アプリモードで実行中', zh: '已安装 — 正以应用模式运行' })
            : L4(language, { ko: '로어가드를 앱으로 설치 (PWA)', en: 'Install Loreguard as an app (PWA)', ja: 'ロアガードをアプリとしてインストール (PWA)', zh: '将 Loreguard 安装为应用 (PWA)' })
        }
        description={
          state === 'installed'
            ? undefined
            : L4(language, { ko: '브라우저의 설치 프롬프트를 띄웁니다 — 강제 설치 없음', en: 'Opens the browser install prompt — never forced', ja: 'ブラウザのインストールプロンプトを表示 — 強制なし', zh: '弹出浏览器安装提示 — 不强制' })
        }
      >
        {state === 'installable' && (
          <button
            type="button"
            onClick={() => {
              void showInstallPrompt().then((result) => {
                if (result !== 'unavailable') setOutcome(result);
                setState(isInstalled() ? 'installed' : canInstall() ? 'installable' : 'unavailable');
              });
            }}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-accent-blue text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            {L4(language, { ko: '설치', en: 'Install', ja: 'インストール', zh: '安装' })}
          </button>
        )}
      </SettingCard>
      {outcome && state !== 'installed' && (
        <p className="text-[12px] text-text-tertiary px-1" role="status">
          {outcome === 'accepted'
            ? L4(language, { ko: '설치를 수락했습니다 — 브라우저가 설치를 마무리합니다.', en: 'Install accepted — the browser is finishing the installation.', ja: 'インストールを承認しました — ブラウザが処理を完了します。', zh: '已接受安装 — 浏览器正在完成安装。' })
            : L4(language, { ko: '설치 프롬프트를 닫았습니다 — 언제든 다시 시도할 수 있습니다.', en: 'Install prompt dismissed — you can try again anytime.', ja: 'プロンプトを閉じました — いつでも再試行できます。', zh: '已关闭安装提示 — 可随时重试。' })}
        </p>
      )}
    </AccordionGroup>
  );
}

export function ThemeSection({ language }: { language: AppLanguage }) {
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

export function LanguageSection({ language }: { language: AppLanguage }) {
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

export function FontSizeSection({ language }: { language: AppLanguage }) {
  const [size, setSize] = useState<number>(FONT_SIZE_DEFAULT);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(FONT_SIZE_KEY);
      const parsed = raw ? Number.parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= FONT_SIZE_MIN && parsed <= FONT_SIZE_MAX) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
          onChange={(event) => update(Number.parseInt(event.target.value, 10))}
          className="w-32 accent-accent-blue"
          aria-label={L4(language, { ko: '폰트 크기 슬라이더', en: 'Font size slider', ja: 'フォントサイズスライダー', zh: '字体大小滑块' })}
        />
        <span className="text-[11px] font-bold text-text-tertiary tabular-nums w-8 text-right">{size}px</span>
      </div>
    </SettingCard>
  );
}

export function AdvancedWritingModeToggle({ language }: { language: AppLanguage }) {
  const ctx = useUserRoleSafe();
  const checked = ctx?.advancedWritingMode ?? false;

  return (
    <SettingCard
      icon={<Sparkles className="w-4 h-4 md:w-5 md:h-5 text-text-tertiary" />}
      title={L4(language, { ko: '고급 집필 모드', en: 'Advanced Writing Mode', ja: '高度執筆モード', zh: '高级写作模式' })}
      description={L4(language, {
        ko: '노아 제안 / 수동 편집 / 3단계 캔버스 / 30% 다듬기 / 고급 — 5모드 활성화',
        en: 'Noa suggestions / Manual / 3-step Canvas / 30% refine / Advanced — enable 5 modes',
        ja: 'Noa提案・手動編集・3段階キャンバス・30%リファイン・高度 — 5モード有効化',
        zh: 'Noa 建议 / 手动编辑 / 3阶段画布 / 30%精修 / 高级 — 启用5种模式',
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
