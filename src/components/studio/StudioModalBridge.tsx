"use client";

// ============================================================
// StudioModalBridge — ModalProvider 와 기존 modal 컴포넌트의 연결 다리
// rank 19 (2026-06-07) — StudioShell 의 분산 useState(showApiKeyModal,
// saveSlotModalOpen 등) 을 점진적으로 ModalProvider 로 이관하는 첫 단계.
//
// 의도:
//   - 'studio:api-keys' / 'studio:save-slot' 두 modal 만 ModalProvider 로 이관 (rank 19 1단계).
//   - 부모는 boolean state 만 넘김 (legacy showApiKeyModal/saveSlotModalOpen 호환 유지).
//     Bridge 가 state ↔ ModalProvider 양방향 sync 처리.
//   - confirm/move/rename 은 follow-up rank 에서 점진 이관 — 회귀 위험 최소화.
//
// 동작 (단방향 + 사용자 close 핸들링):
//   1. props 의 boolean 값이 true → openModal 호출 → modal 렌더
//   2. 사용자가 close 누름 → closeModal 호출 + props 의 setter(false) 도 호출 → 부모 state sync
//
// 부작용:
//   - Bridge 와 StudioOverlayManager 가 같은 modal 을 동시에 렌더하지 않도록 호출처 분리.
//     (StudioOverlayManager 는 saveSlot/apikey 더 이상 그리지 않음 → activeModalKey 분기 변경)
// ============================================================

import React, { useCallback, useEffect } from 'react';
import { APIKeySlotManager } from '@/components/home/APIKeySlotManager';
import { SaveSlotModal } from '@/components/studio/StudioModals';
import { useModal, useModalOpen } from '@/lib/modals/modal-manager';
import { INITIAL_CONFIG } from '@/hooks/useProjectManager';
// [풀점검 priority 6 — 2026-06-08] 절대금지 src/lib/studio-types.ts 직접 import 제거.
// src/types/studio-shared.ts shim 을 경유 — 신규 컴포넌트는 절대 직접 의존 0.
import type { AppLanguage, AppTab, ChatSession, SavedSlot } from '@/types/studio-shared';

// ============================================================
// PART 1 — Props
// ============================================================

export interface StudioModalBridgeProps {
  language: AppLanguage;
  activeTab: AppTab;
  currentSession: ChatSession | null | undefined;
  updateCurrentSession: (update: Partial<ChatSession>) => void;
  triggerSave: () => void;

  /** legacy: showApiKeyModal — true 면 'studio:api-keys' 열고, false 면 닫음. */
  apiKeyOpen: boolean;
  setApiKeyOpen: (v: boolean) => void;
  /** API 키 변경 후 부모에 알림 (apiKeyVersion bump). */
  onApiKeyChange?: () => void;

  /** legacy: saveSlotModalOpen — true/false 양방향 sync. */
  saveSlotOpen: boolean;
  setSaveSlotOpen: (v: boolean) => void;
}

// ============================================================
// PART 2 — Component
// ============================================================

/**
 * StudioModalBridge — ModalProvider 하위에서만 작동.
 * 부모의 boolean state ↔ ModalProvider 의 id state 양방향 sync.
 */
export default function StudioModalBridge({
  language,
  activeTab,
  currentSession,
  updateCurrentSession,
  triggerSave,
  apiKeyOpen,
  setApiKeyOpen,
  onApiKeyChange,
  saveSlotOpen,
  setSaveSlotOpen,
}: StudioModalBridgeProps): React.ReactElement | null {
  const { openModal, closeModal, replaceModal } = useModal();
  const isApiKeyOpen = useModalOpen('studio:api-keys');
  const isSaveSlotOpen = useModalOpen('studio:save-slot');

  // ── 단방향 sync: 부모 state → ModalProvider state ──
  // [C] 부모가 true 로 만들면 modal open. 이미 다른 modal 열려있으면 replace (UX 우선순위 부모 호출에 위임).
  // [G] 같은 state 일 때 noop — effect 가 중복 dispatch 안 함.
  useEffect(() => {
    if (apiKeyOpen && !isApiKeyOpen) {
      // 이미 다른 modal 열림 → replace 로 강제 (legacy stacking guard 우선순위 반영).
      // payload 없는 modal — Record<string, never> 로 정의돼 빈 객체 전달.
      replaceModal('studio:api-keys', {});
    } else if (!apiKeyOpen && isApiKeyOpen) {
      closeModal();
    }
  }, [apiKeyOpen, isApiKeyOpen, replaceModal, closeModal]);

  useEffect(() => {
    if (saveSlotOpen && !isSaveSlotOpen) {
      // openModal — 이미 다른 modal 열림 시 무시되지만 그 경우 부모가 false 로 되돌릴 책임.
      openModal('studio:save-slot', {});
    } else if (!saveSlotOpen && isSaveSlotOpen) {
      closeModal();
    }
  }, [saveSlotOpen, isSaveSlotOpen, openModal, closeModal]);

  // ── close handlers — 사용자가 modal 안에서 X / Esc / 백드롭 누름 ──
  const handleCloseApiKey = useCallback(() => {
    closeModal();
    setApiKeyOpen(false);
    onApiKeyChange?.();
  }, [closeModal, setApiKeyOpen, onApiKeyChange]);

  const handleCloseSaveSlot = useCallback(() => {
    closeModal();
    setSaveSlotOpen(false);
  }, [closeModal, setSaveSlotOpen]);

  const handleSaveSlot = useCallback(
    (slot: SavedSlot) => {
      const base = currentSession?.config ?? INITIAL_CONFIG;
      updateCurrentSession({
        config: {
          ...base,
          savedSlots: [...(base.savedSlots ?? []), slot],
        },
      });
      triggerSave();
    },
    [currentSession, updateCurrentSession, triggerSave],
  );

  return (
    <>
      {isApiKeyOpen && (
        <APIKeySlotManager onClose={handleCloseApiKey} />
      )}
      {isSaveSlotOpen && (
        <SaveSlotModal
          language={language}
          activeTab={activeTab}
          config={currentSession?.config}
          onSave={handleSaveSlot}
          onClose={handleCloseSaveSlot}
        />
      )}
    </>
  );
}

// IDENTITY_SEAL: PART-1..2 | role=studio-modal-bridge | inputs=boolean-state+session | outputs=JSX(modals)
