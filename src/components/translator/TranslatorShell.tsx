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
        // Activity bar is 48px wide, so left sidebar stops at that point
        const newWidth = Math.max(200, Math.min(e.clientX - 48, window.innerWidth / 2));
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
    <div className="flex h-screen w-full overflow-hidden bg-[#0A0A0C] text-text-primary">
      {/* 1. Activity Bar */}
      {!isZenMode && (
        <div className="hidden lg:flex z-50">
          <ActivityBar />
        </div>
      )}

      {/* 2. Left Panel container */}
      {!isZenMode && layout.activeLeftPanel && (
        <>
          <div className="hidden lg:flex shrink-0 z-40 relative" style={{ width: layout.leftSidebarWidth }}>
            <TranslatorPanelManager region="left" />
          </div>
          {/* Resizer handles the width of Left Panel */}
          <div
            onMouseDown={onLeftDragStart}
            className="hidden lg:block w-[4px] cursor-col-resize bg-transparent hover:bg-accent-amber/50 z-50 transition-colors shrink-0"
            style={{ marginLeft: -2, marginRight: -2 }}
          />
        </>
      )}

      {/* 3. Center Area (Editing Region) */}
      <div className="flex-1 flex flex-col min-w-0 z-10 basis-auto h-full">
        <BilateralEditor />
      </div>

      {/* 4. Right Panel container */}
      {!isZenMode && layout.activeRightPanel && (
        <>
          {/* Resizer handles the width of Right Panel */}
          <div
            onMouseDown={onRightDragStart}
            className="hidden lg:block w-[4px] cursor-col-resize bg-transparent hover:bg-accent-purple/50 z-50 transition-colors shrink-0"
            style={{ marginLeft: -2, marginRight: -2 }}
          />
          <div className="hidden lg:flex shrink-0 border-l border-white/5 z-40 bg-[#0A0A0C]" style={{ width: layout.rightSidebarWidth }}>
            <TranslatorPanelManager region="right" />
          </div>
        </>
      )}

      {/* Mobile Drawer (Removed) */}
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
