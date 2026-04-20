"use client";

// ============================================================
// PART 1 — FabControls: AI 생성 FAB + Ctrl+Enter + slow warning listener
// ============================================================
//
// 역할:
//   - AI 모드 전용 플로팅 "엔진 호출" 버튼 (Ctrl+Enter 단축키)
//   - 글로벌 Ctrl+Enter 키 바인딩 (AI 모드에서만 활성)
//   - 느린 생성 경고 구독 (noa:generation-slow / noa:generation-very-slow)
//   - 씬시트 빈 상태 가드 — 클릭 시 토스트 + 엔진 호출 차단 (작가 주도)
//
// M2.2 Day 11-12: 작가 주도 철학 반영.
//   - 레이블: "NOA 생성" → "엔진 호출" (작가가 쓰고 엔진이 받침)
//   - 시각 강도: primary full → secondary outline + hover 강조
//   - sceneSheetEmpty 연결: prop 만 받던 구조 → 실제 가드 + toast
//   - React.memo 로 타이핑 중 리렌더 제거
//
// 부모(WritingShell/WritingTabInline)에서는 writingMode/isGenerating/showAiLock/
// handleSend/currentSessionId/sceneSheetEmpty만 넘기면 전부 이 컴포넌트가 처리.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
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

function FabControlsImpl(props: FabControlsProps): React.ReactElement | null {
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

  // [C] 씬시트 가드 토스트 — 3초 후 자동 소거.
  const [showGuardToast, setShowGuardToast] = useState(false);
  useEffect(() => {
    if (!showGuardToast) return;
    const timer = setTimeout(() => setShowGuardToast(false), 3_000);
    return () => clearTimeout(timer);
  }, [showGuardToast]);

  const handleClick = useCallback(() => {
    if (isGenerating) return;
    if (sceneSheetEmpty) {
      // [C] 작가 주도 철학: 엔진에게 넘기기 전에 재료(씬시트)부터.
      setShowGuardToast(true);
      try {
        window.dispatchEvent(new CustomEvent('noa:fab-blocked', {
          detail: { reason: 'scene-sheet-empty' },
        }));
      } catch { /* non-dom */ }
      return;
    }
    handleSend();
  }, [isGenerating, sceneSheetEmpty, handleSend]);

  // [K] AI 모드 + 세션 활성 + !showAiLock일 때만 FAB 노출.
  if (writingMode !== 'ai' || showAiLock || !currentSessionId) {
    return null;
  }

  const warnTitle = sceneSheetEmpty
    ? L4(language, {
        ko: '씬시트를 먼저 채우세요 — 엔진이 참고할 재료입니다 (Ctrl+Enter)',
        en: 'Fill the scene sheet first — it is the material the engine references (Ctrl+Enter)',
        ja: '先にシーンシートを埋めてください — エンジンが参照する材料です (Ctrl+Enter)',
        zh: '请先填写场景表 — 这是引擎参考的素材 (Ctrl+Enter)',
      })
    : L4(language, {
        ko: '엔진 호출 (Ctrl+Enter) — 작가가 먼저, 엔진이 받침',
        en: 'Summon Engine (Ctrl+Enter) — You lead, engine follows',
        ja: 'エンジン呼び出し (Ctrl+Enter) — 作家が先、エンジンが後',
        zh: '调用引擎 (Ctrl+Enter) — 作者先行，引擎辅助',
      });

  const ariaLabel = L4(language, {
    ko: '엔진 호출',
    en: 'Summon Engine',
    ja: 'エンジン呼び出し',
    zh: '调用引擎',
  });

  const buttonLabel = L4(language, {
    ko: '엔진 호출',
    en: 'Summon Engine',
    ja: 'エンジン呼び出し',
    zh: '调用引擎',
  });

  // [K] 시각 강도: 과거엔 full-primary. 이제는 secondary + hover 시 강조.
  //     작가의 에디터가 주연, FAB은 조연.
  //     sceneSheetEmpty 일 때는 amber(안내) 톤, 정상일 때는 subtle outline.
  const buttonClass = sceneSheetEmpty
    ? 'bg-bg-primary/95 border-accent-amber/60 text-accent-amber hover:bg-accent-amber/10 hover:border-accent-amber shadow-md'
    : 'bg-bg-primary/95 border-border text-text-secondary hover:border-accent-blue/70 hover:text-accent-blue hover:bg-accent-blue/5 shadow-md';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isGenerating}
        aria-label={ariaLabel}
        aria-describedby={sceneSheetEmpty ? 'noa-fab-guard-hint' : undefined}
        title={warnTitle}
        data-testid="noa-fab"
        data-scene-sheet-empty={sceneSheetEmpty ? '1' : '0'}
        className={`fixed bottom-24 right-6 md:bottom-6 md:right-8 px-3.5 py-2.5 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue inline-flex items-center gap-2 transition-[transform,opacity,background-color,border-color,color,box-shadow] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 backdrop-blur-md ${buttonClass}`}
        style={{ zIndex: 'var(--z-overlay, 40)' }}
      >
        <Wand2 className="w-4 h-4" aria-hidden="true" />
        <span className="text-[13px] font-medium">{buttonLabel}</span>
        <kbd className="text-xs opacity-70 ml-1 hidden sm:inline font-mono">Ctrl+Enter</kbd>
      </button>

      {/* [C] 가드 토스트: 씬시트 빈 상태에서 클릭하면 3초간 안내. */}
      {showGuardToast && (
        <div
          role="status"
          aria-live="polite"
          id="noa-fab-guard-hint"
          className="fixed bottom-40 right-6 md:bottom-20 md:right-8 max-w-xs px-3 py-2 rounded-lg bg-accent-amber/10 border border-accent-amber/40 text-xs text-accent-amber shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ zIndex: 'var(--z-overlay, 40)' }}
          data-testid="noa-fab-guard-toast"
        >
          {L4(language, {
            ko: '씬시트를 먼저 채우세요 — 엔진이 참고할 재료입니다',
            en: 'Fill the scene sheet first — it is the material the engine references',
            ja: '先にシーンシートを埋めてください — エンジンが参照する材料です',
            zh: '请先填写场景表 — 这是引擎参考的素材',
          })}
        </div>
      )}
    </>
  );
}

// ============================================================
// PART 6 — Memo 비교 (M2.2)
// ============================================================
// [G] editDraft 타이핑 중 부모(WritingTabInline)가 매 프레임 리렌더될 때
//     FAB은 시각적으로 변화 없음에도 리렌더되던 문제.
//     얕은 비교로 handleSend 참조 안정성 + writingMode/isGenerating 만 본다.
function fabControlsPropsEqual(
  prev: Readonly<FabControlsProps>,
  next: Readonly<FabControlsProps>,
): boolean {
  return (
    prev.language === next.language &&
    prev.writingMode === next.writingMode &&
    prev.isGenerating === next.isGenerating &&
    prev.showAiLock === next.showAiLock &&
    prev.currentSessionId === next.currentSessionId &&
    prev.handleSend === next.handleSend &&
    prev.sceneSheetEmpty === next.sceneSheetEmpty
  );
}

export const FabControls = React.memo(FabControlsImpl, fabControlsPropsEqual);
FabControls.displayName = 'FabControls';

export default FabControls;
