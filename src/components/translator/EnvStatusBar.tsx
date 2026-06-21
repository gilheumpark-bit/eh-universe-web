'use client';

import { useMemo } from 'react';
import { getTranslatorEnvStatus } from '@/lib/translator-env-status';

function Chip({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-bg-secondary/90 px-3 py-2 text-[11px] font-semibold text-text-primary"
      title={detail}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-accent-green' : 'bg-accent-amber'}`}
        aria-hidden
      />
      <span className="min-w-0 truncate">{label}</span>
      {detail ? (
        <span className="truncate text-[10px] font-medium text-text-secondary">
          {detail}
        </span>
      ) : null}
    </div>
  );
}

export function EnvStatusBar() {
  const s = useMemo(() => getTranslatorEnvStatus(), []);

  return (
    <div
      className="mb-5 rounded-3xl border border-border bg-bg-primary p-4 shadow-sm"
      role="region"
      aria-label="환경 연결 상태"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">
          환경 연결
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[10px] font-bold ${
            s.networkBridgeReady && s.supabaseOk
              ? 'bg-accent-green/15 text-accent-green'
              : 'bg-accent-amber/15 text-accent-amber'
          }`}
        >
          {s.networkBridgeReady && s.supabaseOk
            ? '번역·컨텍스트·클라우드 준비됨'
            : '일부만 설정됨 · 아래 항목 확인'}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip
          ok={s.firebaseOk}
          label="로그인"
          detail={s.firebaseOk ? '계정 연결 가능' : '로그인 연결이 아직 준비되지 않았습니다'}
        />
        <Chip
          ok={s.universeOk}
          label="로어가드"
          detail={
            s.universeOk
              ? (s.universeHost || '연결 기준 확인')
              : '로어가드 기준 주소 필요'
          }
        />
        <Chip
          ok={s.supabaseOk}
          label="클라우드 저장"
          detail={s.supabaseOk ? '동기화 가능' : '저장소 설정 필요'}
        />
        <Chip
          ok={s.networkBridgeReady}
          label="컨텍스트 브릿지"
          detail={s.networkBridgeReady ? '번역 컨텍스트 연결 가능' : '로그인·기준 주소 필요'}
        />
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-text-secondary [word-break:keep-all]">
        클라우드 동기화는 로그인 후 자동 저장되며, 다른 기기와 동시 편집 시{' '}
        <strong className="font-semibold text-text-primary">마지막 저장 우선</strong>입니다. 필요하면 작업실에서 JSON
        내보내기로 백업하세요.
      </p>
      <p className="mt-2 text-[10px] leading-relaxed text-text-secondary [word-break:keep-all]">
        번역 컨텍스트 연결은 배포 환경의 고급 설정이 있어야 동작합니다. 이 화면에는 비밀 값을 표시하지 않습니다.
      </p>
    </div>
  );
}
