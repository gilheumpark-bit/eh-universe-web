"use client";
// ============================================================
// SignoffPanel — 작가 승인 (원문 보존안 + 현지화안 분리 승인)
// 시장 분석 4차 §8 §11.
//
// [Batch 4 / rank 13 — 2026-06-07] work-receipt 자동 생성:
//   - DID:     실행된 stage 목록 (예: [DID] Stage 1+4)
//   - SKIPPED: 생략한 항목 (Faithful 미승인 · Market 미작업 · 미실행 stage)
//   - METRICS: 자수 + 실행 stage 개수
// 승인 시 buildSignoffReceipt → localStorage 영속 (recordSignoffReceipt).
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Globe,
  Stamp,
  FileBadge2,
  BookCheck,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Hash,
} from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import {
  summarizeSignoff,
  toggleSignoff,
  isReadyForPublish,
  chapterSignoffStatus,
} from '@/lib/translation/author-signoff';
import {
  buildSignoffReceipt,
  recordSignoffReceipt,
  type SignoffTrack,
} from '@/lib/translation/signoff-receipt';
import { buildReceipt } from '@/lib/creative/work-receipt';

export function SignoffPanel() {
  const { chapters, patchChapterAtIndex, langKo } = useTranslator();
  const summary = useMemo(() => summarizeSignoff(chapters), [chapters]);
  // 영수증 패널 펼침 상태 — chapterIndex × track
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const persistReceipt = useCallback(
    (chapterIndex: number, track: SignoffTrack) => {
      const ch = chapters[chapterIndex];
      if (!ch) return;
      try {
        recordSignoffReceipt({
          id: `sig-${chapterIndex}-${track}-${Date.now()}`,
          at: Date.now(),
          chapter: ch,
          chapterIndex,
          track,
        });
      } catch {
        // localStorage quota / private mode — silent
      }
    },
    [chapters],
  );

  const flipFaithful = (i: number) => {
    const ch = chapters[i];
    if (!ch) return;
    const nextApproved = !ch.faithfulApproved;
    const next = toggleSignoff(ch, 'faithful', nextApproved);
    patchChapterAtIndex(i, next);
    // 창작 과정 확인서 hook (silent)
    import('@/lib/translation/process-record-hooks').then((m) => {
      m.recordAuthorSignoff({ chapterName: ch.name, chapterIndex: i, track: 'faithful' });
    }).catch(() => undefined);
    // 승인 시에만 영수증 영속 (취소 시 기존 기록 유지)
    if (nextApproved) persistReceipt(i, 'faithful');
  };

  const flipMarket = (i: number) => {
    const ch = chapters[i];
    if (!ch) return;
    const nextApproved = !ch.marketApproved;
    const next = toggleSignoff(ch, 'market', nextApproved);
    patchChapterAtIndex(i, next);
    import('@/lib/translation/process-record-hooks').then((m) => {
      m.recordAuthorSignoff({ chapterName: ch.name, chapterIndex: i, track: 'market' });
    }).catch(() => undefined);
    if (nextApproved) persistReceipt(i, 'market');
  };

  const toggleExpand = (i: number, track: SignoffTrack) => {
    const key = `${i}:${track}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const faithfulPublishReady = isReadyForPublish(chapters, 'faithful');
  const marketPublishReady = isReadyForPublish(chapters, 'market');

  return (
    <section className="flex flex-col h-full min-h-0">
      <header className="px-3 py-2 border-b border-border bg-bg-secondary/60 shrink-0">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Stamp className="w-4 h-4 text-accent-purple" />
          {langKo ? '작가 승인' : 'Author Approval'}
        </h3>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          {langKo
            ? '보존안 = 권리 보관용, 현지화안 = 출고 검토용'
            : 'Faithful = archive, Market = publish'}
        </p>
        {/* 요약 */}
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <Stat label={langKo ? '보존' : 'F'} value={`${summary.faithfulApproved}/${summary.total}`} color="text-accent-green" />
          <Stat label={langKo ? '현지화' : 'M'} value={`${summary.marketApproved}/${summary.total}`} color="text-accent-amber" />
          <Stat label={langKo ? '전체' : 'ALL'} value={`${summary.fullyApproved}/${summary.total}`} color="text-accent-purple" />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px]">
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              faithfulPublishReady
                ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                : 'bg-white/[0.02] text-text-tertiary border border-white/10'
            }`}
          >
            <FileBadge2 className="w-3 h-3" />
            {langKo ? '보존안 완료' : 'Faithful ready'}
          </span>
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              marketPublishReady
                ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                : 'bg-white/[0.02] text-text-tertiary border border-white/10'
            }`}
          >
            <BookCheck className="w-3 h-3" />
            {langKo ? '현지화안 출고 가능' : 'Market publishable'}
          </span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {chapters.length === 0 ? (
          <div className="p-6 text-center text-xs text-text-tertiary">
            {langKo
              ? '승인할 회차가 없습니다. 회차를 먼저 불러오거나 만든 뒤 번역을 실행하세요.'
              : 'No chapters to sign off. Add or import chapters and run a translation first.'}
          </div>
        ) : chapters.map((ch, i) => (
          <ChapterRow
            key={i}
            index={i}
            name={ch.name}
            faithful={!!ch.faithfulApproved}
            market={!!ch.marketApproved}
            status={chapterSignoffStatus(ch)}
            hasFaithful={!!ch.resultFaithful}
            hasMarket={!!ch.resultMarket}
            onFlipF={() => flipFaithful(i)}
            onFlipM={() => flipMarket(i)}
            onToggleReceiptF={() => toggleExpand(i, 'faithful')}
            onToggleReceiptM={() => toggleExpand(i, 'market')}
            faithfulExpanded={!!expanded[`${i}:faithful`]}
            marketExpanded={!!expanded[`${i}:market`]}
            chapter={ch}
            langKo={langKo}
          />
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className={`text-[13px] font-bold ${color}`}>{value}</div>
      <div className="text-[8px] uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  );
}

// ============================================================
// ReceiptDetail — DID/SKIPPED/METRICS 3 섹션 (영수증 펼침 UI)
// ============================================================
function ReceiptDetail({
  chapter,
  track,
  langKo,
}: {
  chapter: import('@/types/translator').ChapterEntry;
  track: SignoffTrack;
  langKo: boolean;
}) {
  const receipt = useMemo(() => buildSignoffReceipt(chapter, track), [chapter, track]);
  const formatted = useMemo(() => buildReceipt(receipt), [receipt]);
  const trackColor = track === 'faithful' ? 'text-accent-green' : 'text-accent-amber';
  const trackLabel = langKo
    ? track === 'faithful'
      ? '원문 보존안'
      : '현지화안'
    : track === 'faithful'
      ? 'Faithful'
      : 'Market';

  return (
    <div className="mt-2 px-3 py-2 bg-bg-secondary/30 border border-border rounded text-[11px] space-y-2">
      <div className={`font-bold text-[10px] uppercase tracking-wider ${trackColor}`}>
        {trackLabel} {langKo ? '과정기록' : 'Receipt'}
      </div>

      {/* DID 섹션 */}
      <div>
        <div className="flex items-center gap-1 text-[10px] text-accent-green font-bold uppercase tracking-wider mb-1">
          <CircleCheck className="w-3 h-3" />
          <span>{langKo ? '수행 항목' : 'DID'} ({receipt.did.length})</span>
        </div>
        {receipt.did.length === 0 ? (
          <div className="text-text-tertiary text-[10px] pl-4">{langKo ? '(기록 없음)' : '(empty)'}</div>
        ) : (
          <ul className="pl-4 space-y-0.5">
            {receipt.did.map((d, idx) => (
              <li key={idx} className="text-text-primary text-[11px]">
                <span className="text-accent-green mr-1">✓</span>
                <span className="font-medium">{d.action}</span>
                <span className="text-text-tertiary"> — {d.evidence}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* SKIPPED 섹션 */}
      <div>
        <div className="flex items-center gap-1 text-[10px] text-accent-amber font-bold uppercase tracking-wider mb-1">
          <CircleX className="w-3 h-3" />
          <span>{langKo ? '보류 항목' : 'SKIPPED'} ({receipt.skipped.length})</span>
        </div>
        {receipt.skipped.length === 0 ? (
          <div className="text-text-tertiary text-[10px] pl-4">{langKo ? '(없음)' : '(none)'}</div>
        ) : (
          <ul className="pl-4 space-y-0.5">
            {receipt.skipped.map((s, idx) => (
              <li key={idx} className="text-text-primary text-[11px]">
                <span className="text-accent-amber mr-1">✗</span>
                <span className="font-medium">{s.action}</span>
                <span className="text-text-tertiary"> — {s.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* METRICS 섹션 */}
      <div>
        <div className="flex items-center gap-1 text-[10px] text-accent-purple font-bold uppercase tracking-wider mb-1">
          <Hash className="w-3 h-3" />
          <span>{langKo ? '기록 정보' : 'Record info'}</span>
        </div>
        <ul className="pl-4 space-y-0.5">
          <li className="text-text-primary text-[11px]">
            <span className="text-text-tertiary">{langKo ? '글자 수: ' : 'Characters: '}</span>
            <span className="font-mono">{receipt.metrics?.chars?.toLocaleString() ?? 0}{langKo ? '자' : ''}</span>
          </li>
          <li className="text-text-primary text-[11px]">
            <span className="text-text-tertiary">{langKo ? '확인 단계: ' : 'Review steps: '}</span>
            <span className="font-mono">{receipt.metrics?.keyInfo ?? 0}/5</span>
          </li>
        </ul>
      </div>

      {/* raw 텍스트 (복사용 — sr-only 가까운 micro hint) */}
      <details className="text-[9px] text-text-tertiary">
        <summary className="cursor-pointer hover:text-text-secondary transition-colors">
          {langKo ? '원본 포맷 보기' : 'Original format'}
        </summary>
        <pre className="mt-1 p-2 bg-bg-tertiary rounded font-mono text-[9px] whitespace-pre-wrap break-all">
          {formatted}
        </pre>
      </details>
    </div>
  );
}

function ChapterRow({
  index,
  name,
  faithful,
  market,
  status,
  hasFaithful,
  hasMarket,
  onFlipF,
  onFlipM,
  onToggleReceiptF,
  onToggleReceiptM,
  faithfulExpanded,
  marketExpanded,
  chapter,
  langKo,
}: {
  index: number;
  name: string;
  faithful: boolean;
  market: boolean;
  status: 'unapproved' | 'partial' | 'fully-approved';
  hasFaithful: boolean;
  hasMarket: boolean;
  onFlipF: () => void;
  onFlipM: () => void;
  onToggleReceiptF: () => void;
  onToggleReceiptM: () => void;
  faithfulExpanded: boolean;
  marketExpanded: boolean;
  chapter: import('@/types/translator').ChapterEntry;
  langKo: boolean;
}) {
  const statusLabel =
    status === 'fully-approved'
      ? langKo ? '전체 승인' : 'fully approved'
      : status === 'partial'
        ? langKo ? '부분 승인' : 'partial'
        : langKo ? '승인 대기' : 'unapproved';

  return (
    <div className="px-3 py-2 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-text-tertiary w-8">#{index + 1}</span>
        <span className="flex-1 truncate text-[12px] text-text-primary">{name}</span>
        <button
          type="button"
          onClick={onToggleReceiptF}
          disabled={!hasFaithful}
          aria-expanded={faithfulExpanded}
          aria-label={langKo ? '원문 보존안 과정기록 보기' : 'View Faithful receipt'}
          className="p-0.5 text-text-tertiary hover:text-accent-green disabled:opacity-30 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          {faithfulExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <button
          type="button"
          disabled={!hasFaithful}
          onClick={onFlipF}
          title={langKo ? '원문 보존안 승인 (권리 보관용)' : 'Approve Faithful (archive)'}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
            faithful
              ? 'bg-accent-green/20 border-accent-green/50 text-accent-green'
              : 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-accent-green'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          {langKo ? '보존' : 'F'}
        </button>
        <button
          type="button"
          onClick={onToggleReceiptM}
          disabled={!hasMarket}
          aria-expanded={marketExpanded}
          aria-label={langKo ? '현지화안 과정기록 보기' : 'View Market receipt'}
          className="p-0.5 text-text-tertiary hover:text-accent-amber disabled:opacity-30 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          {marketExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <button
          type="button"
          disabled={!hasMarket}
          onClick={onFlipM}
          title={langKo ? '현지화안 승인 (출고 검토용)' : 'Approve Market (publish)'}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
            market
              ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
              : 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-accent-amber'
          }`}
        >
          <Globe className="w-3 h-3" />
          {langKo ? '현지' : 'M'}
        </button>
        <span
          className={`text-[9px] font-mono uppercase ${
            status === 'fully-approved'
              ? 'text-accent-purple'
              : status === 'partial'
                ? 'text-accent-amber'
                : 'text-text-tertiary'
          }`}
        >
          {statusLabel}
        </span>
      </div>
      {faithfulExpanded && hasFaithful && (
        <ReceiptDetail chapter={chapter} track="faithful" langKo={langKo} />
      )}
      {marketExpanded && hasMarket && (
        <ReceiptDetail chapter={chapter} track="market" langKo={langKo} />
      )}
    </div>
  );
}

export default SignoffPanel;
