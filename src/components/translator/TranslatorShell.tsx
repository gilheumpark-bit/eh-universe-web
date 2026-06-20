'use client';

import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  TRANSLATOR_LAYOUT_LIMITS,
  useTranslatorLayout,
  TranslatorLayoutProvider,
  type LeftPanelType,
  type RightPanelType,
} from './core/TranslatorLayoutContext';
import { useTranslator } from './core/TranslatorContext';
import { ActivityBar } from './features/ActivityBar';
import { TranslatorPanelManager } from './TranslatorPanelManager';
import { BilateralEditor } from './editor/BilateralEditor';
import { TripleEditor } from './editor/TripleEditor';
// [Batch 1 rank 4 — 2026-06-07] Cmd+K 패널 팔레트 시공.
// ActivityBar 클릭은 유지 (호환), Cmd+K 단축키로 12 패널 검색·이동 추가.
import { useCmdPalette } from '@/hooks/useCmdPalette';
import { CmdPaletteOverlay } from '@/components/studio/CmdPaletteOverlay';
import { useRegisterActions } from '@/lib/actions/use-register-actions';
import { useKeyBinding } from '@/lib/keyboard/keyboard-manager';
import { useLang } from '@/lib/LangContext';
// [priority 5 — 2026-06-08] cast 우회 제거 — panel-registry 의 LEFT_PANELS/RIGHT_PANELS 를
// SSOT 로 사용해 binding 을 동적 생성. registry 변경 시 silent breakage 차단.
import { LEFT_PANELS, RIGHT_PANELS } from './core/panel-registry';
// [X2 — 2026-06-11] noa:toast/noa:alert 수신 호스트 — 번역 스튜디오에도 마운트 (NOA 고지 의무).
import ToastHost from '@/components/loreguard/ToastHost';
import PaywallNoticeCard from '@/components/loreguard/PaywallNoticeCard';

/**
 * panel-registry 의 panel id 와 ACTION_CATALOG 의 action id 매핑.
 * registry 에 새 panel 추가 시 이 map 만 갱신하면 binding 자동 등록.
 * (역방향 lookup 으로 cast 제거 + 미정의 panel 즉시 컴파일 에러)
 */
const LEFT_PANEL_ACTION_MAP: Readonly<Record<NonNullable<LeftPanelType>, string>> = Object.freeze({
  explorer: 'translate:open-explorer',
  glossary: 'translate:open-glossary',
  history: 'translate:open-history',
  multilang: 'translate:open-multilang',
  backup: 'translate:open-backup',
  settings: 'translate:open-settings',
});

const RIGHT_PANEL_ACTION_MAP: Readonly<Record<NonNullable<RightPanelType>, string>> = Object.freeze({
  actions: 'translate:open-actions',
  chat: 'translate:open-chat',
  audit: 'translate:open-audit',
  localization: 'translate:open-localization',
  reference: 'translate:open-reference',
  adoption: 'translate:open-adoption',
  signoff: 'translate:open-signoff',
});

function clampPanelWidth(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function TranslatorShellInner() {
  const layout = useTranslatorLayout();
  const { isZenMode, outputMode } = useTranslator();
  const { lang } = useLang();
  const settingsPanelReadableWidth =
    typeof window !== 'undefined' && window.innerWidth >= 2800 ? 420 : 360;
  const effectiveLeftSidebarWidth =
    layout.activeLeftPanel === 'settings'
      ? Math.max(layout.leftSidebarWidth, settingsPanelReadableWidth)
      : layout.leftSidebarWidth;

  // ─── Cmd+K 패널 팔레트 ────────────────────────────────────────
  // [Batch 1 rank 4 — 2026-06-07] ADR-0003 4-way 키 표준: Translation Studio = Cmd+K.
  // useCmdPalette 의 내부 Ctrl+P 트리거는 disableInternalShortcut 로 꺼두고,
  // keyboard-manager 의 area: 'translation-studio' 가드로 Cmd+K (= Ctrl+K on Windows) 만 활성.
  const palette = useCmdPalette({ disableInternalShortcut: true });
  // [풀점검 priority 7 — 2026-06-08] cross-platform 표기 통일 — 'cmd+k' → 'ctrl+k'.
  // keyboard-manager.matchesCombo 가 ctrl/meta 동등 처리하므로 Win+Mac 모두 호환.
  // ID 와 핸들러 동작은 불변 — 회귀 없음.
  useKeyBinding({
    keys: 'ctrl+k',
    area: 'translation-studio',
    handler: () => palette.setOpen(true),
    description: '번역·현지화 패널 팔레트 열기',
    id: 'translator-cmd-k-palette',
  });

  // 12 패널 액션 바인딩 — 좌 6 + 우 6. ActivityBar 와 동일 동작 (setActiveLeftPanel/Right).
  // 같은 패널 재선택 시 토글 닫힘 → 팔레트는 "열기" 의도라 toggle 안 함 (다시 열기 명확).
  // [priority 5 — 2026-06-08] panel-registry SSOT 에서 동적 생성. 하드코딩 cast 제거.
  // registry 에 panel 추가 시 LEFT/RIGHT_PANEL_ACTION_MAP 갱신만 필요 (컴파일 타임 검증).
  const panelBindings = useMemo<Record<string, () => void>>(() => {
    const bindings: Record<string, () => void> = {};
    // Left — panel-registry 의 모든 id 순회. action map 으로 id → action 변환.
    for (const id of Object.keys(LEFT_PANELS)) {
      const actionId = LEFT_PANEL_ACTION_MAP[id as NonNullable<LeftPanelType>];
      if (!actionId) continue; // map 누락 — silent skip (registry 추가 시 map 보충 alarm)
      const panelType = id as NonNullable<LeftPanelType>;
      bindings[actionId] = () => layout.setActiveLeftPanel(panelType);
    }
    // Right — 동일 패턴.
    for (const id of Object.keys(RIGHT_PANELS)) {
      const actionId = RIGHT_PANEL_ACTION_MAP[id as NonNullable<RightPanelType>];
      if (!actionId) continue;
      const panelType = id as NonNullable<RightPanelType>;
      bindings[actionId] = () => layout.setActiveRightPanel(panelType);
    }
    return bindings;
  }, [layout]);
  useRegisterActions({ palette, bindings: panelBindings, lang });

  // Desktop Resize logic
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const activityBarWidth = isZenMode ? 0 : 54;
      const minCenterWidth = Math.min(720, Math.max(420, window.innerWidth * 0.28));
      if (isDraggingLeft.current) {
        const rightReserved = layout.activeRightPanel ? layout.rightSidebarWidth : 0;
        const maxByCenter = window.innerWidth - activityBarWidth - rightReserved - minCenterWidth;
        const maxByScreen = window.innerWidth * 0.72;
        const maxWidth = Math.max(
          TRANSLATOR_LAYOUT_LIMITS.leftMin,
          Math.min(maxByCenter, maxByScreen),
        );
        const newWidth = clampPanelWidth(
          e.clientX - activityBarWidth,
          TRANSLATOR_LAYOUT_LIMITS.leftMin,
          maxWidth,
        );
        layout.setLeftSidebarWidth(newWidth);
      } else if (isDraggingRight.current) {
        const leftReserved = layout.activeLeftPanel ? layout.leftSidebarWidth : 0;
        const maxByCenter = window.innerWidth - activityBarWidth - leftReserved - minCenterWidth;
        const maxByScreen = window.innerWidth * 0.72;
        const maxWidth = Math.max(
          TRANSLATOR_LAYOUT_LIMITS.rightMin,
          Math.min(maxByCenter, maxByScreen),
        );
        const newWidth = clampPanelWidth(
          window.innerWidth - e.clientX,
          TRANSLATOR_LAYOUT_LIMITS.rightMin,
          maxWidth,
        );
        layout.setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLeft.current || isDraggingRight.current) {
        isDraggingLeft.current = false;
        isDraggingRight.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isZenMode, layout]);

  const onLeftDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onRightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  return (
    // 메인 무대: 우주 공간의 딥한 블랙/다크 네이비 배경, 미세한 블러
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-transparent text-text-primary selection:bg-accent-amber/30">
      
      {/* 1. Activity Bar */}
      {!isZenMode && (
        <div className="hidden lg:flex z-100 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
          <ActivityBar />
        </div>
      )}

      {/* 2. Left Panel container */}
      {!isZenMode && layout.activeLeftPanel && (
        <>
          {/* Mobile: overlay */}
          <div className="lg:hidden fixed inset-0 z-[var(--z-overlay)] flex">
            <div className="w-[92vw] max-w-[560px] bg-bg-secondary border-r border-border shadow-2xl">
              <TranslatorPanelManager region="left" />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => layout.setActiveLeftPanel(null)} />
          </div>
          {/* Desktop: inline */}
          <div
            className={`hidden lg:flex shrink-0 z-90 relative border-r border-border bg-bg-secondary/60 backdrop-blur-2xl transition-[transform,opacity,background-color,border-color,color] duration-300 ease-out ${
              layout.activeLeftPanel === 'settings' ? 'translator-side-panel-settings' : ''
            }`}
            style={{ width: effectiveLeftSidebarWidth }}
          >
            <TranslatorPanelManager region="left" />
          </div>
          {/* Resizer handles the width of Left Panel */}
          <div
            onMouseDown={onLeftDragStart}
            className="hidden lg:block w-[6px] cursor-col-resize bg-transparent hover:bg-accent-amber/50 z-95 transition-colors shrink-0"
            style={{ marginLeft: -3, marginRight: -3 }}
          />
        </>
      )}

      {/* 3. Center Area (Editing Region) */}
      {/* [2026-05-08 시장 분석 4차] outputMode === 'dual' 시 TripleEditor (Source/Faithful/Market 3-pane). */}
      <div className="flex-1 flex flex-col min-w-0 z-10 basis-auto h-full relative">
        <div className="absolute inset-0 pointer-events-none bg-transparent" />
        {outputMode === 'dual' ? <TripleEditor /> : <BilateralEditor />}
      </div>

      {/* 4. Right Panel container */}
      {!isZenMode && layout.activeRightPanel && (
        <>
          {/* Mobile: overlay */}
          <div className="lg:hidden fixed inset-0 z-[var(--z-overlay)] flex justify-end">
            <div className="flex-1 bg-black/40" onClick={() => layout.setActiveRightPanel(null)} />
            <div className="w-[92vw] max-w-[640px] bg-bg-secondary border-l border-border shadow-2xl">
              <TranslatorPanelManager region="right" />
            </div>
          </div>
          {/* Desktop: inline */}
          <div
            onMouseDown={onRightDragStart}
            className="hidden lg:block w-[6px] cursor-col-resize bg-transparent hover:bg-accent-purple/50 z-95 transition-colors shrink-0"
            style={{ marginLeft: -3, marginRight: -3 }}
          />
          <div
            className="hidden lg:flex shrink-0 border-l border-border z-90 bg-bg-secondary/60 backdrop-blur-2xl transition-[transform,opacity,background-color,border-color,color] duration-300 ease-out"
            style={{ width: layout.rightSidebarWidth }}
          >
            <TranslatorPanelManager region="right" />
          </div>
        </>
      )}

      {/* Mobile Space - Not needed right now, fallback */}

      {/* [Batch 1 rank 4 — 2026-06-07] Cmd+K 패널 팔레트 overlay */}
      <CmdPaletteOverlay palette={palette} language={lang} />

      {/* [X2 — 2026-06-11] noa:toast/noa:alert 전역 수신 — 번역 스튜디오 트리에는 기존에
          ToastHost 가 없어 notifyNoaBlock 의 toast 채널이 무음이었다 (LoreguardStudio 전용 마운트).
          ToastHost 루트가 .eh-app 자체 스코프 + loreguard.css 전역 import 라 이식 안전. */}
      <ToastHost language={lang.toUpperCase()} />
      <PaywallNoticeCard language={lang.toUpperCase()} />
    </div>
  );
}

export function TranslatorShell() {
  return (
    <TranslatorLayoutProvider>
      <TranslatorShellInner />
    </TranslatorLayoutProvider>
  );
}
