"use client";
// ============================================================
// SegmentAdoptionPanel — 세그먼트별 Faithful/Market 채택 UI.
// 시장 분석 4차 §8 §11 본질: 번역가 검토 → 작가 승인 흐름.
// ============================================================

import React, { useMemo, useState } from 'react';
import { ShieldCheck, Globe, Edit3, Clock, CheckSquare } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import {
  buildSegments,
  setSegmentAction,
  finalizeSegments,
  summarizeAdoption,
  type AdoptionAction,
  type TranslationSegmentAdoption,
} from '@/lib/translation/segment-adoption';

export function SegmentAdoptionPanel() {
  const { source, chapters, activeChapterIndex, patchActiveChapter, langKo } = useTranslator();
  const active = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  const faithful = active?.resultFaithful ?? null;
  const market = active?.resultMarket ?? null;

  const [segments, setSegments] = useState<TranslationSegmentAdoption[]>(() =>
    buildSegments(source, faithful, market),
  );

  // active chapter 변경 시 재빌드
  React.useEffect(() => {
    setSegments(buildSegments(source, faithful, market));
  }, [source, faithful, market]);

  const stats = useMemo(() => summarizeAdoption(segments), [segments]);

  const setAction = (index: number, action: AdoptionAction) => {
    setSegments((prev) => setSegmentAction(prev, index, action));
  };
  const setManual = (index: number, text: string) => {
    setSegments((prev) => setSegmentAction(prev, index, 'manual', { manualText: text }));
  };
  const applyFinalize = () => {
    if (!active) return; // active null 가드 — finalize 자체가 active 필요
    const final = finalizeSegments(segments);
    patchActiveChapter({ result: final });
    // [전체 검증 사이클 — 2026-05-09] 미연결 함수 wiring — 창작 과정 확인서 hook 호출.
    // 이전 (오평가): recordSegmentAdoption export 만 있고 호출 0건 → 채택 결과가 process record 에 안 들어감.
    // 수리: finalize 시 silent hook — 작가가 출판 시 첨부 가능한 artifact 에 segment 채택 통계 누적.
    const chapterName = active.name;
    const chapterIndex = activeChapterIndex ?? 0;
    import('@/lib/translation/process-record-hooks')
      .then((m) => m.recordSegmentAdoption(segments, { chapterName, chapterIndex }))
      .catch(() => undefined);
  };

  if (!active) {
    return (
      <div className="p-6 text-center text-xs text-text-tertiary">
        {langKo ? '활성 챕터 없음' : 'No active chapter'}
      </div>
    );
  }

  if (!faithful && !market) {
    return (
      <div className="p-6 text-center text-xs text-text-tertiary">
        {langKo
          ? '듀얼 번역 결과가 없습니다. AuditPanel 에서 "듀얼 출력" 선택 후 번역 실행.'
          : 'No dual translation results. Run dual translation first.'}
      </div>
    );
  }

  return (
    <section className="flex flex-col h-full min-h-0">
      <header className="px-3 py-2 border-b border-border bg-bg-secondary/60 shrink-0">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-accent-purple" />
          {langKo ? '세그먼트 채택' : 'Segment Adoption'}
        </h3>
        <p className="text-[10px] text-text-tertiary mt-0.5">
          {langKo ? '단락별 Faithful / Market / 직접 편집' : 'Per-segment Faithful / Market / Manual'}
        </p>
        {/* 통계 */}
        <div className="mt-2 grid grid-cols-4 gap-1 text-center">
          <Stat label={langKo ? 'F' : 'F'} value={stats.faithful} color="text-accent-green" />
          <Stat label={langKo ? 'M' : 'M'} value={stats.market} color="text-accent-amber" />
          <Stat label={langKo ? '편집' : 'Edit'} value={stats.manual} color="text-accent-blue" />
          <Stat label={langKo ? '대기' : 'Pend'} value={stats.pending} color="text-text-tertiary" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[10px] text-text-secondary">
            {Math.round(stats.completionRate * 100)}% {langKo ? '완료' : 'done'}
          </div>
          <button
            type="button"
            onClick={applyFinalize}
            className="px-2 py-1 rounded text-[10px] font-bold bg-accent-purple/15 text-accent-purple hover:bg-accent-purple/25 border border-accent-purple/30"
          >
            {langKo ? '최종본 생성' : 'Finalize'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {segments.map((seg) => (
          <SegmentRow
            key={seg.index}
            seg={seg}
            onAction={(a) => setAction(seg.index, a)}
            onManual={(t) => setManual(seg.index, t)}
            langKo={langKo}
          />
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-[14px] font-bold ${color}`}>{value}</div>
      <div className="text-[8px] uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  );
}

function SegmentRow({
  seg,
  onAction,
  onManual,
  langKo,
}: {
  seg: TranslationSegmentAdoption;
  onAction: (a: AdoptionAction) => void;
  onManual: (t: string) => void;
  langKo: boolean;
}) {
  return (
    <li className="px-3 py-2 list-none">
      <div className="text-[10px] text-text-tertiary mb-1 line-clamp-2 italic">
        {seg.source.slice(0, 100)}{seg.source.length > 100 ? '…' : ''}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        {seg.faithful && (
          <button
            type="button"
            onClick={() => onAction('faithful')}
            className={`text-left p-2 rounded border ${
              seg.action === 'faithful'
                ? 'bg-accent-green/15 border-accent-green/50 ring-1 ring-accent-green/30'
                : 'bg-white/[0.02] border-white/10 hover:bg-accent-green/5'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <ShieldCheck className="w-3 h-3 text-accent-green" />
              <span className="font-mono text-[9px] text-accent-green">FAITHFUL</span>
            </div>
            <span className="text-text-primary">{seg.faithful.slice(0, 120)}</span>
          </button>
        )}
        {seg.market && (
          <button
            type="button"
            onClick={() => onAction('market')}
            className={`text-left p-2 rounded border ${
              seg.action === 'market'
                ? 'bg-accent-amber/15 border-accent-amber/50 ring-1 ring-accent-amber/30'
                : 'bg-white/[0.02] border-white/10 hover:bg-accent-amber/5'
            }`}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <Globe className="w-3 h-3 text-accent-amber" />
              <span className="font-mono text-[9px] text-accent-amber">MARKET</span>
            </div>
            <span className="text-text-primary">{seg.market.slice(0, 120)}</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Edit3 className="w-3 h-3 text-accent-blue" />
        <textarea
          className="flex-1 bg-bg-secondary/30 border border-white/10 rounded px-2 py-1 text-[11px] text-text-primary outline-none focus:border-accent-blue/40"
          placeholder={langKo ? '직접 편집…' : 'Edit manually…'}
          value={seg.manualText ?? ''}
          onChange={(e) => onManual(e.target.value)}
          rows={1}
        />
        {seg.action === 'pending' && (
          <Clock className="w-3 h-3 text-text-tertiary" aria-label="pending" />
        )}
      </div>
    </li>
  );
}

export default SegmentAdoptionPanel;
