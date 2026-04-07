"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap, Plus, Globe, UserCircle, FileText, PenTool, Edit3, History,
  Download, Upload, Cloud, Settings, BookOpen, Library, GripVertical, Move
} from 'lucide-react';
import { AppTab, AppLanguage, Project, ChatSession } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import type { ProjectManuscriptFormat } from '@/hooks/useStudioExport';

const DOCK_STORAGE_KEY = 'eh-dock-order';
const DOCK_POS_KEY = 'eh-dock-position';

interface DockPosition { x: number; y: number; }

function loadDockPosition(): DockPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(DOCK_POS_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as DockPosition;
  } catch { return null; }
}
function saveDockPosition(pos: DockPosition) {
  try { localStorage.setItem(DOCK_POS_KEY, JSON.stringify(pos)); } catch {}
}

interface DockItem {
  id: AppTab;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  label: string;
  color: string;
}

function loadDockOrder(): AppTab[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(DOCK_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as AppTab[];
  } catch { return null; }
}
function saveDockOrder(order: AppTab[]) {
  try { localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(order)); } catch {}
}

// Reusing the same props interface as StudioSidebar
interface OSDesktopProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  focusMode: boolean;
  projects: Project[];
  createNewProject: () => void;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  currentProject: Project | null;
  sessions: ChatSession[];
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createNewSession: () => void;
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  studioMode: 'guided' | 'free';
  setStudioMode: (mode: 'guided' | 'free') => void;
  exportTXT: () => void;
  exportJSON: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportAllJSON: () => void;
  handleExportEPUB: () => void;
  handleExportDOCX: () => void;
  handleImportTextFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportProjectJSON?: () => void;
  exportProjectManuscripts?: (format: ProjectManuscriptFormat) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
  signInWithGoogle: () => void;
  signOut: () => void;
  authConfigured: boolean;
  handleSync: () => void;
  syncStatus: string;
  lastSyncTime: number | null;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  showConfirm: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    type?: 'danger' | 'warning' | 'info';
  }) => void;
  closeConfirm: () => void;
  onReorderSessions?: (fromIndex: number, toIndex: number) => void;
}

const OSDesktop: React.FC<OSDesktopProps> = ({
  focusMode, projects, createNewProject, currentProjectId, setCurrentProjectId,
  currentSessionId, setCurrentSessionId, currentProject: _currentProject, sessions,
  createNewSession, activeTab, handleTabChange, studioMode: _studioMode, setStudioMode: _setStudioMode,
  exportTXT, exportJSON, exportAllJSON, handleExportEPUB: _handleExportEPUB, handleExportDOCX: _handleExportDOCX, handleImportJSON: _handleImportJSON, handleImportTextFiles, fileInputRef,
  user, signInWithGoogle: _signInWithGoogle, signOut: _signOut, authConfigured: _authConfigured, handleSync: _handleSync, syncStatus, language, setLanguage, showConfirm: _showConfirm, closeConfirm: _closeConfirm
}) => {
  const t = createT(language);
  const [hoveredTab, setHoveredTab] = useState<AppTab | null>(null);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const textFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // ── Dock position (free-move) ──
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockPos, setDockPos] = useState<DockPosition | null>(() => loadDockPosition());
  const [isDockDraggingState, setIsDockDraggingState] = useState(false);
  const isDockDragging = useRef(false);
  const dockDragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  useEffect(() => {
    if (dockPos) saveDockPosition(dockPos);
  }, [dockPos]);

  // Handle window resize to keep dock in bounds
  useEffect(() => {
    const handleResize = () => {
      if (!dockPos || !dockRef.current) return;
      const w = dockRef.current.offsetWidth;
      const h = dockRef.current.offsetHeight;
      let nx = dockPos.x;
      let ny = dockPos.y;
      let changed = false;

      if (nx > window.innerWidth - w) { nx = Math.max(0, window.innerWidth - w); changed = true; }
      if (ny > window.innerHeight - h) { ny = Math.max(0, window.innerHeight - h); changed = true; }
      
      if (changed) setDockPos({ x: nx, y: ny });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dockPos]);

  const handleDockMoveStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDockDragging.current = true;
    setIsDockDraggingState(true);
    const rect = dockRef.current?.getBoundingClientRect();
    if (rect) {
      dockDragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    }

    const onMove = (ev: MouseEvent) => {
      if (!isDockDragging.current || !dockRef.current) return;
      const w = dockRef.current.offsetWidth;
      const h = dockRef.current.offsetHeight;
      
      // Edge snapping & Viewport bounds
      const snapThreshold = 20;
      let nx = ev.clientX - dockDragOffset.current.dx;
      let ny = ev.clientY - dockDragOffset.current.dy;

      if (nx < snapThreshold) nx = 0;
      if (nx > window.innerWidth - w - snapThreshold) nx = window.innerWidth - w;
      if (ny < snapThreshold) ny = 0;
      if (ny > window.innerHeight - h - snapThreshold) ny = window.innerHeight - h;

      setDockPos({ x: nx, y: ny });
    };
    const onUp = () => {
      isDockDragging.current = false;
      setIsDockDraggingState(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleDockReset = useCallback(() => {
    setDockPos(null);
    localStorage.removeItem(DOCK_POS_KEY);
  }, []);

  // ── Dock items definition ──
  const allDockItems: DockItem[] = [
    { id: 'world' as AppTab, icon: Globe, label: language === 'KO' ? '세계관' : 'World', color: 'text-yellow-400' },
    { id: 'characters' as AppTab, icon: UserCircle, label: language === 'KO' ? '인물' : 'Characters', color: 'text-purple-400' },
    { id: 'rulebook' as AppTab, icon: FileText, label: language === 'KO' ? '설정집' : 'Rulebook', color: 'text-blue-400' },
    { id: 'writing' as AppTab, icon: PenTool, label: language === 'KO' ? '집필' : 'Writing', color: 'text-emerald-400' },
    { id: 'manuscript' as AppTab, icon: Library, label: language === 'KO' ? '원고 관리' : 'Manuscript', color: 'text-pink-400' },
    { id: 'style' as AppTab, icon: Edit3, label: language === 'KO' ? '문체' : 'Style', color: 'text-yellow-400' },
    { id: 'visual' as AppTab, icon: Zap, label: language === 'KO' ? '비주얼' : 'Visual', color: 'text-emerald-400' },
    { id: 'history' as AppTab, icon: History, label: language === 'KO' ? '기록' : 'History', color: 'text-blue-400' },
    { id: 'docs' as AppTab, icon: BookOpen, label: language === 'KO' ? '가이드' : 'Docs', color: 'text-yellow-400' }
  ];

  // ── Drag-and-drop reorder state ──
  const [dockOrder, setDockOrder] = useState<AppTab[]>(() => {
    const saved = loadDockOrder();
    if (saved) {
      // Validate: all ids must still exist, add missing ones at end
      const allIds = allDockItems.map(d => d.id);
      const valid = saved.filter(id => allIds.includes(id));
      const missing = allIds.filter(id => !valid.includes(id));
      return [...valid, ...missing];
    }
    return allDockItems.map(d => d.id);
  });

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLButtonElement | null>(null);

  // Reorder based on saved order
  const orderedDockItems = dockOrder.map(id => allDockItems.find(d => d.id === id)!).filter(Boolean);

  // Persist when order changes
  useEffect(() => {
    saveDockOrder(dockOrder);
  }, [dockOrder]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>, idx: number) => {
    setDragIdx(idx);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    // Ghost image — slightly transparent
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDragIdx(null);
    setDragOverIdx(null);
    dragNodeRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLButtonElement>, targetIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === targetIdx) {
      handleDragEnd();
      return;
    }
    setDockOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    handleDragEnd();
  }, [dragIdx, handleDragEnd]);

  if (focusMode) return null;

  return (
    <>
      {/* OS Top Menu Bar */}
      <div className="fixed top-0 left-0 w-full h-10 bg-black/60 backdrop-blur-xl border-b border-white/10 z-9999 flex items-center justify-between px-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/90 hover:text-white">
            <Zap className="h-4 w-4 text-accent-amber" />
            <span className="font-bold tracking-wider">NOA 스튜디오</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <select
              value={currentProjectId || ''}
              onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
              className="bg-transparent border-none text-white/80 outline-none hover:text-white cursor-pointer"
            >
              <option value="" disabled>{t('sidebar.activeProject')}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-bg-primary">{p.name}</option>
              ))}
            </select>
            <button onClick={createNewProject} className="text-white/50 hover:text-white" title={t('project.newProject')}>
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/20 mx-1" />

          <div className="flex items-center gap-2">
            <select
              value={currentSessionId || ''}
              onChange={e => setCurrentSessionId(e.target.value)}
              className="bg-transparent border-none text-white/80 outline-none hover:text-white cursor-pointer max-w-[200px]"
            >
              <option value="" disabled>{language === 'KO' ? '에피소드 선택' : 'Select Episode'}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-bg-primary">{s.title}</option>
              ))}
            </select>
            <button onClick={createNewSession} className="text-white/50 hover:text-white" title="New Episode">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* System Tray */}
           {user && (
             <div className="flex items-center gap-2 text-white/70">
               <Cloud className="w-3.5 h-3.5" />
               <span className="text-[10px]">{syncStatus}</span>
             </div>
           )}
           <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-0.5 border border-white/10">
             {['KO', 'EN', 'JP', 'CN'].map(l => (
               <button
                 key={l}
                 onClick={() => setLanguage(l as AppLanguage)}
                 className={`text-[9px] font-bold px-1.5 rounded transition ${language === l ? 'text-accent-amber bg-white/10' : 'text-white/50 hover:text-white'}`}
               >
                 {l}
               </button>
             ))}
           </div>
           <span className="text-white/90">
             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
      </div>

      {/* OS Bottom Dock — Draggable & Movable */}
      <div
        ref={dockRef}
        className={`fixed z-9999 flex items-center gap-2 px-4 py-2.5 rounded-[28px] bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.9)] ${!isDockDraggingState ? 'transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)' : ''}`}
        style={
          dockPos
            ? { left: dockPos.x, top: dockPos.y }
            : { bottom: 16, left: '50%', transform: 'translateX(-50%)' }
        }
      >
        {/* Move Handle — Upgraded to be more visible and interactive */}
        <div
          onMouseDown={handleDockMoveStart}
          onDoubleClick={handleDockReset}
          className={`flex flex-col items-center justify-center w-10 h-10 cursor-grab active:cursor-grabbing rounded-full border border-white/5 bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all mr-2 shrink-0 group/handle ${isDockDraggingState ? 'scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : ''}`}
          title={language === 'KO' ? '드래그하여 이동 · 더블클릭 초기화' : 'Drag to move · Double-click to reset'}
        >
          <GripVertical className="w-5 h-5 text-white/30 group-hover/handle:text-accent-amber transition-colors" />
        </div>
        {orderedDockItems.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx && dragIdx !== idx;
          
          return (
            <button
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              onClick={() => handleTabChange(tab.id as AppTab)}
              className={`relative flex flex-col items-center justify-center transition-all duration-300 ease-out group ${
                isDragging ? 'opacity-40 scale-90' : ''
              } ${isDragOver ? 'scale-110' : ''} ${
                isHovered && !isDragging ? '-translate-y-2 scale-110' : isActive && !isDragging ? '-translate-y-1' : ''
              }`}
              style={{ width: "56px", height: "56px" }}
            >
              {/* Drop indicator — left edge glow */}
              {isDragOver && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0.5 h-8 bg-accent-amber rounded-full shadow-[0_0_8px_rgba(202,161,92,0.8)]" />
              )}

              {/* Drag handle — shows on hover */}
              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 transition-opacity duration-200 ${isHovered && !isDragging ? 'opacity-50' : 'opacity-0'}`}>
                <GripVertical className="w-3 h-3 text-white/40 rotate-90" />
              </div>

              {/* Icon Box */}
              <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center transition-all duration-300 ${
                isActive 
                  ? 'bg-white/10 border border-white/20 shadow-inner' 
                  : 'bg-transparent border border-transparent hover:bg-white/10'
              }`}>
                <tab.icon className={`w-6 h-6 ${tab.color} ${isActive || isHovered ? 'opacity-100 drop-shadow-[0_0_12px_currentColor]' : 'opacity-70'} transition-opacity`} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {/* Text Label */}
              <span className={`text-[10px] sm:text-[11px] font-bold mt-1.5 tracking-wide transition-colors ${
                isActive ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-300 group-hover:text-white'
              }`}>
                {tab.label}
              </span>

              {/* Active Indicator (Dot) */}
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              )}
            </button>
          );
        })}

        <div className="w-px h-10 bg-white/10 mx-1" />

        {/* System Settings & Actions */}
        <div className="relative">
          <button
            onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
            className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-transparent hover:border-white/10"
          >
            <Settings className="w-6 h-6" />
          </button>

          {isSystemMenuOpen && (
            <div className="absolute bottom-16 right-0 w-64 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 z-110">
              <button onClick={() => { setIsSystemMenuOpen(false); handleTabChange('settings'); }} className="text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2">
                <Settings className="w-4 h-4" /> {t('sidebar.settings')}
              </button>
              <button 
                onClick={() => { setIsSystemMenuOpen(false); handleDockReset(); }} 
                className="text-left px-3 py-2 text-xs text-accent-amber/80 hover:text-accent-amber hover:bg-white/10 rounded-xl flex items-center gap-2"
              >
                <Move className="w-4 h-4" /> {language === 'KO' ? '독 위치 초기화' : 'Reset Dock Position'}
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button onClick={exportTXT} className="text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2">
                <Download className="w-4 h-4" /> TXT {language === 'KO' ? '내보내기' : 'Export'}
              </button>
              <button onClick={exportJSON} className="text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2">
                <Download className="w-4 h-4" /> JSON {language === 'KO' ? '내보내기' : 'Export'}
              </button>
              <button onClick={exportAllJSON} className="text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2">
                <Download className="w-4 h-4" /> {language === 'KO' ? '전체 백업' : 'Full Backup'} (JSON)
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button onClick={() => fileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2">
                <Upload className="w-4 h-4" /> JSON {language === 'KO' ? '가져오기' : 'Import'}
              </button>
              <button onClick={() => textFileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl flex items-center gap-2">
                <Upload className="w-4 h-4" /> {language === 'KO' ? '텍스트 소설 가져오기' : 'Import TXT novel'}
              </button>
              <input ref={textFileInputRef} type="file" accept=".txt,.md" multiple className="hidden" onChange={handleImportTextFiles} />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OSDesktop;
