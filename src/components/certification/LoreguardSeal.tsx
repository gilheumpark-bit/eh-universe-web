import React from 'react';
import { Activity, FileCheck2, Fingerprint, QrCode, ShieldCheck } from 'lucide-react';
import { CERTIFICATE_OUTPUT_PROFILES } from '@/lib/creative-process/certificate-output-profile';
import type { PublicCertificateCardPayload } from '@/lib/creative-process/public-certificate-card';

interface SealBaseProps {
  docId: string;
  hciScore?: number | null;
  authorName?: string | null;
  hash?: string | null;
  timestamp?: string | null;
  verificationUrl?: string | null;
  verificationQrDataUrl?: string | null;
}

interface LoreguardSubmissionSealProps extends SealBaseProps {
  workTitle?: string | null;
  sealNumber?: string | null;
  processSummary?: string | null;
}

function formatHci(score?: number | null): string {
  return typeof score === 'number' && Number.isFinite(score) ? `${score.toFixed(1)}%` : '기록 없음';
}

function formatDisplayHash(hash?: string | null): string | null {
  const cleaned = hash?.replace(/^0x/i, '').trim();
  if (!cleaned) return null;
  return cleaned.length > 24 ? `${cleaned.slice(0, 16)}...${cleaned.slice(-8)}` : cleaned;
}

function getRecordLevel(score?: number | null) {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return {
      label: '과정기록 확인 필요',
      color: 'text-slate-300',
      border: 'border-slate-600/40',
    };
  }
  if (score >= 80) {
    return {
      label: '작가 주도 기록 높음',
      color: 'text-emerald-300',
      border: 'border-emerald-500/30',
    };
  }
  if (score >= 50) {
    return {
      label: '노아 보조 사용 기록',
      color: 'text-amber-300',
      border: 'border-amber-500/30',
    };
  }
  return {
    label: '추가 검토 필요',
    color: 'text-rose-300',
    border: 'border-rose-500/30',
  };
}

export function LoreguardPublicSeal({
  docId,
  hciScore,
  hash,
  timestamp,
  verificationUrl,
  verificationQrDataUrl,
}: SealBaseProps) {
  const level = getRecordLevel(hciScore);
  const displayHash = formatDisplayHash(hash);
  const outputProfile = CERTIFICATE_OUTPUT_PROFILES['reader-public-card'];

  return (
    <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-5 text-slate-200 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            <h2 className="text-sm font-bold tracking-[0.18em] text-slate-100">LOREGUARD 과정기록</h2>
          </div>
          <p className="mt-1 truncate font-mono text-xs text-slate-500">ID {docId}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 font-serif text-sm font-bold text-slate-200">
          LG
        </div>
      </div>

      <div className={`mt-5 rounded-xl border ${level.border} bg-slate-900/50 p-4`}>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          작가 통제 지수
        </span>
        <div className="mt-2 flex items-end justify-between gap-3">
          <strong className={`text-4xl font-black tracking-tight ${level.color}`}>
            {formatHci(hciScore)}
          </strong>
          <span className={`inline-flex items-center gap-1 rounded-full border ${level.border} px-2.5 py-1 text-xs font-semibold ${level.color}`}>
            <Activity className="h-3 w-3" aria-hidden="true" />
            {level.label}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-2 text-xs text-slate-400">
          {displayHash ? (
            <p className="flex items-center gap-1.5">
              <Fingerprint className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate font-mono">hash {displayHash}</span>
            </p>
          ) : null}
          <p className="font-mono text-[10px] text-slate-500">{timestamp ?? '기록 시각 비공개'}</p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {outputProfile.purposeKo} {outputProfile.boundaryKo}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="rounded-md bg-white p-1 shadow-sm">
            {verificationQrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 발급된 QR data URL은 외부 이미지 최적화 대상이 아님
              <img
                src={verificationQrDataUrl}
                alt="과정기록 조회 QR"
                className="h-11 w-11"
              />
            ) : (
              <QrCode className="h-11 w-11 text-slate-950" aria-hidden="true" />
            )}
          </div>
          <span className="text-[8px] font-semibold tracking-wider text-slate-500">
            {verificationUrl ? '기록 열기' : '조회'}
          </span>
        </div>
      </div>
    </section>
  );
}

export function LoreguardSubmissionSeal({
  docId,
  hciScore,
  authorName,
  hash,
  timestamp,
  verificationUrl,
  verificationQrDataUrl,
  workTitle,
  sealNumber,
  processSummary,
}: LoreguardSubmissionSealProps) {
  const level = getRecordLevel(hciScore);
  const outputProfile = CERTIFICATE_OUTPUT_PROFILES['submission-certificate'];
  const displayHash = formatDisplayHash(hash);

  return (
    <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-300 bg-white p-6 text-slate-950 shadow-xl">
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            Loreguard 제출 기록
          </p>
          <h2 className="mt-2 text-2xl font-bold">제출용 창작 과정기록 요약</h2>
          <p className="mt-2 text-sm text-slate-600">
            {outputProfile.purposeKo}
          </p>
        </div>
        <ShieldCheck className="h-9 w-9 text-slate-700" aria-hidden="true" />
      </div>

      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">작품</dt>
          <dd className="mt-1 font-semibold">{workTitle ?? '비공개'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">작가명</dt>
          <dd className="mt-1 font-semibold">{authorName ?? '비공개'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">확인서 ID</dt>
          <dd className="mt-1 break-all font-mono">{docId}</dd>
        </div>
        <div>
          <dt className="text-slate-500">봉인번호</dt>
          <dd className="mt-1 break-all font-mono">{sealNumber ?? '미발급'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">HCI</dt>
          <dd className={`mt-1 font-bold ${level.color}`}>
            {formatHci(hciScore)} · {level.label}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">기록 시각</dt>
          <dd className="mt-1 font-mono">{timestamp ?? '기록 없음'}</dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">과정 요약</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {processSummary ?? '제출 패키지의 과정기록, 원고 해시, 출처 묶음, 수정 이력을 함께 확인해 주세요.'}
        </p>
      </div>

      <div className="mt-5 space-y-1 text-xs text-slate-500">
        {displayHash ? <p className="break-all font-mono">문서 해시 축약값: {displayHash}</p> : null}
        {verificationUrl ? <p className="break-all font-mono">조회 링크: {verificationUrl}</p> : null}
        <p>{outputProfile.boundaryKo}</p>
      </div>
      {verificationQrDataUrl ? (
        <div className="mt-5 inline-flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- 발급된 QR data URL은 외부 이미지 최적화 대상이 아님 */}
          <img src={verificationQrDataUrl} alt="제출 기록 조회 QR" className="h-24 w-24" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            QR 대조
          </span>
        </div>
      ) : null}
    </section>
  );
}

export function LoreguardSeal(props: SealBaseProps) {
  return <LoreguardPublicSeal {...props} />;
}

export function LoreguardPublicSealFromPayload({ payload }: { payload: PublicCertificateCardPayload }) {
  return (
    <LoreguardPublicSeal
      docId={payload.certificateId}
      hciScore={payload.display.authorControlScore}
      hash={payload.display.shortManuscriptHash}
      timestamp={payload.generatedAt}
      verificationUrl={payload.display.verificationUrl}
    />
  );
}
