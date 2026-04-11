"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen, Plus, ScrollText, UserCircle, Feather, Type, Clock,
  Download, Upload, Cloud, Settings, BookMarked, Library, GripVertical, Move,
  Code2, Languages, Globe, Zap,
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

// ============================================================
// PART 2 — OSDesktop Component
// ============================================================
const OSDesktop: React.FC<OSDesktopProps> = ({
  focusMode, projects, createNewProject, currentProjectId, setCurrentProjectId,
  currentSessionId, setCurrentSessionId, currentProject: _currentProject, sessions,
  createNewSession, activeTab, handleTabChange, studioMode: _studioMode, setStudioMode: _setStudioMode,
  exportTXT, exportJSON, exportAllJSON,
  handleExportEPUB: _handleExportEPUB, handleExportDOCX: _handleExportDOCX,
  handleImportJSON: _handleImportJSON, handleImportTextFiles, fileInputRef,
  user, signInWithGoogle: _signInWithGoogle, signOut: _signOut,
  authConfigured: _authConfigured, handleSync: _handleSync, syncStatus,
  language, setLanguage, showConfirm: _showConfirm, closeConfirm: _closeConfirm,
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

  // ── Dock items (소설 탭) — 집필 앱 아이콘/색상 ──
  const allDockItems: DockItem[] = [
    { id: 'world' as AppTab, icon: ScrollText, label: language === 'KO' ? '세계관' : 'World', color: 'text-amber-300' },
    { id: 'characters' as AppTab, icon: UserCircle, label: language === 'KO' ? '인물' : 'Characters', color: 'text-orange-300' },
    { id: 'rulebook' as AppTab, icon: BookOpen, label: language === 'KO' ? '설정집' : 'Rulebook', color: 'text-amber-400' },
    { id: 'writing' as AppTab, icon: Feather, label: language === 'KO' ? '집필' : 'Writing', color: 'text-amber-200' },
    { id: 'manuscript' as AppTab, icon: Library, label: language === 'KO' ? '원고' : 'Manuscript', color: 'text-amber-300' },
    { id: 'style' as AppTab, icon: Type, label: language === 'KO' ? '문체' : 'Style', color: 'text-orange-200' },
    { id: 'history' as AppTab, icon: Clock, label: language === 'KO' ? '기록' : 'History', color: 'text-stone-300' },
    { id: 'docs' as AppTab, icon: BookMarked, label: language === 'KO' ? '가이드' : 'Docs', color: 'text-amber-300' },
  ];

  // ── App 링크 아이콘 (UNIVERSE / CODE / TRANSLATE) ──
  const appLinks = [
    { href: '/archive', icon: Globe, label: language === 'KO' ? '유니버스' : 'Universe', color: 'text-amber-400' },
    { href: '/code-studio', icon: Code2, label: language === 'KO' ? '코드' : 'Code', color: 'text-stone-300' },
    { href: '/translation-studio', icon: Languages, label: language === 'KO' ? '번역' : 'Translate', color: 'text-amber-300' },
  ];

  // ── Drag-and-drop reorder ──
  const [dockOrder, setDockOrder] = useState<AppTab[]>(() => {
    const saved = loadDockOrder();
    if (saved) {
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

  const orderedDockItems = dockOrder.map(id => allDockItems.find(d => d.id === id)!).filter(Boolean);

  useEffect(() => { saveDockOrder(dockOrder); }, [dockOrder]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLButtonElement>, idx: number) => {
    setDragIdx(idx);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1';
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
    if (dragIdx === null || dragIdx === targetIdx) { handleDragEnd(); return; }
    setDockOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    handleDragEnd();
  }, [dragIdx, handleDragEnd]);

  if (focusMode) return null;

  // ============================================================
  // PART 3 — Render
  // ============================================================
  return (
    <>
      {/* OS Top Menu Bar — 집필 세피아 톤 */}
      <div data-zen-hide className="fixed top-0 left-0 w-full h-10 bg-[#1c1208]/90 backdrop-blur-xl border-b border-amber-900/25 z-[9999] flex items-center justify-between px-4 text-xs font-mono text-amber-200/90">
        <div className="flex items-center gap-4">
          <Link href="/studio" className="flex items-center gap-2 text-amber-200/90 hover:text-amber-100 transition-colors">
            <Feather className="h-4 w-4 text-amber-400" />
            <span className="font-serif font-semibold tracking-wider">{language === 'KO' ? 'NOA 스튜디오' : language === 'JP' ? 'NOA スタジオ' : language === 'CN' ? 'NOA 工作室' : 'NOA Studio'}</span>
          </Link>

          <div className="flex items-center gap-2">
            <select
              value={currentProjectId || ''}
              onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
              className="bg-transparent border-none text-amber-200/80 outline-none hover:text-amber-100 cursor-pointer font-serif"
            >
              <option value="" disabled>{t('sidebar.activeProject')}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-[#1c1208]">{p.name}</option>
              ))}
            </select>
            <button onClick={createNewProject} className="text-amber-600/60 hover:text-amber-400 transition-colors" title={t('project.newProject')}>
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-amber-900/30 mx-1" />

          <div className="flex items-center gap-2">
            <select
              value={currentSessionId || ''}
              onChange={e => setCurrentSessionId(e.target.value)}
              className="bg-transparent border-none text-amber-200/80 outline-none hover:text-amber-100 cursor-pointer max-w-[200px] font-serif"
            >
              <option value="" disabled>{language === 'KO' ? '챕터 선택' : 'Select Chapter'}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-[#1c1208]">{s.title}</option>
              ))}
            </select>
            <button onClick={createNewSession} className="text-amber-600/60 hover:text-amber-400 transition-colors" title="New Chapter">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2 text-amber-600/60">
              <Cloud className="w-3.5 h-3.5" />
              <span className="text-[10px]">{syncStatus}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-amber-900/20 rounded-full px-2 py-0.5 border border-amber-800/20">
            {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`text-[9px] font-bold px-1.5 rounded transition ${language === l ? 'text-amber-300 bg-amber-900/40' : 'text-amber-700/60 hover:text-amber-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="text-amber-200/70 font-serif">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* OS Bottom Dock — 집필 앱 양피지 톤 */}
      <div
        ref={dockRef}
        data-zen-hide
        className={`fixed z-[9999] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[28px] bg-[#16100a]/95 backdrop-blur-2xl border border-amber-800/20 shadow-[0_8px_40px_rgba(101,67,33,0.35)] hover:shadow-[0_8px_48px_rgba(101,67,33,0.45)] ${!isDockDraggingState ? 'transition-all duration-500' : ''}`}
        style={
          dockPos
            ? { left: dockPos.x, top: dockPos.y }
            : { bottom: 16, left: '50%', transform: 'translateX(-50%)' }
        }
      >
        {/* Move Handle */}
        <div
          onMouseDown={handleDockMoveStart}
          onDoubleClick={handleDockReset}
          className={`flex flex-col items-center justify-center w-10 h-10 cursor-grab active:cursor-grabbing rounded-full border border-amber-800/20 bg-amber-900/10 hover:bg-amber-900/20 active:bg-amber-900/30 transition-all mr-2 shrink-0 group/handle ${isDockDraggingState ? 'scale-110 shadow-[0_0_16px_rgba(180,120,40,0.3)]' : ''}`}
          title={language === 'KO' ? '드래그하여 이동 · 더블클릭 초기화' : 'Drag to move · Double-click to reset'}
        >
          <GripVertical className="w-5 h-5 text-amber-700/40 group-hover/handle:text-amber-400 transition-colors" />
        </div>

        {/* 소설 탭 아이콘 */}
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
              className={`relative flex flex-col items-center justify-center transition-all duration-200 ease-out group ${
                isDragging ? 'opacity-40' : ''
              } ${isDragOver ? 'brightness-125' : ''} ${
                isHovered && !isDragging ? 'brightness-125' : ''
              }`}
              style={{ width: '56px', height: '56px' }}
            >
              {isDragOver && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0.5 h-8 bg-accent-amber rounded-full shadow-[0_0_8px_rgba(202,161,92,0.8)]" />
              )}
              <div className={`absolute -top-1 left-1/2 -translate-x-1/2 transition-opacity duration-200 ${isHovered && !isDragging ? 'opacity-50' : 'opacity-0'}`}>
                <GripVertical className="w-3 h-3 text-white/40 rotate-90" />
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-amber-900/30 border border-amber-700/40 shadow-[0_0_12px_rgba(180,120,40,0.25)]'
                  : 'bg-transparent border border-transparent hover:bg-amber-900/15'
              }`}>
                <tab.icon className={`w-6 h-6 ${tab.color} ${isActive || isHovered ? 'opacity-100 drop-shadow-[0_0_8px_rgba(180,120,40,0.6)]' : 'opacity-50'} transition-opacity`} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] sm:text-[11px] font-serif mt-1.5 tracking-wide transition-colors ${
                isActive ? 'text-amber-200' : 'text-amber-700/60 group-hover:text-amber-300'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-amber-400/80 shadow-[0_0_6px_rgba(180,120,40,0.8)]" />
              )}
            </button>
          );
        })}

        {/* 구분선 */}
        <div className="w-px h-10 bg-amber-800/20 mx-1" />

        {/* 앱 링크 아이콘 (UNIVERSE / CODE / TRANSLATE) */}
        {appLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="relative flex flex-col items-center justify-center group transition-all duration-200"
            style={{ width: '56px', height: '56px' }}
            title={link.label}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center bg-transparent border border-transparent hover:bg-amber-900/15 transition-all duration-200">
              <link.icon className={`w-6 h-6 ${link.color} opacity-50 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(180,120,40,0.5)] transition-opacity`} strokeWidth={1.8} />
            </div>
            <span className="text-[10px] sm:text-[11px] font-serif mt-1.5 tracking-wide text-amber-700/50 group-hover:text-amber-300 transition-colors">
              {link.label}
            </span>
          </Link>
        ))}

        {/* 구분선 */}
        <div className="w-px h-10 bg-amber-800/20 mx-1" />

        {/* Settings */}
        <div className="relative">
          <button
            onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-amber-900/10 hover:bg-amber-900/20 text-amber-700/50 hover:text-amber-400 transition-colors border border-transparent hover:border-amber-800/20"
          >
            <Settings className="w-6 h-6" />
          </button>

          {isSystemMenuOpen && (
            <div className="absolute bottom-16 right-0 w-64 bg-[#16100a]/97 backdrop-blur-xl border border-amber-800/20 rounded-2xl p-2 shadow-[0_8px_32px_rgba(101,67,33,0.3)] flex flex-col gap-1 z-[110]">
              <button onClick={() => { setIsSystemMenuOpen(false); handleTabChange('settings'); }} className="text-left px-3 py-2 text-xs text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Settings className="w-4 h-4" /> {t('sidebar.settings')}
              </button>
              <button
                onClick={() => { setIsSystemMenuOpen(false); handleDockReset(); }}
                className="text-left px-3 py-2 text-xs text-amber-400/70 hover:text-amber-300 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors"
              >
                <Move className="w-4 h-4" /> {language === 'KO' ? '독 위치 초기화' : 'Reset Dock Position'}
              </button>
              <div className="h-px bg-amber-800/20 my-1" />
              <button onClick={exportTXT} className="text-left px-3 py-2 text-xs text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Download className="w-4 h-4" /> TXT {language === 'KO' ? '원고 내보내기' : 'Export'}
              </button>
              <button onClick={exportJSON} className="text-left px-3 py-2 text-xs text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Download className="w-4 h-4" /> JSON {language === 'KO' ? '내보내기' : 'Export'}
              </button>
              <button onClick={exportAllJSON} className="text-left px-3 py-2 text-xs text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Download className="w-4 h-4" /> {language === 'KO' ? '전체 백업' : 'Full Backup'} (JSON)
              </button>
              <div className="h-px bg-amber-800/20 my-1" />
              <button onClick={() => fileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Upload className="w-4 h-4" /> JSON {language === 'KO' ? '가져오기' : 'Import'}
              </button>
              <button onClick={() => textFileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/20 rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Upload className="w-4 h-4" /> {language === 'KO' ? '원고 텍스트 가져오기' : 'Import TXT novel'}
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
