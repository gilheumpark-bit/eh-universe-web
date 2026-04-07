import React, { useRef, type ChangeEvent } from 'react';
import { Settings, Cloud, Sliders, User, Save, Download, Upload, LogOut, LogIn, Key } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { useAuth } from '@/lib/AuthContext';
import { EnvStatusBar } from '../EnvStatusBar';

export function SettingsPanel() {
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    cloudSyncEnabled,
    cloudSyncStatus,
    cloudSyncDetail,
    provider,
    langKo,
    autoSaveLabel,
    authUser,
    isAuthLoaded,
    signInWithGoogle,
    signOut,
    exportData,
    importData,
    openApiKeyModal,
    apiKeys,
    setApiKeys,
    aiCapabilitiesLoaded,
    hostedGemini,
  } = useTranslator();
  const layout = useTranslatorLayout();
  const { isConfigured, error: authError } = useAuth();

  const syncLabel =
    cloudSyncStatus === 'saving'
      ? langKo
        ? '동기화 중'
        : 'Syncing'
      : cloudSyncStatus === 'ok'
        ? langKo
          ? '클라우드 반영됨'
          : 'Cloud OK'
        : cloudSyncStatus === 'error'
          ? langKo
            ? '클라우드 오류'
            : 'Cloud error'
          : langKo
            ? '대기'
            : 'Idle';

  const email = authUser?.email as string | undefined;
  const displayName = authUser?.displayName as string | undefined;

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <Settings className="w-4 h-4 text-accent-indigo" />
          <span className="text-[13px] font-medium">
            {langKo ? '설정 · 계정 · 저장' : 'Settings · Account · Save'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pointer-events-auto">
        <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
          <EnvStatusBar />
        </div>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Key className="w-3 h-3" />
            {langKo ? 'BYOK · API 키' : 'BYOK · API keys'}
          </h3>
          <p className="text-[11px] text-text-tertiary leading-relaxed">
            {langKo
              ? 'NOA 소설 스튜디오와 동일한 키 저장소를 사용합니다. Gemini·OpenAI·Claude 등은 아래에서 등록하세요.'
              : 'Uses the same key store as NOA Novel Studio. Register Gemini, OpenAI, Claude, etc. below.'}
          </p>
          <button
            type="button"
            onClick={openApiKeyModal}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-purple/30 bg-accent-purple/10 py-2.5 text-[12px] font-medium text-accent-purple transition-colors hover:bg-accent-purple/20"
          >
            <Key className="w-3.5 h-3.5" />
            {langKo ? 'API 키 패널 열기' : 'Open API key panel'}
          </button>
          <p className="text-[10px] text-text-tertiary">
            {aiCapabilitiesLoaded
              ? langKo
                ? `AI 준비: 호스팅 Gemini ${hostedGemini ? 'ON' : 'OFF'}`
                : `AI: hosted Gemini ${hostedGemini ? 'ON' : 'OFF'}`
              : '…'}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
            {langKo ? 'DeepSeek (번역 전용)' : 'DeepSeek (translator)'}
          </h3>
          <p className="text-[10px] text-text-tertiary leading-relaxed">
            {langKo
              ? '엔진에서 DeepSeek을 쓸 때만 필요합니다. 위 BYOK 목록에 없는 별도 키입니다.'
              : 'Only when the engine is DeepSeek. Separate from the shared BYOK list.'}
          </p>
          <input
            type="password"
            autoComplete="off"
            value={apiKeys.deepseek ?? ''}
            onChange={(e) =>
              setApiKeys((prev) => ({ ...prev, deepseek: e.target.value }))
            }
            placeholder={langKo ? 'sk-…' : 'sk-…'}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[12px] text-text-primary placeholder:text-text-tertiary focus:border-accent-cyan/40 focus:outline-none"
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <User className="w-3 h-3" />
            {langKo ? '계정' : 'Account'}
          </h3>
          {!isConfigured ? (
            <p className="text-[12px] text-amber-400/90 leading-relaxed">
              {langKo
                ? 'Firebase가 설정되지 않았습니다. 배포의 NEXT_PUBLIC_FIREBASE_* 환경 변수를 확인하세요.'
                : 'Firebase is not configured. Check NEXT_PUBLIC_FIREBASE_* in your deployment.'}
            </p>
          ) : !isAuthLoaded ? (
            <p className="text-[12px] text-text-tertiary">{langKo ? '인증 확인 중…' : 'Checking auth…'}</p>
          ) : authUser ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3">
              <div className="text-[12px] text-text-secondary space-y-0.5">
                <div className="font-medium text-text-primary">{displayName || email || '—'}</div>
                {email ? <div className="text-[11px] text-text-tertiary">{email}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/30 py-2 text-[12px] text-text-secondary transition-colors hover:bg-white/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                {langKo ? '로그아웃' : 'Sign out'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-indigo/30 bg-accent-indigo/15 py-2.5 text-[12px] font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/25"
              >
                <LogIn className="w-3.5 h-3.5" />
                {langKo ? 'Google로 로그인' : 'Sign in with Google'}
              </button>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                {langKo
                  ? '로그인하면 Supabase가 켜져 있을 때 프로젝트가 클라우드에 자동 동기화됩니다.'
                  : 'When Supabase is configured, signing in enables automatic cloud sync.'}
              </p>
            </div>
          )}
          {authError ? (
            <p className="text-[11px] text-red-400/90 wrap-break-word">{authError}</p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Save className="w-3 h-3" />
            {langKo ? '저장' : 'Save'}
          </h3>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
            <div className="flex justify-between gap-2 text-[12px]">
              <span className="text-text-tertiary">{langKo ? '브라우저(로컬)' : 'Browser (local)'}</span>
              <span className="text-emerald-400/90 font-mono text-[11px] text-right">{autoSaveLabel}</span>
            </div>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              {langKo
                ? '편집 내용은 이 브라우저의 localStorage에 자동 저장됩니다. JSON 백업·일괄보내기는 왼쪽 활동 바의 디스크 아이콘(저장·백업)에서 하세요.'
                : 'Edits autosave to localStorage. JSON backup and batch export live in the left activity bar (hard drive icon: Save & backup).'}
            </p>
            <button
              type="button"
              onClick={() => layout.setActiveLeftPanel('backup')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-[11px] font-medium text-emerald-300/90 transition-colors hover:bg-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              {langKo ? '저장·백업 패널 열기' : 'Open save & backup panel'}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Cloud className="w-3 h-3" />
            {langKo ? '클라우드 동기화' : 'Cloud sync'}
          </h3>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] text-text-secondary">{langKo ? '상태' : 'Status'}</span>
              <span
                className={`text-[11px] font-medium ${
                  cloudSyncEnabled ? 'text-emerald-400/90' : 'text-amber-400/90'
                }`}
              >
                {cloudSyncEnabled
                  ? langKo
                    ? '로그인·Supabase OK'
                    : 'Signed in & Supabase OK'
                  : langKo
                    ? '비활성'
                    : 'Off'}
              </span>
            </div>
            {cloudSyncEnabled ? (
              <div className="flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
                <span>{syncLabel}</span>
                <span className="truncate max-w-[55%] text-right" title={cloudSyncDetail}>
                  {cloudSyncDetail || '—'}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                {langKo
                  ? '클라우드를 쓰려면 Google 로그인 + NEXT_PUBLIC_SUPABASE_* 설정이 필요합니다.'
                  : 'Cloud sync needs Google sign-in and NEXT_PUBLIC_SUPABASE_* env vars.'}
              </p>
            )}
            <p className="text-[11px] text-text-tertiary leading-relaxed pt-1 border-t border-white/5">
              {langKo
                ? '여러 기기에서 동시에 편집하면 서버에 마지막으로 도달한 저장이 우선합니다(last-write-wins).'
                : 'Last write to the server wins if you edit on multiple devices.'}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Download className="w-3 h-3" />
            {langKo ? '백업 / 복원' : 'Backup / Restore'}
          </h3>
          <p className="text-[10px] text-text-tertiary leading-relaxed">
            {langKo
              ? 'JSON·일괄보내기·문서 가져오기는「저장·백업」패널에 모여 있습니다. 왼쪽 디스크 아이콘으로 바로 열 수 있습니다.'
              : 'JSON export, batch download, and document import are grouped in Save & backup (left hard-drive icon).'}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void exportData()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111113] py-2 text-[12px] text-text-secondary transition-colors hover:bg-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              {langKo ? '프로젝트 JSON보내기' : 'Export project JSON'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => importData(e)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111113] py-2 text-[12px] text-text-secondary transition-colors hover:bg-white/10"
            >
              <Upload className="w-3.5 h-3.5" />
              {langKo ? 'JSON 가져오기' : 'Import JSON'}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3 h-3" />
            {langKo ? '번역 엔진' : 'Translation engine'}
          </h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {langKo
              ? `우측 「액션」패널에서 프로바이더를 고릅니다. 현재: ${provider}. BYOK 키는 사이트 공통 저장소(소설 스튜디오 등과 동일)에서 읽습니다.`
              : `Pick the provider in the right Actions panel. Current: ${provider}. BYOK keys use the site-wide key store (same as Novel Studio).`}
          </p>
        </section>
      </div>
    </div>
  );
}
