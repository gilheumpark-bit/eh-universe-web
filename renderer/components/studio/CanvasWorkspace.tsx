"use client";

import React, { useState, useRef, useCallback } from 'react';
import { 
  Maximize2, Minimize2, X, Move, Layers, 
  Plus, Edit3, Settings, BookOpen, Search
} from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';

interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  zIndex: number;
  content: React.ReactNode;
}

interface Props {
  language: AppLanguage;
  onClose?: () => void;
}

export default function CanvasWorkspace({ language }: Props) {
  const [windows, setWindows] = useState<WindowState[]>([
    {
      id: 'manuscript-main',
      title: language === 'KO' ? '메인 원고' : 'Main Manuscript',
      x: 100,
      y: 100,
      width: 600,
      height: 500,
      isMaximized: false,
      zIndex: 10,
      content: (
        <div className="p-6 h-full bg-bg-primary overflow-y-auto">
          <h2 className="text-xl font-serif mb-4 opacity-30 italic">
            {language === 'KO' ? '집필 중...' : 'Writing...'}
          </h2>
          <div className="space-y-4 text-text-secondary leading-relaxed">
            <p>...</p>
          </div>
        </div>
      )
    },
    {
      id: 'ai-suggestions',
      title: language === 'KO' ? 'AI 브레인스토밍' : 'AI Brainstorming',
      x: 720,
      y: 120,
      width: 350,
      height: 400,
      isMaximized: false,
      zIndex: 11,
      content: (
        <div className="p-4 h-full bg-accent-purple/5 space-y-3 overflow-y-auto">
          <div className="p-3 rounded-lg bg-bg-secondary border border-accent-purple/20 text-xs">
            {language === 'KO' ? '장면의 긴장도를 높이려면 갈등 요소를 강화하세요.' : 'To increase tension, intensify the conflict.'}
          </div>
        </div>
      )
    }
  ]);

  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(20);

  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, zIndex: nextZIndex } : w
    ));
    setNextZIndex(z => z + 1);
  };

  const handleWindowDrag = (id: string, dx: number, dy: number) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, x: w.x + dx, y: w.y + dy } : w
    ));
  };

  const toggleMaximize = (id: string) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMaximized: !w.isMaximized } : w
    ));
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="relative w-full h-[80vh] bg-[#0a0a0c] overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
      {/* Workspace Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />

      {/* Workspace Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all">
          <Plus className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all">
          <Edit3 className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all">
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Windows Layer */}
      {windows.map(win => (
        <div
          key={win.id}
          onMouseDown={() => focusWindow(win.id)}
          className={`absolute flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ease-out shadow-2xl ${
            win.isMaximized ? 'inset-0 z-50 m-2' : ''
          } ${activeWindowId === win.id ? 'border-accent-purple/50 bg-[#121216]' : 'border-white/10 bg-[#0d0d10]'}`}
          style={!win.isMaximized ? {
            left: win.x,
            top: win.y,
            width: win.width,
            height: win.height,
            zIndex: win.zIndex
          } : {}}
        >
          {/* Window Title Bar */}
          <div 
            className="flex items-center justify-between px-4 py-3 cursor-move bg-white/[0.03] select-none"
            onMouseDown={(e) => {
              if (win.isMaximized) return;
              const startX = e.clientX;
              const startY = e.clientY;
              const onMove = (ev: MouseEvent) => {
                handleWindowDrag(win.id, ev.clientX - startX, ev.clientY - startY);
                // Recursive offset not ideal, but keeping it simple for autonomy
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent-purple" />
              <span className="text-[11px] font-bold tracking-tight text-white/80">{win.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleMaximize(win.id); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all"
              >
                {win.isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all font-bold"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Window Content */}
          <div className="flex-1 overflow-hidden">
            {win.content}
          </div>
        </div>
      ))}

      {/* Floating Status Bar */}
      <div className="absolute bottom-4 right-4 z-50 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-mono text-white/40 uppercase tracking-widest">
        Canvas Workspace 1.2
      </div>
    </div>
  );
}
