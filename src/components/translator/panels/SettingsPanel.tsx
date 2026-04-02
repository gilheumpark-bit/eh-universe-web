import React from 'react';
import { Settings, Cloud, Sliders } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

export function SettingsPanel() {
  const {
    cloudSyncEnabled,
    cloudSyncStatus,
    cloudSyncDetail,
    provider,
    langKo,
  } = useTranslator();

  const syncLabel =
    cloudSyncStatus === 'saving'
      ? langKo
        ? '동기화 중'
        : 'Syncing'
      : cloudSyncStatus === 'ok'
        ? langKo
          ? '마지막 저장'
          : 'Last saved'
        : cloudSyncStatus === 'error'
          ? langKo
            ? '오류'
            : 'Error'
          : langKo
            ? '대기'
            : 'Idle';

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <Settings className="w-4 h-4 text-accent-indigo" />
          <span className="text-[13px] font-medium">Translator Settings</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pointer-events-auto">
        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3 h-3" />
            {langKo ? '번역 엔진' : 'Translation engine'}
          </h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            {langKo
              ? `현재 선택된 프로바이더는 메인 화면(액션 도크·헤더)에서 바꿉니다. 지금: ${provider}. 모델·API 키도 동일 경로의 설정을 따릅니다.`
              : `Change provider from the main action dock / header. Current: ${provider}. Models and API keys follow the same settings.`}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-2">
            <Cloud className="w-3 h-3" />
            {langKo ? '클라우드 저장' : 'Cloud save'}
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
                    ? '로그인·Supabase 사용 가능'
                    : 'Signed in & Supabase OK'
                  : langKo
                    ? '비활성(로그인 또는 env 확인)'
                    : 'Off (sign in or check env)'}
              </span>
            </div>
            {cloudSyncEnabled ? (
              <div className="flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
                <span>{syncLabel}</span>
                <span className="truncate max-w-[60%] text-right" title={cloudSyncDetail}>
                  {cloudSyncDetail || '—'}
                </span>
              </div>
            ) : null}
            <p className="text-[11px] text-text-tertiary leading-relaxed pt-1 border-t border-white/5">
              {langKo
                ? '여러 기기에서 동시에 편집하면 마지막으로 서버에 도달한 저장이 우선합니다. 중요한 시점에는 JSON보내기로 백업하세요.'
                : 'If you edit on multiple devices, the last write that reaches the server wins. Export JSON before risky merges.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
