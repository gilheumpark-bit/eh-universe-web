"use client";

// ============================================================
// PART 1 — FabControls: AI 생성 FAB + Ctrl+Enter + slow warning listener
// ============================================================
//
// 역할:
//   - AI 모드 전용 플로팅 생성 버튼 (Ctrl+Enter 단축키)
//   - 글로벌 Ctrl+Enter 키 바인딩 (AI 모드에서만 활성)
//   - 느린 생성 경고 배너 (noa:generation-slow / noa:generation-very-slow 수신)
//   - 씬시트 빈 상태 힌트 (작가 주도형 플로우 — 씬시트 없이 엔진 호출 차단)
//
// M2 Day 11-12: 작가 주도형 UX — FAB 레이블 "노아 작성 받침" 강조.
//
// 부모(WritingShell/WritingTabInline)에서는 writingMode/isGenerating/showAiLock/
// handleSend/currentSessionId만 넘기면 전부 이 컴포넌트가 처리.
// ============================================================

import React, { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 2 — Props
// ============================================================

export interface FabControlsProps {
  language: AppLanguage;
  writingMode: 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';
  isGenerating: boolean;
  showAiLock: boolean;
  currentSessionId: string | null;
  handleSend: (customPrompt?: string, inputValue?: string, clearInput?: () => void) => void;
  /** 씬시트가 비어있는지 — 작가 주도형 UX에서 먼저 채우도록 유도. */
  sceneSheetEmpty?: boolean;
}

// ============================================================
// PART 3 — Slow warning listener (훅)
// ============================================================
//
// [G] !isGenerating 전환에 따른 state 초기화는 render-time derivation으로 처리
// (react-hooks/set-state-in-effect 회피). 이벤트 수신만 effect로 남김.

function useSlowWarning(isGenerating: boolean): 'slow' | 'very-slow' | null {
  const [slowWarning, setSlowWarning] = useState<'slow' | 'very-slow' | null>(null);

  useEffect(() => {
    const onSlow = () => setSlowWarning('slow');
    const onVerySlow = () => setSlowWarning('very-slow');
    window.addEventListener('noa:generation-slow', onSlow);
    window.addEventListener('noa:generation-very-slow', onVerySlow);
    return () => {
      window.removeEventListener('noa:generation-slow', onSlow);
      window.removeEventListener('noa:generation-very-slow', onVerySlow);
    };
  }, []);

  // 생성이 끝났으면 경고도 무효 — derive 시점에 null 반환(상태는 자연 교체).
  return isGenerating ? slowWarning : null;
}

// ============================================================
// PART 4 — Ctrl+Enter 글로벌 키 바인딩 (훅)
// ============================================================

function useCtrlEnterShortcut(
  writingMode: FabControlsProps['writingMode'],
  isGenerating: boolean,
  showAiLock: boolean,
  handleSend: FabControlsProps['handleSend'],
): void {
  useEffect(() => {
    if (writingMode !== 'ai') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (isGenerating || showAiLock) return;
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [writingMode, isGenerating, showAiLock, handleSend]);
}

// ============================================================
// PART 5 — 컴포넌트
// ============================================================

export function FabControls(props: FabControlsProps): React.ReactElement | null {
  const {
    language,
    writingMode,
    isGenerating,
    showAiLock,
    currentSessionId,
    handleSend,
    sceneSheetEmpty = false,
  } = props;

  // [C] slow warning은 훅 내부에서만 사용 — 외부 상태 오염 방지.
  // 현재 배너 UI는 AIModeSection/EditModeSection에서 별도 렌더.
  // (FAB 자체 동작에는 무관하므로 구독만 유지 — 향후 FAB 위 작은 배지 확장 지점.)
  useSlowWarning(isGenerating);
  useCtrlEnterShortcut(writingMode, isGenerating, showAiLock, handleSend);

  // [K] AI 모드 + 세션 활성 + !showAiLock일 때만 FAB 노출.
  if (writingMode !== 'ai' || showAiLock || !currentSessionId) {
    return null;
  }

  const warnTitle = sceneSheetEmpty
    ? L4(language, {
        ko: '씬시트를 먼저 채우면 생성 품질이 올라갑니다 (Ctrl+Enter)',
        en: 'Fill the scene sheet first for higher quality (Ctrl+Enter)',
        ja: 'シーンシートを先に埋めると品質が向上 (Ctrl+Enter)',
        zh: '先填写场景表可提升生成质量 (Ctrl+Enter)',
      })
    : L4(language, {
        ko: 'NOA 생성 (Ctrl+Enter)',
        en: 'Generate with NOA (Ctrl+Enter)',
        ja: 'NOA生成 (Ctrl+Enter)',
        zh: 'NOA 生成 (Ctrl+Enter)',
      });

  return (
    <button
      type="button"
      onClick={() => { if (!isGenerating) handleSend(); }}
      disabled={isGenerating}
      aria-label={L4(language, {
        ko: 'NOA 생성 시작',
        en: 'Start NOA generation',
        ja: 'NOA生成開始',
        zh: '开始 NOA 生成',
      })}
      title={warnTitle}
      className="fixed bottom-24 right-6 md:bottom-6 md:right-8 z-40 px-4 py-3 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-full shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue inline-flex items-center gap-2 transition-[transform,opacity,background-color] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      style={{ zIndex: 'var(--z-overlay, 40)' }}
    >
      <Wand2 className="w-4 h-4" aria-hidden="true" />
      <span className="text-sm font-medium">
        {L4(language, {
          ko: 'NOA 생성',
          en: 'Generate',
          ja: 'NOA生成',
          zh: 'NOA 生成',
        })}
      </span>
      <kbd className="text-xs opacity-70 ml-1 hidden sm:inline">Ctrl+Enter</kbd>
    </button>
  );
}

export default FabControls;
