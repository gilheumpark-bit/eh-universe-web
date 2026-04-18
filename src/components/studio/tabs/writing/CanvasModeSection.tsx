"use client";

// ============================================================
// CanvasModeSection — 3-Step 캔버스 (뼈대→초안→다듬기, 구 PART 5)
// ============================================================

import React from 'react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { CanvasStepIndicator } from '@/components/studio/tabs/CanvasStepIndicator';
import type { UndoStack } from '@/hooks/useUndoStack';

interface CanvasModeSectionProps {
  language: AppLanguage;
  canvasContent: string;
  setCanvasContent: (val: string) => void;
  canvasPass: number;
  setCanvasPass: (val: number | ((p: number) => number)) => void;
  isGenerating: boolean;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  editDraft: string;
  setEditDraft: (val: string) => void;
  setWritingMode: (mode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced') => void;
  undoStack: UndoStack;
}

export function CanvasModeSection({
  language, canvasContent, setCanvasContent, canvasPass, setCanvasPass,
  isGenerating, handleSend, editDraft, setEditDraft, setWritingMode, undoStack,
}: CanvasModeSectionProps) {
  return (
    <div className="flex-1 space-y-4">
      <div className="bg-accent-green/5 border border-accent-green/20 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-accent-green mb-2">{L4(language, { ko: '3단계 캔버스 모드', en: 'Three-Step Canvas', ja: '3ステップキャンバス', zh: '三步骤画布' })}</h3>
        <p className="text-sm md:text-xs text-text-secondary mb-2">
          {canvasPass === 0
            ? L4(language, { ko: '1단계: 장면의 뼈대(등장인물, 핵심 사건, 분위기)를 적으세요.', en: 'Step 1: Write the scene skeleton (characters, events, mood).', ja: 'ステップ1: シーンの骨組み（登場人物・主要事件・雰囲気）を書いてください。', zh: '第 1 步:撰写场景骨架(角色、核心事件、氛围)。' })
            : canvasPass === 1
            ? L4(language, { ko: '2단계: 노아가 구조를 초안으로 확장했습니다. 수정 후 다듬기로 넘어가세요.', en: 'Step 2: NOA expanded your structure into a draft. Edit and proceed to polish.', ja: 'ステップ2: ノアが構造を下書きに展開しました。修正後、仕上げに進んでください。', zh: '第 2 步:诺亚已将结构扩展为草稿。修改后进入润色。' })
            : canvasPass === 2
            ? L4(language, { ko: '3단계: 노아가 초안을 다듬었습니다. 최종 확인 후 본문에 반영하세요.', en: 'Step 3: NOA polished your draft. Review and apply to manuscript.', ja: 'ステップ3: ノアが下書きを仕上げました。最終確認後、本文に反映してください。', zh: '第 3 步:诺亚已润色草稿。确认后应用到正文。' })
            : L4(language, { ko: '완료! 아래 버튼으로 본문에 반영하세요.', en: 'Done! Apply to manuscript below.', ja: '完了! 下のボタンで本文に反映してください。', zh: '完成!使用下方按钮应用到正文。' })}
        </p>
        {/* 단계 인디케이터 */}
        <CanvasStepIndicator canvasPass={canvasPass} language={language} />
        {/* 액션 버튼 — 모바일 세로 스택 */}
        <div className="flex flex-col sm:flex-row gap-2">
          {canvasPass > 0 && (
            <button
              onClick={() => setCanvasPass(p => Math.max(0, (typeof p === 'number' ? p : 0) - 1))}
              className="px-3 py-1.5 min-h-[44px] text-xs font-medium border border-border rounded-lg hover:bg-bg-secondary transition-colors text-text-secondary"
            >
              {L4(language, { ko: '← 이전 단계', en: '← Previous', ja: '← 前の段階', zh: '← 上一步' })}
            </button>
          )}
          {canvasPass < 2 && canvasContent.trim().length > 10 && (
            <button
              onClick={() => {
                // 다음 단계로 전환 → AI 호출은 useStudioAI의 canvasPass 감지로 자동
                setCanvasPass(p => (typeof p === 'number' ? p : 0) + 1);
                // 현재 캔버스를 프롬프트로 전송
                if (handleSend) handleSend(canvasPass === 0
                  ? `${L4(language, { ko: '[캔버스 구조 → 초안 확장]', en: '[Canvas Structure → Draft Expansion]', ja: '[キャンバス構造 → 下書き展開]', zh: '[画布结构 → 草稿扩展]' })}\n\n${canvasContent}`
                  : `${L4(language, { ko: '[캔버스 초안 → 다듬기]', en: '[Canvas Draft → Polish]', ja: '[キャンバス下書き → 仕上げ]', zh: '[画布草稿 → 润色]' })}\n\n${canvasContent}`
                );
              }}
              disabled={isGenerating}
              className={`px-4 py-1.5 min-h-[44px] text-xs font-bold border border-accent-green/30 rounded-lg transition-colors ${isGenerating ? 'bg-bg-tertiary text-text-tertiary opacity-50 cursor-not-allowed' : 'bg-accent-green/20 hover:bg-accent-green/30 text-accent-green'}`}
            >
              {isGenerating
                ? L4(language, { ko: '노아 생성 중...', en: 'NOA generating...', ja: 'ノア生成中...', zh: '诺亚生成中...' })
                : canvasPass === 0
                ? L4(language, { ko: '초안으로 확장 →', en: 'Expand to Draft →', ja: '下書きに展開 →', zh: '扩展为草稿 →' })
                : L4(language, { ko: '다듬기 시작 →', en: 'Start Polish →', ja: '仕上げ開始 →', zh: '开始润色 →' })}
            </button>
          )}
          {canvasPass >= 2 && canvasContent.trim() && (
            <button
              onClick={() => {
                undoStack.push(editDraft, L4(language, { ko: '캔버스 반영', en: 'Canvas Apply', ja: 'キャンバス適用', zh: '应用画布' }));
                setEditDraft(canvasContent);
                setWritingMode('edit');
                setCanvasPass(0);
              }}
              className="px-4 py-1.5 min-h-[44px] text-xs font-bold bg-accent-green hover:bg-accent-green/90 text-white rounded-lg transition-colors"
            >
              {L4(language, { ko: '본문에 반영', en: 'Apply to Manuscript', ja: '本文に反映', zh: '应用到正文' })}
            </button>
          )}
        </div>
      </div>
      {/* textarea: 모바일 폰트 16px 이상(iOS zoom 방지) — text-base(16px) */}
      <textarea
        value={canvasContent}
        onChange={e => setCanvasContent(e.target.value)}
        className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-4 md:p-6 text-base font-serif leading-relaxed focus:border-accent-green outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color] resize-none"
        placeholder={canvasPass === 0
          ? L4(language, { ko: '장면의 뼈대를 작성하세요... (등장인물, 핵심 사건, 분위기)', en: 'Write scene skeleton... (characters, events, mood)', ja: 'シーンの骨組みを書いてください...（登場人物・主要事件・雰囲気）', zh: '撰写场景骨架...(角色、核心事件、氛围)' })
          : L4(language, { ko: '노아가 집필 중...', en: 'NOA is writing...', ja: 'ノアが執筆中...', zh: '诺亚正在写作...' })}
      />
    </div>
  );
}
