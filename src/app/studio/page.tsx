"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Settings, Send,
  Sparkles, Menu, Globe, UserCircle,
  Zap, Ghost, X, PenTool, History, StopCircle,
  Download, Upload, Edit3, Search, Maximize2, Minimize2, Printer, Keyboard, Sun, Moon,
  FileType
} from 'lucide-react';
import {
  Message, StoryConfig, Genre,
  AppLanguage, AppTab, PlatformType,
  ChatSession, Project
} from '@/lib/studio-types';
import { TRANSLATIONS, ENGINE_VERSION } from '@/lib/studio-constants';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, processHFCPTurn, type HFCPState as HFCPStateType } from '@/engine/hfcp';
import { EngineReport } from '@/engine/types';
import ChatMessage from '@/components/studio/ChatMessage';
import PlanningView from '@/components/studio/PlanningView';
import ResourceView from '@/components/studio/ResourceView';
import SettingsView from '@/components/studio/SettingsView';
// RulebookView removed — available at /rulebook site-wide
import EngineDashboard from '@/components/studio/EngineDashboard';
import EngineStatusBar from '@/components/studio/EngineStatusBar';
import ApiKeyModal from '@/components/studio/ApiKeyModal';
import { generateStoryStream } from '@/services/geminiService';
import { exportEPUB, exportDOCX } from '@/lib/export-utils';
import dynamic from 'next/dynamic';
const WorldSimulator = dynamic(() => import('@/components/WorldSimulator'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading World Simulator...</div> });
const SceneSheet = dynamic(() => import('@/components/studio/SceneSheet'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Scene Sheet...</div> });
const StyleStudioView = dynamic(() => import('@/components/studio/StyleStudioView'), { ssr: false, loading: () => <div className="text-center py-12 text-text-tertiary text-xs">Loading Style Studio...</div> });
const VersionDiff = dynamic(() => import('@/components/studio/VersionDiff'), { ssr: false });
const TypoPanel = dynamic(() => import('@/components/studio/TypoPanel'), { ssr: false });
const TabAssistant = dynamic(() => import('@/components/studio/TabAssistant'), { ssr: false });
import Link from 'next/link';
import { FileText, Map, Cloud, CloudOff } from 'lucide-react';
import { loadProjects, saveProjects } from '@/lib/project-migration';
import { syncAllProjects } from '@/services/driveService';
// BYOK provider info available via '@/lib/ai-providers'

const INITIAL_CONFIG: StoryConfig = {
  genre: Genre.SYSTEM_HUNTER,
  povCharacter: "",
  setting: "",
  primaryEmotion: "",
  episode: 1,
  title: "",
  totalEpisodes: 25,
  guardrails: { min: 3000, max: 5000 },
  characters: [],
  platform: PlatformType.MOBILE,
};

export default function StudioPage() {
  // ============================================================
  // PROJECT-BASED STATE MANAGEMENT
  // ============================================================
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadProjects();
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const loaded = loadProjects();
    return loaded.length > 0 ? loaded[0].id : null;
  });
  const currentProject = projects.find(p => p.id === currentProjectId) || null;

  // Sessions derived from current project
  const sessions = currentProject?.sessions || [];
  const setSessions = useCallback((updater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== currentProjectId) return p;
      const newSessions = typeof updater === 'function' ? updater(p.sessions) : updater;
      return { ...p, sessions: newSessions, lastUpdate: Date.now() };
    }));
  }, [currentProjectId]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const loaded = loadProjects();
    const firstProject = loaded[0];
    return firstProject?.sessions?.[0]?.id || null;
  });

  const [activeTab, setActiveTab] = useState<AppTab>('world');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('KO');
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [lastReport, setLastReport] = useState<EngineReport | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSession = sessions.find(s => s.id === currentSessionId) || null;
  const t = TRANSLATIONS[language] || TRANSLATIONS['KO'];
  const isKO = language === 'KO';

  // UX feature states
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [lightTheme, setLightTheme] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<string>('ALL');
  const [archiveScope, setArchiveScope] = useState<'project' | 'all'>('project');
  const { user, signInWithGoogle, signOut, isConfigured: authConfigured, accessToken, refreshAccessToken } = useAuth();

  // ============================================================
  // SYNC STATE
  // ============================================================
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const handleSync = useCallback(async () => {
    let token = accessToken;
    if (!token) {
      token = await refreshAccessToken();
      if (!token) return;
    }
    setSyncStatus('syncing');
    try {
      const result = await syncAllProjects(token, projects);
      setProjects(result.merged);
      setLastSyncTime(Date.now());
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || '';
      // Auto-retry on 401 (expired token)
      if (msg.includes('401')) {
        console.warn('[Sync] Token expired, refreshing...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const retryResult = await syncAllProjects(newToken, projects);
            setProjects(retryResult.merged);
            setLastSyncTime(Date.now());
            setSyncStatus('done');
            setTimeout(() => setSyncStatus('idle'), 3000);
            return;
          } catch (retryErr) {
            console.error('[Sync] Retry failed', retryErr);
          }
        }
      }
      console.error('[Sync]', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  }, [accessToken, refreshAccessToken, projects]);

  // ============================================================
  // PROJECT MANAGEMENT
  // ============================================================
  const createNewProject = useCallback(() => {
    const names: Record<AppLanguage, string> = { KO: '새 작품', EN: 'New Project', JP: '新しい作品', CN: '新作品' };
    const p: Project = {
      id: `project-${Date.now()}`,
      name: names[language],
      description: '',
      genre: Genre.SF,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      sessions: [],
    };
    setProjects(prev => [...prev, p]);
    setCurrentProjectId(p.id);
    setCurrentSessionId(null);
  }, [language]);

  const deleteProject = useCallback((projectId: string) => {
    const tp = t.project || {};
    if (!window.confirm(tp.confirmDelete || 'Delete this project?')) return;
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (currentProjectId === projectId) {
      const remaining = projects.filter(p => p.id !== projectId);
      setCurrentProjectId(remaining[0]?.id || null);
      setCurrentSessionId(null);
    }
  }, [currentProjectId, projects, t]);

  const renameProject = useCallback((projectId: string, newName: string) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, name: newName, lastUpdate: Date.now() } : p
    ));
  }, []);

  const moveSessionToProject = useCallback((sessionId: string, targetProjectId: string) => {
    setProjects(prev => {
      const sourceProject = prev.find(p => p.sessions.some(s => s.id === sessionId));
      if (!sourceProject || sourceProject.id === targetProjectId) return prev;
      const session = sourceProject.sessions.find(s => s.id === sessionId);
      if (!session) return prev;
      return prev.map(p => {
        if (p.id === sourceProject.id) {
          return { ...p, sessions: p.sessions.filter(s => s.id !== sessionId), lastUpdate: Date.now() };
        }
        if (p.id === targetProjectId) {
          return { ...p, sessions: [session, ...p.sessions], lastUpdate: Date.now() };
        }
        return p;
      });
    });
    if (currentSessionId === sessionId) {
      setCurrentProjectId(targetProjectId);
    }
  }, [currentSessionId]);

  const [hfcpState] = useState<HFCPStateType>(() => createHFCPState());
  const [writingMode, setWritingMode] = useState<'ai' | 'edit' | 'canvas'>('ai');
  const [editDraft, setEditDraft] = useState('');
  const [canvasContent, setCanvasContent] = useState('');
  const [canvasPass, setCanvasPass] = useState(0);
  const [promptDirective, setPromptDirective] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [saveFlash, setSaveFlash] = useState(false);
  const triggerSave = useCallback(() => {
    // Data is already auto-saved via localStorage, this is visual feedback
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, []); // 0=empty, 1=skeleton, 2=emotion, 3=sensory

  useEffect(() => {
    setIsSidebarOpen(window.innerWidth >= 768);
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    if (activeTab === 'writing') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentSession?.messages, isGenerating, activeTab]);

  const createNewSession = useCallback(() => {
    const sessionTitles: Record<AppLanguage, string> = { KO: "새로운 소설", EN: "New Story", JP: "新しい小説", CN: "新小说" };
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: sessionTitles[language],
      messages: [],
      config: { ...INITIAL_CONFIG },
      lastUpdate: Date.now()
    };

    if (projects.length === 0) {
      // Auto-create default project with the new session inside
      const p: Project = {
        id: 'project-default',
        name: '미분류',
        description: '',
        genre: Genre.SF,
        createdAt: Date.now(),
        lastUpdate: Date.now(),
        sessions: [newSession],
      };
      setProjects([p]);
      setCurrentProjectId(p.id);
    } else {
      setSessions(prev => [newSession, ...prev]);
    }
    setCurrentSessionId(newSession.id);
    setActiveTab('world');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [language, projects.length, setSessions]);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (sessionIdToDelete: string) => {
    const sessionToDelete = sessions.find(s => s.id === sessionIdToDelete);
    if (!sessionToDelete) return;
    const confirmMsg = ({ KO: `'${sessionToDelete.title}' 아카이브를 삭제하시겠습니까?`, EN: `Delete '${sessionToDelete.title}'?`, JP: `'${sessionToDelete.title}'を削除しますか？`, CN: `删除 '${sessionToDelete.title}'？` })[language];
    if (window.confirm(confirmMsg)) {
      const newSessions = sessions.filter(s => s.id !== sessionIdToDelete);
      setSessions(newSessions);
      if (currentSessionId === sessionIdToDelete) {
        setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
        if (newSessions.length === 0) setActiveTab('world');
      }
    }
  };

  const clearAllSessions = () => {
    const confirmMsg = ({ KO: "모든 세션을 삭제하시겠습니까?", EN: "Delete all sessions?", JP: "すべてのセッションを削除しますか？", CN: "删除所有会话？" })[language];
    if (window.confirm(confirmMsg)) {
      setSessions([]);
      setCurrentSessionId(null);
      setActiveTab('world');
    }
  };

  // ============================================================
  // EXPORT / IMPORT / RENAME / SEARCH / SHORTCUTS
  // ============================================================

  // Export session as TXT
  const exportTXT = useCallback(() => {
    if (!currentSession) return;
    const lines = currentSession.messages.map(m => {
      const prefix = m.role === 'user' ? '[USER]' : '[NOA]';
      return `${prefix}\n${m.content}\n`;
    });
    const header = `# ${currentSession.config.title || currentSession.title}\n# Genre: ${currentSession.config.genre} | Episode: ${currentSession.config.episode}\n# Exported: ${new Date().toISOString()}\n\n`;
    const blob = new Blob([header + lines.join('\n---\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title || 'noa-story'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentSession]);

  // Export session as JSON backup
  const exportJSON = useCallback(() => {
    if (!currentSession) return;
    const blob = new Blob([JSON.stringify(currentSession, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSession.title || 'noa-session'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentSession]);

  // Export ALL sessions as JSON
  const exportAllJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noa-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  // Import JSON backup
  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          // Multiple sessions
          setSessions(prev => [...data, ...prev]);
          setCurrentSessionId(data[0]?.id || null);
        } else if (data.id && data.messages) {
          // Single session
          setSessions(prev => [data, ...prev]);
          setCurrentSessionId(data.id);
        }
        setActiveTab('writing');
      } catch {
        alert(isKO ? '유효하지 않은 JSON 파일입니다.' : 'Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [isKO]);

  // Rename session
  const startRename = (sessionId: string, currentTitle: string) => {
    setRenamingSessionId(sessionId);
    setRenameValue(currentTitle);
  };
  const confirmRename = () => {
    if (!renamingSessionId || !renameValue.trim()) return;
    setSessions(prev => prev.map(s =>
      s.id === renamingSessionId ? { ...s, title: renameValue.trim() } : s
    ));
    setRenamingSessionId(null);
    setRenameValue('');
  };

  // Search filter
  const filteredMessages = currentSession?.messages.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Print
  const handlePrint = useCallback(() => {
    if (!currentSession) return;
    const printContent = currentSession.messages.map(m => {
      const prefix = m.role === 'user' ? '📝 ' : '🤖 ';
      return `<div style="margin-bottom:24px;"><strong>${prefix}${m.role.toUpperCase()}</strong><div style="white-space:pre-wrap;font-family:serif;line-height:1.8;margin-top:8px;">${m.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div>`;
    }).join('<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${currentSession.title}</title><style>body{max-width:800px;margin:40px auto;padding:0 20px;font-family:sans-serif;color:#333;}@media print{body{margin:0;}}</style></head><body><h1>${currentSession.title}</h1><p style="color:#888;">${currentSession.config.genre} | EP.${currentSession.config.episode} | ${new Date().toLocaleDateString()}</p><hr>${printContent}</body></html>`);
    w.document.close();
    w.print();
  }, [currentSession]);

  // Export as EPUB
  const handleExportEPUB = useCallback(() => {
    if (!currentSession) return;
    exportEPUB(currentSession);
  }, [currentSession]);

  // Export as DOCX
  const handleExportDOCX = useCallback(() => {
    if (!currentSession) return;
    exportDOCX(currentSession);
  }, [currentSession]);

  // Switch message version
  const handleVersionSwitch = useCallback((messageId: string, versionIndex: number) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== messageId || !m.versions) return m;
        const content = m.versions[versionIndex];
        if (content == null) return m;
        return { ...m, content, currentVersionIndex: versionIndex };
      });
      return { ...s, messages: msgs };
    }));
  }, [currentSessionId]);

  // Apply single typo fix to a message
  const handleTypoFix = useCallback((messageId: string, index: number, original: string, suggestion: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== currentSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== messageId) return m;
        const fixed = m.content.slice(0, index) + suggestion + m.content.slice(index + original.length);
        return { ...m, content: fixed };
      });
      return { ...s, messages: msgs };
    }));
  }, [currentSessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'f') { e.preventDefault(); setShowSearch(prev => !prev); }
      if (ctrl && e.key === 'e') { e.preventDefault(); exportTXT(); }
      if (ctrl && e.key === 'p') { e.preventDefault(); handlePrint(); }
      if (ctrl && e.key === 'n') { e.preventDefault(); createNewSession(); }
      if (e.key === 'F11') { e.preventDefault(); setFocusMode(prev => !prev); }
      if (ctrl && e.key === '/') { e.preventDefault(); setShowShortcuts(prev => !prev); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [exportTXT, handlePrint, createNewSession]);

  const updateCurrentSession = (updates: Partial<ChatSession>) => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s =>
      s.id === currentSessionId ? { ...s, ...updates, lastUpdate: Date.now() } : s
    ));
  };

  const setConfig = (newConfig: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => {
    if (typeof newConfig === 'function') {
      updateCurrentSession({ config: newConfig(currentSession?.config || INITIAL_CONFIG) });
    } else {
      updateCurrentSession({ config: newConfig });
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || input;
    if (!text.trim() || isGenerating || !currentSessionId) return;

    // HFCP: classify input and get prompt modifier
    const hfcpResult = processHFCPTurn(hfcpState, text);
    const hfcpPrefix = hfcpResult.promptModifier ? `\n${hfcpResult.promptModifier}\n` : '';
    const directivePrefix = promptDirective ? `\n[작가 지침: ${promptDirective}]\n` : '';

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now(), meta: { hfcpMode: hfcpResult.mode, hfcpVerdict: hfcpResult.verdict, hfcpScore: hfcpResult.score } as Message['meta'] };
    const aiMsgId = `a-${Date.now()}`;
    const initialAiMsg: Message = { id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now() };
    const existingMessages = currentSession?.messages || [];
    const updatedMessages = [...existingMessages, userMsg, initialAiMsg];

    updateCurrentSession({
      messages: updatedMessages,
      title: existingMessages.length === 0 ? text.substring(0, 15) : currentSession?.title
    });
    setInput('');
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let fullContent = '';
    try {
      // Inject genreSelections from worldSimData into simulatorRef for AI prompt
      const configForAI = {
        ...currentSession!.config,
        simulatorRef: {
          ...currentSession!.config.simulatorRef,
          genreSelections: currentSession!.config.worldSimData?.genreSelections || currentSession!.config.simulatorRef?.genreSelections,
        },
      };
      const result = await generateStoryStream(
        configForAI, directivePrefix + hfcpPrefix + text,
        (chunk) => {
          fullContent += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const msgs = s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m);
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        { language, signal: controller.signal, platform: currentSession!.config.platform, history: existingMessages }
      );

      // Trademark/IP filter — 상표 자동 치환
      const { filterTrademarks } = await import('@/engine/validator');
      const ipCheck = filterTrademarks(fullContent);
      if (ipCheck.matches.length > 0) {
        fullContent = ipCheck.filtered;
        console.info(`[IP Filter] ${ipCheck.matches.length}건 치환: ${[...new Set(ipCheck.matches.map(m => m.original))].join(', ')}`);
      }

      setLastReport(result.report);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const msgs = s.messages.map(m =>
            m.id === aiMsgId
              ? { ...m, content: fullContent, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length } }
              : m
          );
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') console.error(error);
    } finally {
      // 3패스 캔버스 모드: 단계 완료 시 JSON 제거 후 자동 주입
      if (canvasPass >= 1 && canvasPass <= 3 && fullContent) {
        const clean = fullContent.replace(/```json[\s\S]*?```/g, '').trim();
        if (clean) setCanvasContent(clean);
        setWritingMode('canvas');
      }
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = async (assistantMsgId: string) => {
    if (isGenerating || !currentSessionId || !currentSession) return;
    const msgIndex = currentSession.messages.findIndex(m => m.id === assistantMsgId);
    if (msgIndex <= 0) return;
    const userMsg = currentSession.messages[msgIndex - 1];
    if (userMsg.role !== 'user') return;
    const historyMessages = currentSession.messages.slice(0, msgIndex - 1);

    // Save current content to versions before regenerating
    const currentMsg = currentSession.messages[msgIndex];
    const prevVersions = currentMsg.versions ?? [];
    const savedVersions = currentMsg.content ? [...prevVersions, currentMsg.content] : prevVersions;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: '', meta: undefined, versions: savedVersions, currentVersionIndex: savedVersions.length } : m);
        return { ...s, messages: msgs };
      }
      return s;
    }));
    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let fullContent = '';
    try {
      const configForChat = {
        ...currentSession.config,
        simulatorRef: {
          ...currentSession.config.simulatorRef,
          genreSelections: currentSession.config.worldSimData?.genreSelections || currentSession.config.simulatorRef?.genreSelections,
        },
      };
      const result = await generateStoryStream(
        configForChat, userMsg.content,
        (chunk) => {
          fullContent += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m);
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        { language, signal: controller.signal, platform: currentSession.config.platform, history: historyMessages }
      );

      // Trademark/IP filter
      const { filterTrademarks } = await import('@/engine/validator');
      const ipCheck = filterTrademarks(fullContent);
      if (ipCheck.matches.length > 0) {
        fullContent = ipCheck.filtered;
      }

      setLastReport(result.report);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const msgs = s.messages.map(m => {
            if (m.id !== assistantMsgId) return m;
            const updatedVersions = [...(m.versions ?? []), fullContent];
            return { ...m, content: fullContent, versions: updatedVersions, currentVersionIndex: updatedVersions.length - 1, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length } };
          });
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') console.error(error);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleNextEpisode = () => {
    if (!currentSession) return;
    const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
    setConfig({ ...currentSession.config, episode: nextEp });
  };

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${lightTheme ? 'bg-white text-gray-900' : 'bg-bg-primary text-text-primary'}`} style={{ fontFamily: 'var(--font-sans)' }}>
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 left-0 bg-bg-primary border-r border-border transition-transform md:transition-all duration-300 flex flex-col z-50 overflow-hidden ${focusMode ? '-translate-x-full md:translate-x-0 md:w-0' : isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-0'}`}>
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity">
            <Zap className="w-6 h-6 text-accent-purple" />
            <div>
              <h1 className="text-lg font-black italic tracking-tighter font-[family-name:var(--font-mono)]">NOA STUDIO</h1>
              <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] tracking-widest uppercase">← EH UNIVERSE</span>
            </div>
          </Link>
          {/* Project Selector */}
          <div className="mb-3 space-y-1">
            {projects.length === 0 ? (
              <button onClick={createNewProject} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary border border-dashed border-border rounded-xl text-[10px] font-bold text-text-tertiary hover:text-accent-purple hover:border-accent-purple transition-all font-[family-name:var(--font-mono)]">
                <Plus className="w-3.5 h-3.5" /> {t.project?.newProject || 'New Project'}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <select
                    value={currentProjectId || ''}
                    onChange={e => { setCurrentProjectId(e.target.value); setCurrentSessionId(null); }}
                    className="flex-1 bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] outline-none text-text-primary truncate"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sessions.length})</option>
                    ))}
                  </select>
                  <button onClick={createNewProject} className="p-1.5 bg-bg-secondary border border-border rounded-lg text-text-tertiary hover:text-accent-purple transition-colors" title={t.project?.newProject || 'New Project'}>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {currentProject && (
                  <div className="flex gap-1 text-[8px] font-[family-name:var(--font-mono)]">
                    <button onClick={() => {
                      const name = window.prompt(t.project?.renameProject || 'Rename', currentProject.name);
                      if (name) renameProject(currentProject.id, name);
                    }} className="text-text-tertiary hover:text-accent-purple">{t.project?.renameProject || 'Rename'}</button>
                    {projects.length > 1 && (
                      <button onClick={() => deleteProject(currentProject.id)} className="text-text-tertiary hover:text-accent-red">{t.project?.deleteProject || 'Delete'}</button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 py-3 bg-bg-secondary rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-bg-tertiary transition-all mb-6 border border-border font-[family-name:var(--font-mono)]">
            <Plus className="w-4 h-4" /> {t.sidebar.newProject}
          </button>

          <nav className="space-y-1">
            {([
              { tab: 'world' as AppTab, icon: Globe, label: t.sidebar.worldBible },
              { tab: 'critique' as AppTab, icon: Map, label: t.sidebar.worldSimulator },
              { tab: 'characters' as AppTab, icon: UserCircle, label: t.sidebar.characterStudio },
              { tab: 'rulebook' as AppTab, icon: FileText, label: t.sidebar.rulebook },
              { tab: 'writing' as AppTab, icon: PenTool, label: t.sidebar.writingMode },
              { tab: 'style' as AppTab, icon: Edit3, label: t.sidebar.styleStudio },
              { tab: 'history' as AppTab, icon: History, label: t.sidebar.archives },
            ]).map(({ tab, icon: Icon, label }) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all font-[family-name:var(--font-mono)] ${activeTab === tab ? 'bg-accent-purple/20 text-accent-purple shadow-lg' : 'text-text-tertiary hover:bg-bg-secondary'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-border space-y-3">
          {/* Export / Import */}
          <div className="flex gap-1.5">
            <button onClick={exportTXT} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Download className="w-3 h-3" /> TXT
            </button>
            <button onClick={exportJSON} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Download className="w-3 h-3" /> JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <Upload className="w-3 h-3" /> {isKO ? '불러오기' : 'Import'}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleExportEPUB} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <FileText className="w-3 h-3" /> EPUB
            </button>
            <button onClick={handleExportDOCX} disabled={!currentSession} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-tertiary hover:text-text-primary disabled:opacity-30 font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
              <FileType className="w-3 h-3" /> DOCX
            </button>
          </div>
          <button onClick={exportAllJSON} className="w-full py-1.5 bg-bg-secondary border border-border rounded-lg text-[8px] font-bold text-text-tertiary hover:text-text-primary font-[family-name:var(--font-mono)] uppercase tracking-wider transition-colors">
            {isKO ? '📦 전체 백업 (JSON)' : '📦 Full Backup (JSON)'}
          </button>
          {/* Auth */}
          <div className="flex items-center gap-2 py-1">
            {user ? (
              <>
                <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center text-[9px] font-bold text-accent-purple overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.displayName?.[0] || '?'}
                </div>
                <span className="text-[9px] text-text-secondary truncate flex-1">{user.displayName || user.email}</span>
                <button onClick={signOut} className="text-[8px] text-text-tertiary hover:text-accent-red font-bold">{isKO ? '로그아웃' : 'Logout'}</button>
              </>
            ) : (
              <button onClick={() => {
                if (!authConfigured) {
                  alert(isKO ? 'Firebase 설정이 필요합니다.\n.env.local에 NEXT_PUBLIC_FIREBASE_* 환경변수를 설정해주세요.' : 'Firebase configuration required.\nSet NEXT_PUBLIC_FIREBASE_* in .env.local');
                  return;
                }
                signInWithGoogle();
              }} className="w-full py-2 bg-bg-secondary border border-border rounded-lg text-[9px] font-bold text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] transition-colors">
                🔑 {isKO ? 'Google 로그인' : 'Sign in with Google'}
              </button>
            )}
          </div>
          {/* Drive Sync */}
          {user && (
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all border ${
                syncStatus === 'syncing' ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30 animate-pulse'
                : syncStatus === 'done' ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                : syncStatus === 'error' ? 'bg-accent-red/10 text-accent-red border-accent-red/30'
                : 'bg-bg-secondary text-text-tertiary border-border hover:text-text-primary'
              }`}
            >
              {syncStatus === 'syncing' ? <Cloud className="w-3 h-3 animate-spin" /> : syncStatus === 'error' ? <CloudOff className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
              {syncStatus === 'syncing' ? (t.sync?.syncing || 'Syncing...')
                : syncStatus === 'done' ? (t.sync?.syncDone || 'Synced!')
                : syncStatus === 'error' ? (t.sync?.syncError || 'Error')
                : (t.sync?.syncNow || 'Sync')}
            </button>
          )}
          {lastSyncTime && (
            <div className="text-[7px] text-text-tertiary font-[family-name:var(--font-mono)] text-center">
              {t.sync?.lastSync || 'Last'}: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}
          <div className="flex gap-4">
            {(['KO', 'EN', 'JP', 'CN'] as AppLanguage[]).map(l => (
              <button key={l} onClick={() => setLanguage(l)} className={`text-[10px] font-black font-[family-name:var(--font-mono)] ${language === l ? 'text-accent-purple' : 'text-text-tertiary'}`}>{l}</button>
            ))}
          </div>
          <button onClick={() => handleTabChange('settings')} className={`flex items-center gap-2 text-xs font-bold transition-colors font-[family-name:var(--font-mono)] ${activeTab === 'settings' ? 'text-accent-purple' : 'text-text-tertiary hover:text-text-primary'}`}>
            <Settings className="w-4 h-4" /> {t.sidebar.settings}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-bg-primary overflow-hidden">
        <header className={`h-14 flex items-center justify-between px-4 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-bg-secondary rounded-lg transition-colors">
              <Menu className="w-5 h-5 text-text-tertiary" />
            </button>
            <div className="text-sm font-black tracking-tighter uppercase flex items-center gap-2 min-w-0 font-[family-name:var(--font-mono)]">
              <span className="text-text-tertiary hidden sm:inline">{t.sidebar.activeProject}:</span>
              <span className="text-text-primary truncate">{currentSession?.title || t.engine.noStory}</span>
              {currentSessionId && <span className={`text-[8px] font-[family-name:var(--font-mono)] transition-all duration-300 ${saveFlash ? 'text-accent-green scale-125 font-black' : 'text-text-tertiary'}`}>✓ {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '자동 저장' : 'Auto-saved')}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {currentSession && (
              <div className="flex gap-2 md:gap-4">
                <div className="px-3 py-1 bg-bg-secondary rounded-full text-[10px] font-bold text-text-tertiary border border-border hidden sm:block font-[family-name:var(--font-mono)]">
                  {currentSession.config.genre}
                </div>
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all font-[family-name:var(--font-mono)] ${
                    showDashboard
                      ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/30'
                      : 'bg-accent-purple/10 text-accent-purple border-accent-purple/20 hover:bg-accent-purple/20'
                  }`}
                >
                  ANS {ENGINE_VERSION}
                </button>
              </div>
            )}
            {/* Tool buttons */}
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '검색 (Ctrl+F)' : 'Search (Ctrl+F)'} aria-label={isKO ? '검색' : 'Search'}><Search className="w-4 h-4" /></button>
              <button onClick={() => setFocusMode(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '집중 모드 (F11)' : 'Focus Mode (F11)'} aria-label={isKO ? '집중 모드' : 'Focus mode'}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
              <button onClick={() => setLightTheme(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title={isKO ? '테마 전환' : 'Toggle Theme'} aria-label={isKO ? '테마 전환' : 'Toggle theme'}>{lightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}</button>
              <button onClick={() => setShowShortcuts(prev => !prev)} className="p-1.5 hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-purple" title="Ctrl+/" aria-label={isKO ? '단축키 도움말' : 'Keyboard shortcuts'}><Keyboard className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        {/* Search bar */}
        {showSearch && (
          <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-text-tertiary shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={isKO ? '메시지 검색...' : 'Search messages...'} autoFocus
              className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder-text-tertiary" />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Shortcuts modal */}
        {showShortcuts && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
            <div className="bg-bg-primary border border-border rounded-xl p-6 max-w-sm mx-4 space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="font-black text-sm">{isKO ? '키보드 단축키' : 'Keyboard Shortcuts'}</h3>
                <button onClick={() => setShowShortcuts(false)}><X className="w-4 h-4 text-text-tertiary" /></button>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  ['Ctrl+N', isKO ? '새 세션' : 'New session'],
                  ['Ctrl+F', isKO ? '검색' : 'Search'],
                  ['Ctrl+E', isKO ? 'TXT 내보내기' : 'Export TXT'],
                  ['Ctrl+P', isKO ? '인쇄' : 'Print'],
                  ['F11', isKO ? '집중 모드' : 'Focus mode'],
                  ['Ctrl+/', isKO ? '단축키 도움말' : 'Shortcuts help'],
                  ['Enter', isKO ? '메시지 전송' : 'Send message'],
                  ['Shift+Enter', isKO ? '줄바꿈' : 'New line'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex justify-between">
                    <span className="px-2 py-0.5 bg-bg-secondary rounded text-text-tertiary font-[family-name:var(--font-mono)]">{key}</span>
                    <span className="text-text-secondary">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {!currentSessionId && !['settings', 'history', 'rulebook', 'critique', 'style'].includes(activeTab) ? (
              <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                {/* Background gate image */}
                <div className="absolute inset-0 z-0">
                  <img src="/images/gate-infrastructure-visual.jpg" alt="" className="w-full h-full object-cover opacity-20" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
                </div>
                {/* Noise overlay matching landing */}
                <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-accent-purple/30 flex items-center justify-center mb-6 backdrop-blur-sm bg-bg-primary/30">
                    <Ghost className="w-10 h-10 md:w-12 md:h-12 text-accent-purple/40" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black mb-2 tracking-tighter uppercase font-[family-name:var(--font-mono)] text-text-primary">{t.engine.noActiveNarrative}</h2>
                  <p className="text-text-tertiary text-sm mb-2">{t.engine.startPrompt}</p>
                  <p className="text-text-tertiary/50 text-[10px] mb-8 max-w-sm font-[family-name:var(--font-mono)]">
                    {isKO ? '세계관 설계 → 캐릭터 생성 → 연출 설정 → 집필 순서로 진행하세요' : 'World Design → Characters → Direction → Writing — follow the workflow'}
                  </p>
                  <button onClick={createNewSession} className="px-8 py-3 md:px-10 md:py-4 bg-accent-purple text-white rounded-2xl font-black text-xs uppercase tracking-widest font-[family-name:var(--font-mono)] hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-accent-purple/20">{t.sidebar.newProject}</button>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'world' && currentSession && (
                  <>
                    <PlanningView language={language} config={currentSession.config} setConfig={setConfig} onStart={() => setActiveTab('writing')} />
                    <div className="max-w-4xl mx-auto px-4 pb-4">
                      <TabAssistant tab="world" language={language} config={currentSession.config} />
                    </div>
                    <div className="max-w-4xl mx-auto px-4 pb-8 flex justify-end">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save Settings')}
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'critique' && (
                  <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
                    <WorldSimulator lang={language === 'EN' ? 'en' : 'ko'}
                      synopsis={currentSession?.config.synopsis}
                      initialData={currentSession?.config.worldSimData}
                      onSave={(data) => {
                        if (!currentSessionId || !currentSession) return;
                        updateCurrentSession({
                          config: {
                            ...currentSession.config,
                            worldSimData: {
                              civs: data.civs.map(c => ({ name: c.name, era: c.era, color: c.color, traits: c.traits })),
                              relations: data.relations.map(r => {
                                const from = data.civs.find(c => c.id === r.from)?.name || '';
                                const to = data.civs.find(c => c.id === r.to)?.name || '';
                                return { fromName: from, toName: to, type: r.type };
                              }),
                              transitions: data.transitions,
                              selectedGenre: data.selectedGenre,
                              selectedLevel: data.selectedLevel,
                              genreSelections: data.genreSelections,
                              ruleLevel: data.ruleLevel,
                            },
                          },
                        });
                      }}
                    />
                    <div className="mt-4">
                      <TabAssistant tab="critique" language={language} config={currentSession?.config ?? null} />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save')}
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'characters' && currentSession && (
                  <>
                    <ResourceView language={language} config={currentSession.config} setConfig={setConfig} />
                    <div className="max-w-[1400px] mx-auto px-4 pb-4">
                      <TabAssistant tab="characters" language={language} config={currentSession.config} />
                    </div>
                    <div className="max-w-[1400px] mx-auto px-4 pb-8 flex justify-end">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save')}
                      </button>
                    </div>
                  </>
                )}
                {activeTab === 'settings' && (
                  <SettingsView language={language} onClearAll={clearAllSessions} onManageApiKey={() => setShowApiKeyModal(true)} />
                )}
                {/* critique tab rendered above */}
                {activeTab === 'rulebook' && (
                  <div className="max-w-5xl mx-auto py-8 px-4 md:py-12 md:px-6">
                    <SceneSheet lang={language === 'EN' ? 'en' : 'ko'}
                      synopsis={currentSession?.config.synopsis}
                      characterNames={currentSession?.config.characters.map(c => c.name)}
                      initialDirection={currentSession?.config.sceneDirection ? {
                        goguma: currentSession.config.sceneDirection.goguma?.map((g, i) => ({ id: `r-${i}`, type: g.type as "goguma" | "cider", intensity: g.intensity as "small" | "medium" | "large", desc: g.desc, episode: 1 })),
                        hooks: currentSession.config.sceneDirection.hooks?.map((h, i) => ({ id: `r-${i}`, position: h.position as "opening" | "middle" | "ending", hookType: h.hookType, desc: h.desc })),
                        emotions: currentSession.config.sceneDirection.emotionTargets?.map((e, i) => ({ id: `r-${i}`, position: i * 25, emotion: e.emotion, intensity: e.intensity })),
                        dialogueRules: currentSession.config.sceneDirection.dialogueTones?.map((d, i) => ({ id: `r-${i}`, character: d.character, tone: d.tone, notes: d.notes })),
                        dopamines: currentSession.config.sceneDirection.dopamineDevices?.map((dp, i) => ({ id: `r-${i}`, scale: dp.scale as "micro" | "medium" | "macro", device: dp.device, desc: dp.desc, resolved: false })),
                        cliffs: currentSession.config.sceneDirection.cliffhanger ? [{ id: 'r-0', cliffType: currentSession.config.sceneDirection.cliffhanger.cliffType, desc: currentSession.config.sceneDirection.cliffhanger.desc, episode: 1 }] : [],
                      } : undefined}
                      onDirectionUpdate={(data) => {
                        if (!currentSessionId) return;
                        updateCurrentSession({
                          config: {
                            ...(currentSession?.config || INITIAL_CONFIG),
                            sceneDirection: {
                              goguma: data.goguma.map(g => ({ type: g.type, intensity: g.intensity, desc: g.desc })),
                              hooks: data.hooks.map(h => ({ position: h.position, hookType: h.hookType, desc: h.desc })),
                              emotionTargets: data.emotions.map(e => ({ emotion: e.emotion, intensity: e.intensity })),
                              dialogueTones: data.dialogueRules.map(d => ({ character: d.character, tone: d.tone, notes: d.notes })),
                              dopamineDevices: data.dopamines.map(dp => ({ scale: dp.scale, device: dp.device, desc: dp.desc })),
                              cliffhanger: data.cliffs.length > 0 ? { cliffType: data.cliffs[0].cliffType, desc: data.cliffs[0].desc } : undefined,
                            },
                          },
                        });
                      }}
                      onSimRefUpdate={(ref) => {
                        if (!currentSessionId) return;
                        updateCurrentSession({
                          config: {
                            ...(currentSession?.config || INITIAL_CONFIG),
                            simulatorRef: { ...ref },
                          },
                        });
                      }}
                    />
                    <div className="mt-4">
                      <TabAssistant tab="rulebook" language={language} config={currentSession?.config ?? null} />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={triggerSave} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest font-[family-name:var(--font-mono)] transition-all active:scale-95 ${saveFlash ? 'bg-accent-green text-white' : 'bg-accent-purple text-white hover:opacity-80'}`}>
                        💾 {saveFlash ? (isKO ? '저장 완료!' : 'Saved!') : (isKO ? '설정 저장' : 'Save')}
                      </button>
                    </div>
                  </div>
                )}
                {activeTab === 'writing' && currentSession && (
                  <div className="max-w-4xl mx-auto py-8 px-4 md:py-12 md:px-6 space-y-6">
                    {/* Applied Settings Summary */}
                    <details className="group border border-border rounded-xl bg-bg-secondary/50 overflow-hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-secondary transition-colors">
                        <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                          {isKO ? '📋 현재 적용 설정' : '📋 Applied Settings'}
                        </span>
                        <span className="text-[9px] text-text-tertiary group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-3 text-[10px] border-t border-border pt-3">
                        {/* World */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-text-tertiary font-bold uppercase w-16">{isKO ? '장르' : 'Genre'}</span>
                          <span className="text-accent-purple font-bold">{currentSession.config.genre}</span>
                          <span className="text-text-tertiary">EP.{currentSession.config.episode}/{currentSession.config.totalEpisodes}</span>
                          {currentSession.config.setting && <span className="text-text-secondary">📍 {currentSession.config.setting}</span>}
                          {currentSession.config.primaryEmotion && <span className="text-text-secondary">💓 {currentSession.config.primaryEmotion}</span>}
                        </div>
                        {/* Characters */}
                        {currentSession.config.characters.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '캐릭터' : 'Characters'}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.characters.map(c => (
                                <span key={c.id} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                                  <span className="font-bold text-text-primary">{c.name}</span>
                                  <span className="text-text-tertiary ml-1">({c.role})</span>
                                  {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Relations */}
                        {currentSession.config.charRelations && currentSession.config.charRelations.length > 0 && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '관계' : 'Relations'}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.charRelations.map((r, i) => {
                                const from = currentSession.config.characters.find(c => c.id === r.from)?.name || '?';
                                const to = currentSession.config.characters.find(c => c.id === r.to)?.name || '?';
                                return (
                                  <span key={i} className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                                    {from} ⇄ {to} <span className="text-accent-purple">[{r.type}]</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* Synopsis preview */}
                        {currentSession.config.synopsis && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '시놉시스' : 'Synopsis'}</span>
                            <p className="text-text-secondary text-[9px] mt-0.5 line-clamp-2 italic">{currentSession.config.synopsis}</p>
                          </div>
                        )}
                        {/* Scene Direction */}
                        {currentSession.config.sceneDirection && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '연출' : 'Direction'}</span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {currentSession.config.sceneDirection.hooks && currentSession.config.sceneDirection.hooks.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold">
                                  🪝 {isKO ? '훅' : 'Hook'} {currentSession.config.sceneDirection.hooks.length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.goguma && currentSession.config.sceneDirection.goguma.length > 0 && (
                                <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[9px] font-bold">
                                  🍠 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'goguma').length} / 🥤 {currentSession.config.sceneDirection.goguma.filter(g => g.type === 'cider').length}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.cliffhanger && (
                                <span className="px-2 py-0.5 bg-accent-red/10 text-accent-red rounded text-[9px] font-bold">
                                  🔚 {currentSession.config.sceneDirection.cliffhanger.cliffType}
                                </span>
                              )}
                              {currentSession.config.sceneDirection.emotionTargets && currentSession.config.sceneDirection.emotionTargets.length > 0 && (
                                <span className="px-2 py-0.5 bg-bg-primary border border-border rounded text-[9px]">
                                  💓 {currentSession.config.sceneDirection.emotionTargets.map(e => e.emotion).join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Simulator Ref */}
                        {currentSession.config.simulatorRef && Object.values(currentSession.config.simulatorRef).some(Boolean) && (
                          <div>
                            <span className="text-text-tertiary font-bold uppercase">{isKO ? '시뮬레이터' : 'Simulator'}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {currentSession.config.simulatorRef.worldConsistency && <span className="px-1.5 py-0.5 bg-accent-green/10 text-accent-green rounded text-[8px] font-bold">✓ {isKO ? '일관성' : 'Consistency'}</span>}
                              {currentSession.config.simulatorRef.civRelations && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[8px] font-bold">✓ {isKO ? '관계도' : 'Relations'}</span>}
                              {currentSession.config.simulatorRef.timeline && <span className="px-1.5 py-0.5 bg-accent-amber/10 text-accent-amber rounded text-[8px] font-bold">✓ {isKO ? '타임라인' : 'Timeline'}</span>}
                              {currentSession.config.simulatorRef.territoryMap && <span className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[8px] font-bold">✓ {isKO ? '지도' : 'Map'}</span>}
                              {currentSession.config.simulatorRef.languageSystem && <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[8px] font-bold">✓ {isKO ? '언어' : 'Language'}</span>}
                              {currentSession.config.simulatorRef.genreLevel && <span className="px-1.5 py-0.5 bg-accent-red/10 text-accent-red rounded text-[8px] font-bold">✓ {isKO ? '장르Lv' : 'GenreLv'}</span>}
                            </div>
                          </div>
                        )}
                        {/* Quick nav */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setActiveTab('world')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {isKO ? '→ 세계관 수정' : '→ Edit World'}
                          </button>
                          <button onClick={() => setActiveTab('characters')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {isKO ? '→ 캐릭터 수정' : '→ Edit Characters'}
                          </button>
                          <button onClick={() => setActiveTab('rulebook')} className="px-2 py-1 bg-bg-primary border border-border rounded text-[8px] font-bold text-text-tertiary hover:text-accent-purple transition-colors">
                            {isKO ? '→ 연출 수정' : '→ Edit Direction'}
                          </button>
                        </div>
                      </div>
                    </details>

                    {/* AI / Edit sub-tabs */}
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setWritingMode('ai')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'ai' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        }`}>
                        🤖 {isKO ? 'AI 집필' : 'AI Writing'}
                      </button>
                      <button onClick={() => {
                        setWritingMode('edit');
                        if (!editDraft && currentSession.messages.length > 0) {
                          const allText = currentSession.messages
                            .filter(m => m.role === 'assistant' && m.content)
                            .map(m => m.content.replace(/```json\n[\s\S]*?\n```/g, '').trim())
                            .join('\n\n---\n\n');
                          setEditDraft(allText);
                        }
                      }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'edit' ? 'bg-accent-purple text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        }`}>
                        ✏️ {isKO ? '직접 편집' : 'Manual Edit'}
                      </button>
                      <button onClick={() => { setWritingMode('canvas'); if (!canvasContent) setCanvasPass(0); }}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                          writingMode === 'canvas' ? 'bg-accent-green text-white' : 'bg-bg-secondary text-text-tertiary border border-border hover:text-text-secondary'
                        }`}>
                        🎨 {isKO ? '3패스 캔버스' : '3-Pass Canvas'}
                      </button>
                      {writingMode === 'edit' && (
                        <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] ml-2">
                          {editDraft.length.toLocaleString()}{isKO ? '자' : ' chars'}
                        </span>
                      )}
                    </div>

                    {/* Prompt Directive — AI에 추가 지시 */}
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider shrink-0">
                        💡 {isKO ? '지침' : 'Directive'}
                      </span>
                      <input
                        value={promptDirective}
                        onChange={e => setPromptDirective(e.target.value)}
                        placeholder={isKO ? '프롬프트 지침 (예: "문체를 하드보일드로", "대화 비율 50%", "1인칭 시점")' : 'Prompt directive (e.g. "hardboiled style", "50% dialogue", "1st person POV")'}
                        className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                      />
                      {promptDirective && (
                        <button onClick={() => setPromptDirective('')} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                      )}
                    </div>

                    {writingMode === 'ai' && (
                      <>
                        <EngineStatusBar language={language} config={currentSession.config} report={lastReport} isGenerating={isGenerating} />
                        {currentSession.messages.length === 0 ? (
                          <div className="py-20 text-center space-y-4">
                            <Sparkles className="w-10 h-10 text-accent-purple/30 mx-auto" />
                            <p className="text-text-tertiary text-sm font-medium">{t.engine.startPrompt}</p>
                          </div>
                        ) : (
                          (searchQuery ? filteredMessages : currentSession.messages).map(msg => (
                            <div key={msg.id}>
                              <ChatMessage message={msg} language={language} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} />
                              {msg.role === 'assistant' && msg.versions && msg.versions.length > 1 && (
                                <div className="ml-11 md:ml-12">
                                  <VersionDiff
                                    versions={msg.versions}
                                    currentIndex={msg.currentVersionIndex ?? msg.versions.length - 1}
                                    language={language}
                                    onSwitch={(idx) => handleVersionSwitch(msg.id, idx)}
                                  />
                                </div>
                              )}
                              {msg.role === 'assistant' && msg.content && (
                                <div className="ml-11 md:ml-12">
                                  <TypoPanel
                                    text={msg.content}
                                    language={language}
                                    onApplyFix={(idx, orig, sug) => handleTypoFix(msg.id, idx, orig, sug)}
                                  />
                                </div>
                              )}
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} className="h-32" />
                      </>
                    )}

                    {writingMode === 'edit' && (
                      /* ====== EDIT MODE ====== */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-text-tertiary">
                            {isKO ? 'AI가 생성한 텍스트를 직접 수정할 수 있습니다. 수정 후 원고에 반영됩니다.' : 'Directly edit AI-generated text. Changes will be applied to your manuscript.'}
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              if (!editDraft.trim()) return;
                              const editMsg: Message = { id: `edit-${Date.now()}`, role: 'assistant', content: editDraft, timestamp: Date.now() };
                              updateCurrentSession({ messages: [...currentSession.messages, { id: `u-edit-${Date.now()}`, role: 'user', content: isKO ? '[작가 직접 편집]' : '[Manual Edit]', timestamp: Date.now() }, editMsg] });
                              setWritingMode('ai');
                            }}
                              className="px-3 py-1.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
                              {isKO ? '💾 원고에 반영' : '💾 Apply to Manuscript'}
                            </button>
                            <button onClick={() => setEditDraft('')}
                              className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-accent-red transition-colors">
                              {isKO ? '초기화' : 'Clear'}
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          className="w-full min-h-[60vh] bg-bg-primary border border-border rounded-xl p-6 text-sm leading-[2] font-serif text-text-primary outline-none focus:border-accent-purple transition-colors resize-y"
                          placeholder={isKO ? '여기에 직접 소설을 쓰거나, AI 집필 탭에서 생성된 텍스트를 편집하세요...' : 'Write your novel here directly, or edit AI-generated text...'}
                        />
                        <div className="flex justify-between items-center text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          <span>{editDraft.length.toLocaleString()}{isKO ? '자' : ' chars'} | ~{Math.round(editDraft.length / 2).toLocaleString()} tokens</span>
                          <span>{isKO ? '자동저장 활성' : 'Autosave active'}</span>
                        </div>
                      </div>
                    )}

                    {/* ====== 3-PASS CANVAS MODE ====== */}
                    {/* ====== 3-PASS CANVAS MODE ====== */}
                    {writingMode === 'canvas' && (
                      <div className="space-y-4">
                        {/* Pass progress */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 1 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            🦴 {canvasPass >= 1 ? '✓' : '1'} {isKO ? '뼈대' : 'Skeleton'}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 2 ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            💓 {canvasPass >= 2 ? '✓' : '2'} {isKO ? '감정' : 'Emotion'}
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] ${canvasPass >= 3 ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'bg-bg-secondary text-text-tertiary border border-border'}`}>
                            👁 {canvasPass >= 3 ? '✓' : '3'} {isKO ? '묘사' : 'Sensory'}
                          </div>
                          <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)]">
                            {canvasContent.length.toLocaleString()}{isKO ? '자' : ' chars'}
                          </span>
                          {isGenerating && <span className="text-[9px] text-accent-purple animate-pulse font-[family-name:var(--font-mono)]">{isKO ? '생성 중...' : 'Generating...'}</span>}
                        </div>

                        {/* Custom prompt input */}
                        <div className="flex gap-2">
                          <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { handleSend(); } }}
                            placeholder={isKO ? '💡 커스텀 지시 (예: "전투 장면 더 길게", "대사 톤 부드럽게", "클리프행어 바꿔줘")' : '💡 Custom instruction (e.g. "extend fight scene", "softer dialogue", "change cliffhanger")'}
                            className="flex-1 bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-xs outline-none focus:border-accent-purple transition-colors font-[family-name:var(--font-mono)] placeholder-text-tertiary"
                            disabled={isGenerating}
                          />
                          <button onClick={() => { if (input.trim()) handleSend(); }} disabled={isGenerating || !input.trim()}
                            className="px-4 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30 shrink-0">
                            {isKO ? '전송' : 'Send'}
                          </button>
                        </div>

                        {/* Canvas textarea */}
                        <textarea
                          value={canvasContent}
                          onChange={e => setCanvasContent(e.target.value)}
                          className="w-full min-h-[50vh] bg-bg-primary border border-border rounded-xl p-6 text-sm leading-[2] font-serif text-text-primary outline-none focus:border-accent-purple transition-colors resize-y"
                          placeholder={isKO ? '3패스 캔버스 — 상단에서 커스텀 지시를 보내거나, 아래 단계 버튼을 순서대로 눌러 원고를 완성하세요.' : '3-Pass Canvas — Send custom instructions above, or click pass buttons below in order.'}
                        />

                        {/* Pass action buttons */}
                        <div className="flex gap-2 flex-wrap items-center">
                          <button disabled={isGenerating} onClick={() => {
                            setCanvasPass(1);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? '[1단계 — 뼈대] 씬시트/연출표를 기반으로 초안을 작성하세요. 사건과 대사만. 감정 묘사 없이 골격만. 약 1,000토큰(2,000자). 중요: JSON 코드블록, 분석 리포트, grade, metrics 등 절대 출력하지 마세요. 순수 소설 본문만 출력하세요.'
                                : '[Pass 1 — Skeleton] Scene sheet based. Events and dialogue only. ~1,000 tokens. Story text only, no JSON.'
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-blue-600/10 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 hover:bg-blue-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            🦴 {isKO ? '1단계: 뼈대' : 'Pass 1: Skeleton'}
                          </button>
                          <button disabled={isGenerating || canvasPass < 1} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const draft = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!draft) { alert(isKO ? '1단계 결과가 없습니다.' : 'No Pass 1 result.'); return; }
                            setCanvasContent(draft);
                            setCanvasPass(2);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[2단계 — 감정선] 아래 초안을 전체 다시 써주세요. 인물 내면, 감정 밀도, 문장 리듬 강화. 고구마/사이다 타이밍. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---초안---\n${draft.slice(0, 4000)}`
                                : `[Pass 2 — Emotion] Rewrite fully with inner thoughts, emotional density, pacing. +1,000 tokens. Full output.\n\n---Draft---\n${draft.slice(0, 4000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-pink-600/10 border border-pink-500/30 rounded-lg text-[10px] font-bold text-pink-400 hover:bg-pink-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            💓 {isKO ? '2단계: 감정' : 'Pass 2: Emotion'}
                          </button>
                          <button disabled={isGenerating || canvasPass < 2} onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const ms = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (!ms) { alert(isKO ? '2단계 결과가 없습니다.' : 'No Pass 2 result.'); return; }
                            setCanvasContent(ms);
                            setCanvasPass(3);
                            setWritingMode('ai');
                            setTimeout(() => {
                              handleSend(isKO
                                ? `[3단계 — 감각 묘사] 아래 원고를 전체 다시 써주세요. 물성/시각/청각/촉각 묘사 추가. 클리프행어 마무리. 약 1,000토큰 추가. JSON/리포트/grade/metrics 절대 출력 금지. 소설 본문만.\n\n---원고---\n${ms.slice(0, 5000)}`
                                : `[Pass 3 — Sensory] Rewrite with physical/visual/auditory descriptions. Cliffhanger. +1,000 tokens. Full output.\n\n---Manuscript---\n${ms.slice(0, 5000)}`
                              );
                            }, 100);
                          }}
                            className="px-4 py-2.5 bg-amber-600/10 border border-amber-500/30 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-600/20 transition-all font-[family-name:var(--font-mono)] disabled:opacity-30">
                            👁 {isKO ? '3단계: 묘사' : 'Pass 3: Sensory'}
                          </button>
                          <span className="text-border mx-1">|</span>
                          <button onClick={() => {
                            const lastAI = currentSession?.messages.filter(m => m.role === 'assistant' && m.content).pop();
                            const text = lastAI?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                            if (text) { setCanvasContent(text); setWritingMode('canvas'); }
                          }}
                            className="px-3 py-2.5 bg-bg-secondary border border-border rounded-lg text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all font-[family-name:var(--font-mono)]">
                            📋 {isKO ? '캔버스에 가져오기' : 'Pull to Canvas'}
                          </button>
                          <button disabled={!canvasContent} onClick={() => {
                            const editMsg: Message = { id: `canvas-${Date.now()}`, role: 'assistant', content: canvasContent, timestamp: Date.now() };
                            updateCurrentSession({ messages: [...(currentSession?.messages || []), { id: `u-canvas-${Date.now()}`, role: 'user', content: isKO ? `[3패스 완성 — ${canvasContent.length}자]` : `[3-Pass Complete — ${canvasContent.length} chars]`, timestamp: Date.now() }, editMsg] });
                            setWritingMode('ai');
                          }}
                            className="px-3 py-2.5 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] hover:opacity-80 transition-opacity disabled:opacity-30">
                            💾 {isKO ? '원고 저장' : 'Save'}
                          </button>
                        </div>
                        <p className="text-[8px] text-text-tertiary font-[family-name:var(--font-mono)]">
                          {isKO ? '※ 각 단계 클릭 → AI 채팅에서 결과 확인 → 📋 캔버스로 가져와서 편집 → 다음 단계' : '※ Click pass → Check result in AI chat → 📋 Pull to canvas for editing → Next pass'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'style' && currentSession && (
                  <>
                    <StyleStudioView
                      isKO={isKO}
                      initialProfile={currentSession.config.styleProfile}
                      onProfileChange={(profile) => {
                        updateCurrentSession({
                          config: { ...currentSession.config, styleProfile: profile },
                        });
                      }}
                    />
                    <div className="max-w-4xl mx-auto px-4 pb-4">
                      <TabAssistant tab="style" language={language} config={currentSession.config} />
                    </div>
                  </>
                )}
                {activeTab === 'history' && (() => {
                  const allSessions: (ChatSession & { _projectName?: string; _projectId?: string })[] = archiveScope === 'all'
                    ? projects.flatMap(p => p.sessions.map(s => ({ ...s, _projectName: p.name, _projectId: p.id })))
                    : sessions.map(s => ({ ...s, _projectName: currentProject?.name, _projectId: currentProjectId ?? undefined }));

                  const genres = Array.from(new Set(allSessions.map(s => s.config.genre)));
                  const hasWorldData = allSessions.some(s => s.config.worldSimData?.civs?.length);

                  const categories = [
                    { key: 'ALL', label: isKO ? '전체' : 'All' },
                    ...genres.map(g => ({ key: g, label: g })),
                    ...(hasWorldData ? [{ key: 'WORLD', label: isKO ? '세계관' : 'World' }] : []),
                  ];

                  const filtered = allSessions.filter(s => {
                    if (archiveFilter === 'ALL') return true;
                    if (archiveFilter === 'WORLD') return (s.config.worldSimData?.civs?.length ?? 0) > 0;
                    return s.config.genre === archiveFilter;
                  }).sort((a, b) => b.lastUpdate - a.lastUpdate);

                  return (
                    <div className="p-4 md:p-10">
                      {/* Archive Header: scope toggle + category filter */}
                      <div className="mb-6 space-y-3">
                        {projects.length > 1 && (
                          <div className="flex gap-1.5">
                            <button onClick={() => setArchiveScope('project')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'project' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {isKO ? '현재 프로젝트' : 'Current Project'}
                            </button>
                            <button onClick={() => setArchiveScope('all')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveScope === 'all' ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {isKO ? '전체 프로젝트' : 'All Projects'}
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {categories.map(cat => (
                            <button key={cat.key} onClick={() => setArchiveFilter(cat.key)} className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest font-[family-name:var(--font-mono)] border transition-colors ${archiveFilter === cat.key ? 'bg-blue-600/15 border-blue-500/30 text-blue-400' : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'}`}>
                              {cat.label}
                              <span className="ml-1 text-[8px] opacity-50">
                                {cat.key === 'ALL' ? allSessions.length : cat.key === 'WORLD' ? allSessions.filter(s => (s.config.worldSimData?.civs?.length ?? 0) > 0).length : allSessions.filter(s => s.config.genre === cat.key).length}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Session Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {filtered.length === 0 ? (
                          <div className="col-span-full py-20 text-center text-text-tertiary font-bold uppercase tracking-widest font-[family-name:var(--font-mono)]">{t.engine.noArchive}</div>
                        ) : (
                          filtered.map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                if (s._projectId && s._projectId !== currentProjectId) setCurrentProjectId(s._projectId);
                                setCurrentSessionId(s.id);
                                setActiveTab('writing');
                              }}
                              className={`relative group p-6 bg-bg-secondary border border-border rounded-2xl cursor-pointer hover:border-accent-purple transition-all ${currentSessionId === s.id ? 'border-accent-purple ring-1 ring-accent-purple' : ''}`}
                            >
                              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 z-10">
                                <button onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all"><Edit3 className="w-3 h-3" /></button>
                                {projects.length > 1 && (
                                  <button onClick={(e) => {
                                    e.stopPropagation();
                                    const others = projects.filter(p => p.id !== (s._projectId || currentProjectId));
                                    if (others.length === 1) {
                                      moveSessionToProject(s.id, others[0].id);
                                    } else if (others.length > 1) {
                                      const choice = window.prompt(
                                        (t.project?.moveSession || 'Move to') + ':\n' + others.map((p, i) => `${i + 1}. ${p.name}`).join('\n'),
                                        '1'
                                      );
                                      const idx = parseInt(choice || '', 10) - 1;
                                      if (idx >= 0 && idx < others.length) moveSessionToProject(s.id, others[idx].id);
                                    }
                                  }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-all" title={t.project?.moveSession || 'Move Session'}><Upload className="w-3 h-3" /></button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); handlePrint(); }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-text-primary transition-all"><Printer className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }} className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-red transition-all"><X className="w-3 h-3" /></button>
                              </div>
                              {renamingSessionId === s.id ? (
                                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingSessionId(null); }}
                                  onBlur={confirmRename} onClick={e => e.stopPropagation()}
                                  className="font-black text-sm mb-2 pr-16 w-full bg-transparent border-b border-accent-purple outline-none" />
                              ) : (
                                <h4 className="font-black text-sm mb-2 pr-16 truncate">{s.title}</h4>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">{s.config.genre}</span>
                                <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-[family-name:var(--font-mono)]">EP.{s.config.episode}</span>
                                {s.messages.length > 0 && (
                                  <span className="px-1.5 py-0.5 bg-zinc-800/80 rounded text-[8px] font-bold text-zinc-600 font-[family-name:var(--font-mono)]">{s.messages.length} msg</span>
                                )}
                                {(s.config.worldSimData?.civs?.length ?? 0) > 0 && (
                                  <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400 font-[family-name:var(--font-mono)]">
                                    {isKO ? '세계관' : 'WORLD'} · {s.config.worldSimData!.civs!.length}
                                  </span>
                                )}
                                {archiveScope === 'all' && s._projectName && (
                                  <span className="px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/15 rounded text-[8px] font-bold text-purple-400/70 font-[family-name:var(--font-mono)]">{s._projectName}</span>
                                )}
                              </div>
                              <div className="mt-2 text-[8px] text-zinc-600 font-[family-name:var(--font-mono)]">
                                {new Date(s.lastUpdate).toLocaleDateString(language === 'KO' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {showDashboard && activeTab === 'writing' && currentSession && (
            <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
          )}

          {/* Right Panel — Save Slots (all tabs except writing) */}
          {activeTab !== 'writing' && activeTab !== 'history' && activeTab !== 'settings' && currentSession && (
            <aside className="hidden lg:flex w-64 shrink-0 flex-col border-l border-border bg-bg-primary overflow-y-auto">
              <div className="p-4 space-y-3">
                <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                  📂 {isKO ? '저장 목록' : 'Saved Versions'}
                </div>

                {/* Save current */}
                <button onClick={() => {
                  const name = prompt(isKO ? '저장 이름을 입력하세요:' : 'Enter save name:');
                  if (!name) return;
                  const slot: import('@/lib/studio-types').SavedSlot = {
                    id: `slot-${Date.now()}`,
                    name,
                    tab: activeTab,
                    timestamp: Date.now(),
                    data: {
                      genre: currentSession.config.genre,
                      title: currentSession.config.title,
                      povCharacter: currentSession.config.povCharacter,
                      setting: currentSession.config.setting,
                      primaryEmotion: currentSession.config.primaryEmotion,
                      synopsis: currentSession.config.synopsis,
                      characters: currentSession.config.characters,
                      charRelations: currentSession.config.charRelations,
                      sceneDirection: currentSession.config.sceneDirection,
                      worldSimData: currentSession.config.worldSimData,
                      simulatorRef: currentSession.config.simulatorRef,
                    },
                  };
                  updateCurrentSession({
                    config: {
                      ...currentSession.config,
                      savedSlots: [...(currentSession.config.savedSlots || []), slot],
                    },
                  });
                  triggerSave();
                }}
                  className="w-full py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity active:scale-95">
                  💾 {isKO ? '현재 설정 저장' : 'Save Current'}
                </button>

                {/* Saved slots list */}
                <div className="space-y-1.5">
                  {(currentSession.config.savedSlots || [])
                    .filter(s => s.tab === activeTab || s.tab === 'all')
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 px-2 py-2 bg-bg-secondary/50 border border-border rounded-lg group hover:border-accent-purple/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-text-primary truncate">{slot.name}</div>
                          <div className="text-[8px] text-text-tertiary">{new Date(slot.timestamp).toLocaleString()}</div>
                        </div>
                        <button onClick={() => {
                          if (!confirm(isKO ? `"${slot.name}"을 불러오시겠습니까? 현재 설정이 덮어씌워집니다.` : `Load "${slot.name}"? Current settings will be overwritten.`)) return;
                          updateCurrentSession({ config: { ...currentSession.config, ...slot.data } });
                          triggerSave();
                        }}
                          className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-[8px] font-bold hover:bg-accent-purple/20 transition-colors opacity-0 group-hover:opacity-100">
                          {isKO ? '불러오기' : 'Load'}
                        </button>
                        <button onClick={() => {
                          updateCurrentSession({
                            config: {
                              ...currentSession.config,
                              savedSlots: (currentSession.config.savedSlots || []).filter(s => s.id !== slot.id),
                            },
                          });
                        }}
                          className="text-text-tertiary hover:text-accent-red text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </div>
                    ))}
                  {(currentSession.config.savedSlots || []).filter(s => s.tab === activeTab || s.tab === 'all').length === 0 && (
                    <p className="text-[9px] text-text-tertiary italic text-center py-4">
                      {isKO ? '저장된 버전이 없습니다' : 'No saved versions'}
                    </p>
                  )}
                </div>

                {/* All slots across tabs */}
                {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length > 0 && (
                  <details className="group">
                    <summary className="text-[9px] text-text-tertiary cursor-pointer hover:text-text-secondary">
                      {isKO ? '다른 탭 저장' : 'Other tabs'} ({(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).length})
                    </summary>
                    <div className="mt-1 space-y-1">
                      {(currentSession.config.savedSlots || []).filter(s => s.tab !== activeTab).map(slot => (
                        <div key={slot.id} className="text-[8px] text-text-tertiary px-2 py-1 bg-bg-primary rounded">
                          [{slot.tab}] {slot.name}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </aside>
          )}

          {/* Right Panel — Writing Assistant + AI Chat */}
          {activeTab === 'writing' && writingMode === 'ai' && currentSession && !showDashboard && (
            <aside className={`hidden lg:flex shrink-0 flex-col border-l border-border bg-bg-primary transition-all duration-300 ${rightPanelOpen ? 'w-80' : 'w-10'}`}>
              {/* Toggle button */}
              <button onClick={() => setRightPanelOpen(p => !p)} className="w-full py-2 text-[10px] text-text-tertiary hover:text-text-primary transition-colors border-b border-border font-[family-name:var(--font-mono)]">
                {rightPanelOpen ? '▶' : '◀'}
              </button>

              {rightPanelOpen && (
                <div className="flex-1 overflow-y-auto">
                  {/* 도우미 섹션 */}
                  <div className="p-4 space-y-3 border-b border-border">
                    <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest font-[family-name:var(--font-mono)]">
                      {isKO ? '집필 참고' : 'Reference'}
                    </div>

                    {/* ① 브릿지 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📎 {isKO ? '이전 화' : 'Bridge'}</summary>
                      {(() => {
                        const prev = currentSession.messages.filter(m => m.role === 'assistant' && m.content).slice(-1)[0];
                        const txt = prev?.content.replace(/```json[\s\S]*?```/g, '').trim() || '';
                        return <p className="mt-1.5 text-[11px] text-text-tertiary pl-4 italic leading-relaxed">{txt ? txt.slice(-250) : (isKO ? '없음' : 'None')}</p>;
                      })()}
                    </details>

                    {/* ② 씬시트 — 미설정 시 자동 open + 경고 표시 */}
                    <details className="group" open={!currentSession.config.sceneDirection}>
                      <summary className={`flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-colors ${
                        currentSession.config.sceneDirection
                          ? 'text-text-tertiary hover:text-text-secondary'
                          : 'text-amber-400 hover:text-amber-300'
                      }`}>🎬 {isKO ? '씬시트' : 'Scene'} {!currentSession.config.sceneDirection && <span className="text-[9px] ml-1 px-1.5 py-0.5 bg-amber-500/10 rounded text-amber-400">{isKO ? '미설정' : 'Not set'}</span>}</summary>
                      <div className="mt-1.5 pl-4 space-y-1">
                        {currentSession.config.sceneDirection?.hooks?.map((h, i) => <div key={i} className="text-[10px] text-blue-400">🪝 {h.desc}</div>)}
                        {currentSession.config.sceneDirection?.goguma?.map((g, i) => <div key={i} className={`text-[10px] ${g.type === 'goguma' ? 'text-amber-400' : 'text-cyan-400'}`}>{g.type === 'goguma' ? '🍠' : '🥤'} {g.desc}</div>)}
                        {currentSession.config.sceneDirection?.cliffhanger && <div className="text-[10px] text-red-400">🔚 {currentSession.config.sceneDirection.cliffhanger.desc}</div>}
                        {!currentSession.config.sceneDirection && (
                          <div className="space-y-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/20">
                            <p className="text-[10px] text-amber-300">{isKO ? '씬시트 없이 집필하면 AI 품질이 떨어집니다' : 'Writing without scene direction reduces AI quality'}</p>
                            <button onClick={() => setActiveTab('rulebook')} className="text-[10px] text-accent-purple hover:underline font-bold">
                              → {isKO ? '연출 스튜디오에서 설정하기' : 'Set up in Direction Studio'}
                            </button>
                          </div>
                        )}
                      </div>
                    </details>

                    {/* ③ 캐릭터 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">👤 {isKO ? '캐릭터' : 'Chars'} ({currentSession.config.characters.length})</summary>
                      <div className="mt-1.5 pl-4 space-y-1.5">
                        {currentSession.config.characters.length > 0 ? currentSession.config.characters.map(c => (
                          <div key={c.id} className="text-[10px]">
                            <span className="font-bold text-text-primary">{c.name}</span> <span className="text-text-tertiary">({c.role})</span>
                            {c.speechStyle && <span className="text-accent-blue ml-1">🗣️{c.speechStyle}</span>}
                          </div>
                        )) : <p className="text-[10px] text-text-tertiary italic">{isKO ? '없음' : 'None'}</p>}
                      </div>
                    </details>

                    {/* ④ 서식 */}
                    <details className="group">
                      <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-tertiary hover:text-text-secondary">📐 {isKO ? '서식' : 'Format'}</summary>
                      <div className="mt-1.5 pl-4 grid grid-cols-2 gap-1">
                        {(isKO ? ['괄호제거','소제목없음','대화줄분리','—금지','삭제금지','…통일','대화보호'] : ['No()','No head','Dlg split','No—','No del','…','Keep dlg']).map((r, i) => (
                          <div key={i} className="text-[9px] text-text-tertiary"><span className="text-accent-green">✓</span> {r}</div>
                        ))}
                      </div>
                    </details>

                    {/* ⑤ 대화 온도 */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-text-tertiary">🌡️</span>
                      <span className={`text-xs font-bold ${
                        hfcpState.verdict === 'engagement' ? 'text-accent-green' :
                        hfcpState.verdict === 'normal_free' ? 'text-accent-blue' :
                        hfcpState.verdict === 'normal_analysis' ? 'text-accent-amber' :
                        hfcpState.verdict === 'limited' ? 'text-accent-red' : 'text-text-tertiary'
                      }`}>
                        {isKO ? ({
                          engagement: '적극 참여',
                          normal_free: '자유 대화',
                          normal_analysis: '분석 모드',
                          limited: '절제 모드',
                          silent: '침묵',
                        } as Record<string, string>)[hfcpState.verdict] || hfcpState.verdict
                        : hfcpState.verdict.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-text-tertiary">{Math.round(hfcpState.score)}</span>
                    </div>
                  </div>

                  {/* AI 대화 섹션 */}
                  <div className="p-4 space-y-3">
                    <div className="text-[10px] font-black text-accent-purple uppercase tracking-widest font-[family-name:var(--font-mono)]">
                      💬 {isKO ? 'AI 대화' : 'AI Chat'}
                    </div>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                      {currentSession.messages.filter(m => {
                        if (m.role === 'user') {
                          const isGen = m.meta?.hfcpMode === 'generate' || m.content.startsWith('[1단계') || m.content.startsWith('[2단계') || m.content.startsWith('[3단계') || m.content.startsWith('[Pass');
                          return !isGen;
                        }
                        return false;
                      }).length === 0 ? (
                        <p className="text-[11px] text-text-tertiary italic text-center py-4">{isKO ? 'AI와 대화하려면 아래 입력창에 질문하세요' : 'Ask questions in the input below'}</p>
                      ) : (
                        currentSession.messages.filter(m => {
                          if (m.role === 'user' && m.meta?.hfcpMode === 'chat') return true;
                          const idx = currentSession.messages.indexOf(m);
                          if (m.role === 'assistant' && idx > 0) {
                            const prev = currentSession.messages[idx - 1];
                            return prev.meta?.hfcpMode === 'chat';
                          }
                          return false;
                        }).slice(-6).map(msg => (
                          <div key={msg.id} className={`text-[11px] leading-relaxed ${msg.role === 'user' ? 'text-accent-purple' : 'text-text-secondary'}`}>
                            <span className="font-bold">{msg.role === 'user' ? '나' : 'AI'}:</span> {msg.content.slice(0, 200)}{msg.content.length > 200 ? '...' : ''}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Writing Input */}
        {activeTab === 'writing' && currentSessionId && (
          <div className="p-4 md:p-6 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent pt-8 md:pt-12 shrink-0">
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 md:bottom-auto md:-top-10 md:left-4 md:translate-x-0 flex gap-2 items-center">
                <button onClick={() => handleSend(t.engine.nextChapterPrompt)} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                  {t.engine.nextChapter}
                </button>
                <button onClick={() => handleSend(t.engine.plotTwistPrompt)} className="px-3 py-1.5 bg-bg-secondary border border-border rounded-full text-[10px] font-bold text-text-tertiary hover:text-text-primary transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                  {t.engine.plotTwist}
                </button>
                {currentSession && currentSession.config.episode < currentSession.config.totalEpisodes && (
                  <button onClick={handleNextEpisode} className="px-3 py-1.5 bg-accent-purple/10 border border-accent-purple/20 rounded-full text-[10px] font-bold text-accent-purple hover:bg-accent-purple/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                    EP.{currentSession.config.episode} → {currentSession.config.episode + 1}
                  </button>
                )}
                <span className="text-border">|</span>
                <button onClick={() => { setWritingMode('canvas'); setCanvasContent(''); setCanvasPass(0); }}
                  className="px-3 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-full text-[10px] font-bold text-accent-green hover:bg-accent-green/20 transition-all whitespace-nowrap font-[family-name:var(--font-mono)]">
                  🎨 {isKO ? '캔버스 실행' : 'Open Canvas'}
                </button>
              </div>
              <div className="relative bg-bg-secondary border border-border rounded-2xl md:rounded-[2rem] shadow-2xl focus-within:border-accent-purple/30 transition-all p-2 pl-4 md:pl-6 flex items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t.writing.inputPlaceholder}
                  className="flex-1 bg-transparent border-none outline-none py-3 md:py-4 text-sm md:text-[15px] text-text-primary placeholder-text-tertiary resize-none max-h-40 leading-relaxed"
                  rows={1}
                  disabled={isGenerating}
                />
                {input.length > 0 && (
                  <span className="text-[9px] text-text-tertiary font-[family-name:var(--font-mono)] shrink-0 self-center mr-1">
                    {input.length}
                  </span>
                )}
                {isGenerating ? (
                  <button onClick={handleCancel} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-accent-red text-white transition-all shrink-0 hover:opacity-80">
                    <StopCircle className="w-5 h-5" />
                  </button>
                ) : (
                  <button onClick={() => handleSend()} disabled={!input.trim()} className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showApiKeyModal && (
        <ApiKeyModal language={language} onClose={() => setShowApiKeyModal(false)} onSave={() => {}} />
      )}
    </div>
  );
}
