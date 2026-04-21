"use client";

// ============================================================
// VerificationReceipt — 생성 완료 수령증 토스트
// ============================================================
// 배경: 작가가 "얘가 진짜 내 글 검사했나?" 의심 방지용.
// NOA 철학 "수령증 강제 출력" 원칙을 UI 레벨로 확장.
//
// 설계:
// - 생성 완료 시 (isGenerating: true → false + directorReport 존재) 4초 토스트
// - 작가 친화 언어 (rule IDs 금지, 품질/문제수/등급만)
// - 클릭 시 DirectorPanel 스크롤 + 포커스
// - dismiss 후 동일 report는 재노출 안 함 (lastShownReportKey 기억)
// - "과잉 알림" 방지: 매 생성마다 떠도 3-4초면 몰입 크게 해치지 않음
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X, Film } from 'lucide-react';
import type { DirectorReport } from '@/engine/director';
import { gradeFromScore } from '@/engine/director';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface VerificationReceiptProps {
  directorReport: DirectorReport | null;
  isGenerating: boolean;
  language: AppLanguage;
}

// ============================================================
// PART 1 — 등급 색상 매핑 (DirectorPanel과 동기)
// ============================================================

const GRADE_COLORS: Record<string, string> = {
  'S++': 'text-green-300',
  'S+': 'text-green-400',
  'S': 'text-green-400',
  'A': 'text-accent-blue',
  'B': 'text-amber-400',
  'C': 'text-accent-red',
  'D': 'text-accent-red',
};

// ============================================================
// PART 2 — 리포트 고유 키 (재노출 방지용)
// ============================================================

function reportKey(report: DirectorReport): string {
  return `${report.score}|${report.findings.length}|${JSON.stringify(report.stats).slice(0, 40)}`;
}

// ============================================================
// PART 3 — 메인 컴포넌트
// ============================================================

export function VerificationReceipt({ directorReport, isGenerating, language }: VerificationReceiptProps) {
  const [visible, setVisible] = useState(false);
  const lastKeyRef = useRef<string | null>(null);
  const wasGeneratingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 생성 → 완료 트랜지션 감지
  useEffect(() => {
    const justFinished = wasGeneratingRef.current && !isGenerating;
    wasGeneratingRef.current = isGenerating;

    if (!justFinished || !directorReport) return;

    const key = reportKey(directorReport);
    if (key === lastKeyRef.current) return; // 동일 report 재노출 방지
    lastKeyRef.current = key;

    setVisible(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setVisible(false), 4500);
  }, [directorReport, isGenerating]);

  // 언마운트 정리
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const handleClick = () => {
    setVisible(false);
    // DirectorPanel 스크롤 (있으면)
    const panel = document.querySelector('[data-director-panel]');
    if (panel instanceof HTMLElement) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      panel.classList.add('ring-2', 'ring-accent-amber', 'transition-[box-shadow]');
      setTimeout(() => {
        panel.classList.remove('ring-2', 'ring-accent-amber');
      }, 1600);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
  };

  if (!visible || !directorReport) return null;

  const grade = gradeFromScore(directorReport.score);
  const gradeColor = GRADE_COLORS[grade] || 'text-text-primary';
  const issueCount = directorReport.findings.length;
  const highSeverity = directorReport.findings.filter((f: { severity: number }) => f.severity >= 3).length;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[var(--z-tooltip)] max-w-sm animate-in slide-in-from-bottom-3 fade-in duration-300"
    >
      <button
        type="button"
        onClick={handleClick}
        className="group flex items-start gap-3 px-4 py-3 rounded-xl bg-bg-primary/95 backdrop-blur-xl border border-border shadow-2xl hover:border-accent-amber/40 transition-colors text-left cursor-pointer"
        aria-label={L4(language, {
          ko: '생성 검사 결과 보기',
          en: 'View generation inspection result',
          ja: '生成検査結果を表示',
          zh: '查看生成检查结果',
        })}
      >
        <CheckCircle2 className="w-5 h-5 text-accent-green shrink-0 mt-0.5" aria-hidden="true" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-text-primary uppercase tracking-wider font-mono">
              {L4(language, { ko: '검사 완료', en: 'Check Complete', ja: '検査完了', zh: '检查完成' })}
            </span>
            <span className={`text-[11px] font-black font-mono ${gradeColor}`}>{grade}</span>
          </div>

          <p className="mt-1 text-[11px] text-text-secondary leading-relaxed">
            {issueCount === 0
              ? L4(language, {
                  ko: '문제 없음. 계속 쓰셔도 좋아요.',
                  en: 'No issues. You can keep writing.',
                  ja: '問題なし。続けて執筆できます。',
                  zh: '无问题。可以继续写作。',
                })
              : L4(language, {
                  ko: `문제 ${issueCount}건 감지${highSeverity > 0 ? ` (주의 ${highSeverity})` : ''}`,
                  en: `${issueCount} issue${issueCount > 1 ? 's' : ''}${highSeverity > 0 ? ` (${highSeverity} major)` : ''}`,
                  ja: `問題 ${issueCount} 件検出${highSeverity > 0 ? ` (注意 ${highSeverity})` : ''}`,
                  zh: `检测到 ${issueCount} 个问题${highSeverity > 0 ? ` (注意 ${highSeverity})` : ''}`,
                })}
          </p>

          <p className="mt-1 flex items-center gap-1 text-[10px] text-accent-amber/80 opacity-0 group-hover:opacity-100 transition-opacity">
            <Film className="w-3 h-3" aria-hidden="true" />
            {L4(language, { ko: '자세히 →', en: 'Details →', ja: '詳細 →', zh: '详情 →' })}
          </p>
        </div>

        <span
          onClick={handleDismiss}
          role="button"
          aria-label={L4(language, { ko: '알림 닫기', en: 'Dismiss', ja: '閉じる', zh: '关闭' })}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors shrink-0 cursor-pointer"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setVisible(false);
            }
          }}
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}

export default VerificationReceipt;
