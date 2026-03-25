import React, { useState } from 'react';
import { Eraser, Sparkles, Command, MapPin, User, Bookmark } from 'lucide-react';
import { StoryConfig, AppLanguage } from '@/lib/studio-types';
import { TRANSLATIONS } from '@/lib/studio-translations';

interface InputAreaProps {
  language: AppLanguage;
  onGenerate: (config: StoryConfig, draft: string) => void;
  disabled: boolean;
  config: StoryConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoryConfig>>;
}

const InputArea: React.FC<InputAreaProps> = ({ language, onGenerate, disabled, config, setConfig }) => {
  const [draft, setDraft] = useState('');
  const t = TRANSLATIONS[language].writing;
  const canSubmit = !disabled && !!draft.trim();
  const fieldShellClass = 'group flex items-center gap-3 bg-[rgba(255,255,255,0.02)] px-4 py-4 transition-colors hover:bg-[rgba(255,255,255,0.04)]';
  const fieldInputClass = 'w-full bg-transparent text-sm font-medium text-text-primary placeholder:text-text-tertiary outline-none transition-colors group-hover:text-white';

  const handleSubmit = () => {
    if (!canSubmit) return;
    onGenerate(config, draft);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한국어 IME 조합 중에는 Enter 무시 (isComposing 또는 keyCode 229)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (!disabled && !e.repeat) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="premium-panel pointer-events-auto w-full overflow-hidden rounded-[2rem] border-white/8 shadow-[0_28px_80px_rgba(0,0,0,0.36)] lg:rounded-[2.5rem]">
      <div className="grid gap-px border-b border-white/8 bg-white/[0.05] md:grid-cols-3">
        <label className={fieldShellClass}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(92,143,214,0.2)] bg-[rgba(92,143,214,0.1)] text-[rgba(216,230,255,0.82)]">
            <User className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="site-kicker block text-[0.56rem]">{t.pov}</span>
            <input
              className={fieldInputClass}
              placeholder={t.pov}
              aria-label={t.pov}
              value={config.povCharacter}
              onChange={e => setConfig({ ...config, povCharacter: e.target.value })}
            />
          </span>
        </label>

        <label className={fieldShellClass}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(92,143,214,0.2)] bg-[rgba(92,143,214,0.1)] text-[rgba(216,230,255,0.82)]">
            <MapPin className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="site-kicker block text-[0.56rem]">{t.loc}</span>
            <input
              className={fieldInputClass}
              placeholder={t.loc}
              aria-label={t.loc}
              value={config.setting}
              onChange={e => setConfig({ ...config, setting: e.target.value })}
            />
          </span>
        </label>

        <label className={fieldShellClass}>
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(92,143,214,0.2)] bg-[rgba(92,143,214,0.1)] text-[rgba(216,230,255,0.82)]">
            <Bookmark className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="site-kicker block text-[0.56rem]">{t.epTitle}</span>
            <input
              className={fieldInputClass}
              placeholder={t.epTitle}
              aria-label={t.epTitle}
              value={config.title}
              onChange={e => setConfig({ ...config, title: e.target.value })}
            />
          </span>
        </label>
      </div>

      <div className="relative bg-[radial-gradient(circle_at_top_left,rgba(92,143,214,0.08),transparent_22%),linear-gradient(180deg,rgba(9,12,18,0.35),rgba(7,9,13,0.02))]">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t.inputPlaceholder}
          aria-label={t.inputPlaceholder}
          className="min-h-[130px] max-h-[360px] w-full resize-none scrollbar-hide bg-transparent px-6 py-6 font-serif text-[1.02rem] leading-8 text-text-primary placeholder:text-text-tertiary outline-none disabled:opacity-30 lg:min-h-[190px] lg:px-7 lg:py-7 lg:text-[1.08rem]"
        />

        <div className="flex flex-col gap-4 border-t border-white/8 bg-[rgba(8,12,18,0.7)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5">
              <Command className="h-3 w-3 text-text-tertiary" />
              <span className="font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">CMD + ENTER</span>
            </div>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
              {disabled ? t.architecting : t.ready}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
              {draft.trim().length} chars
            </span>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <button
              onClick={() => setDraft('')}
              aria-label="Clear draft"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary transition-all hover:-translate-y-0.5 hover:border-accent-red/30 hover:text-accent-red sm:px-5"
            >
              <Eraser className="h-4 w-4" />
              Clear
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`flex min-w-[220px] flex-1 items-center justify-center gap-3 rounded-2xl px-9 py-4 font-[family-name:var(--font-mono)] text-[11px] font-semibold uppercase tracking-[0.18em] transition-all lg:flex-none ${
                canSubmit
                  ? 'border border-[rgba(202,161,92,0.38)] bg-[linear-gradient(135deg,rgba(202,161,92,0.28),rgba(202,161,92,0.12))] text-text-primary shadow-[0_20px_45px_rgba(0,0,0,0.24)] hover:-translate-y-0.5'
                  : 'cursor-not-allowed border border-white/8 bg-white/[0.04] text-text-tertiary'
              }`}
            >
              {disabled && draft.trim() ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-tertiary border-t-text-primary"></div>
              ) : (
                <Sparkles className={`h-4 w-4 ${canSubmit ? 'text-[rgba(246,226,188,0.9)]' : 'text-text-tertiary'}`} />
              )}
              {disabled ? 'SYNC' : t.execute}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;
