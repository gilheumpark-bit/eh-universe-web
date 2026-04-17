"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useMemo, useState, useCallback } from 'react';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle, Sparkles, Loader2, ListChecks, Wand2 } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { scoreTranslation } from '@/hooks/useTranslation';
import {
  getDefaultConfig,
  isFidelityScore,
  isExperienceScore,
  type ChunkScoreDetail,
  type TranslationMode as EngineScoringMode,
} from '@/engine/translation';
import { runPublishAudit, applyAutoFix, runAIAudit, type PublishAuditReport, type PublishAuditFinding, type AICorrection } from '@/lib/translation/publish-audit';
import { searchTM, type TMMatch } from '@/lib/translation/translation-memory';
import { BookOpen } from 'lucide-react';

type AuditIssue = {
  id: string;
  type: 'warning' | 'style' | 'info';
  text: string;
  severity: 'high' | 'medium' | 'low';
};

// ============================================================
// PART 2 — Heuristic Issue Builder (기존 자동 점검, 유지)
// ============================================================
function buildAuditIssues(
  source: string,
  result: string,
  chapters: { name: string; content: string; result: string; isDone: boolean }[],
  glossaryText: string,
  glossary: Record<string, string>
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const s = source.trim();
  const r = result.trim();

  if (s.length > 0 && r.length === 0) {
    issues.push({ id: 'empty-result', type: 'warning', text: '현재 편집 중인 챕터에 원문은 있으나 번역문이 비어 있습니다.', severity: 'medium' });
  }

  if (s.length > 400 && r.length > 0 && r.length < s.length * 0.12) {
    issues.push({ id: 'short-result', type: 'warning', text: '번역문 길이가 원문에 비해 매우 짧습니다. 누락이나 요약 번역 여부를 확인해 보세요.', severity: 'medium' });
  }

  const pending = chapters.filter((c) => (c.content || '').trim() && !(c.result || '').trim() && !c.isDone);
  if (pending.length > 0) {
    issues.push({
      id: 'pending-chapters',
      type: 'info',
      text: `미번역 챕터가 ${pending.length}개 있습니다. (${pending.slice(0, 3).map((c) => c.name).join(', ')}${pending.length > 3 ? '…' : ''})`,
      severity: 'low',
    });
  }

  const glossaryLines = glossaryText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  const dictCount = Object.keys(glossary || {}).length;
  if (glossaryLines >= 3 && dictCount === 0) {
    issues.push({ id: 'glossary-orphan', type: 'style', text: '용어집(텍스트)에 줄이 있으나 용어 사전 항목이 비어 있습니다. 패널에서 용어를 추가하면 번역 일관성에 도움이 됩니다.', severity: 'low' });
  }

  const openJa = (source.match(/「|『|【/g) || []).length;
  const closeJa = (source.match(/」|』|】/g) || []).length;
  if (openJa !== closeJa && openJa + closeJa > 0) {
    issues.push({ id: 'bracket-balance', type: 'style', text: `원문에 여닫는 괄호/인용부호 개수가 맞지 않을 수 있습니다. (「」류 ${openJa}/${closeJa})`, severity: 'low' });
  }

  if (s.length > 100 && r.length > 0) {
    const ratio = r.length / s.length;
    if (ratio < 0.5) issues.push({ id: 'length-too-short', type: 'warning', text: `번역문이 원문 대비 ${Math.round(ratio * 100)}% — 심각한 누락 가능`, severity: 'high' });
    else if (ratio > 2.5) issues.push({ id: 'length-too-long', type: 'warning', text: `번역문이 원문 대비 ${Math.round(ratio * 100)}% — 과잉 번역 가능`, severity: 'medium' });
  }

  if (r.length > 0 && glossary) {
    for (const [src, target] of Object.entries(glossary)) {
      if (s.includes(src) && !r.includes(target)) {
        issues.push({ id: `glossary-miss-${src}`, type: 'warning', text: `용어 "${src}" → "${target}" 이(가) 번역문에 없습니다.`, severity: 'medium' });
      }
    }
  }

  if (r.length > 50) {
    const translationese = ['것으로 보인다', '하는 것이 가능하다', '에 대하여', '측면에서'];
    for (const pat of translationese) {
      if (r.includes(pat)) { issues.push({ id: `translationese-${pat}`, type: 'style', text: `번역투 패턴: "${pat}"`, severity: 'low' }); break; }
    }
  }

  if (s.length > 20 && r.length > 20) {
    const srcLines = s.split(/\r?\n/).filter((l) => l.trim().length > 5);
    const resLines = r.split(/\r?\n/).filter((l) => l.trim().length > 5);
    let untranslated = 0;
    const checkLen = Math.min(srcLines.length, resLines.length);
    for (let i = 0; i < checkLen; i++) {
      if (srcLines[i].trim() === resLines[i].trim()) untranslated++;
    }
    if (untranslated > 0 && checkLen > 0) {
      const pct = Math.round((untranslated / checkLen) * 100);
      if (pct > 10) {
        issues.push({ id: 'untranslated-segments', type: 'warning', text: `미번역 세그먼트 ${untranslated}개 감지 (${pct}%) — 원문과 동일한 줄이 있습니다.`, severity: pct > 50 ? 'high' : 'medium' });
      }
    }
  }

  if (s.length > 10 && r.length > 10) {
    const srcNums = (s.match(/\d+/g) ?? []).sort();
    const resNums = (r.match(/\d+/g) ?? []).sort();
    const srcSet = new Set(srcNums);
    const missing = srcNums.filter((n) => !new Set(resNums).has(n));
    const extra = resNums.filter((n) => !srcSet.has(n));
    if (missing.length > 0 || extra.length > 0) {
      const parts: string[] = [];
      if (missing.length > 0) parts.push(`누락: ${missing.slice(0, 5).join(', ')}`);
      if (extra.length > 0) parts.push(`추가: ${extra.slice(0, 5).join(', ')}`);
      issues.push({ id: 'number-consistency', type: 'warning', text: `숫자 불일치 — ${parts.join(' / ')}`, severity: missing.length > 3 ? 'high' : 'medium' });
    }
  }

  return issues;
}

// ============================================================
// PART 3 — AI Score UI (신규, FidelityScoreDetail / ExperienceScoreDetail 렌더)
// ============================================================

type AxisRow = { label: string; value: number; hint?: string };

/** 0~100 점수 → 색상 토큰 */
function scoreColor(v: number): string {
  if (v >= 80) return 'text-accent-green';
  if (v >= 60) return 'text-accent-amber';
  return 'text-red-400';
}

function scoreBarColor(v: number): string {
  if (v >= 80) return 'bg-accent-green';
  if (v >= 60) return 'bg-accent-amber';
  return 'bg-red-400';
}

function AxisBar({ row }: { row: AxisRow }) {
  const pct = Math.max(0, Math.min(100, Math.round(row.value)));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-text-secondary">{row.label}</span>
        <span className={`text-[12px] font-mono font-bold ${scoreColor(pct)}`}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${scoreBarColor(pct)} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {row.hint ? <span className="text-[9px] text-text-tertiary">{row.hint}</span> : null}
    </div>
  );
}

function buildAxesFromScore(score: ChunkScoreDetail): AxisRow[] {
  if (isFidelityScore(score)) {
    // 번역투는 낮을수록 좋음 → 100-값으로 반전
    return [
      { label: '정확성 (Fidelity)', value: score.fidelity, hint: '원문 충실도' },
      { label: '자연스러움 (Naturalness)', value: score.naturalness, hint: '타겟어 자연도' },
      { label: '완성도 (낮은 번역투)', value: 100 - score.translationese, hint: '번역투 ↓일수록 좋음' },
      { label: '포맷·일관성 (Consistency)', value: score.consistency, hint: '용어·스타일 통일' },
    ];
  }
  if (isExperienceScore(score)) {
    return [
      { label: '몰입도 (Immersion)', value: score.immersion },
      { label: '감정 재현 (Emotion)', value: score.emotionResonance },
      { label: '문화 적합 (Cultural)', value: score.culturalFit },
      { label: '일관성 (Consistency)', value: score.consistency },
      { label: '원문 근거 (Grounded)', value: score.groundedness },
      { label: '번역자 투명 (Voice)', value: score.voiceInvisibility },
    ];
  }
  return [];
}

// ============================================================
// PART 4 — Publish Audit (로컬 규칙 기반 자체 검수, 외부 API 없음)
// ============================================================
const CATEGORY_LABEL: Record<PublishAuditFinding['category'], string> = {
  punctuation: '문장부호',
  spacing: '띄어쓰기',
  spelling: '맞춤법',
  structure: '구조',
  consistency: '일관성',
  completeness: '완성도',
};

function SeverityBadge({ severity }: { severity: PublishAuditFinding['severity'] }) {
  const map: Record<PublishAuditFinding['severity'], string> = {
    high: 'bg-red-500/10 border-red-500/30 text-red-400',
    medium: 'bg-accent-amber/10 border-accent-amber/30 text-accent-amber',
    low: 'bg-accent-indigo/10 border-accent-indigo/30 text-accent-indigo',
    info: 'bg-white/5 border-white/10 text-text-tertiary',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase ${map[severity]}`}>
      {severity}
    </span>
  );
}

function PublishAuditSection() {
  const { result, setResult, provider, getEffectiveApiKeyForProvider } = useTranslator();
  const [report, setReport] = useState<PublishAuditReport | null>(null);
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [aiCorrections, setAiCorrections] = useState<AICorrection[]>([]);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    if (!result || result.trim().length < 10) return;
    const r = runPublishAudit(result);
    setReport(r);
    setLastRunAt(Date.now());
  }, [result]);

  const handleAutoFix = useCallback(() => {
    if (!result) return;
    const { fixed, changes } = applyAutoFix(result);
    if (changes > 0) {
      setResult(fixed);
      // 재검사
      setTimeout(() => setReport(runPublishAudit(fixed)), 50);
    }
  }, [result, setResult]);

  const handleRunAI = useCallback(async () => {
    if (!result || result.trim().length < 10 || aiRunning) return;
    setAiRunning(true);
    setAiError(null);
    try {
      const apiKey = getEffectiveApiKeyForProvider(provider);
      const corrections = await runAIAudit(result, provider, apiKey);
      setAiCorrections(corrections);
      if (corrections.length === 0) setAiError('AI가 교정 제안을 반환하지 않음. API 키 확인 또는 다시 시도.');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 검수 실패');
      setAiCorrections([]);
    } finally {
      setAiRunning(false);
    }
  }, [result, provider, getEffectiveApiKeyForProvider, aiRunning]);

  const handleApplyAICorrection = useCallback((c: AICorrection) => {
    if (!result) return;
    // 첫 번째 매치만 교체 (보수적)
    const idx = result.indexOf(c.original);
    if (idx < 0) return;
    const fixed = result.slice(0, idx) + c.suggested + result.slice(idx + c.original.length);
    setResult(fixed);
    // 적용된 항목 제거
    setAiCorrections(prev => prev.filter(x => x !== c));
  }, [result, setResult]);

  const canRun = result.trim().length >= 10;
  const autoFixableCount = report?.findings.filter(f => f.autoFixable).length ?? 0;

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <ListChecks className="w-3.5 h-3.5 text-accent-green" />
          <span className="text-[12px] font-medium">출판 검수</span>
          <span className="text-[9px] text-text-tertiary">무료 · 로컬</span>
        </div>
        {report && (
          <span className={`text-[11px] font-mono font-bold ${scoreColor(report.overallScore)}`}>
            {report.overallScore}
          </span>
        )}
      </div>

      {!report && (
        <button
          type="button"
          onClick={handleRun}
          disabled={!canRun}
          className="w-full min-h-[36px] rounded-md bg-accent-green/15 hover:bg-accent-green/25 text-accent-green border border-accent-green/30 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="맞춤법·띄어쓰기·문장부호·구조 자체 검수 실행 (외부 API 없음)"
        >
          {canRun ? '검수 실행' : '번역문 10자 이상 필요'}
        </button>
      )}

      {report && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">총 문자</span>
              <span className="font-mono text-text-secondary">{report.stats.totalChars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">문단</span>
              <span className="font-mono text-text-secondary">{report.stats.totalParagraphs}</span>
            </div>
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">평균 문장</span>
              <span className="font-mono text-text-secondary">{report.stats.avgSentenceLength}자</span>
            </div>
            <div className="flex justify-between rounded bg-white/[0.02] px-2 py-1.5">
              <span className="text-text-tertiary">대사 비율</span>
              <span className="font-mono text-text-secondary">{Math.round(report.stats.dialogueRatio * 100)}%</span>
            </div>
          </div>

          {/* Findings */}
          {report.findings.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-accent-green bg-accent-green/5 border border-accent-green/20 rounded p-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>눈에 띄는 문제를 찾지 못했습니다.</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {report.findings.map((f) => (
                <div key={f.id} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={f.severity} />
                    <span className="text-[9px] text-text-tertiary font-mono">{CATEGORY_LABEL[f.category]}</span>
                    {f.autoFixable && (
                      <span className="text-[9px] text-accent-purple font-mono">자동 고침</span>
                    )}
                    <span className="text-[11px] text-text-primary">{f.title}</span>
                  </div>
                  <div className="text-[10px] text-text-secondary">{f.detail}</div>
                  {f.suggestion && (
                    <div className="text-[10px] text-accent-amber">→ {f.suggestion}</div>
                  )}
                  {f.locations && f.locations.length > 0 && (
                    <div className="text-[9px] text-text-tertiary font-mono truncate">
                      예: {f.locations.map(l => `"${l.snippet}"`).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRun}
              className="flex-1 min-h-[32px] rounded-md bg-white/5 hover:bg-white/10 text-text-secondary border border-white/10 text-[11px] font-medium transition-colors"
            >
              재검수
            </button>
            {autoFixableCount > 0 && (
              <button
                type="button"
                onClick={handleAutoFix}
                className="flex-1 min-h-[32px] rounded-md bg-accent-purple/15 hover:bg-accent-purple/25 text-accent-purple border border-accent-purple/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
                title="중복 문장부호·전각/반각 혼용 등 안전한 항목만 자동 수정"
              >
                <Wand2 className="w-3 h-3" />
                자동 고침 ({autoFixableCount})
              </button>
            )}
          </div>

          {lastRunAt && (
            <div className="text-[9px] text-text-tertiary text-center italic">
              마지막 검수: {new Date(lastRunAt).toLocaleTimeString('ko-KR')}
            </div>
          )}
        </>
      )}

      {/* ── AI 교정 제안 (선택적, API 키 1회 소모) ── */}
      {canRun && (
        <div className="pt-2 mt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Sparkles className="w-3 h-3 text-accent-purple" />
              <span className="text-[10px] font-medium">AI 교정 (선택)</span>
              <span className="text-[9px] text-text-tertiary">· API 키 소모</span>
            </div>
            {aiCorrections.length > 0 && (
              <span className="text-[10px] text-accent-purple font-mono">{aiCorrections.length}건</span>
            )}
          </div>

          {!aiRunning && aiCorrections.length === 0 && (
            <button
              type="button"
              onClick={handleRunAI}
              className="w-full min-h-[28px] rounded-md bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple border border-accent-purple/25 text-[11px] font-medium transition-colors"
              title={`${provider}로 1회 호출 — 맞춤법·띄어쓰기·어색한 표현 제안`}
            >
              AI 교정 제안 실행
            </button>
          )}

          {aiRunning && (
            <div className="flex items-center gap-2 text-[10px] text-text-secondary py-1">
              <Loader2 className="w-3 h-3 animate-spin text-accent-purple" />
              <span>AI 교정 중… (최대 45초)</span>
            </div>
          )}

          {aiError && !aiRunning && (
            <div className="text-[10px] text-accent-amber bg-accent-amber/5 border border-accent-amber/20 rounded p-1.5">
              {aiError}
            </div>
          )}

          {aiCorrections.length > 0 && (
            <div className="space-y-1.5">
              {aiCorrections.map((c, i) => {
                const sev = c.severity;
                const sevColor = sev === 'high' ? 'text-red-400' : sev === 'medium' ? 'text-accent-amber' : 'text-accent-indigo';
                return (
                  <div key={i} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] px-1 py-0.5 rounded border font-mono uppercase ${sevColor}`}>
                        {sev}
                      </span>
                      <span className="text-[10px] text-text-secondary italic">{c.reason}</span>
                    </div>
                    <div className="text-[10px] text-text-tertiary">
                      <span className="line-through">{c.original}</span>
                    </div>
                    <div className="text-[11px] text-accent-green">
                      → {c.suggested}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyAICorrection(c)}
                      className="w-full mt-1 text-[10px] py-1 rounded bg-accent-green/10 hover:bg-accent-green/20 text-accent-green border border-accent-green/25 font-medium transition-colors"
                    >
                      이 교정 적용
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={handleRunAI}
                className="w-full text-[10px] py-1 rounded bg-white/5 hover:bg-white/10 text-text-tertiary border border-white/10 transition-colors"
              >
                AI 재검수
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 4b — TM Suggestions (번역 메모리 유사 매치)
// ============================================================
function TMSuggestionsSection() {
  const { source, to } = useTranslator();
  const [matches, setMatches] = useState<TMMatch[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  React.useEffect(() => {
    if (!source || source.trim().length < 20) {
      setMatches([]);
      return;
    }
    try {
      const targetUpper = (to || 'EN').toUpperCase();
      // 문장 분할 → 각 문장별 상위 매치 1개씩 → 전체 유사도 평균
      const sentences = source
        .split(/[.!?…]+\s*|\n+/)
        .map(s => s.trim())
        .filter(s => s.length >= 15)
        .slice(0, 8); // 최대 8 문장만 검사 (성능)
      const allMatches: TMMatch[] = [];
      for (const sent of sentences) {
        const found = searchTM(sent, targetUpper, 0.65);
        if (found.length > 0) allMatches.push(found[0]);
      }
      // similarity 높은 순, 중복 source 제거
      const seen = new Set<string>();
      const dedup = allMatches
        .sort((a, b) => b.similarity - a.similarity)
        .filter(m => {
          if (seen.has(m.entry.source)) return false;
          seen.add(m.entry.source);
          return true;
        })
        .slice(0, 5);
      setMatches(dedup);
    } catch {
      setMatches([]);
    }
  }, [source, to]);

  if (matches.length === 0) return null;

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <div className="flex items-center gap-1.5">
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
            return (
              <div key={i} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-mono font-bold ${color}`}>{pct}%</span>
                  <span className="text-[9px] text-text-tertiary font-mono uppercase">{m.type}</span>
                  {m.entry.confirmed && (
                    <span className="text-[9px] text-accent-green bg-accent-green/10 px-1 rounded">확정</span>
                  )}
                  <span className="text-[9px] text-text-tertiary font-mono ml-auto">{m.entry.sourceLang}→{m.entry.targetLang}</span>
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
  const { source, result, chapters, glossaryText, glossary, to } = useTranslator();

  const issues = useMemo(
    () => buildAuditIssues(source, result, chapters, glossaryText, glossary),
    [source, result, chapters, glossaryText, glossary]
  );

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
      setScoreError(err instanceof Error ? err.message : '채점 실패');
    } finally {
      setScoring(false);
    }
  }, [canScore, scoring, scoreMode, source, result, to]);

  const axes = aiScore ? buildAxesFromScore(aiScore) : [];
  const aiOverall = aiScore ? Math.round(aiScore.overall) : null;

  return (
    <div className="flex h-full flex-col font-sans">
      {/* ── Header ── */}
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-text-secondary">
            <Activity className="w-4 h-4 text-accent-green" />
            <span className="text-[13px] font-medium">Quality Audit</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-text-secondary bg-white/[0.03] px-2 py-0.5 rounded border border-white/10" title="원문·번역문·챕터·용어 휴리스틱 자동 점검">
              <CheckCircle className="w-3 h-3" /> 자동 {heuristicScore}%
            </span>
            {aiOverall !== null && (
              <span className={`flex items-center gap-1 text-[11px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/10 ${scoreColor(aiOverall)}`} title={`AI 정밀 채점 (${scoreMode === 'fidelity' ? '원문 보존형 4축' : '독자 경험형 6축'})`}>
                <Sparkles className="w-3 h-3" /> AI {aiOverall}%
              </span>
            )}
          </div>
        </div>
        <p className="text-[10px] text-text-tertiary mt-2 leading-snug">
          자동 점검은 길이·용어·숫자 같은 기계적 지표입니다. AI 정밀 채점으로 4축(원문보존) 또는 6축(독자경험) 품질 분석을 실행할 수 있습니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        {/* ── TM 매칭 (번역 메모리 유사 제안) ── */}
        <TMSuggestionsSection />

        {/* ── 출판 검수 (로컬 규칙, 무료) ── */}
        <PublishAuditSection />

        {/* ── AI 4/6축 정밀 채점 섹션 ── */}
        <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Sparkles className="w-3.5 h-3.5 text-accent-amber" />
              <span className="text-[12px] font-medium">AI 정밀 채점</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScoreMode('fidelity')}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${scoreMode === 'fidelity' ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-white/10 text-text-tertiary hover:text-text-secondary'}`}
                title="원문 보존형 4축 — 정확성·자연스러움·완성도·포맷"
              >4축</button>
              <button
                type="button"
                onClick={() => setScoreMode('experience')}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${scoreMode === 'experience' ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-white/10 text-text-tertiary hover:text-text-secondary'}`}
                title="독자 경험형 6축 — 몰입·감정·문화·일관·근거·투명"
              >6축</button>
            </div>
          </div>

          {!aiScore && !scoring && (
            <button
              type="button"
              onClick={handleRunAIScore}
              disabled={!canScore}
              className="w-full min-h-[36px] rounded-md bg-accent-amber/15 hover:bg-accent-amber/25 text-accent-amber border border-accent-amber/30 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={canScore ? '현재 원문·번역문을 AI로 정밀 채점' : '원문/번역문이 20자 이상일 때 실행 가능'}
            >
              {canScore ? `AI ${scoreMode === 'fidelity' ? '4축' : '6축'} 채점 실행` : '원문/번역문 20자 이상 필요'}
            </button>
          )}

          {scoring && (
            <div className="flex items-center gap-2 text-[12px] text-text-secondary py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-amber" />
              <span>AI 채점 실행 중… (10~25초)</span>
            </div>
          )}

          {scoreError && !scoring && (
            <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded p-2">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{scoreError}</span>
            </div>
          )}

          {aiScore && !scoring && (
            <>
              <div className="flex items-center justify-between gap-3 pt-1 pb-2 border-b border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Overall</span>
                  <span className={`text-2xl font-bold font-mono ${scoreColor(aiOverall ?? 0)}`}>{aiOverall}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRunAIScore}
                  className="text-[10px] text-text-tertiary hover:text-accent-amber transition-colors underline underline-offset-2"
                  title="현재 설정으로 재채점"
                >재채점</button>
              </div>
              <div className="space-y-2.5">
                {axes.map((row) => <AxisBar key={row.label} row={row} />)}
              </div>
              <p className="text-[9px] text-text-tertiary italic">
                {scoreMode === 'fidelity' ? '원문 보존형 — 원문 구조·의미 보존 중심' : '독자 경험형 — 타겟 독자 몰입 중심'}
              </p>
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
              {issues.filter((i) => i.severity === 'low').length} low — {issues.length}개 자동 점검 항목
            </span>
          </div>
        )}

        {issues.map((issue) => (
          <div key={issue.id} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="shrink-0 mt-0.5">
              {issue.severity === 'high' ? (
                <ShieldAlert className="w-4 h-4 text-red-400" />
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
