import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { AlertTriangle, CheckCircle2, FileCheck2, Info } from 'lucide-react';
import Header from '@/components/Header';
import type { PublicCertificateCardPayload } from '@/lib/creative-process/public-certificate-card';

export const dynamic = 'force-dynamic';

interface LookupMeta {
  cert_id: string;
  seal_number: string | null;
  registered_at: string | null;
  visibility: string | null;
  issuer_type: string | null;
  github_repo: string | null;
  github_commit_sha: string | null;
  cert_hash?: string | null;
  chain_tip_hash?: string | null;
  honesty_note_ko?: string;
  privacy_note?: string;
  public_card?: PublicCertificateCardPayload;
}

type LookupResult =
  | { kind: 'registered'; meta: LookupMeta }
  | { kind: 'not_found' }
  | { kind: 'invalid' }
  | { kind: 'unavailable' }
  | { kind: 'error' };

const GITHUB_REPO_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GITHUB_SHA_REGEX = /^[0-9a-f]{7,40}$/i;

function visibilityLabel(value: string | null): string {
  switch (value) {
    case 'public':
      return '공개';
    case 'publisher':
      return '출판사·플랫폼';
    case 'legal':
      return '법적 대응용';
    case 'private':
      return '비공개';
    default:
      return value ?? '-';
  }
}

function issuerLabel(value: string | null): string {
  switch (value) {
    case 'self':
      return '작가 본인';
    case 'publisher':
      return '출판사·에이전시';
    case 'collaborator':
      return '공동 작업자';
    case 'admission_token':
      return '외부 확인 토큰';
    default:
      return value ?? '-';
  }
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR');
}

function shortHash(value?: string | null): string {
  if (!value) return '-';
  return value.length > 24 ? `${value.slice(0, 16)}...${value.slice(-8)}` : value;
}

async function lookupRecord(docId: string): Promise<LookupResult> {
  try {
    const headerStore = await headers();
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
    if (!host) return { kind: 'error' };
    const protocol = headerStore.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    const res = await fetch(
      `${protocol}://${host}/api/cp/verify/${encodeURIComponent(docId)}?lookup=true`,
      { cache: 'no-store' },
    );

    if (res.status === 400) return { kind: 'invalid' };
    if (res.status === 404) return { kind: 'not_found' };
    if (res.status === 503) return { kind: 'unavailable' };
    if (!res.ok) return { kind: 'error' };

    const data = (await res.json()) as LookupMeta & { registered?: boolean };
    if (!data.registered) return { kind: 'not_found' };
    return { kind: 'registered', meta: data };
  } catch {
    return { kind: 'error' };
  }
}

function GithubAnchor({ meta }: { meta: LookupMeta }) {
  const repo = meta.github_repo;
  const sha = meta.github_commit_sha;
  if (!sha) return null;
  if (repo && GITHUB_REPO_REGEX.test(repo) && GITHUB_SHA_REGEX.test(sha)) {
    return (
      <a
        href={`https://github.com/${repo}/commit/${sha}`}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all font-mono text-xs text-emerald-300 hover:underline"
      >
        {sha}
      </a>
    );
  }
  return <span className="break-all font-mono text-xs text-slate-300">{sha}</span>;
}

function PublicCardSummary({ payload }: { payload: PublicCertificateCardPayload }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            공개용 과정기록 카드
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{payload.summaryKo}</p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-200">
          {payload.display.recordLevelKo}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-400">과정기록 해시 축약값</dt>
          <dd className="mt-1 break-all font-mono text-slate-100">
            {payload.display.shortRecordHash ?? '-'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">공개 제외</dt>
          <dd className="mt-1 text-slate-100">
            {payload.publicPolicy.excludedFieldsKo.slice(0, 3).join(' · ')}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default async function VerificationPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const result = await lookupRecord(docId);

  return (
    <>
      <Header stellarWhite />
      <main className="min-h-screen bg-slate-950 px-4 pb-16 pt-28 text-slate-200">
        <section className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-800 bg-slate-950/70 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                {result.kind === 'registered' ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-amber-300" aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                  Loreguard 공개 기록
                </p>
                <h1 className="mt-1 text-2xl font-bold !text-white">
                  {result.kind === 'registered' ? '등록 기록 있음' : '등록 상태 확인 필요'}
                </h1>
              </div>
            </div>
          </div>

          <div className="p-6">
            {result.kind === 'registered' ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-emerald-100">
                      이 번호의 창작 과정기록 메타가 Loreguard 레지스트리에 등록되어 있습니다.
                      원고 본문은 공개하지 않습니다.
                    </p>
                  </div>
                </div>
                {result.meta.public_card ? <PublicCardSummary payload={result.meta.public_card} /> : null}

                <dl className="grid gap-4 text-sm">
                  <div>
                    <dt className="text-slate-400">확인서 ID</dt>
                    <dd className="mt-1 break-all font-mono text-slate-100">{result.meta.cert_id}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">봉인번호</dt>
                    <dd className="mt-1 break-all font-mono text-slate-100">
                      {result.meta.seal_number ?? '-'}
                    </dd>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-400">등록 시각</dt>
                      <dd className="mt-1 text-slate-100">{formatDate(result.meta.registered_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">공개 범위</dt>
                      <dd className="mt-1 text-slate-100">{visibilityLabel(result.meta.visibility)}</dd>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-400">발급자 유형</dt>
                      <dd className="mt-1 text-slate-100">{issuerLabel(result.meta.issuer_type)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">과정기록 해시</dt>
                      <dd className="mt-1 break-all font-mono text-slate-100">
                        {shortHash(result.meta.cert_hash)}
                      </dd>
                    </div>
                  </div>
                  {result.meta.github_commit_sha ? (
                    <div>
                      <dt className="text-slate-400">외부 앵커</dt>
                      <dd className="mt-1">
                        <GithubAnchor meta={result.meta} />
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                  <div className="space-y-2 text-sm leading-relaxed text-amber-100">
                    <p>
                      {result.kind === 'invalid'
                        ? 'ID 형식이 올바르지 않습니다.'
                        : result.kind === 'not_found'
                          ? '해당 번호로 등록된 과정기록을 찾지 못했습니다.'
                          : result.kind === 'unavailable'
                            ? '레지스트리에 일시적으로 접근할 수 없습니다.'
                            : '조회 중 문제가 발생했습니다.'}
                    </p>
                    <p className="text-amber-100/80">번호를 다시 확인하거나 발급자에게 문의하세요.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs leading-relaxed text-slate-400">
              <p className="font-semibold text-slate-300">조회 한계</p>
              <p className="mt-2">
                이 화면은 작성자가 직접 썼는지 자체나 권리 귀속을 확정하지 않습니다. 등록 시점 이후의 해시·메타 대조와
                존재 여부를 확인하기 위한 공개용 화면입니다.
              </p>
              <p className="mt-2">
                제출용 검토에는 원고, 과정기록, 출처 묶음, 수정 이력, C2PA-ready 자료가 포함된 출고 패키지가 필요합니다.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800 bg-slate-950/60 p-4 text-center">
            <Link
              href="/verify"
              className="inline-flex min-h-11 items-center rounded px-2 text-sm font-medium text-emerald-300 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              다른 번호 조회하기
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
