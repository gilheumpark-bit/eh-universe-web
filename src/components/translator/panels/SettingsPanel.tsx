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
    hostedNoa,
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
  const hasByokKey = Object.values(apiKeys).some((value) => typeof value === 'string' && value.trim().length > 0);

  return (
    <div className="translator-settings-panel flex h-full flex-col font-sans">
      <div className="p-5 shrink-0 border-b border-border bg-bg-primary/80">
        <div className="flex items-center gap-2 text-text-primary">
          <Settings className="w-4 h-4 text-accent-indigo" aria-hidden />
          <span className="text-[14px] font-semibold">
            {langKo ? '환경 설정' : 'Environment settings'}
          </span>
        </div>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          {langKo
            ? '노아 운영 모드, 저장, 계정, 백업을 여기서 정리합니다.'
            : 'Review Noa mode, storage, account, and backup in one place.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pointer-events-auto bg-bg-secondary/80">
        <div className="rounded-2xl border border-border bg-bg-primary overflow-hidden">
          <EnvStatusBar />
        </div>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide flex items-center gap-2">
            <Key className="w-3.5 h-3.5" aria-hidden />
            {langKo ? '노아 운영 모드' : 'Noa operating mode'}
          </h3>
          <div className="grid gap-2">
            <div className={`rounded-xl border p-3 ${hostedNoa ? 'border-accent-green/30 bg-accent-green/10' : 'border-border bg-bg-primary'}`}>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-[13px] text-text-primary">{langKo ? '기본 운영' : 'Hosted operation'}</strong>
                <span className={`text-[12px] font-semibold ${hostedNoa ? 'text-accent-green' : 'text-text-secondary'}`}>
                  {hostedNoa ? (langKo ? '사용 가능' : 'Ready') : (langKo ? '미설정' : 'Not set')}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                {langKo
                  ? '서비스 기본 풀을 사용합니다. 이용 범위와 일일 제공량 기준을 따릅니다.'
                  : 'Uses the built-in service pool and follows plan limits.'}
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${hasByokKey ? 'border-accent-purple/30 bg-accent-purple/10' : 'border-border bg-bg-primary'}`}>
              <div className="flex items-center justify-between gap-3">
                <strong className="text-[13px] text-text-primary">{langKo ? '연결 키' : 'Connection keys'}</strong>
                <span className={`text-[12px] font-semibold ${hasByokKey ? 'text-accent-purple' : 'text-text-secondary'}`}>
                  {hasByokKey ? (langKo ? '연결됨' : 'Connected') : (langKo ? '대기' : 'Waiting')}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                {langKo
                  ? '작가가 등록한 키로 호출합니다. 기본 운영량을 쓰지 않고, 키 비용은 사용자 계정 기준입니다.'
                  : 'Uses the writer’s own keys and does not consume hosted quota.'}
              </p>
            </div>
          </div>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {langKo
              ? 'Loreguard 공통 키 저장소를 사용합니다. 모델별 연결 키는 아래에서 등록하세요.'
              : 'Uses the shared Loreguard key store. Register model connection keys below.'}
          </p>
          <button
            data-testid="translator-open-api-key-modal"
            type="button"
            aria-label={langKo ? '연결 키 관리 열기' : 'Open connection key manager'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openApiKeyModal();
            }}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-accent-purple/30 bg-accent-purple/10 px-3 py-2.5 text-[13px] font-medium text-accent-purple transition-colors hover:bg-accent-purple/20"
          >
            <Key className="w-3.5 h-3.5" />
            {langKo ? '연결 키 관리 열기' : 'Open connection key manager'}
          </button>
          <p className="text-[12px] text-text-secondary">
            {aiCapabilitiesLoaded
              ? langKo
                ? `노아 운영: 기본 운영 ${hostedNoa ? 'ON' : 'OFF'}`
                : `Noa: hosted operation ${hostedNoa ? 'ON' : 'OFF'}`
              : '…'}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide">
            {langKo ? '전용 번역 연결 키' : 'Dedicated translation key'}
          </h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {langKo
              ? '특정 번역 엔진을 직접 연결할 때만 씁니다. Loreguard 공통 연결 키와는 따로 보관됩니다.'
              : 'Only used when you connect a specific translation engine directly. Stored separately from shared Loreguard keys.'}
          </p>
          <form
            className="space-y-1.5"
            onSubmit={(event) => event.preventDefault()}
          >
            <label
              htmlFor="translator-deepseek-key"
              className="block text-[12px] font-medium text-text-secondary"
            >
              {langKo ? 'DeepSeek 연결 키' : 'DeepSeek connection key'}
            </label>
            <input
              id="translator-deepseek-key"
              type="password"
              autoComplete="off"
              value={apiKeys.deepseek ?? ''}
              onChange={(e) =>
                setApiKeys((prev) => ({ ...prev, deepseek: e.target.value }))
              }
              placeholder={langKo ? '연결 키 입력' : 'Enter connection key'}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:border-accent-cyan/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            />
          </form>
        </section>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            {langKo ? '계정' : 'Account'}
          </h3>
          {!isConfigured ? (
            <p className="text-[12px] text-accent-amber leading-relaxed">
              {langKo
                ? '로그인을 사용할 수 없습니다. 배포 계정 연결 설정을 확인해 주세요.'
                : 'Sign-in is not ready yet. Check the account connection settings for this deployment.'}
            </p>
          ) : !isAuthLoaded ? (
            <p className="text-[12px] text-text-secondary">{langKo ? '로그인 확인 중…' : 'Checking sign-in…'}</p>
          ) : authUser ? (
            <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-3">
              <div className="text-[12px] text-text-secondary space-y-0.5">
                <div className="font-medium text-text-primary">{displayName || email || '—'}</div>
                {email ? <div className="text-[11px] text-text-secondary">{email}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary py-2 text-[12px] text-text-secondary transition-colors hover:bg-bg-tertiary"
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
              <p className="text-[12px] text-text-secondary leading-relaxed">
                {langKo
                  ? '로그인하면 배포 저장소가 켜져 있을 때 번역 작업이 클라우드에 자동 반영됩니다.'
                  : 'Signing in enables automatic cloud sync when the deployment storage is connected.'}
              </p>
            </div>
          )}
          {authError ? (
            <p className="text-[12px] text-accent-red/90 break-words">{authError}</p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide flex items-center gap-2">
            <Save className="w-3.5 h-3.5" />
            {langKo ? '저장' : 'Save'}
          </h3>
          <div className="rounded-lg border border-accent-green/25 bg-accent-green/10 p-3 space-y-2">
            <div className="flex justify-between gap-2 text-[13px]">
              <span className="text-text-secondary">{langKo ? '브라우저(로컬)' : 'Browser (local)'}</span>
              <span className="text-accent-green font-mono text-[12px] text-right">{autoSaveLabel}</span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              {langKo
                ? '편집 내용은 이 브라우저에 자동 저장됩니다. 백업 파일·일괄보내기는 왼쪽 활동 바의 디스크 아이콘(저장·백업)에서 하세요.'
                : 'Edits autosave in this browser. Backup files and batch export live in the left activity bar (hard drive icon: Save & backup).'}
            </p>
            <button
              type="button"
              onClick={() => layout.setActiveLeftPanel('backup')}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-[12px] font-medium text-accent-green transition-colors hover:bg-accent-green/20"
            >
              <Download className="w-3.5 h-3.5" />
              {langKo ? '저장·백업 패널 열기' : 'Open save & backup panel'}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5" />
            {langKo ? '클라우드 동기화' : 'Cloud sync'}
          </h3>
          <div className="rounded-lg border border-border bg-bg-primary p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-text-secondary">{langKo ? '상태' : 'Status'}</span>
              <span
                className={`text-[12px] font-medium ${
                  cloudSyncEnabled ? 'text-accent-green' : 'text-accent-amber'
                }`}
              >
                {cloudSyncEnabled
                  ? langKo
                    ? '로그인·클라우드 저장 연결됨'
                    : 'Signed in & cloud storage connected'
                  : langKo
                    ? '비활성'
                    : 'Off'}
              </span>
            </div>
            {cloudSyncEnabled ? (
              <div className="flex items-center justify-between gap-2 text-[12px] text-text-secondary">
                <span>{syncLabel}</span>
                <span className="truncate max-w-[55%] text-right" title={cloudSyncDetail}>
                  {cloudSyncDetail || '—'}
                </span>
              </div>
            ) : (
              <p className="text-[12px] text-text-secondary leading-relaxed">
                {langKo
                ? '클라우드를 쓰려면 Google 로그인과 배포 저장소 연결이 필요합니다.'
                  : 'Cloud sync needs Google sign-in and deployment storage connection.'}
              </p>
            )}
            <p className="text-[12px] text-text-secondary leading-relaxed pt-1 border-t border-border">
              {langKo
                ? '여러 기기에서 동시에 편집하면 서버에 마지막으로 도달한 저장이 우선합니다.'
                : 'Last write to the server wins if you edit on multiple devices.'}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            {langKo ? '백업 / 복원' : 'Backup / Restore'}
          </h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {langKo
              ? '백업 파일·일괄보내기·문서 가져오기는「저장·백업」패널에 모여 있습니다. 왼쪽 디스크 아이콘으로 바로 열 수 있습니다.'
              : 'Backup files, batch download, and document import are grouped in Save & backup (left hard-drive icon).'}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void exportData()}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-secondary transition-colors hover:bg-bg-tertiary"
            >
              <Download className="w-3.5 h-3.5" />
              {langKo ? '작업실 백업 내보내기' : 'Export workspace backup'}
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
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-secondary transition-colors hover:bg-bg-tertiary"
            >
              <Upload className="w-3.5 h-3.5" />
              {langKo ? '백업 가져오기' : 'Import backup'}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold text-text-secondary tracking-wide flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5" />
            {langKo ? '번역 방식' : 'Translation method'}
          </h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {langKo
              ? `우측 「번역 실행」패널에서 번역 방식을 고릅니다. 현재: ${provider}. 연결 키는 Loreguard 공통 저장소에서 읽습니다.`
              : `Pick the engine in the right Translate panel. Current: ${provider}. Connection keys use the shared Loreguard key store.`}
          </p>
        </section>
      </div>
    </div>
  );
}
