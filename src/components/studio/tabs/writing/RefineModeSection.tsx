"use client";

// ============================================================
// RefineModeSection — 약한 문단 자동 개선 (구 PART 6)
// ============================================================

import React from 'react';
import { Wand2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import type { QualityState } from './EditModeSection';

interface RefineModeSectionProps {
  language: AppLanguage;
  editDraft: string;
  setEditDraft: (val: string) => void;
  promptDirective: string;
  quality: QualityState;
}

export function RefineModeSection({
  language, editDraft, setEditDraft, promptDirective, quality,
}: RefineModeSectionProps) {
  const isKO = language === 'KO';

  return (
    <div className="flex-1 space-y-4">
      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-accent-blue mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4" /> {L4(language, { ko: '다듬기', en: 'Refine', ja: '仕上げ', zh: '润色' })}</h3>
        <p className="text-sm md:text-xs text-text-secondary mb-1">{L4(language, { ko: 'NOA가 현재 원고를 분석하고 약한 문단(점수 50 미만)을 자동으로 개선합니다.', en: 'NOA analyzes your manuscript and automatically improves weak paragraphs (score <50).', ja: 'NOAが現在の原稿を分析し、弱い段落（スコア50未満）を自動的に改善します。', zh: 'NOA 分析当前稿件并自动改善薄弱段落(分数 < 50)。' })}</p>
        <p className="text-sm md:text-[13px] text-text-tertiary mb-3">{L4(language, { ko: '💡 아래에 원고를 붙여넣으면 문단별 품질 점수가 표시됩니다. 점수가 낮은 문단을 선택하여 자동 개선할 수 있습니다.', en: '💡 Paste your manuscript below to see paragraph quality scores. Select low-scoring paragraphs for automatic improvement.', ja: '💡 下に原稿を貼り付けると段落ごとの品質スコアが表示されます。低スコア段落を選択して自動改善できます。', zh: '💡 在下方粘贴稿件可查看各段落质量分数。选择低分段落进行自动改善。' })}</p>
        {promptDirective && <p className="text-xs text-accent-blue font-mono bg-accent-blue/5 rounded px-3 py-2 break-words">{L4(language, { ko: '지시:', en: 'Directive:', ja: '指示:', zh: '指令:' })} {promptDirective}</p>}

        {/* 약한 문단 감지 결과 — 모바일 랩 */}
        {quality.paragraphs.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-3 text-xs">
            <span className="font-mono text-text-tertiary">
              {L4(language, { ko: '평균 점수:', en: 'Avg Score:', ja: '平均スコア:', zh: '平均分:' })} <span className={quality.averageScore >= 60 ? 'text-accent-green font-bold' : 'text-accent-amber font-bold'}>{quality.averageScore}</span>
            </span>
            {quality.weakCount > 0 && (
              <span className="font-mono text-accent-red">
                {quality.weakCount} {L4(language, { ko: '개 약한 문단 감지됨', en: 'weak paragraphs detected', ja: '個の弱い段落を検出', zh: '个薄弱段落被检测' })}
              </span>
            )}
            {quality.weakCount === 0 && (
              <span className="font-mono text-accent-green">
                {L4(language, { ko: '모든 문단 양호', en: 'All paragraphs healthy', ja: 'すべての段落が良好', zh: '所有段落良好' })}
              </span>
            )}
          </div>
        )}

        {/* 약한 문단 목록 */}
        {quality.weakCount > 0 && (
          <div className="mt-3 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
            {quality.paragraphs.filter(p => p.score < 50).map((p, i) => (
              <div key={i} className="flex flex-wrap md:flex-nowrap items-start gap-2 px-3 py-2 rounded-lg bg-accent-red/5 border border-accent-red/15 text-[13px]">
                <span className="font-mono font-bold text-accent-red shrink-0">{p.score}</span>
                <span className="text-text-secondary truncate flex-1 min-w-0">{p.text.slice(0, 80)}...</span>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {p.issues.slice(0, 2).map((iss, j) => (
                    <span key={j} className="text-[9px] px-1 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-mono">
                      {isKO ? iss.messageKO.slice(0, 15) : iss.messageEN.slice(0, 15)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <textarea
        value={editDraft}
        onChange={e => setEditDraft(e.target.value)}
        className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-4 md:p-6 text-base font-serif leading-relaxed focus:border-accent-blue outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color] resize-none"
        placeholder={L4(language, { ko: '다듬을 원고를 붙여넣으세요...', en: 'Paste your manuscript to refine...', ja: '仕上げる原稿を貼り付けてください...', zh: '粘贴要润色的稿件...' })}
      />
    </div>
  );
}
