"use client";
// ============================================================
// SignoffPanel — 작가 sign-off (Faithful archive + Market publish 분리 승인)
// 시장 분석 4차 §8 §11.
// ============================================================

import React, { useMemo } from 'react';
import { ShieldCheck, Globe, Stamp, FileBadge2, BookCheck } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import {
  summarizeSignoff,
  toggleSignoff,
  isReadyForPublish,
  chapterSignoffStatus,
} from '@/lib/translation/author-signoff';

export function SignoffPanel() {
  const { chapters, patchChapterAtIndex, langKo } = useTranslator();
  const summary = useMemo(() => summarizeSignoff(chapters), [chapters]);

  const flipFaithful = (i: number) => {
    const ch = chapters[i];
    if (!ch) return;
    const next = toggleSignoff(ch, 'faithful', !ch.faithfulApproved);
    patchChapterAtIndex(i, next);
    // 창작 과정 확인서 hook (silent)
    import('@/lib/translation/process-record-hooks').then((m) => {
      m.recordAuthorSignoff({ chapterName: ch.name, chapterIndex: i, track: 'faithful' });
    }).catch(() => undefined);
  };
  const flipMarket = (i: number) => {
    const ch = chapters[i];
    if (!ch) return;
    const next = toggleSignoff(ch, 'market', !ch.marketApproved);
    patchChapterAtIndex(i, next);
    import('@/lib/translation/process-record-hooks').then((m) => {
      m.recordAuthorSignoff({ chapterName: ch.name, chapterIndex: i, track: 'market' });
    }).catch(() => undefined);
  };

  const faithfulPublishReady = isReadyForPublish(chapters, 'faithful');
  const marketPublishReady = isReadyForPublish(chapters, 'market');

  return (
    <section className="flex flex-col h-full min-h-0">
      <header className="px-3 py-2 border-b border-border bg-bg-secondary/60 shrink-0">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <Stamp className="w-4 h-4 text-accent-purple" />
          {langKo ? '작가 sign-off' : 'Author Sign-off'}
        </h3>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {langKo
            ? 'Faithful = 저작권 archive, Market = 출판본'
            : 'Faithful = archive, Market = publish'}
        </p>
        {/* 요약 */}
        <div className="mt-2 grid grid-cols-3 gap-1 text-center">
          <Stat label="F" value={`${summary.faithfulApproved}/${summary.total}`} color="text-accent-green" />
          <Stat label="M" value={`${summary.marketApproved}/${summary.total}`} color="text-accent-amber" />
          <Stat label="ALL" value={`${summary.fullyApproved}/${summary.total}`} color="text-accent-purple" />
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
            {langKo ? 'Faithful 완료' : 'Faithful ready'}
          </span>
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded ${
              marketPublishReady
                ? 'bg-accent-green/15 text-accent-green border border-accent-green/30'
                : 'bg-white/[0.02] text-text-tertiary border border-white/10'
            }`}
          >
            <BookCheck className="w-3 h-3" />
            {langKo ? 'Market 출판 가능' : 'Market publishable'}
          </span>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {chapters.map((ch, i) => (
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
  langKo: boolean;
}) {
  return (
    <div className="px-3 py-2 flex items-center gap-2">
      <span className="font-mono text-[10px] text-text-tertiary w-8">#{index + 1}</span>
      <span className="flex-1 truncate text-[12px] text-text-primary">{name}</span>
      <button
        type="button"
        disabled={!hasFaithful}
        onClick={onFlipF}
        title={langKo ? 'Faithful 승인 (저작권 archive)' : 'Approve Faithful (archive)'}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors disabled:opacity-30 ${
          faithful
            ? 'bg-accent-green/20 border-accent-green/50 text-accent-green'
            : 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-accent-green'
        }`}
      >
        <ShieldCheck className="w-3 h-3" />
        F
      </button>
      <button
        type="button"
        disabled={!hasMarket}
        onClick={onFlipM}
        title={langKo ? 'Market 승인 (출판)' : 'Approve Market (publish)'}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors disabled:opacity-30 ${
          market
            ? 'bg-accent-amber/20 border-accent-amber/50 text-accent-amber'
            : 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-accent-amber'
        }`}
      >
        <Globe className="w-3 h-3" />
        M
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
        {status}
      </span>
    </div>
  );
}

export default SignoffPanel;
