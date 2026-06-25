"use client";

import { useMemo, useState } from 'react';
import { CheckCircle, Globe2, Languages, ListChecks, ShieldAlert, SquarePen } from 'lucide-react';
import { buildLocalizationDecisionReport, type LocalizationIssueCard } from '@/lib/translation/localization-review';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';

type DecisionState = 'accepted' | 'held' | 'editing';

function recommendationLabel(card: LocalizationIssueCard): string {
  if (card.recommendation === 'accept') return '채택 가능';
  if (card.recommendation === 'hold') return '보류 권장';
  return '검토 권장';
}

function recommendationClass(card: LocalizationIssueCard): string {
  if (card.recommendation === 'accept') return 'border-accent-green/40 bg-accent-green/10 text-accent-green';
  if (card.recommendation === 'hold') return 'border-accent-red/40 bg-accent-red/10 text-accent-red';
  return 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber';
}

export function LocalizationReviewPanel() {
  const {
    source,
    result,
    to,
    glossary,
    chapters,
    activeChapterIndex,
    compareResultB,
    langKo,
  } = useTranslator();
  const layout = useTranslatorLayout();
  const activeChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  const faithfulResult = activeChapter?.resultFaithful;
  const marketResult = activeChapter?.resultMarket || compareResultB || result;
  const [decisions, setDecisions] = useState<Record<string, DecisionState>>({});

  const report = useMemo(
    () => buildLocalizationDecisionReport({
      source,
      result,
      faithfulResult,
      marketResult,
      targetLanguage: to,
      glossary,
    }),
    [faithfulResult, glossary, marketResult, result, source, to],
  );

  const markDecision = (cardId: string, state: DecisionState) => {
    setDecisions((prev) => ({ ...prev, [cardId]: state }));
    window.dispatchEvent(new CustomEvent('noa:toast', {
      detail: {
        message:
          state === 'accepted'
            ? '현지 판단 카드 채택 표시'
            : state === 'held'
              ? '현지 판단 카드 보류 표시'
              : '직접 수정 메모 표시',
        variant: state === 'held' ? 'warning' : 'success',
        duration: 1800,
      },
    }));
  };

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="shrink-0 border-b border-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-text-secondary">
              <Globe2 className="h-4 w-4 text-accent-amber" />
              <span className="text-[13px] font-semibold">{langKo ? '현지 판단' : 'Localization Review'}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-text-tertiary">
              {langKo
                ? '대상 언어를 몰라도 결정할 수 있도록 현지 독자 관점의 걸림돌을 한국어 판단 카드로 정리합니다.'
                : 'Decision cards summarize local reader friction without requiring the author to know the target language.'}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${report.riskCount > 0 ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-accent-green/40 bg-accent-green/10 text-accent-green'}`}>
            {report.riskCount > 0 ? `${report.riskCount}개 검토` : '큰 걸림돌 적음'}
          </span>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text-secondary">
            <Languages className="h-3.5 w-3.5 text-accent-purple" />
            <span>{report.profile.labelKo}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-text-tertiary">{report.summaryKo}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {report.profile.readerLensKo.map((lens) => (
              <span key={lens} className="rounded-full border border-white/10 bg-bg-primary px-2 py-1 text-[10px] text-text-secondary">
                {lens}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => layout.setActiveRightPanel('audit')}
            className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent-green/30 hover:text-accent-green focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            품질 점검 보기
          </button>
          <button
            type="button"
            onClick={() => layout.setActiveRightPanel('adoption')}
            className="min-h-[44px] rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent-purple/30 hover:text-accent-purple focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            단락별 채택
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {report.cards.map((card) => {
          const state = decisions[card.id];
          return (
            <article key={card.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {card.recommendation === 'accept'
                      ? <CheckCircle className="h-4 w-4 shrink-0 text-accent-green" />
                      : <ShieldAlert className="h-4 w-4 shrink-0 text-accent-amber" />}
                    <h3 className="text-[12px] font-bold leading-snug text-text-primary">{card.koreanDecisionTitle}</h3>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-text-tertiary">{card.evidenceKo}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${recommendationClass(card)}`}>
                  {recommendationLabel(card)}
                </span>
              </header>

              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-white/5 bg-bg-primary/70 p-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">원문 의도</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{card.originalIntentKo}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-bg-primary/70 p-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">수정 후보</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{card.suggestionKo}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-bg-primary/70 p-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary">바뀌는 느낌</span>
                  <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{card.nuanceChangeKo}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => markDecision(card.id, 'accepted')}
                  className={`min-h-[44px] rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${state === 'accepted' ? 'border-accent-green/40 bg-accent-green/10 text-accent-green' : 'border-white/10 text-text-tertiary hover:text-accent-green'}`}
                >
                  채택
                </button>
                <button
                  type="button"
                  onClick={() => markDecision(card.id, 'held')}
                  className={`min-h-[44px] rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${state === 'held' ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-white/10 text-text-tertiary hover:text-accent-amber'}`}
                >
                  보류
                </button>
                <button
                  type="button"
                  onClick={() => markDecision(card.id, 'editing')}
                  className={`min-h-[44px] rounded-lg border px-2 py-2 text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${state === 'editing' ? 'border-accent-purple/40 bg-accent-purple/10 text-accent-purple' : 'border-white/10 text-text-tertiary hover:text-accent-purple'}`}
                >
                  직접수정
                </button>
              </div>

              {state && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-text-tertiary">
                  <ListChecks className="h-3 w-3 text-accent-green" />
                  <span>{state === 'accepted' ? '채택 표시됨' : state === 'held' ? '보류 표시됨' : '직접 수정 예정'}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-white/5 p-3">
        <div className="flex items-start gap-2 rounded-lg border border-accent-blue/20 bg-accent-blue/5 p-2 text-[10px] leading-relaxed text-text-tertiary">
          <SquarePen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-blue" />
          <span>{report.profile.decisionNoteKo}</span>
        </div>
      </div>
    </div>
  );
}
