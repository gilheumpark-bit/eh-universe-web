"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Activity, AlertTriangle, BookOpen, CheckCircle, Loader2, Shield, ShieldAlert, Sparkles } from 'lucide-react';
import type { NCGReport, NCTReport } from '@/lib/translation/ncg-nct';
import { useTranslator } from '../core/TranslatorContext';
import {
  AxisBar,
  CreativeChecklistSection,
  buildAuditIssues,
  buildAxesFromScore,
  normalizeLang,
  scoreColor,
  type ChecklistContext,
} from './AuditPanel.helpers';
import { PublishAuditSection } from './AuditPanel.sections';
import { scoreTranslation } from '@/hooks/useTranslation';
import {
  getDefaultConfig,
  type ChunkScoreDetail,
  type TranslationMode as EngineScoringMode,
} from '@/engine/translation';
import { searchTM, type TMMatch } from '@/lib/translation/translation-memory';
import { scoreToBand, bandModeColor } from '@/lib/translation/bands';
// [1원칙 fix — 2026-05-08] 원문 보존 결정론적 검증 (LLM 호출 없음)
import { runIntegrityCheck, summarizeIntegrity, type IntegrityReport } from '@/lib/translation/source-integrity';
// [Track-D Phase 1 P0-1] 외부 status 4언어 매핑 (한국어 하드코드 제거)
import { mapInternalToExternalStatus, type InternalStatus } from '@/lib/creative-process';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';

// ============================================================
// PART 4b — TM Suggestions (번역 메모리 유사 매치)
// ============================================================
function TMSuggestionsSection() {
  const { source, to, glossary, setGlossary } = useTranslator();
  const matches = useMemo<TMMatch[]>(() => {
    if (!source || source.trim().length < 20) return [];
    try {
      const targetUpper = (to || 'EN').toUpperCase();
      const sentences = source
        .split(/[.!?…]+\s*|\n+/)
        .map(s => s.trim())
        .filter(s => s.length >= 15)
        .slice(0, 8);
      const allMatches: TMMatch[] = [];
      for (const sent of sentences) {
        const found = searchTM(sent, targetUpper, 0.65);
        if (found.length > 0) allMatches.push(found[0]);
      }
      const seen = new Set<string>();
      return allMatches
        .sort((a, b) => b.similarity - a.similarity)
        .filter(match => {
          if (seen.has(match.entry.source)) return false;
          seen.add(match.entry.source);
          return true;
        })
        .slice(0, 5);
    } catch {
      return [];
    }
  }, [source, to]);
  const [collapsed, setCollapsed] = useState(false);
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  /** TM 매치의 원문-번역 쌍을 용어집에 추가 (이미 있으면 덮어쓰기) */
  const handleAddToGlossary = useCallback((match: TMMatch) => {
    const src = match.entry.source.trim().slice(0, 100);
    const tgt = match.entry.target.trim().slice(0, 200);
    if (!src || !tgt) return;
    setGlossary(prev => ({ ...(prev ?? {}), [src]: tgt }));
    setAddedKeys(prev => new Set(prev).add(src));
  }, [setGlossary]);

  if (matches.length === 0) return null;

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="min-h-[44px] w-full flex items-center justify-between gap-2 text-text-secondary hover:text-text-primary transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-accent-indigo" />
          <span className="text-[12px] font-medium">번역 메모리 매칭</span>
          <span className="text-[10px] text-accent-indigo bg-accent-indigo/10 px-1.5 py-0.5 rounded">{matches.length}</span>
        </div>
        <span className={`text-[10px] text-text-tertiary transition-transform ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>

      {!collapsed && (
        <div className="space-y-1.5 pt-1">
          {matches.map((m, i) => {
            const pct = Math.round(m.similarity * 100);
            const color = pct >= 90 ? 'text-accent-green' : pct >= 80 ? 'text-accent-amber' : 'text-accent-indigo';
            const srcKey = m.entry.source.trim().slice(0, 100);
            const inGlossary = Boolean(glossary?.[srcKey]);
            const justAdded = addedKeys.has(srcKey);
            return (
              <div key={i} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono font-bold ${color}`}>{pct}%</span>
                  <span className="text-[9px] text-text-tertiary font-mono uppercase">{m.type}</span>
                  {m.entry.confirmed && (
                    <span className="text-[9px] text-accent-green bg-accent-green/10 px-1 rounded">확정</span>
                  )}
                  <span className="text-[9px] text-text-tertiary font-mono">{m.entry.sourceLang}→{m.entry.targetLang}</span>
                  <button
                    type="button"
                    onClick={() => handleAddToGlossary(m)}
                    disabled={justAdded || inGlossary}
                    className={`ml-auto text-[9px] px-1.5 py-0.5 rounded border font-mono transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                      justAdded || inGlossary
                        ? 'border-accent-green/30 bg-accent-green/10 text-accent-green cursor-default'
                        : 'border-accent-indigo/30 bg-accent-indigo/5 text-accent-indigo hover:bg-accent-indigo/15'
                    }`}
                    title={inGlossary ? '이미 용어집에 있음' : '원문-번역 쌍을 용어집에 추가'}
                  >
                    {justAdded || inGlossary ? '📖 용어집에 있음' : '+ 용어집'}
                  </button>
                </div>
                <div className="text-[10px] text-text-tertiary truncate" title={m.entry.source}>
                  원문: {m.entry.source.slice(0, 80)}{m.entry.source.length > 80 ? '…' : ''}
                </div>
                <div className="text-[11px] text-text-secondary leading-snug" title={m.entry.target}>
                  번역: {m.entry.target.slice(0, 120)}{m.entry.target.length > 120 ? '…' : ''}
                </div>
              </div>
            );
          })}
          <p className="text-[9px] text-text-tertiary italic text-center pt-1">
            과거 번역과 유사한 원문입니다. 참고하세요.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 5 — AuditPanel (Main)
// ============================================================
export function AuditPanel() {
  const {
    source,
    result,
    chapters,
    glossaryText,
    glossary,
    from,
    to,
    autoRegenEnabled,
    setAutoRegenEnabled,
    autoRegenAttempts,
    outputMode,
    setOutputMode,
    // [creative:quality-checklist rank 7] 5 도메인 추론 컨텍스트
    worldContext,
    characterProfiles,
    storySummary,
    completedChapters,
  } = useTranslator();
  const layout = useTranslatorLayout();

  // [A.4 + B.4 — 2026-05-08] NCG/NCT 결과 실시간 표시. localStorage + CustomEvent + storage event 3중 갱신.
  // race 보강: 1) mount 시 즉시 read, 2) CustomEvent 'noa:translator-ncg-nct-updated' listener, 3) storage event (다른 탭 동기화)
  const [ncgReport, setNcgReport] = useState<NCGReport | null>(null);
  const [nctReport, setNctReport] = useState<NCTReport | null>(null);
  useEffect(() => {
    const refresh = () => {
      try {
        const ncgRaw = localStorage.getItem('noa_translator_lastNCG');
        setNcgReport(ncgRaw ? (JSON.parse(ncgRaw) as NCGReport) : null);
        const nctRaw = localStorage.getItem('noa_translator_lastNCT');
        setNctReport(nctRaw ? (JSON.parse(nctRaw) as NCTReport) : null);
      } catch { /* skip */ }
    };
    refresh();
    const handler = () => refresh();
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'noa_translator_lastNCG' || e.key === 'noa_translator_lastNCT') refresh();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('noa:translator-ncg-nct-updated', handler);
      window.addEventListener('storage', storageHandler);
      // 추가 보강 — 60초 polling (CustomEvent 누락 대비, mount race)
      const polling = setInterval(refresh, 60_000);
      return () => {
        window.removeEventListener('noa:translator-ncg-nct-updated', handler);
        window.removeEventListener('storage', storageHandler);
        clearInterval(polling);
      };
    }
    return undefined;
  }, []);

  const issues = useMemo(
    () => buildAuditIssues(source, result, chapters, glossaryText, glossary),
    [source, result, chapters, glossaryText, glossary]
  );

  // [1원칙 fix — 2026-05-08] 원문 보존 결정론적 검증 — LLM 호출 없이 매 변경 시 자동 갱신
  const integrityReport = useMemo<IntegrityReport | null>(() => {
    if (source.trim().length < 10 || result.trim().length === 0) return null;
    try {
      return runIntegrityCheck({
        source,
        translation: result,
        srcLang: normalizeLang(from || 'ko'),
        tgtLang: normalizeLang(to || 'en'),
      });
    } catch {
      return null;
    }
  }, [source, result, from, to]);

  const heuristicScore = useMemo(() => {
    let penalty = 0;
    for (const issue of issues) {
      if (issue.severity === 'high') penalty += 18;
      else if (issue.severity === 'medium') penalty += 10;
      else penalty += 4;
    }
    return Math.max(0, Math.min(100, 100 - penalty));
  }, [issues]);

  // ── AI 4축/6축 정밀 채점 ──
  const [aiScore, setAiScore] = useState<ChunkScoreDetail | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreMode, setScoreMode] = useState<EngineScoringMode>('fidelity');

  const canScore = source.trim().length >= 20 && result.trim().length >= 20;

  const handleRunAIScore = useCallback(async () => {
    if (!canScore || scoring) return;
    setScoring(true);
    setScoreError(null);
    try {
      const toUpper = (to || '').toUpperCase();
      const targetLang: 'EN' | 'JP' | 'CN' | 'KO' =
        toUpper === 'KO' ? 'KO'
        : toUpper === 'JP' || toUpper === 'JA' || toUpper === 'JAPANESE' ? 'JP'
        : toUpper === 'CN' || toUpper === 'ZH' || toUpper === 'CHINESE' ? 'CN'
        : 'EN';
      const config = { ...getDefaultConfig(scoreMode), targetLang };
      const s = await scoreTranslation(source, result, config);
      setAiScore(s);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : '점검 실패');
    } finally {
      setScoring(false);
    }
  }, [canScore, scoring, scoreMode, source, result, to]);

  const axes = aiScore ? buildAxesFromScore(aiScore) : [];
  const aiOverall = aiScore ? Math.round(aiScore.overall) : null;

  // [creative:quality-checklist rank 7] 5 도메인 컨텍스트 — 매 변경 시 재추론
  const checklistCtx = useMemo<ChecklistContext>(
    () => ({
      source,
      result,
      worldContext: worldContext ?? '',
      characterProfiles: characterProfiles ?? '',
      storySummary: storySummary ?? '',
      glossary: glossary ?? {},
      chaptersCount: chapters?.length ?? 0,
      completedChapters: completedChapters ?? 0,
    }),
    [source, result, worldContext, characterProfiles, storySummary, glossary, chapters, completedChapters],
  );

  return (
    <div className="flex h-full flex-col font-sans">
      {/* ── Header ── */}
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-text-secondary">
            <Activity className="w-4 h-4 text-accent-green" />
            <span className="text-[13px] font-medium">품질 점검</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* [1원칙 fix — 2026-05-08] 원문 보존 배지 — 최우선 노출 (잘라먹기 방지) */}
            {integrityReport && (
              <span
                className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border font-bold ${
                  integrityReport.status === 'fail'
                    ? 'bg-accent-red/15 border-accent-red/40 text-accent-red'
                    : integrityReport.status === 'warn'
                      ? 'bg-accent-amber/15 border-accent-amber/40 text-accent-amber'
                      : 'bg-accent-green/15 border-accent-green/40 text-accent-green'
                }`}
                title="원문 누락 여부를 먼저 확인합니다"
              >
                <ShieldAlert className="w-3 h-3" /> 원문 {integrityReport.score}%
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-text-secondary bg-white/[0.03] px-2 py-0.5 rounded border border-white/10" title="원문·번역문·회차·용어 휴리스틱 자동 점검">
              <CheckCircle className="w-3 h-3" /> 자동 {heuristicScore}%
            </span>
            {aiOverall !== null && (
              <span className={`flex items-center gap-1 text-[11px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/10 ${scoreColor(aiOverall)}`} title={`노아 품질 점검 (${scoreMode === 'fidelity' ? '원문 보존형' : '독자 경험형'})`}>
                <Sparkles className="w-3 h-3" /> 노아 {aiOverall}%
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-text-tertiary mt-2 leading-snug">
          <strong className="text-accent-green">원문 보존</strong> 은 단락·단어 수·누락 의심을 먼저 확인합니다. 노아 품질 점검은 원문 보존과 독자 경험을 나눠 보여줍니다.
        </p>
        <button
          type="button"
          onClick={() => layout.setActiveRightPanel('localization')}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-accent-amber/25 bg-accent-amber/10 px-3 py-2 text-[11px] font-semibold text-accent-amber transition-colors hover:bg-accent-amber/15 focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          현지 판단 카드 보기
        </button>
        {/* [A.4 — 2026-05-08] NCG / NCT 결과 배지 — runDualTranslate 자동 호출 결과 시각 표시. */}
        {(ncgReport || nctReport) && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3 h-3 text-accent-blue" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                사전·사후 점검
              </span>
              <span className="text-[9px] text-text-tertiary italic">번역 전후 확인</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* NCG */}
              <div className={`px-2 py-1.5 rounded border text-[10px] ${
                ncgReport?.decision === 'block'
                  ? 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                  : ncgReport?.decision === 'warn'
                    ? 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber'
                    : ncgReport?.decision === 'pass'
                      ? 'bg-accent-green/10 border-accent-green/40 text-accent-green'
                      : 'bg-white/[0.02] border-white/10 text-text-tertiary'
              }`}>
                <div className="font-bold">사전 점검 · {ncgReport?.decision ?? '대기'}</div>
                <div className="text-[9px] opacity-80 mt-0.5">
                  {ncgReport?.violations.length ?? 0}건 · 번역 전 확인
                </div>
              </div>
              {/* NCT */}
              <div className={`px-2 py-1.5 rounded border text-[10px] ${
                nctReport?.recommendation === 'reject'
                  ? 'bg-accent-red/10 border-accent-red/40 text-accent-red'
                  : nctReport?.recommendation === 'review'
                    ? 'bg-accent-amber/10 border-accent-amber/40 text-accent-amber'
                    : nctReport?.recommendation === 'publish'
                      ? 'bg-accent-green/10 border-accent-green/40 text-accent-green'
                      : 'bg-white/[0.02] border-white/10 text-text-tertiary'
              }`}>
                <div className="font-bold">사후 점검 · {nctReport?.recommendation ?? '대기'}</div>
                <div className="text-[9px] opacity-80 mt-0.5">
                  보존안 {nctReport?.faithful?.status ?? '—'} · 현지화안 {nctReport?.market?.status ?? '—'}
                </div>
              </div>
            </div>
            {nctReport?.glossaryMisses && nctReport.glossaryMisses.length > 0 && (
              <p className="text-[9px] text-accent-amber mt-1.5">
                용어집 누락 {nctReport.glossaryMisses.length}건 · 검토 권장
              </p>
            )}
          </div>
        )}

        {/* [시장 분석 4차] 2개 출력 모델 토글 — Source-faithful / Market-ready / default */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3 h-3 text-accent-purple" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">출력 모드</span>
            </div>
            <span className="text-[9px] text-text-tertiary italic">원문은 지키고, 독자에게는 자연스럽게</span>
          </div>
          <div role="radiogroup" aria-label="번역 출력 모드" className="grid grid-cols-2 gap-1 mt-2">
            {([
              { id: 'dual' as const, label: '두 안 비교 (권장)', en: '보존+현지화', desc: '원문 보존안과 현지화안을 함께 만들고 나란히 검토합니다.', highlight: true },
              { id: 'faithful' as const, label: '원문 보존', en: '보존안', desc: '작가 의도·고유명사·복선·문체 유지 (단일 결과)' },
              { id: 'market' as const, label: '현지화', en: '현지화안', desc: '대사 리듬·호칭·장르 문법·시장 감각 (단일 결과)' },
              { id: 'default' as const, label: '통합', en: '기존 방식', desc: '기존 문맥 점검 흐름으로 한 가지 결과를 만듭니다.' },
            ]).map((m) => {
              const active = outputMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setOutputMode(m.id)}
                  title={m.desc}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                    active
                      ? m.highlight
                        ? 'bg-accent-green/15 border-accent-green/50 text-accent-green ring-1 ring-accent-green/30'
                        : 'bg-accent-purple/15 border-accent-purple/50 text-accent-purple'
                      : m.highlight
                        ? 'bg-accent-green/5 border-accent-green/20 text-accent-green/80 hover:bg-accent-green/10'
                        : 'bg-white/[0.02] border-white/10 text-text-tertiary hover:text-text-secondary hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[11px] font-bold">{m.label}</span>
                  <span className="text-[8px] font-mono uppercase tracking-wider opacity-70">{m.en}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        {/* [1원칙 fix — 2026-05-08] 원문 보존 결정론적 검증 — 최우선 노출 */}
        {integrityReport && integrityReport.status !== 'pass' && (
          <section
            className={`rounded-lg border p-3 ${
              integrityReport.status === 'fail'
                ? 'bg-accent-red/10 border-accent-red/40'
                : 'bg-accent-amber/10 border-accent-amber/40'
            }`}
            aria-label="번역 1원칙 검증"
          >
            <header className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${integrityReport.status === 'fail' ? 'text-accent-red' : 'text-accent-amber'}`} />
                <h3 className="text-[12px] font-bold text-text-primary">
                  번역 1원칙 — 원문 보존 검증
                </h3>
              </div>
              <span className={`text-[11px] font-mono font-bold ${integrityReport.status === 'fail' ? 'text-accent-red' : 'text-accent-amber'}`}>
                {summarizeIntegrity(integrityReport, 'ko')}
              </span>
            </header>
            <ul className="space-y-1.5">
              {integrityReport.issues.map((iss, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px]">
                  {iss.severity === 'fail' ? (
                    <AlertTriangle className="w-3 h-3 text-accent-red shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-accent-amber shrink-0 mt-0.5" />
                  )}
                  <span className="text-text-secondary leading-snug">{iss.message.ko}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-3 text-[10px] font-mono text-text-tertiary">
              <span>원문 단락 {integrityReport.metrics.sourceParagraphs} → 번역 {integrityReport.metrics.translationParagraphs}</span>
              <span>·</span>
              <span>비율 {Math.round(integrityReport.metrics.wordRatio * 100)}%</span>
            </div>
          </section>
        )}
        {integrityReport && integrityReport.status === 'pass' && (
          <section className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2 flex items-center gap-2 text-[11px]" aria-label="번역 1원칙 통과">
            <CheckCircle className="w-3.5 h-3.5 text-accent-green shrink-0" />
            <span className="text-accent-green font-medium">번역 1원칙 통과 — 원문 보존 100%</span>
            <span className="text-text-tertiary font-mono ml-auto text-[10px]">
              {integrityReport.metrics.sourceParagraphs} 단락 · 비율 {Math.round(integrityReport.metrics.wordRatio * 100)}%
            </span>
          </section>
        )}

        {/* ── TM 매칭 (번역 메모리 유사 제안) ── */}
        <TMSuggestionsSection />

        {/* ── 5 도메인 완성도 (creative:quality-checklist) ── */}
        <CreativeChecklistSection ctx={checklistCtx} />

        {/* ── 출판 검수 (로컬 규칙, 무료) ── */}
        <PublishAuditSection />

        {/* ── 노아 품질 점검 섹션 ── */}
        <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-text-secondary">
              <Sparkles className="w-3.5 h-3.5 text-accent-amber" />
              <span className="text-[12px] font-medium">노아 품질 점검</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScoreMode('fidelity')}
                className={`min-h-[44px] min-w-[44px] text-[10px] px-2 py-2 rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${scoreMode === 'fidelity' ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-white/10 text-text-tertiary hover:text-text-secondary'}`}
                title="원문 보존형 — 정확성·자연스러움·완성도·포맷"
              >원문</button>
              <button
                type="button"
                onClick={() => setScoreMode('experience')}
                className={`min-h-[44px] min-w-[44px] text-[10px] px-2 py-2 rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${scoreMode === 'experience' ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-white/10 text-text-tertiary hover:text-text-secondary'}`}
                title="독자 경험형 — 몰입·감정·문화·일관·근거·투명"
              >독자</button>
            </div>
          </div>

          {!aiScore && !scoring && (
            <button
              type="button"
              onClick={handleRunAIScore}
              disabled={!canScore}
              className="w-full min-h-[44px] rounded-md bg-accent-amber/15 hover:bg-accent-amber/25 text-accent-amber border border-accent-amber/30 text-[12px] font-medium transition-colors disabled:bg-bg-tertiary disabled:text-text-quaternary disabled:opacity-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              title={canScore ? '현재 원문·번역문을 노아로 품질 점검' : '원문/번역문이 20자 이상일 때 실행 가능'}
            >
              {canScore ? `노아 ${scoreMode === 'fidelity' ? '원문 보존' : '독자 경험'} 점검` : '원문/번역문 20자 이상 필요'}
            </button>
          )}

          {scoring && (
            <div className="flex items-center gap-2 text-[12px] text-text-secondary py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-amber" />
              <span>노아 점검 중… (10~25초)</span>
            </div>
          )}

          {scoreError && !scoring && (
            <div className="flex items-center gap-2 text-[11px] text-accent-red bg-accent-red/5 border border-accent-red/20 rounded p-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{scoreError}</span>
            </div>
          )}

          {aiScore && !scoring && (
            <>
              <div className="flex items-center justify-between gap-3 pt-1 pb-2 border-b border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider">종합</span>
                  <span className={`text-2xl font-bold font-mono ${scoreColor(aiOverall ?? 0)}`}>{aiOverall}</span>
                </div>
                {/* [41-band 2026-04-25] README.ko.md 약속의 UI 측 wiring — Overall 점수를 41-band 분류로 노출 */}
                {(() => {
                  const band = scoreToBand(aiOverall ?? 0);
                  // [Track-D Phase 1 P0-1 — 2026-05-07] 4언어 외부 status (한국어 하드코드 제거)
                  // band.mode → InternalStatus 매핑 → mapInternalToExternalStatus 4언어 라벨
                  const internalStatus: InternalStatus = band.mode === 'F' ? 'REVIEW_NEEDED'
                    : band.mode === 'C' ? 'HUMAN_REVIEW_LOW'
                    : 'READY';
                  // 'to' 가 4언어 (ko/en/ja/zh) — TranslatorContext 에서 lowercase
                  const certLang = (['ko', 'en', 'ja', 'zh'].includes(to as string) ? to : 'ko') as 'ko' | 'en' | 'ja' | 'zh';
                  const externalStatusLabel = mapInternalToExternalStatus(internalStatus, certLang);
                  return (
                    <div className="flex flex-col items-center" title={`Band ${band.display} · Mode ${band.mode} · ${externalStatusLabel}`}>
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider">등급</span>
                      <span
                        className="text-xl font-bold font-mono"
                        style={{ color: bandModeColor(band.mode) }}
                      >
                        {band.label}
                      </span>
                      <span className="text-[9px] text-text-tertiary font-mono">{band.display}</span>
                      <span className="text-[9px] text-text-tertiary mt-0.5" style={{ color: bandModeColor(band.mode), opacity: 0.85 }}>
                        {externalStatusLabel}
                      </span>
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={handleRunAIScore}
                  className="min-h-[44px] min-w-[44px] px-2 text-[10px] text-text-tertiary hover:text-accent-amber transition-colors underline underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                  title="현재 설정으로 다시 점검"
                >다시 점검</button>
              </div>
              <div className="space-y-2.5">
                {axes.map((row) => <AxisBar key={row.label} row={row} />)}
              </div>
              <p className="text-[9px] text-text-tertiary italic">
                {scoreMode === 'fidelity' ? '원문 보존형 — 원문 구조·의미 보존 중심' : '독자 경험형 — 타겟 독자 몰입 중심'}
              </p>
              {/* [Track-D Phase 1 P0-3 + Round 2-1 — 2026-05-07] 자동 재창조 토글 4언어 */}
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 mt-1.5">
                <label className="relative flex min-h-[44px] items-center gap-2 cursor-pointer text-[11px] text-text-tertiary">
                  <input
                    type="checkbox"
                    checked={autoRegenEnabled}
                    onChange={(e) => setAutoRegenEnabled(e.target.checked)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      autoRegenEnabled ? 'border-accent-amber bg-accent-amber text-white' : 'border-border bg-bg-primary'
                    }`}
                  >
                    {autoRegenEnabled ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span>
                    {to === 'en'
                      ? 'Auto-retry when quality is low (up to 2)'
                      : to === 'ja'
                      ? '品質が低い場合は自動再試行(最大2回)'
                      : to === 'zh'
                      ? '质量较低时自动重试(最多 2 次)'
                      : '자동 재시도 (품질이 낮으면 표현 다양도 조정, 최대 2회)'}
                  </span>
                </label>
                {autoRegenAttempts !== null && (
                  <span className="text-[10px] text-accent-amber font-mono" title={
                    to === 'en' ? 'Total attempts of last chunked translation'
                    : to === 'ja' ? '最後の分割翻訳の総試行回数'
                    : to === 'zh' ? '最后一次分块翻译的总尝试次数'
                    : '마지막 분할 번역의 총 시도 횟수'
                  }>
                    시도 {autoRegenAttempts}회
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── 자동 점검 (기존 휴리스틱) ── */}
        {issues.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] text-text-tertiary">
            <ShieldAlert className="w-3.5 h-3.5 text-accent-amber shrink-0" />
            <span>
              {issues.filter((i) => i.severity === 'high').length > 0 ? `${issues.filter((i) => i.severity === 'high').length} high / ` : ''}
              {issues.filter((i) => i.severity === 'medium').length > 0 ? `${issues.filter((i) => i.severity === 'medium').length} medium / ` : ''}
              낮은 위험 {issues.filter((i) => i.severity === 'low').length}건 · 자동 점검 {issues.length}건
            </span>
          </div>
        )}

        {issues.map((issue) => (
          <div key={issue.id} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="shrink-0 mt-0.5">
              {issue.severity === 'high' ? (
                <ShieldAlert className="w-4 h-4 text-accent-red" />
              ) : (
                <AlertTriangle className={`w-4 h-4 ${issue.severity === 'medium' ? 'text-accent-amber' : 'text-accent-indigo'}`} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-text-secondary leading-snug">{issue.text}</span>
            </div>
          </div>
        ))}

        {issues.length === 0 && !aiScore && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-60">
            <CheckCircle className="w-8 h-8 text-accent-green" />
            <span className="text-[13px] text-text-secondary w-2/3 text-center">
              자동 점검에서 눈에 띄는 문제를 찾지 못했습니다.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: AuditPanel | role=quality audit + AI scoring | inputs=source,result,chapters,glossary | outputs=UI(heuristic+AI 4/6axis)
