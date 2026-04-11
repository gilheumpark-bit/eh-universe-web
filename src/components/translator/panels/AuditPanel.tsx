import React, { useMemo } from 'react';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

type AuditIssue = {
  id: string;
  type: 'warning' | 'style' | 'info';
  text: string;
  severity: 'high' | 'medium' | 'low';
};

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
    issues.push({
      id: 'empty-result',
      type: 'warning',
      text: '현재 편집 중인 챕터에 원문은 있으나 번역문이 비어 있습니다.',
      severity: 'medium',
    });
  }

  if (s.length > 400 && r.length > 0 && r.length < s.length * 0.12) {
    issues.push({
      id: 'short-result',
      type: 'warning',
      text: '번역문 길이가 원문에 비해 매우 짧습니다. 누락이나 요약 번역 여부를 확인해 보세요.',
      severity: 'medium',
    });
  }

  const pending = chapters.filter((c) => (c.content || '').trim() && !(c.result || '').trim() && !c.isDone);
  if (pending.length > 0) {
    issues.push({
      id: 'pending-chapters',
      type: 'info',
      text: `미번역 챕터가 ${pending.length}개 있습니다. (${pending
        .slice(0, 3)
        .map((c) => c.name)
        .join(', ')}${pending.length > 3 ? '…' : ''})`,
      severity: 'low',
    });
  }

  const glossaryLines = glossaryText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
  const dictCount = Object.keys(glossary || {}).length;
  if (glossaryLines >= 3 && dictCount === 0) {
    issues.push({
      id: 'glossary-orphan',
      type: 'style',
      text: '용어집(텍스트)에 줄이 있으나 용어 사전 항목이 비어 있습니다. 패널에서 용어를 추가하면 번역 일관성에 도움이 됩니다.',
      severity: 'low',
    });
  }

  const openJa = (source.match(/「|『|【/g) || []).length;
  const closeJa = (source.match(/」|』|】/g) || []).length;
  if (openJa !== closeJa && openJa + closeJa > 0) {
    issues.push({
      id: 'bracket-balance',
      type: 'style',
      text: `원문에 여닫는 괄호/인용부호 개수가 맞지 않을 수 있습니다. (「」류 ${openJa}/${closeJa})`,
      severity: 'low',
    });
  }

  // 엔진 검증: 길이 비율 체크 (KO→EN 1.10~1.60 기대)
  if (s.length > 100 && r.length > 0) {
    const ratio = r.length / s.length;
    if (ratio < 0.5) {
      issues.push({ id: 'length-too-short', type: 'warning', text: `번역문이 원문 대비 ${Math.round(ratio * 100)}% — 심각한 누락 가능`, severity: 'high' });
    } else if (ratio > 2.5) {
      issues.push({ id: 'length-too-long', type: 'warning', text: `번역문이 원문 대비 ${Math.round(ratio * 100)}% — 과잉 번역 가능`, severity: 'medium' });
    }
  }

  // 엔진 검증: 용어집 locked 항목 누락 체크
  if (r.length > 0 && glossary) {
    for (const [src, target] of Object.entries(glossary)) {
      if (s.includes(src) && !r.includes(target)) {
        issues.push({
          id: `glossary-miss-${src}`,
          type: 'warning',
          text: `용어 "${src}" → "${target}" 이(가) 번역문에 없습니다.`,
          severity: 'medium',
        });
      }
    }
  }

  // 엔진 검증: 번역투 패턴 감지 (EN)
  if (r.length > 50) {
    const translationese = ['것으로 보인다', '하는 것이 가능하다', '에 대하여', '측면에서'];
    for (const pat of translationese) {
      if (r.includes(pat)) {
        issues.push({ id: `translationese-${pat}`, type: 'style', text: `번역투 패턴: "${pat}"`, severity: 'low' });
        break;
      }
    }
  }

  return issues;
}

export function AuditPanel() {
  const { source, result, chapters, glossaryText, glossary } = useTranslator();

  const issues = useMemo(
    () => buildAuditIssues(source, result, chapters, glossaryText, glossary),
    [source, result, chapters, glossaryText, glossary]
  );

  const score = useMemo(() => {
    let penalty = 0;
    for (const issue of issues) {
      if (issue.severity === 'high') penalty += 18;
      else if (issue.severity === 'medium') penalty += 10;
      else penalty += 4;
    }
    return Math.max(0, Math.min(100, 100 - penalty));
  }, [issues]);

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-secondary">
            <Activity className="w-4 h-4 text-accent-green" />
            <span className="text-[13px] font-medium">Quality Audit</span>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1 text-[11px] text-accent-green bg-accent-green/10 px-2 py-0.5 rounded border border-accent-green/20">
              <CheckCircle className="w-3 h-3" /> {score}% 점수
            </span>
          </div>
        </div>
        <p className="text-[10px] text-text-tertiary mt-2 leading-snug">
          원문·번역문·챕터·용어 상태를 기준으로 한 자동 점검입니다. LLM 품질 판정은 포함되지 않습니다.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pointer-events-auto">
        {issues.map((issue) => (
          <div key={issue.id} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="shrink-0 mt-0.5">
              {issue.severity === 'high' ? (
                <ShieldAlert className="w-4 h-4 text-red-400" />
              ) : (
                <AlertTriangle
                  className={`w-4 h-4 ${issue.severity === 'medium' ? 'text-accent-amber' : 'text-accent-indigo'}`}
                />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-text-secondary leading-snug">{issue.text}</span>
            </div>
          </div>
        ))}

        {issues.length === 0 && (
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
