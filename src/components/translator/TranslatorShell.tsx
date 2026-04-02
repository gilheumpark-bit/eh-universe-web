'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useTranslatorLayout, TranslatorLayoutProvider } from './core/TranslatorLayoutContext';
import { useTranslator } from './core/TranslatorContext';
import { ActivityBar } from './features/ActivityBar';
import { TranslatorPanelManager } from './TranslatorPanelManager';
import { BilateralEditor } from './editor/BilateralEditor';

export function TranslatorShellInner() {
  const layout = useTranslatorLayout();
  const { isZenMode } = useTranslator();

  // Desktop Resize logic
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft.current) {
        // Activity bar is 54px wide, so left sidebar stops at that point
        const newWidth = Math.max(200, Math.min(e.clientX - 54, window.innerWidth / 2));
        layout.setLeftSidebarWidth(newWidth);
      } else if (isDraggingRight.current) {
        // Calculate based on window width
        const newWidth = Math.max(250, Math.min(window.innerWidth - e.clientX, window.innerWidth / 2));
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
  }, [layout]);

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
          <div 
            className="hidden lg:flex shrink-0 z-90 relative border-r border-white/5 bg-black/60 backdrop-blur-2xl transition-all duration-300 ease-out" 
            style={{ width: layout.leftSidebarWidth }}
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
      {/* 그라데이션 광원을 배경에 미세하게 추가하여 프리미엄 느낌 부여 */}
      <div className="flex-1 flex flex-col min-w-0 z-10 basis-auto h-full relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-950/15 via-transparent to-transparent" />
        <BilateralEditor />
      </div>

      {/* 4. Right Panel container */}
      {!isZenMode && layout.activeRightPanel && (
        <>
          {/* Resizer handles the width of Right Panel */}
          <div
            onMouseDown={onRightDragStart}
            className="hidden lg:block w-[6px] cursor-col-resize bg-transparent hover:bg-accent-purple/50 z-95 transition-colors shrink-0"
            style={{ marginLeft: -3, marginRight: -3 }}
          />
          <div 
            className="hidden lg:flex shrink-0 border-l border-white/5 z-90 bg-black/60 backdrop-blur-2xl transition-all duration-300 ease-out" 
            style={{ width: layout.rightSidebarWidth }}
          >
            <TranslatorPanelManager region="right" />
          </div>
        </>
      )}

      {/* Mobile Space - Not needed right now, fallback */}
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
