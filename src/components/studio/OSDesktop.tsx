"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, ScrollText, UserCircle, Feather, Type, Clock,
  Download, Upload, Cloud, Settings, BookMarked, Library, GripVertical, Move,
  Languages, Globe, ImageIcon, Film, MoreHorizontal, Printer,
  ArrowUpToLine, ArrowDownToLine,
} from 'lucide-react';
import { AppTab, AppLanguage, Project, ChatSession } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import type { ProjectManuscriptFormat } from '@/hooks/useStudioExport';

const DOCK_STORAGE_KEY = 'eh-dock-order';
const DOCK_POS_KEY = 'eh-dock-position';
const DOCK_ANCHOR_KEY = 'eh-dock-anchor'; // 'top' | 'bottom'

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
  try { localStorage.setItem(DOCK_POS_KEY, JSON.stringify(pos)); } catch { /* [의도적 무시] localStorage 쓰기 실패 (private mode 등) */ }
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
  try { localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(order)); } catch { /* [의도적 무시] localStorage 쓰기 실패 (private mode 등) */ }
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
  sessions: ChatSession[];
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  createNewSession: () => void;
  activeTab: AppTab;
  handleTabChange: (tab: AppTab) => void;
  exportTXT: () => void;
  exportJSON: () => void;
  exportAllJSON: () => void;
  handleExportEPUB: () => void;
  handleExportDOCX: () => void;
  handleImportTextFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  exportProjectJSON?: () => void;
  exportProjectManuscripts?: (format: ProjectManuscriptFormat) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  user: { displayName: string | null; email: string | null; photoURL: string | null } | null;
  syncStatus: string;
  lastSyncTime: number | null;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  onReorderSessions?: (fromIndex: number, toIndex: number) => void;
}

// ============================================================
// PART 2 — OSDesktop Component
// ============================================================
const OSDesktop: React.FC<OSDesktopProps> = ({
  focusMode, projects, createNewProject, currentProjectId, setCurrentProjectId,
  currentSessionId, setCurrentSessionId, sessions,
  createNewSession, activeTab, handleTabChange,
  exportTXT, exportJSON, exportAllJSON,
  handleExportEPUB, handleExportDOCX,
  handleImportTextFiles, fileInputRef,
  user, syncStatus,
  language, setLanguage,
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

  // ── Dock anchor (top | bottom) — 자유이동 없을 때 적용, 팝업 방향 결정 ──
  const [dockAnchor, setDockAnchor] = useState<'top' | 'bottom'>(() => {
    if (typeof window === 'undefined') return 'bottom';
    try {
      const saved = localStorage.getItem(DOCK_ANCHOR_KEY);
      return saved === 'top' ? 'top' : 'bottom';
    } catch { return 'bottom'; }
  });

  const toggleDockAnchor = useCallback(() => {
    setDockAnchor(prev => {
      const next = prev === 'top' ? 'bottom' : 'top';
      try { localStorage.setItem(DOCK_ANCHOR_KEY, next); } catch { /* quota */ }
      return next;
    });
    // 앵커 전환 시 자유이동 위치 초기화 (드래그로 옮긴 상태면 해제)
    setDockPos(null);
    try { localStorage.removeItem(DOCK_POS_KEY); } catch { /* private */ }
  }, []);

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
    try { localStorage.removeItem(DOCK_POS_KEY); } catch { /* private */ }
  }, []);

  // ── Dock items (소설 탭) — 집필 앱 아이콘/색상 ──
  // Primary 5: 항상 표시 | Overflow 4: "더보기" 뒤에 숨김
  const PRIMARY_TAB_IDS: AppTab[] = ['world' as AppTab, 'characters' as AppTab, 'rulebook' as AppTab, 'writing' as AppTab, 'manuscript' as AppTab];
  const OVERFLOW_TAB_IDS: AppTab[] = ['visual' as AppTab, 'style' as AppTab, 'history' as AppTab, 'docs' as AppTab];

  const allDockItems: DockItem[] = [
    { id: 'world' as AppTab, icon: ScrollText, label: L4(language, { ko: '세계관', en: 'World', ja: '世界観', zh: '世界观' }), color: 'text-text-secondary' },
    { id: 'characters' as AppTab, icon: UserCircle, label: L4(language, { ko: '인물', en: 'Characters', ja: '人物', zh: '人物' }), color: 'text-text-secondary' },
    { id: 'rulebook' as AppTab, icon: Film, label: L4(language, { ko: '연출', en: 'Direction', ja: '演出', zh: '演出' }), color: 'text-text-secondary' },
    { id: 'writing' as AppTab, icon: Feather, label: L4(language, { ko: '집필', en: 'Writing', ja: '執筆', zh: '写作' }), color: 'text-text-secondary' },
    { id: 'manuscript' as AppTab, icon: Library, label: L4(language, { ko: '원고', en: 'Manuscript', ja: '原稿', zh: '稿件' }), color: 'text-text-secondary' },
    { id: 'visual' as AppTab, icon: ImageIcon, label: L4(language, { ko: '이미지', en: 'Image', ja: '画像', zh: '图片' }), color: 'text-text-secondary' },
    { id: 'style' as AppTab, icon: Type, label: L4(language, { ko: '문체', en: 'Style', ja: '文体', zh: '文风' }), color: 'text-text-secondary' },
    { id: 'history' as AppTab, icon: Clock, label: L4(language, { ko: '기록', en: 'History', ja: '履歴', zh: '历史' }), color: 'text-text-secondary' },
    { id: 'docs' as AppTab, icon: BookMarked, label: L4(language, { ko: '가이드', en: 'Docs', ja: 'ガイド', zh: '指南' }), color: 'text-text-secondary' },
  ];

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  // ── App 링크 아이콘 (UNIVERSE / TRANSLATE) ──
  // 번역: 창작→번역→출판 파이프라인의 "다음 단계". 현재 세션이 있으면 세션 ID 전달.
  // 코드 스튜디오는 유니버스 내 도구(/tools)로 이동 (2026-04-21) — 집필 OS dock은
  // 창작 파이프라인(세계관·번역) 중심으로 정돈. Code Studio는 /tools 에서 접근.
  const translationHref = currentSessionId
    ? `/translation-studio?from=${encodeURIComponent(currentSessionId)}`
    : '/translation-studio';
  const hasManuscript = (sessions.find(s => s.id === currentSessionId)?.config.manuscripts?.length ?? 0) > 0;
  const appLinks = [
    { href: '/archive', icon: Globe, label: L4(language, { ko: '유니버스', en: 'Universe', ja: 'ユニバース', zh: '宇宙' }), color: 'text-text-secondary' },
    // 번역은 파이프라인 "다음 단계" — 원고 있으면 앰버 강조, 없으면 일반
    { href: translationHref, icon: Languages, label: L4(language, { ko: '번역', en: 'Translate', ja: '翻訳', zh: '翻译' }), color: hasManuscript ? 'text-accent-amber' : 'text-text-secondary' },
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
      <div data-zen-hide className="fixed top-0 left-0 w-full h-10 bg-bg-secondary/90 backdrop-blur-xl border-b border-border z-[var(--z-tooltip)] flex items-center justify-between px-4 text-xs font-mono text-text-secondary">
        <div className="flex items-center gap-4">
          <Link href="/studio" className="flex items-center gap-2 text-text-primary hover:text-accent-amber transition-colors">
            <Feather className="h-4 w-4 text-accent-amber" />
            <span className="font-serif font-semibold tracking-wider">{language === 'KO' ? 'NOA 스튜디오' : language === 'JP' ? 'NOA スタジオ' : language === 'CN' ? 'NOA 工作室' : 'NOA Studio'}</span>
          </Link>

          <div className="flex items-center gap-2">
            <select
              value={currentProjectId || ''}
              onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
              className="bg-transparent border-none text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 hover:text-text-primary cursor-pointer font-serif"
            >
              <option value="" disabled>{t('sidebar.activeProject')}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-bg-primary">{p.name}</option>
              ))}
            </select>
            <button onClick={createNewProject} className="text-text-tertiary hover:text-accent-amber transition-colors" title={t('project.newProject')}>
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-2">
            <select
              value={currentSessionId || ''}
              onChange={e => setCurrentSessionId(e.target.value)}
              className="bg-transparent border-none text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 hover:text-text-primary cursor-pointer max-w-[200px] font-serif"
            >
              <option value="" disabled>{L4(language, { ko: '챕터 선택', en: 'Select Chapter', ja: 'チャプター選択', zh: '选择章节' })}</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id} className="bg-bg-primary">{s.title}</option>
              ))}
            </select>
            <button onClick={createNewSession} className="text-text-tertiary hover:text-accent-amber transition-colors" title="New Chapter">
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
          <div className="flex items-center gap-1.5 bg-bg-tertiary/50 rounded-full px-2 py-0.5 border border-border">
            {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`text-[9px] font-bold px-1.5 rounded transition ${language === l ? 'text-accent-amber bg-accent-amber/15' : 'text-text-tertiary hover:text-accent-amber'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <span className="text-text-tertiary font-serif">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* OS Bottom Dock — 집필 앱 양피지 톤 */}
      <div
        ref={dockRef}
        data-zen-hide
        data-dock-anchor={dockAnchor}
        className={`fixed z-[var(--z-tooltip)] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[28px] bg-bg-secondary/95 backdrop-blur-2xl border border-border shadow-panel ${!isDockDraggingState ? 'transition-[transform,opacity,background-color,border-color,color] duration-500' : ''}`}
        style={
          dockPos
            ? { left: dockPos.x, top: dockPos.y }
            : dockAnchor === 'top'
              ? { top: 'calc(env(safe-area-inset-top, 0px) + 16px)', left: '50%', transform: 'translateX(-50%)' }
              : { bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', left: '50%', transform: 'translateX(-50%)' }
        }
      >
        {/* 앵커 토글 — 상단/하단 전환 */}
        <button
          type="button"
          onClick={toggleDockAnchor}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-bg-tertiary/30 hover:bg-bg-tertiary/60 active:bg-bg-tertiary transition-colors mr-1 shrink-0 group/anchor"
          title={L4(language, {
            ko: dockAnchor === 'top' ? '하단으로 이동' : '상단으로 이동',
            en: dockAnchor === 'top' ? 'Move to bottom' : 'Move to top',
            ja: dockAnchor === 'top' ? '下部へ移動' : '上部へ移動',
            zh: dockAnchor === 'top' ? '移至底部' : '移至顶部',
          })}
          aria-label={L4(language, {
            ko: dockAnchor === 'top' ? '독을 하단으로' : '독을 상단으로',
            en: dockAnchor === 'top' ? 'Dock to bottom' : 'Dock to top',
            ja: dockAnchor === 'top' ? 'ドックを下部に' : 'ドックを上部に',
            zh: dockAnchor === 'top' ? '停靠到底部' : '停靠到顶部',
          })}
        >
          {dockAnchor === 'top'
            ? <ArrowDownToLine className="w-4 h-4 text-text-tertiary group-hover/anchor:text-accent-amber transition-colors" />
            : <ArrowUpToLine className="w-4 h-4 text-text-tertiary group-hover/anchor:text-accent-amber transition-colors" />}
        </button>

        {/* Move Handle — 자유 이동 */}
        <div
          onMouseDown={handleDockMoveStart}
          onDoubleClick={handleDockReset}
          className={`flex flex-col items-center justify-center w-10 h-10 cursor-grab active:cursor-grabbing rounded-full border border-border bg-bg-tertiary/30 hover:bg-bg-tertiary/60 active:bg-bg-tertiary transition-colors mr-2 shrink-0 group/handle ${isDockDraggingState ? 'scale-110 shadow-panel' : ''}`}
          title={language === 'KO' ? '드래그하여 이동 · 더블클릭 초기화' : 'Drag to move · Double-click to reset'}
        >
          <GripVertical className="w-5 h-5 text-text-tertiary group-hover/handle:text-accent-amber transition-colors" />
        </div>

        {/* 소설 탭 아이콘 — Primary 5개 + 활성 overflow 탭 */}
        {orderedDockItems
          .filter((tab) => {
            // Always show primary tabs
            if (PRIMARY_TAB_IDS.includes(tab.id)) return true;
            // Show overflow tab if it is currently active (temporary promotion)
            if (OVERFLOW_TAB_IDS.includes(tab.id) && activeTab === tab.id) return true;
            return false;
          })
          .map((tab) => {
            const idx = orderedDockItems.indexOf(tab);
            const isActive = activeTab === tab.id;
            const isHovered = hoveredTab === tab.id;
            const isDragging = dragIdx === idx;
            const isDragOver = dragOverIdx === idx && dragIdx !== idx;
            const isPromoted = OVERFLOW_TAB_IDS.includes(tab.id);

            return (
              <button
                key={tab.id}
                draggable={!isPromoted}
                onDragStart={(e) => !isPromoted && handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => !isPromoted && handleDragOver(e, idx)}
                onDrop={(e) => !isPromoted && handleDrop(e, idx)}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                onClick={() => handleTabChange(tab.id as AppTab)}
                className={`relative flex flex-col items-center justify-center transition-[transform,opacity,background-color,border-color,color] duration-200 ease-out group ${
                  isDragging ? 'opacity-40' : ''
                } ${isDragOver ? 'brightness-125' : ''} ${
                  isHovered && !isDragging ? 'brightness-125' : ''
                }`}
                style={{ width: '56px', height: '56px' }}
              >
                {isDragOver && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0.5 h-8 bg-accent-amber rounded-full" />
                )}
                {!isPromoted && (
                  <div className={`absolute -top-1 left-1/2 -translate-x-1/2 transition-opacity duration-200 ${isHovered && !isDragging ? 'opacity-50' : 'opacity-0'}`}>
                    <GripVertical className="w-3 h-3 text-text-tertiary rotate-90" />
                  </div>
                )}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center transition-[transform,opacity,background-color,border-color,color] duration-200 ${
                  isActive
                    ? 'bg-accent-amber/10 border border-accent-amber/30'
                    : 'bg-transparent border border-transparent hover:bg-bg-tertiary/50'
                }`}>
                  <tab.icon className={`w-6 h-6 ${isActive ? 'text-accent-amber' : tab.color} ${isActive || isHovered ? 'opacity-100' : 'opacity-70'} transition-opacity`} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={`text-[10px] sm:text-[11px] font-serif mt-1.5 tracking-wide transition-colors ${
                  isActive ? 'text-accent-amber' : 'text-text-secondary group-hover:text-text-primary'
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-accent-amber" />
                )}
              </button>
            );
          })}

        {/* "더보기" overflow toggle button */}
        <div ref={overflowRef} className="relative">
          <button
            onClick={() => setOverflowOpen(!overflowOpen)}
            className={`relative flex flex-col items-center justify-center transition-[transform,opacity,background-color,border-color,color] duration-200 ease-out group ${
              overflowOpen ? 'brightness-125' : ''
            }`}
            style={{ width: '56px', height: '56px' }}
            title={L4(language, { ko: '더보기', en: 'More', ja: 'もっと見る', zh: '更多' })}
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center transition-[transform,opacity,background-color,border-color,color] duration-200 ${
              overflowOpen
                ? 'bg-bg-tertiary/60 border border-border/50'
                : 'bg-transparent border border-transparent hover:bg-bg-tertiary/50'
            }`}>
              <MoreHorizontal className={`w-6 h-6 ${overflowOpen ? 'text-accent-amber' : 'text-text-secondary'} opacity-70 group-hover:opacity-100 transition-opacity`} strokeWidth={1.8} />
            </div>
            <span className={`text-[10px] sm:text-[11px] font-serif mt-1.5 tracking-wide transition-colors ${
              overflowOpen ? 'text-accent-amber' : 'text-text-secondary group-hover:text-text-primary'
            }`}>
              {L4(language, { ko: '더보기', en: 'More', ja: 'もっと', zh: '更多' })}
            </span>
            {/* Dot indicator when any overflow tab is active */}
            {OVERFLOW_TAB_IDS.includes(activeTab) && (
              <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-accent-amber" />
            )}
          </button>

          {/* Overflow popup — 4 hidden tabs (앵커에 따라 방향 반전) */}
          {overflowOpen && (
            <div className={`absolute left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-2 rounded-2xl bg-bg-secondary/95 backdrop-blur-xl border border-border shadow-panel z-[var(--z-dropdown)] ${dockAnchor === 'top' ? 'top-[68px]' : 'bottom-[68px]'}`}>
              {allDockItems
                .filter((tab) => OVERFLOW_TAB_IDS.includes(tab.id))
                .map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleTabChange(tab.id as AppTab);
                        setOverflowOpen(false);
                      }}
                      className="relative flex flex-col items-center justify-center transition-[transform,opacity,background-color,border-color,color] duration-200 ease-out group"
                      style={{ width: '56px', height: '56px' }}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center transition-[transform,opacity,background-color,border-color,color] duration-200 ${
                        isActive
                          ? 'bg-accent-amber/10 border border-accent-amber/30'
                          : 'bg-transparent border border-transparent hover:bg-bg-tertiary/50'
                      }`}>
                        <tab.icon className={`w-6 h-6 ${isActive ? 'text-accent-amber' : tab.color} ${isActive ? 'opacity-100' : 'opacity-70'} group-hover:opacity-100 transition-opacity`} strokeWidth={isActive ? 2.5 : 1.8} />
                      </div>
                      <span className={`text-[10px] sm:text-[11px] font-serif mt-1.5 tracking-wide transition-colors ${
                        isActive ? 'text-accent-amber' : 'text-text-secondary group-hover:text-text-primary'
                      }`}>
                        {tab.label}
                      </span>
                      {isActive && (
                        <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-accent-amber" />
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* 구분선 */}
        <div className="w-px h-10 bg-border/30 mx-1" />

        {/* 앱 링크 아이콘 (UNIVERSE / TRANSLATE) — 앵커 tier (Handle·Settings와 동일 크기) */}
        {appLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-bg-secondary/30 hover:bg-bg-secondary/50 transition-colors border border-transparent hover:border-border/30"
            title={link.label}
            aria-label={link.label}
          >
            <link.icon className={`w-6 h-6 ${link.color} hover:text-text-primary transition-colors`} strokeWidth={1.8} />
          </Link>
        ))}

        {/* 구분선 */}
        <div className="w-px h-10 bg-border/30 mx-1" />

        {/* Settings */}
        <div className="relative">
          <button
            onClick={() => setIsSystemMenuOpen(!isSystemMenuOpen)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center bg-bg-secondary/30 hover:bg-bg-secondary/50 text-text-secondary hover:text-text-primary transition-colors border border-transparent hover:border-border/30"
          >
            <Settings className="w-6 h-6" />
          </button>

          {isSystemMenuOpen && (
            <div className={`absolute right-0 w-64 bg-bg-secondary/97 backdrop-blur-xl border border-border rounded-2xl p-2 shadow-lg flex flex-col gap-1 z-[var(--z-dropdown)] ${dockAnchor === 'top' ? 'top-16' : 'bottom-16'}`}>
              <button onClick={() => { setIsSystemMenuOpen(false); handleTabChange('settings'); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors">
                <Settings className="w-4 h-4" /> {t('sidebar.settings')}
              </button>
              <button
                onClick={() => { setIsSystemMenuOpen(false); handleDockReset(); }}
                className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors"
              >
                <Move className="w-4 h-4" /> {language === 'KO' ? '독 위치 초기화' : 'Reset Dock Position'}
              </button>
              <div className="h-px bg-border/30 my-1" />
              {/* Export submenu (내보내기) */}
              <div className="px-3 py-1.5 text-[10px] font-black text-text-tertiary uppercase tracking-widest font-serif">
                <Download className="w-3 h-3 inline mr-1.5" />
                {L4(language, { ko: '내보내기', en: 'Export', ja: 'エクスポート', zh: '导出' })}
              </div>
              <button onClick={() => { setIsSystemMenuOpen(false); handleExportEPUB(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
                <span>EPUB <span className="text-text-tertiary text-[10px]">({L4(language, { ko: '전자책', en: 'E-book', ja: '電子書籍', zh: '电子书' })})</span></span>
                <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '전자책 리더용', en: 'For e-book readers', ja: '電子書籍リーダー用', zh: '电子书阅读器用' })}</span>
              </button>
              <button onClick={() => { setIsSystemMenuOpen(false); handleExportDOCX(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
                <span>DOCX <span className="text-text-tertiary text-[10px]">({L4(language, { ko: '워드', en: 'Word', ja: 'ワード', zh: 'Word' })})</span></span>
                <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '워드 편집용', en: 'For Word editing', ja: 'ワード編集用', zh: 'Word编辑用' })}</span>
              </button>
              <button onClick={() => { setIsSystemMenuOpen(false); exportTXT(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
                <span>TXT <span className="text-text-tertiary text-[10px]">({L4(language, { ko: '텍스트', en: 'Text', ja: 'テキスト', zh: '文本' })})</span></span>
                <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '플랫폼 등록용', en: 'For platform submission', ja: 'プラットフォーム登録用', zh: '平台提交用' })}</span>
              </button>
              <button onClick={() => { setIsSystemMenuOpen(false); exportJSON(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex flex-col gap-0.5 font-serif transition-colors pl-7">
                <span>JSON <span className="text-text-tertiary text-[10px]">({L4(language, { ko: '데이터', en: 'Data', ja: 'データ', zh: '数据' })})</span></span>
                <span className="text-[9px] text-text-tertiary">{L4(language, { ko: '백업/복원용', en: 'For backup/restore', ja: 'バックアップ/復元用', zh: '备份/恢复用' })}</span>
              </button>
              <button onClick={() => { setIsSystemMenuOpen(false); exportAllJSON(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
                {L4(language, { ko: '전체 백업', en: 'Full Backup', ja: '全体バックアップ', zh: '全量备份' })} (JSON)
              </button>
              <button onClick={() => { setIsSystemMenuOpen(false); window.print(); }} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
                <Printer className="w-3 h-3" /> {L4(language, { ko: '인쇄', en: 'Print', ja: '印刷', zh: '打印' })}
              </button>

              <div className="h-px bg-border/30 my-1" />
              {/* Import submenu (가져오기) */}
              <div className="px-3 py-1.5 text-[10px] font-black text-text-tertiary uppercase tracking-widest font-serif">
                <Upload className="w-3 h-3 inline mr-1.5" />
                {L4(language, { ko: '가져오기', en: 'Import', ja: 'インポート', zh: '导入' })}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
                JSON {L4(language, { ko: '프로젝트', en: 'Project', ja: 'プロジェクト', zh: '项目' })}
              </button>
              <button onClick={() => textFileInputRef.current?.click()} className="text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-xl flex items-center gap-2 font-serif transition-colors pl-7">
                {L4(language, { ko: '원고 텍스트 (TXT/MD)', en: 'Manuscript Text (TXT/MD)', ja: '原稿テキスト (TXT/MD)', zh: '稿件文本 (TXT/MD)' })}
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
