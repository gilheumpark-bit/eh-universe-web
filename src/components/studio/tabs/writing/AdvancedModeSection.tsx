"use client";

// ============================================================
// AdvancedModeSection — temperature/top-p 직접 제어 (구 PART 7)
// ============================================================

import React from 'react';
import { Settings2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface AdvancedModeSectionProps {
  language: AppLanguage;
  editDraft: string;
  setEditDraft: (val: string) => void;
  editDraftRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function AdvancedModeSection({
  language, editDraft, setEditDraft, editDraftRef,
}: AdvancedModeSectionProps) {
  return (
    <div className="flex-1 space-y-4">
      <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-bold text-accent-red mb-2 flex items-center gap-2"><Settings2 className="w-4 h-4" /> {L4(language, { ko: '세부 설정', en: 'Advanced Settings', ja: '詳細設定', zh: '详细设置' })}</h3>
        <p className="text-sm md:text-xs text-text-secondary mb-1">{L4(language, { ko: '표현 자유도, 장르 프리셋, 문장 지시문을 직접 조정합니다.', en: 'Adjust expression range, genre presets, and writing instructions.', ja: '表現の幅、ジャンルプリセット、文章指示を直接調整します。', zh: '直接调整表达范围、类型预设与写作指令。' })}</p>
        <p className="text-sm md:text-[13px] text-text-tertiary">{L4(language, { ko: '경험 있는 사용자를 위한 화면입니다. 필요할 때만 열어도 됩니다.', en: 'For experienced users. Open this only when you need finer control.', ja: '経験者向けの画面です。必要なときだけ開いてください。', zh: '面向进阶用户。需要精细控制时再打开即可。' })}</p>
      </div>
      <textarea
        ref={editDraftRef}
        value={editDraft}
        onChange={e => setEditDraft(e.target.value)}
        className="w-full min-h-[40vh] bg-bg-primary border border-border rounded-xl p-4 md:p-6 text-base font-serif leading-relaxed focus:border-accent-red outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-[transform,opacity,background-color,border-color,color] resize-none"
        placeholder={L4(language, { ko: '고급 모드에서 직접 작성하세요...', en: 'Write directly in advanced mode...', ja: '高度モードで直接作成してください...', zh: '在高级模式下直接撰写...' })}
      />
    </div>
  );
}
