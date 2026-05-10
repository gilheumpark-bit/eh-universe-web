// ============================================================
// PART 1 — Module Header
// ============================================================
//
// TripleEditor.tsx — Source / Faithful / Market 3-pane 비교 에디터.
//
// outputMode === 'dual' 시 BilateralEditor 대체. 시장 분석 4차 §1·§8 본질 구현:
//   "원문 보존 번역 + 현지화 번역을 동시 제공" → 3-pane 비교 view.
//
// 동작:
//   - 좌:    SOURCE (원문, 읽기/쓰기)
//   - 중:    FAITHFUL (Source-faithful Translation, 읽기/쓰기)
//   - 우:    MARKET (Market-ready Localization, 읽기/쓰기)
//   - 동기 스크롤 옵션 — 단락별 정렬
//   - 1원칙 배지 — Faithful 단락 수 일치 시각 확인
//
// [C] 부분 결과 허용 — faithful 또는 market 한쪽 비어 있어도 노출
// [C] outputMode 'dual' 외에는 마운트되지 않음 (TranslatorPanelManager 분기)
// [G] 단순 textarea 3개 + 동기 스크롤 (가벼움)
// [K] 새 컴포넌트로 격리 — BilateralEditor 0byte
// ============================================================

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Languages, Sparkles, Globe, ShieldCheck, AlignLeft } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import {
  runIntegrityCheck,
  summarizeIntegrity,
  type IntegrityReport,
} from '@/lib/translation/source-integrity';

// ============================================================
// PART 2 — Helpers
// ============================================================

function normalizeLang(code: string): 'ko' | 'en' | 'ja' | 'zh' {
  const u = (code || '').toUpperCase();
  if (u === 'KO' || u === 'KR') return 'ko';
  if (u === 'JP' || u === 'JA' || u === 'JAPANESE') return 'ja';
  if (u === 'CN' || u === 'ZH' || u === 'CHINESE') return 'zh';
  return 'en';
}

function buildIntegrity(
  source: string,
  translation: string | undefined,
  from: string,
  to: string,
): IntegrityReport | null {
  if (!translation || translation.trim().length === 0) return null;
  if (source.trim().length < 10) return null;
  try {
    return runIntegrityCheck({
      source,
      translation,
      srcLang: normalizeLang(from),
      tgtLang: normalizeLang(to),
    });
  } catch {
    return null;
  }
}

// ============================================================
// PART 3 — Single Pane
// ============================================================

interface PaneProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  badge?: React.ReactNode;
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>;
  onScroll?: (e: React.UIEvent<HTMLTextAreaElement>) => void;
  accentClass?: string;
  placeholder?: string;
}

function Pane({
  title,
  subtitle,
  icon,
  value,
  onChange,
  readOnly,
  badge,
  scrollRef,
  onScroll,
  accentClass = 'border-border',
  placeholder,
}: PaneProps) {
  const charCount = value.length;
  return (
    <div className={`flex flex-col h-full min-h-0 border ${accentClass} rounded-lg bg-bg-secondary/30 overflow-hidden`}>
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5 bg-bg-secondary/60 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0">{icon}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text-secondary truncate">
            {title}
          </span>
          {subtitle && (
            <span className="text-[9px] text-text-tertiary truncate hidden sm:inline">{subtitle}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          <span className="font-mono text-[10px] text-text-tertiary">{charCount.toLocaleString()}</span>
        </div>
      </header>
      <textarea
        ref={scrollRef}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        onScroll={onScroll}
        spellCheck={false}
        aria-label={title}
        className="flex-1 min-h-0 w-full bg-transparent text-text-primary text-[14px] leading-[1.7] resize-none outline-none p-3 font-serif placeholder:text-text-tertiary/50"
      />
    </div>
  );
}

// ============================================================
// PART 4 — Main Component
// ============================================================

export function TripleEditor() {
  const {
    source,
    setSource,
    from,
    to,
    chapters,
    activeChapterIndex,
    patchActiveChapter,
    langKo,
  } = useTranslator();

  const activeChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  // [B.2 — 2026-05-08] legacy fallback — resultMarket / resultFaithful 결여 시 legacy result 표시.
  // 기존 chapter (single-track) 가 dual 모드에서 빈 화면 노출 방지.
  // Faithful 은 fallback 지원 X (의도 — 듀얼 번역 시에만 생성).
  const resultFaithful = activeChapter?.resultFaithful ?? '';
  const resultMarket = activeChapter?.resultMarket ?? activeChapter?.result ?? '';

  const [syncedScroll, setSyncedScroll] = useState(true);
  const sourceRef = useRef<HTMLTextAreaElement | null>(null);
  const faithfulRef = useRef<HTMLTextAreaElement | null>(null);
  const marketRef = useRef<HTMLTextAreaElement | null>(null);
  const isProgrammaticScroll = useRef(false);

  // useMemo는 React에서 import (이미 사용됨, 안 됐으면 추가)
  // (이미 import 됨 위에서 — useState/useEffect/useRef/useCallback 동일 React에서)

  // 동기 스크롤 — 한 pane 스크롤 시 나머지 두 pane 비례 이동
  const handleSync = useCallback(
    (sourcePane: 'source' | 'faithful' | 'market') => (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (!syncedScroll) return;
      if (isProgrammaticScroll.current) return;
      const fromEl = e.currentTarget;
      const ratio = fromEl.scrollTop / Math.max(1, fromEl.scrollHeight - fromEl.clientHeight);
      const targets: HTMLTextAreaElement[] = [];
      if (sourcePane !== 'source' && sourceRef.current) targets.push(sourceRef.current);
      if (sourcePane !== 'faithful' && faithfulRef.current) targets.push(faithfulRef.current);
      if (sourcePane !== 'market' && marketRef.current) targets.push(marketRef.current);
      isProgrammaticScroll.current = true;
      for (const el of targets) {
        el.scrollTop = ratio * Math.max(1, el.scrollHeight - el.clientHeight);
      }
      // 다음 frame 에 unlock — RAF 가 없으면 setTimeout(0)
      requestAnimationFrame(() => {
        isProgrammaticScroll.current = false;
      });
    },
    [syncedScroll],
  );

  const faithfulIntegrity = buildIntegrity(source, resultFaithful, from, to);
  const marketIntegrity = buildIntegrity(source, resultMarket, from, to);

  const updateFaithful = (v: string) => patchActiveChapter({ resultFaithful: v });
  const updateMarket = (v: string) => patchActiveChapter({ resultMarket: v });

  // [B.3 — 2026-05-08] Faithful vs Market diff 단순 통계 — 단락 단위 변경 비율.
  // [5 — 2026-05-09] 단락별 changed/identical 인덱스 set 추가 — 시각 highlight 용.
  const diffStats = useMemo(() => {
    if (!resultFaithful || !resultMarket) return null;
    const fParas = resultFaithful.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const mParas = resultMarket.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const max = Math.max(fParas.length, mParas.length);
    let identical = 0;
    let changed = 0;
    const changedIndices = new Set<number>();
    for (let i = 0; i < max; i++) {
      const f = (fParas[i] ?? '').trim();
      const m = (mParas[i] ?? '').trim();
      if (!f || !m) continue;
      if (f === m) identical++;
      else {
        changed++;
        changedIndices.add(i);
      }
    }
    return { identical, changed, total: max, changeRate: max === 0 ? 0 : changed / max, changedIndices };
  }, [resultFaithful, resultMarket]);

  const integrityBadge = (report: IntegrityReport | null) => {
    if (!report) return null;
    const cls =
      report.status === 'fail'
        ? 'bg-accent-red/15 border-accent-red/40 text-accent-red'
        : report.status === 'warn'
          ? 'bg-accent-amber/15 border-accent-amber/40 text-accent-amber'
          : 'bg-accent-green/15 border-accent-green/40 text-accent-green';
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold ${cls}`}
        title={summarizeIntegrity(report, langKo ? 'ko' : 'en')}
      >
        <ShieldCheck className="w-2.5 h-2.5" />
        {report.score}%
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full p-2 gap-2">
      {/* 헤더 — 동기 스크롤 토글 + 메타 */}
      <div className="flex items-center justify-between gap-2 shrink-0 px-1">
        <div className="flex items-center gap-2">
          <Languages className="w-3.5 h-3.5 text-accent-purple" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary font-bold">
            {langKo ? '듀얼 출력 비교' : 'Dual Output Compare'}
          </span>
          <span className="text-[10px] text-text-tertiary">
            {langKo ? '원문 ▸ 원문 보존 ▸ 현지화' : 'Source ▸ Faithful ▸ Market'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSyncedScroll((s) => !s)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
            syncedScroll
              ? 'bg-accent-purple/15 border-accent-purple/40 text-accent-purple'
              : 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-text-secondary'
          }`}
          aria-pressed={syncedScroll}
          title={langKo ? '세 패널 스크롤 동기화' : 'Sync scroll across panes'}
        >
          <AlignLeft className="w-3 h-3" />
          {langKo ? '동기 스크롤' : 'Sync scroll'}
        </button>
      </div>

      {/* 3-pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 flex-1 min-h-0">
        {/* SOURCE */}
        <Pane
          title={langKo ? 'SOURCE · 원문' : 'SOURCE'}
          subtitle={(from || '').toUpperCase()}
          icon={<Languages className="w-3.5 h-3.5 text-accent-blue" />}
          value={source}
          onChange={setSource}
          scrollRef={sourceRef}
          onScroll={handleSync('source')}
          accentClass="border-accent-blue/30"
          placeholder={langKo ? '원문을 붙여넣거나 입력하세요' : 'Paste or type source text'}
        />
        {/* FAITHFUL */}
        <Pane
          title={langKo ? 'FAITHFUL · 원문 보존' : 'FAITHFUL'}
          subtitle={(to || '').toUpperCase()}
          icon={<ShieldCheck className="w-3.5 h-3.5 text-accent-green" />}
          value={resultFaithful}
          onChange={updateFaithful}
          scrollRef={faithfulRef}
          onScroll={handleSync('faithful')}
          badge={integrityBadge(faithfulIntegrity)}
          accentClass="border-accent-green/30"
          placeholder={
            langKo
              ? '듀얼 번역 실행 시 자동 생성 (작가 의도·고유명사·복선·문체 보존)'
              : 'Auto-generated on dual translation (preserves intent, names, foreshadowing, voice)'
          }
        />
        {/* MARKET */}
        <Pane
          title={langKo ? 'MARKET · 현지화' : 'MARKET'}
          subtitle={(to || '').toUpperCase()}
          icon={<Globe className="w-3.5 h-3.5 text-accent-amber" />}
          value={resultMarket}
          onChange={updateMarket}
          scrollRef={marketRef}
          onScroll={handleSync('market')}
          badge={integrityBadge(marketIntegrity)}
          accentClass="border-accent-amber/30"
          placeholder={
            langKo
              ? '듀얼 번역 실행 시 자동 생성 (대사 리듬·호칭·장르 문법·시장 감각 적응)'
              : 'Auto-generated on dual translation (dialogue rhythm, honorifics, genre fit, market feel)'
          }
        />
      </div>

      {/* Footer hint + diff stats */}
      <div className="flex items-center justify-between gap-2 shrink-0 px-1 text-[10px] text-text-tertiary">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-accent-purple/60" />
          <span className="italic">
            {langKo
              ? '"원문은 지키고, 시장에는 맞춘다."'
              : '"Faithful where it matters. Localized where it counts."'}
          </span>
          {diffStats && diffStats.total > 0 && (
            <span
              className="ml-2 font-mono px-1.5 py-0.5 rounded bg-accent-purple/10 border border-accent-purple/20 text-accent-purple"
              title={
                diffStats.changedIndices.size > 0
                  ? (langKo ? '변경 단락 번호 (Faithful vs Market): ' : 'Changed paragraphs (F vs M): ') +
                    Array.from(diffStats.changedIndices).map((i) => `#${i + 1}`).slice(0, 20).join(', ') +
                    (diffStats.changedIndices.size > 20 ? '…' : '')
                  : (langKo ? '변경 없음' : 'No changes')
              }
            >
              Δ {diffStats.changed}/{diffStats.total} · {Math.round(diffStats.changeRate * 100)}%
              <span className="ml-1 text-text-tertiary">
                {langKo ? '단락 변경' : 'paragraphs changed'}
              </span>
              {diffStats.changedIndices.size > 0 && diffStats.changedIndices.size <= 5 && (
                <span className="ml-2 text-accent-amber">
                  #{Array.from(diffStats.changedIndices).map((i) => i + 1).join(', #')}
                </span>
              )}
            </span>
          )}
        </div>
        <span className="font-mono">AI prepares · Translators elevate · Authors go global</span>
      </div>
    </div>
  );
}

export default TripleEditor;
