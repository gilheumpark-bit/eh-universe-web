import React, { useRef, type ChangeEvent } from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { useLang } from '@/lib/LangContext';
import { PROVIDERS } from '@/lib/translator-constants';
import {
  Sparkles,
  Zap,
  Brain,
  Globe,
  Settings2,
  ShieldCheck,
  ChevronRight,
  Save,
  Download,
  Upload,
  Cloud,
  Key,
} from 'lucide-react';

export function TranslationActionDock() {
  const { lang } = useLang();
  const importRef = useRef<HTMLInputElement>(null);
  const { setActiveLeftPanel } = useTranslatorLayout();
  const {
    loading,
    statusMsg,
    provider,
    setProvider,
    translate,
    deepTranslate,
    activeChapter,
    autoSaveLabel,
    cloudSyncEnabled,
    cloudSyncStatus,
    cloudSyncDetail,
    exportData,
    importData,
    authUser,
    isAuthLoaded,
    openApiKeyModal,
  } = useTranslator();

  const stage = activeChapter?.stageProgress ?? 0;
  const stageLabel = loading ? `${Math.min(stage, 5)}/5` : '—/5';

  return (
    <div className="flex flex-col gap-4 p-4">
      {loading ? (
        <div className="flex items-center justify-between rounded-lg border border-accent-indigo/20 bg-accent-indigo/10 p-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-ping rounded-full bg-accent-indigo" />
            <span className="font-mono text-xs uppercase tracking-wider text-accent-indigo">
              {statusMsg || (lang === 'ko' ? '처리 중…' : 'Working…')}
            </span>
          </div>
          <span className="text-xs text-text-tertiary">{stageLabel}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#111113] p-3 font-mono text-xs uppercase tracking-wider text-text-tertiary">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          {lang === 'ko' ? '대기' : 'Ready'}
        </div>
      )}

      <div className="rounded-lg border border-white/8 bg-[#0d0d10] p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          <Save className="h-3 w-3 text-emerald-400/80" />
          {lang === 'ko' ? '저장' : 'Save'}
        </div>
        <p className="text-[11px] text-text-secondary leading-snug break-words">{autoSaveLabel}</p>
        <div className="flex items-start gap-2 text-[10px] text-text-tertiary">
          <Cloud className="h-3 w-3 shrink-0 mt-0.5 text-sky-400/70" />
          <span className="leading-snug">
            {cloudSyncEnabled
              ? isAuthLoaded && authUser
                ? lang === 'ko'
                  ? `클라우드: ${cloudSyncStatus === 'saving' ? '저장 중' : cloudSyncStatus === 'ok' ? '동기화됨' : cloudSyncStatus === 'error' ? '오류' : '대기'}${cloudSyncDetail ? ` · ${cloudSyncDetail}` : ''}`
                  : `Cloud: ${cloudSyncStatus}${cloudSyncDetail ? ` · ${cloudSyncDetail}` : ''}`
                : lang === 'ko'
                  ? '클라우드: 로그인하면 자동 업로드됩니다.'
                  : 'Cloud: sign in to enable upload.'
              : lang === 'ko'
                ? '클라우드: Supabase 미설정 또는 미로그인'
                : 'Cloud: Supabase or sign-in not active'}
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => void exportData()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-black/40 py-1.5 text-[10px] text-text-secondary hover:bg-white/10"
          >
            <Download className="h-3 w-3" />
            JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => importData(e)}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-black/40 py-1.5 text-[10px] text-text-secondary hover:bg-white/10"
          >
            <Upload className="h-3 w-3" />
            {lang === 'ko' ? '불러오기' : 'Import'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          {lang === 'ko' ? '엔진 선택' : 'Primary engine'}
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-[#111113] p-2 text-sm text-text-secondary outline-none transition-colors hover:bg-[#151518] focus:border-accent-green/50"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="my-2 h-px w-full bg-white/5" />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void translate()}
          disabled={loading}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-white/10 bg-linear-to-r from-[#1A1A1D] to-[#111113] py-3 pl-4 pr-4 transition-all hover:border-accent-green/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-accent-green/5 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-md bg-accent-green/10 p-1.5">
              <Zap className="h-4 w-4 text-accent-green" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-text-primary">
                {lang === 'ko' ? '빠른 번역' : 'Fast draft'}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {lang === 'ko' ? '단일 패스 번역' : 'Single-pass translation'}
              </span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1 group-hover:text-accent-green" />
        </button>

        <button
          type="button"
          onClick={() => void deepTranslate()}
          disabled={loading}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-accent-indigo/20 bg-linear-to-r from-accent-indigo/10 to-transparent py-3 pl-4 pr-4 shadow-[0_0_15px_rgba(47,155,131,0.05)] transition-all hover:border-accent-indigo/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-accent-indigo/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative rounded-md bg-accent-indigo/20 p-1.5 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Brain className="h-4 w-4 text-accent-indigo" strokeWidth={2.5} />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-accent-indigo">
                {lang === 'ko' ? '딥 파이프라인' : 'Deep pipeline'}
              </span>
              <span className="text-[10px] text-accent-indigo/60">5-stage</span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-accent-indigo/50 transition-transform group-hover:translate-x-1 group-hover:text-accent-indigo" />
        </button>
      </div>

      <div className="my-2 h-px w-full bg-white/5" />

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveLeftPanel('glossary')}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#111113] py-3 text-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
        >
          <Globe className="h-4 w-4" />
          <span className="text-[10px] font-medium">{lang === 'ko' ? '용어집' : 'Glossary'}</span>
        </button>
        <button
          type="button"
          onClick={openApiKeyModal}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#111113] py-3 text-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
        >
          <Key className="h-4 w-4" />
          <span className="text-[10px] font-medium">{lang === 'ko' ? 'API 키' : 'API keys'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLeftPanel('settings')}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#111113] py-3 text-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-[10px] font-medium">{lang === 'ko' ? '설정' : 'Settings'}</span>
        </button>
      </div>
    </div>
  );
}
