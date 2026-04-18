"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { ParagraphScore, QualityIssue } from '@/hooks/useQualityAnalysis';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — 타입
// ============================================================

interface QualityGutterProps {
  paragraphs: ParagraphScore[];
  averageScore: number;
  weakCount: number;
  language: string;
  onSelectWeak?: (index: number) => void;
}

// ============================================================
// PART 2 — 점수 색상 유틸
// ============================================================

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-accent-green/80';
  if (score >= 50) return 'bg-accent-amber/80';
  return 'bg-accent-red/80';
}

function scoreBorder(score: number): string {
  if (score >= 75) return 'border-accent-green/30';
  if (score >= 50) return 'border-accent-amber/30';
  return 'border-accent-red/30';
}

function scoreTextColor(score: number): string {
  if (score >= 75) return 'text-accent-green';
  if (score >= 50) return 'text-accent-amber';
  return 'text-accent-red';
}

// ============================================================
// PART 3 — 이슈별 개선 제안 유틸
// ============================================================

function getIssueSuggestion(issue: QualityIssue, isKO: boolean): string {
  const suggestions: Record<QualityIssue['type'], { ko: string; en: string }> = {
    'weak-opening': {
      ko: '첫 문장에 행동/감각 묘사를 넣어 독자를 즉시 끌어들이세요.',
      en: 'Start with action or sensory detail to hook the reader immediately.',
    },
    'too-long': {
      ko: '문단을 2~3개로 분할하여 가독성을 높이세요.',
      en: 'Split into 2-3 shorter paragraphs for better readability.',
    },
    'too-short': {
      ko: '묘사나 내면 독백을 추가하여 깊이를 더하세요.',
      en: 'Add description or inner monologue for more depth.',
    },
    'repetition': {
      ko: '반복되는 단어를 동의어나 다른 표현으로 교체하세요.',
      en: 'Replace repeated words with synonyms or rephrase.',
    },
    'flat-pacing': {
      ko: '문장 길이에 변화를 주거나 긴장감 요소를 삽입하세요.',
      en: 'Vary sentence length or insert tension-building elements.',
    },
    'low-dialogue': {
      ko: '대사를 추가하여 장면에 생동감을 부여하세요.',
      en: 'Add dialogue to bring the scene to life.',
    },
    'info-dump': {
      ko: '정보를 행동이나 대화 속에 자연스럽게 녹이세요.',
      en: 'Weave information into action or dialogue naturally.',
    },
  };
  const s = suggestions[issue.type];
  return s ? (isKO ? s.ko : s.en) : '';
}

// ============================================================
// PART 4 — 팝오버 컴포넌트
// ============================================================

function ParagraphPopover({
  paragraph,
  isKO,
  onClose,
}: {
  paragraph: ParagraphScore;
  isKO: boolean;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const m = paragraph.metrics;

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 right-0 z-20 mt-1 mx-2 bg-bg-primary border border-border rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
    >
      {/* 헤더: 점수 + 닫기 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className={`text-lg font-black font-mono ${scoreTextColor(paragraph.score)}`}>
            {paragraph.score}
          </h4>
          <span className="text-[10px] text-text-tertiary">
            / 100
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${
            paragraph.score >= 90 ? 'bg-green-500/10 text-green-400' :
            paragraph.score >= 75 ? 'bg-accent-green/10 text-accent-green' :
            paragraph.score >= 50 ? 'bg-accent-amber/10 text-accent-amber' :
            'bg-accent-red/10 text-accent-red'
          }`}>
            {paragraph.score >= 90 ? (isKO ? '출판 수준' : 'Publication level')
              : paragraph.score >= 75 ? (isKO ? '게시 가능' : 'Ready to publish')
              : paragraph.score >= 50 ? (isKO ? '수정 권장' : 'Revision suggested')
              : (isKO ? '개선 필요' : 'Needs work')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-primary transition-colors text-sm px-1"
          aria-label="Close"
        >
          x
        </button>
      </div>

      {/* 지표 상세 */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {([
          ['S/T', m.showTellRatio, isKO ? 'Show vs Tell' : 'Show vs Tell'],
          ['VAR', m.sentenceVariety, isKO ? '문장 다양성' : 'Sentence Variety'],
          ['REP', m.repetition, isKO ? '반복어 비율' : 'Repetition'],
          ['DLG', m.dialogueRatio, isKO ? '대사 비율' : 'Dialogue Ratio'],
          ['DNS', m.density, isKO ? '정보 밀도' : 'Density'],
        ] as [string, number, string][]).map(([key, val, label]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="font-mono font-bold text-text-tertiary w-7" title={label}>{key}</span>
            <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  key === 'REP' ? (val > 0.3 ? 'bg-accent-red' : 'bg-accent-green') : (val >= 0.5 ? 'bg-accent-green' : 'bg-accent-amber')
                }`}
                style={{ width: `${Math.round(val * 100)}%` }}
              />
            </div>
            <span className="font-mono text-text-secondary w-8 text-right">{Math.round(val * 100)}%</span>
          </div>
        ))}
      </div>

      {/* 이슈 목록 + 개선 제안 */}
      {paragraph.issues.length > 0 && (
        <div className="space-y-2 border-t border-border/40 pt-2">
          <h5 className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
            {isKO ? '이슈 & 개선 제안' : 'Issues & Suggestions'}
          </h5>
          {paragraph.issues.map((issue, j) => (
            <div key={j} className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  issue.severity === 'warning' ? 'bg-accent-amber' : 'bg-text-tertiary'
                }`} />
                <span className={`text-[10px] font-bold ${
                  issue.severity === 'warning' ? 'text-accent-amber' : 'text-text-secondary'
                }`}>
                  {isKO ? issue.messageKO : issue.messageEN}
                </span>
              </div>
              {getIssueSuggestion(issue, isKO) && (
                <p className="text-[9px] text-text-tertiary ml-3 italic">
                  {getIssueSuggestion(issue, isKO)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 이슈 없으면 OK 표시 */}
      {paragraph.issues.length === 0 && (
        <p className="text-[10px] text-accent-green italic">
          {isKO ? '이 문단에는 감지된 이슈가 없습니다.' : 'No issues detected in this paragraph.'}
        </p>
      )}
    </div>
  );
}

// ============================================================
// PART 5 — 메인 컴포넌트
// ============================================================

const QualityGutter: React.FC<QualityGutterProps> = ({
  paragraphs,
  averageScore,
  weakCount,
  language,
  onSelectWeak,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  const isKO = language === 'KO';

  if (paragraphs.length === 0) return (
    <div className="border border-border/50 rounded-xl bg-bg-secondary/50 px-4 py-3 text-center">
      <p className="text-[10px] text-text-tertiary">
        {L4(language as AppLanguage, { ko: '글을 쓰면 문단별 품질 점수가 표시됩니다', en: 'Write to see paragraph quality scores', ja: '文章を書くと段落ごとの品質スコアが表示されます', zh: '写作后将显示段落质量评分' })}
      </p>
    </div>
  );

  const handleRowClick = (p: ParagraphScore, rowIndex: number) => {
    onSelectWeak?.(p.index);
    setSelectedParagraph(prev => prev === rowIndex ? null : rowIndex);
  };

  // [C] 상태표시 — 색상만으로 품질 구분 불가 (색맹/저시력 고려). 점수 뒤에 등급 텍스트 붙여 의미 중복.
  const gradeLabel = (s: number): string => {
    if (s >= 75) return isKO ? '양호' : 'Good';
    if (s >= 50) return isKO ? '보통' : 'Fair';
    return isKO ? '개선 필요' : 'Needs work';
  };

  return (
    <div className="border border-border/50 rounded-xl bg-bg-secondary/50 overflow-hidden">
      {/* 요약 바 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-secondary transition-colors"
        aria-expanded={expanded}
      >
        {/* 평균 점수 배지 */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${scoreBorder(averageScore)} bg-bg-primary`}>
          <div className={`w-2 h-2 rounded-full ${scoreColor(averageScore)}`} aria-hidden="true" />
          <span className={`text-xs font-bold font-mono ${scoreTextColor(averageScore)}`}>
            {averageScore}
          </span>
          <span className="sr-only"> {gradeLabel(averageScore)}</span>
        </div>

        <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {isKO ? 'NOD 품질 분석' : 'NOD Quality'}
        </span>

        {/* 문단 미니 바 차트 */}
        <div className="flex-1 flex items-center gap-px mx-2" role="presentation">
          {paragraphs.slice(0, 20).map((p, i) => (
            <div
              key={i}
              className={`h-3 flex-1 rounded-sm ${scoreColor(p.score)} opacity-60 hover:opacity-100 transition-opacity cursor-pointer`}
              title={`P${i + 1}: ${p.score} (${gradeLabel(p.score)})`}
              aria-label={`P${i + 1}: ${p.score} (${gradeLabel(p.score)})`}
              onClick={(e) => { e.stopPropagation(); onSelectWeak?.(p.index); }}
            />
          ))}
        </div>

        {/* 약한 문단 카운트 */}
        {weakCount > 0 && (
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red">
            {weakCount} {isKO ? '개선 필요' : 'weak'}
          </span>
        )}

        <span className={`text-[11px] text-text-tertiary transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* 상세 목록 */}
      {expanded && (
        <div className="border-t border-border/40 px-4 py-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {paragraphs.map((p, i) => (
            <div key={i} className="relative" style={{ position: 'relative' }}>
              <div
                className={`flex items-start gap-2 px-3 py-2 rounded-lg ${
                  p.score < 50 ? 'bg-accent-red/5 border border-accent-red/20' : 'bg-bg-primary/50'
                } ${selectedParagraph === i ? 'ring-1 ring-white/20' : ''} cursor-pointer hover:bg-bg-secondary transition-colors`}
                onClick={() => handleRowClick(p, i)}
              >
                {/* 점수 */}
                <span className={`text-xs font-bold font-mono shrink-0 w-8 ${scoreTextColor(p.score)}`}>
                  {p.score}
                  <span className="sr-only"> {gradeLabel(p.score)}</span>
                </span>

                {/* 문단 미리보기 + 이슈 */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-text-secondary truncate">
                    {p.text.slice(0, 60)}...
                  </p>
                  {p.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.issues.map((issue, j) => (
                        <span
                          key={j}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            issue.severity === 'warning'
                              ? 'bg-accent-amber/10 text-accent-amber'
                              : 'bg-bg-tertiary text-text-tertiary'
                          }`}
                        >
                          {isKO ? issue.messageKO : issue.messageEN}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 지표 미니 게이지 */}
                <div className="hidden sm:flex flex-col gap-0.5 text-[8px] font-mono text-text-tertiary shrink-0">
                  <span title="Show/Tell Ratio">S/T {Math.round(p.metrics.showTellRatio * 100)}%</span>
                  <span title="Sentence Variety">VAR {Math.round(p.metrics.sentenceVariety * 100)}%</span>
                  <span title="Repetition">REP {Math.round(p.metrics.repetition * 100)}%</span>
                </div>

                {/* 약한 문단 자동 수정 버튼 */}
                {p.score < 50 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWeak?.(p.index);
                      window.dispatchEvent(new CustomEvent('noa:trigger-inline-rewrite'));
                    }}
                    className="shrink-0 px-2 py-1 text-[9px] font-bold rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 border border-accent-blue/20 transition-colors"
                    title={isKO ? 'NOA 자동 수정 (Ctrl+Shift+R)' : 'NOA auto-fix (Ctrl+Shift+R)'}
                  >
                    {isKO ? '수정' : 'Fix'}
                  </button>
                )}
              </div>

              {/* 팝오버 */}
              {selectedParagraph === i && (
                <ParagraphPopover
                  paragraph={p}
                  isKO={isKO}
                  onClose={() => setSelectedParagraph(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QualityGutter;
