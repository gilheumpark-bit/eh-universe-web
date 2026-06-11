'use client';

// ============================================================
// EH Universe Desktop Shell — 심플 채팅형 IDE (좌 탭 / 중앙 채팅 / 우 캔버스 양식)
// 각 탭 = 채팅 인터뷰 → [정리] → 우측 캔버스에 양식 팝업(Artifact 스타일) → 로컬 폴더 저장.
// 데스크톱(Electron)에서 window.ehDesktop.fs 로 로컬 .md 읽기/저장. 웹에서는 다운로드 폴백.
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { Globe, Users, Clapperboard, Film, ListTree, PenLine, Wand2, Send, Sparkles, Check, X, Save, FolderOpen, FileText, Settings, Languages, StickyNote, Type, Gauge, ChevronDown, ChevronUp, ClipboardCheck, FileDown, AlertTriangle, Command, Maximize2 } from 'lucide-react';
import Toaster, { pushToast } from '@/components/desktop/Toaster';
import CommandPalette from '@/components/desktop/CommandPalette';
import { registerCommand, clearCommands } from '@/lib/desktop/command-palette';
import { resolveAction } from '@/lib/desktop/keymap';
import { loadCollapse, saveCollapse, isCollapsed, toggleCollapse, type CollapseMap } from '@/lib/desktop/collapse-state';
import { loadZen, saveZen, toggleZen, type ZenState } from '@/lib/desktop/zen-mode';
import { loadManuscript, persistManuscript, saveStateLabel, type SaveState } from '@/lib/desktop/auto-save';
import InPageSearch from '@/components/desktop/InPageSearch';
import { loadWidth, saveWidth, clampWidth, DEFAULT_SIDEBAR_WIDTH } from '@/lib/desktop/panel-resize';
import { FONT_FAMILIES, fontStackById, fontLabel } from '@/lib/desktop/font-family';
import { loadFavorites, saveFavorites, addFavorite, removeFavorite, type Favorite } from '@/lib/desktop/favorites';
import { loadRecents, saveRecents, pushRecent, type RecentEntry } from '@/lib/desktop/recents';
import { searchAll, type SearchableItem } from '@/lib/desktop/global-search-index';
import { loadContextItems, saveContextItems, loadTabMessages, saveTabMessages, trimTabMessages } from '@/lib/desktop/context-persistence';
import { analyzeText, computeCPM } from '@/lib/desktop/writing-stats';
import { loadPrefs, savePrefs, prefsToStyle, DEFAULT_PREFS, type WorkspacePrefs } from '@/lib/desktop/workspace-prefs';
import { buildContextBlock, buildAIWritePrompt, type ContextItem } from '@/lib/desktop/context-block';
import { analyzeRevision, revisionIssues } from '@/lib/desktop/revision-analysis';
import { checkPlatformFit, countChars, stripForExport, getPlatformSpec, PLATFORM_SPECS } from '@/lib/desktop/export-spec';
import { scanAISignature } from '@/lib/creative/ai-signature-scan';
import { analyzeRhythm } from '@/lib/creative/rhythm-analysis';
import { scanForeshadows, foreshadowHealth } from '@/lib/creative/foreshadow-tracker';
import { computeIntegratedGrade } from '@/lib/creative/integrated-grade';
import { computeIPReadiness } from '@/lib/creative/ip-readiness';
import { buildReceipt } from '@/lib/creative/work-receipt';
import { observeStyle } from '@/lib/creative/style-profile';
import { scoreLength } from '@/lib/creative/scoring-system';
import { detectMode, modeLabel } from '@/lib/creative/writer-mode';
import { checklistCompleteness, type Domain as ChecklistDomain } from '@/lib/creative/quality-checklist';
import { GENRES, getGenreProfile } from '@/lib/creative/genre-matrix';
import { suggestTransforms, techniqueLabel } from '@/lib/creative/cliche-transform';
import { auditManuscript, auditVerdict, type AuditPerspective } from '@/lib/creative/qa-auditor';
import { panelReaction } from '@/lib/creative/reader-persona-16';
import { summarizeNotes, type WorkPhase } from '@/lib/creative/work-note';
import { localFillDraft, commitAsCanon, buildFillPrompt, parseAIFill } from '@/lib/worldgraph/fill';
import { localAIChat, isLocalAIConfigured } from '@/lib/local-ai/local-ai-client';
import LocalAISettings from '@/components/desktop/LocalAISettings';
import { validateWorldFact } from '@/lib/worldgraph/validate';
import { serializeWorldFact } from '@/lib/worldgraph/worldfact-serializer';
import type { WorldFactEntry } from '@/lib/worldgraph/types';
import { localFillDomainForm, commitFormAsUser, formTitle, buildDomainFillPrompt, parseDomainFill, type FilledForm } from '@/lib/forms/fill-domain';
import { getDomainForm, tabToDomain } from '@/lib/forms/domain-forms';

// ============================================================
// PART 1 — 탭 정의 + 타입
// ============================================================

type TabId = 'world' | 'character' | 'scene' | 'direction' | 'structure' | 'write' | 'memo' | 'revision' | 'export' | 'translate';
const TABS: { id: TabId; label: string; icon: React.ElementType; placeholder: string }[] = [
  { id: 'world', label: '세계관', icon: Globe, placeholder: '세계관 fact를 설명하세요. 예: 마법은 시전자의 마나를 소비한다.' },
  { id: 'character', label: '캐릭터', icon: Users, placeholder: '캐릭터를 설명하세요. 이름·욕망·결핍·갈등.' },
  { id: 'scene', label: '씬시트', icon: Clapperboard, placeholder: '이번 화의 사건·감정·훅을 설명하세요. (무엇이/왜)' },
  { id: 'direction', label: '연출', icon: Film, placeholder: '이번 화의 컷·카메라·조명·색감을 설명하세요. (어떻게 보이나)' },
  { id: 'structure', label: '구성', icon: ListTree, placeholder: '작품/아크/화 구조를 설명하세요.' },
  { id: 'write', label: '집필', icon: PenLine, placeholder: '집필할 장면을 설명하거나, 수동 모드로 직접 쓰세요.' },
  { id: 'memo', label: '메모', icon: StickyNote, placeholder: '' },
  { id: 'revision', label: '퇴고', icon: Wand2, placeholder: '퇴고 기준을 설명하세요. (show/tell·반복어·문장 다양성·밀도·대사비율)' },
  { id: 'export', label: '출고', icon: Send, placeholder: '출고 형식·플랫폼·메타데이터를 설정하세요. (EPUB/DOCX·자수·플랫폼 규격)' },
  { id: 'translate', label: '번역', icon: Languages, placeholder: '원문/언어/트랙(faithful·market)/플랫폼을 설명하거나 원문을 붙여넣으세요.' },
];

interface Msg { role: 'user' | 'ai'; text: string }

// ── Electron 로컬 폴더 브리지 (preload window.ehDesktop.fs) ──
interface FolderFile { name: string; path: string; size: number }
interface EhFs {
  pickFolder: () => Promise<string | null>;
  listMd: (dir: string) => Promise<FolderFile[]>;
  readFile: (p: string) => Promise<string | null>;
  saveFile: (filename: string, content: string) => Promise<string | null>;
}
function getEhFs(): EhFs | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { ehDesktop?: { fs?: EhFs } }).ehDesktop?.fs ?? null;
}

/** 도메인 폼 → .md (front-matter + 필드별 섹션). 로컬 저장용. */
function domainFormToMd(form: FilledForm): string {
  const def = getDomainForm(form.domainId);
  const head = ['---', `domain: ${form.domainId}`, `origin: ${form.origin}`, `createdAt: ${new Date(form.createdAt).toISOString()}`, '---', ''];
  const body = (def?.fields ?? []).map((f) => `## ${f.label}\n\n${form.values[f.key] ?? ''}\n`).join('\n');
  return head.join('\n') + '\n' + body;
}

// ============================================================
// PART 2 — 셸
// ============================================================

export default function DesktopShell() {
  const [tab, setTab] = useState<TabId>('world');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [draft, setDraft] = useState<WorldFactEntry | null>(null);
  const [domainDraft, setDomainDraft] = useState<FilledForm | null>(null);
  const [committed, setCommitted] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  // 집필 모드
  const [writeMode, setWriteMode] = useState<'form' | 'manual'>('form');
  const [manuscript, setManuscript] = useState('');
  // 누적 컨텍스트 — 각 탭에서 확정된 항목. 집필이 이걸 읽어서 본문 생성.
  // details: 폼 전체 필드(캐릭 DNA Tier 1/2/3·씬시트·연출 등) 또는 worldgraph bodyRaw 평탄화 — AI 프롬프트 주입용 풀텍스트.
  const [contextItems, setContextItems] = useState<{ tab: TabId; label: string; fact: string; details: string }[]>([]);
  // 로컬 폴더 (Electron) — 지침/원고 .md 읽어오기
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<FolderFile[]>([]);
  const [showAISettings, setShowAISettings] = useState(false);
  // 작업공간 커스터마이즈 (Muvel 흡수: 글꼴·줄간격·너비·테마)
  const [prefs, setPrefs] = useState<WorkspacePrefs>(DEFAULT_PREFS);
  const [showWorkspace, setShowWorkspace] = useState(false);
  // 편의 시스템: 명령팔레트·접힘·Zen·자동저장 상태
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapse, setCollapse] = useState<CollapseMap>({});
  const [zen, setZen] = useState<ZenState>({ enabled: false, hideSidebar: false, hideStrip: false, hideHeader: false });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarW, setSidebarW] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 로컬스토리지 하이드레이션(cascade 아님)
    setCollapse(loadCollapse()); setZen(loadZen());
    const m = loadManuscript('manuscript'); if (m) setManuscript(m);
    setSidebarW(loadWidth('sidebar', DEFAULT_SIDEBAR_WIDTH));
    setFavorites(loadFavorites()); setRecents(loadRecents());
    // Blocker #1 수리: 새로고침 시 confirmed 세계관~연출 복원
    const ci = loadContextItems(); if (ci.length) setContextItems(ci as typeof contextItems);
    // Blocker #2 수리: 탭별 인터뷰 메시지 복원
    const tm = loadTabMessages(); const cur = tm[tab]; if (cur && cur.length) setMessages(cur);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // contextItems 변경 시 즉시 영속
  useEffect(() => { saveContextItems(contextItems); }, [contextItems]);
  // 탭 전환 시 최근 항목 push
  useEffect(() => {
    const t = TABS.find((x) => x.id === tab);
    if (!t) return;
    const next = pushRecent(recents, { id: `tab:${t.id}`, kind: 'tab', label: t.label, at: Date.now() });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 탭 전환 시 최근목록 갱신·영속(파생-during-render 아님)
    setRecents(next); saveRecents(next);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const updateSidebarW = useCallback((w: number) => { const c = clampWidth(w, 160, 360); setSidebarW(c); saveWidth('sidebar', c); }, []);
  const toggleCol = useCallback((k: string) => { setCollapse((m) => { const n = toggleCollapse(m, k); saveCollapse(n); return n; }); }, []);
  const toggleZenMode = useCallback(() => { setZen((s) => { const n = toggleZen(s); saveZen(n); return n; }); }, []);
  // 자동 저장 — manuscript 변화 시 2초 후 저장.
  useEffect(() => {
    if (!manuscript) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 자동저장 transient 상태('saving') 표시
    setSaveState('saving');
    const t = setTimeout(() => {
      const ok = persistManuscript('manuscript', manuscript);
      setSaveState(ok ? 'saved' : 'error');
      const t2 = setTimeout(() => setSaveState('idle'), 1500);
      return () => clearTimeout(t2);
    }, 2000);
    return () => clearTimeout(t);
  }, [manuscript]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 prefs 하이드레이션
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (prefs.theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);
  const updatePrefs = useCallback((p: WorkspacePrefs) => { setPrefs(p); savePrefs(p); }, []);

  const activeTab = TABS.find((t) => t.id === tab)!;
  const userText = messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n');
  // writer-mode(00) 흡수 — 첫 사용자 메시지로 작가 부담 모드 감지
  const writerMode = detectMode(messages.find((mm) => mm.role === 'user')?.text ?? '');

  // 명령팔레트 등록 (탭 전환·테마·작업공간·Zen·AI설정·저장)
  useEffect(() => {
    clearCommands();
    TABS.forEach((t) => registerCommand({ id: `tab:${t.id}`, label: `이동: ${t.label}`, group: '탭', action: () => setTab(t.id) }));
    registerCommand({ id: 'cmd:zen', label: 'Zen 집중 모드 토글', shortcut: 'F11', group: '보기', action: toggleZenMode });
    registerCommand({ id: 'cmd:workspace', label: '작업공간 설정 열기', group: '보기', action: () => setShowWorkspace(true) });
    registerCommand({ id: 'cmd:ai', label: '로컬 AI 설정 열기', group: '설정', action: () => setShowAISettings(true) });
    registerCommand({ id: 'cmd:save', label: '원고 즉시 저장', shortcut: 'Ctrl+S', group: '저장', action: () => {
      const ok = persistManuscript('manuscript', manuscript);
      setSaveState(ok ? 'saved' : 'error');
      pushToast({ kind: ok ? 'success' : 'error', message: ok ? '원고를 저장했습니다.' : '저장 실패 — 저장공간 부족 가능.' });
    } });
    registerCommand({ id: 'cmd:collapse-sidebar', label: '좌측 사이드바 접기/펼치기', group: '보기', action: () => toggleCol('sidebar') });
    registerCommand({ id: 'cmd:collapse-strip', label: '하단 통계 스트립 접기/펼치기', group: '보기', action: () => toggleCol('strip') });
    registerCommand({ id: 'cmd:search', label: '본문 검색', shortcut: 'Ctrl+F', group: '검색', action: () => setSearchOpen(true) });
    registerCommand({ id: 'cmd:sidebar-narrow', label: '사이드바 좁게 (180px)', group: '보기', action: () => updateSidebarW(180) });
    registerCommand({ id: 'cmd:sidebar-wide', label: '사이드바 넓게 (260px)', group: '보기', action: () => updateSidebarW(260) });
    // 즐겨찾기·최근 (현 탭 즐겨찾기 추가·즐겨찾기로 이동)
    registerCommand({ id: 'cmd:fav-add-tab', label: `현재 탭 즐겨찾기 추가: ${activeTab.label}`, group: '즐겨찾기', action: () => {
      const next = addFavorite(favorites, { id: `fav:tab:${tab}:${Date.now()}`, kind: 'tab', label: activeTab.label, ref: `tab:${tab}`, at: Date.now() });
      setFavorites(next); saveFavorites(next);
      pushToast({ kind: 'success', message: `즐겨찾기에 추가: ${activeTab.label}` });
    } });
    favorites.forEach((f) => f.kind === 'tab' && registerCommand({ id: `goto-fav:${f.id}`, label: `★ ${f.label}`, group: '즐겨찾기', action: () => { const id = f.ref.replace(/^tab:/, ''); if (TABS.some((x) => x.id === id)) setTab(id as TabId); } }));
    recents.slice(0, 8).forEach((r) => r.kind === 'tab' && registerCommand({ id: `recent:${r.id}`, label: `최근: ${r.label}`, group: '최근', action: () => { const id = r.id.replace(/^tab:/, ''); if (TABS.some((x) => x.id === id)) setTab(id as TabId); } }));
    // 글꼴 패밀리
    FONT_FAMILIES.forEach((ff) => registerCommand({ id: `font:${ff.id}`, label: `글꼴: ${ff.label}`, group: '보기', action: () => updatePrefs({ ...prefs, fontFamily: ff.id }) }));
  }, [manuscript, toggleZenMode, toggleCol, updateSidebarW, activeTab.label, favorites, recents, prefs, tab, updatePrefs]);

  // 글로벌 단축키 (Ctrl+K 팔레트·Ctrl+S 저장·F11 Zen·ESC 모달 닫기)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 입력 중에 일반키 차단 X — Ctrl 조합과 ESC/F11 만 글로벌.
      const action = resolveAction({ ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, key: e.key });
      if (action === 'palette') { e.preventDefault(); setPaletteOpen((v) => !v); }
      else if (action === 'save') { e.preventDefault(); const ok = persistManuscript('manuscript', manuscript); setSaveState(ok ? 'saved' : 'error'); pushToast({ kind: ok ? 'success' : 'error', message: ok ? '저장 완료' : '저장 실패' }); }
      else if (action === 'search') { e.preventDefault(); setSearchOpen((v) => !v); }
      else if (action === 'zen') { e.preventDefault(); toggleZenMode(); }
      else if (action === 'cancel') { setPaletteOpen(false); setShowWorkspace(false); setShowAISettings(false); setSearchOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [manuscript, toggleZenMode]);

  const switchTab = (id: TabId) => {
    // Blocker #2 수리: 떠나는 탭 메시지 저장 → 새 탭 메시지 복원 (각 탭 인터뷰 누적 보존)
    const prevMap = loadTabMessages();
    if (tab !== 'write' && tab !== 'memo' && tab !== 'revision' && tab !== 'export') {
      prevMap[tab] = messages;
      saveTabMessages(trimTabMessages(prevMap));
    }
    const nextMessages = prevMap[id] ?? [];
    setMessages(nextMessages);
    setTab(id);
    setCanvasOpen(false);
    setDraft(null);
    setDomainDraft(null);
    setCommitted(false);
    setSavedPath(null);
  };

  const send = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      { role: 'user', text: t },
      { role: 'ai', text: '내용을 모았어요. 우측 [정리]를 누르면 양식 캔버스로 정리합니다.' },
    ]);
    setInput('');
  }, [input]);

  const organize = useCallback(async () => {
    const text = userText || input.trim();
    setCanvasOpen(true);
    setCommitted(false);
    if (tab === 'world') {
      let d: WorldFactEntry | null = null;
      if (isLocalAIConfigured()) {
        const raw = await localAIChat(buildFillPrompt(text), { json: true });
        if (raw) d = parseAIFill(raw, text);
      }
      setDraft(d ?? localFillDraft(text || '[확인 필요] 내용을 입력하세요'));
      setDomainDraft(null);
    } else {
      const dom = tabToDomain(tab);
      if (dom) {
        let f: FilledForm | null = null;
        if (isLocalAIConfigured()) {
          const raw = await localAIChat(buildDomainFillPrompt(dom, text), { json: true });
          if (raw) f = parseDomainFill(dom, raw, text);
        }
        setDomainDraft(f ?? localFillDomainForm(dom, text || '[확인 필요]'));
        setDraft(null);
      }
    }
  }, [tab, userText, input]);

  const commit = useCallback(() => {
    if (tab === 'world' && draft) {
      const c = commitAsCanon(draft);
      setDraft(c);
      setCommitted(true);
      // worldgraph 풀 보존: fact 단언 + bodyRaw 본문/예외/셀프검증 + sandersonCheck.
      const sc = c.frontMatter.sandersonCheck;
      const scLimits = sc?.limitations?.map((l) => Object.entries(l).map(([k, v]) => `${k}=${v}`).join(',')).join(' / ');
      const scLine = sc?.applicable
        ? `Sanderson: type=${sc.magicSystemType ?? '-'} ${scLimits ? '| 한계: ' + scLimits : ''}`
        : '';
      const exc = (c.frontMatter.exceptions ?? []).filter(Boolean).join(' / ');
      const details = [
        c.frontMatter.fact && `[단언] ${c.frontMatter.fact}`,
        exc && `[예외] ${exc}`,
        scLine,
        c.bodyRaw && `[본문]\n${c.bodyRaw.trim()}`,
      ].filter(Boolean).join('\n');
      setContextItems((prev) => [...prev, { tab, label: activeTab.label, fact: c.frontMatter.fact, details }]);
    } else if (domainDraft) {
      const c = commitFormAsUser(domainDraft);
      setDomainDraft(c);
      setCommitted(true);
      // 도메인 폼 풀 보존: 모든 필드 label/value 평탄화. 빈 값 제외.
      const def = getDomainForm(c.domainId);
      const lines = (def?.fields ?? [])
        .map((f) => ({ label: f.label, val: (c.values[f.key] ?? '').trim() }))
        .filter((x) => x.val.length > 0)
        .map((x) => `· ${x.label}: ${x.val}`);
      const details = lines.length ? lines.join('\n') : formTitle(c);
      setContextItems((prev) => [...prev, { tab, label: activeTab.label, fact: formTitle(c), details }]);
    }
  }, [tab, draft, domainDraft, activeTab.label]);

  const updateDomainField = (key: string, value: string) => {
    setDomainDraft((d) => (d ? { ...d, values: { ...d.values, [key]: value }, origin: 'USER' } : d));
    setCommitted(false);
  };

  // 로컬 폴더 열기 + .md 읽어오기 (Electron 전용)
  const openFolder = useCallback(async () => {
    const fsApi = getEhFs();
    if (!fsApi) return;
    const dir = await fsApi.pickFolder();
    if (!dir) return;
    setFolderName(dir.split(/[\\/]/).pop() || dir);
    setFolderFiles((await fsApi.listMd(dir)).slice(0, 200));
  }, []);

  const loadFile = useCallback(async (p: string, name: string) => {
    const fsApi = getEhFs();
    if (!fsApi) return;
    const content = await fsApi.readFile(p);
    if (content == null) return;
    setMessages((m) => [...m, { role: 'user', text: `[불러옴: ${name}]\n${content.slice(0, 6000)}` }]);
  }, []);

  // 로컬 폴더 저장 — Electron 이면 fs IPC(위치 다이얼로그), 웹이면 다운로드 폴백
  const saveToFolder = useCallback(async () => {
    let md = '';
    let filename = '';
    if (tab === 'world' && draft) {
      md = serializeWorldFact(draft);
      filename = `${draft.frontMatter.workId || 'untitled'}_world_${draft.frontMatter.id}.md`;
    } else if (domainDraft) {
      md = domainFormToMd(domainDraft);
      filename = `${domainDraft.domainId}_${(formTitle(domainDraft) || domainDraft.domainId).slice(0, 24)}.md`;
    } else {
      return;
    }
    const fsApi = getEhFs();
    if (fsApi) {
      const p = await fsApi.saveFile(filename, md);
      setSavedPath(p ?? '(저장 취소)');
    } else {
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setSavedPath('(다운로드) ' + filename);
    }
  }, [tab, draft, domainDraft]);

  const hideSidebar = zen.enabled && zen.hideSidebar;
  return (
    <div className="flex h-screen w-full bg-bg-primary text-text-primary">
      <Toaster />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {/* ── 좌: 탭 레일 (Zen·접힘 적용) ── */}
      {!hideSidebar && !isCollapsed(collapse, 'sidebar') && (
      <nav className="flex shrink-0 flex-col gap-1 border-r border-border bg-bg-secondary/50 p-[var(--sp-sm)]" style={{ width: sidebarW }}>
        <div className="px-2 py-3 text-xs font-mono uppercase tracking-widest text-text-tertiary">Loreguard</div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
              tab === id ? 'bg-accent-amber/15 text-accent-amber' : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
          <button
            type="button"
            onClick={openFolder}
            className="inline-flex min-h-[40px] items-center gap-2 truncate rounded-lg px-3 text-xs font-semibold text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <FolderOpen className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{folderName || '로컬 폴더 열기'}</span>
          </button>
          {folderFiles.length > 0 && (
            <ul className="max-h-44 overflow-y-auto px-1 text-[11px]">
              {folderFiles.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => loadFile(f.path, f.name)}
                    title={f.path}
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-text-tertiary hover:bg-bg-hover hover:text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-blue"
                  >
                    <FileText className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{f.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span className="px-2 pb-1 text-[9px] text-text-tertiary">{folderFiles.length ? `${folderFiles.length} .md · 클릭→읽어오기` : '지침·원고 폴더 (데스크톱)'}</span>
        </div>
      </nav>
      )}

      {/* ── 중앙: 채팅 인터뷰 ── */}
      <main className="relative flex flex-1 flex-col">
        <InPageSearch open={searchOpen} onClose={() => setSearchOpen(false)} body={manuscript} />
        <header className="flex items-center justify-between border-b border-border px-[var(--sp-lg)] py-[var(--sp-md)]">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            {activeTab.label} — 무엇을 만들까요?
            <span className="rounded-md bg-bg-secondary px-2 py-0.5 text-[10px] font-mono text-text-tertiary" title="작가 부담 모드 (00_핵심)">{modeLabel(writerMode, 'ko')}</span>
          </h1>
          <div className="flex items-center gap-2">
            {/* 자동 저장 상태 */}
            {saveState !== 'idle' && (
              <span className={`text-[11px] ${saveState === 'error' ? 'text-red-400' : saveState === 'saved' ? 'text-accent-green' : 'text-text-tertiary'}`} role="status">{saveStateLabel(saveState)}</span>
            )}
            {/* 명령 팔레트 */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="명령 팔레트"
              title="명령 팔레트 (Ctrl+K)"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2 text-xs text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Command className="h-4 w-4" aria-hidden /> <kbd className="text-[10px] text-text-tertiary">Ctrl+K</kbd>
            </button>
            {/* Zen 모드 */}
            <button
              type="button"
              onClick={toggleZenMode}
              aria-label="Zen 집중 모드"
              aria-pressed={zen.enabled}
              title={zen.enabled ? 'Zen 종료 (F11)' : 'Zen 집중 (F11)'}
              className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2 text-xs hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${zen.enabled ? 'bg-accent-amber/15 text-accent-amber' : 'text-text-secondary'}`}
            >
              <Maximize2 className="h-4 w-4" aria-hidden />
            </button>
            {/* 사이드바 접힘 토글 */}
            <button
              type="button"
              onClick={() => toggleCol('sidebar')}
              aria-label="사이드바 접기/펼치기"
              title="사이드바 접기/펼치기"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2 text-xs text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {isCollapsed(collapse, 'sidebar') ? <ChevronUp className="h-4 w-4 rotate-90" aria-hidden /> : <ChevronDown className="h-4 w-4 rotate-90" aria-hidden />}
            </button>
            {tab === 'write' && (
              <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
                {(['form', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setWriteMode(m)}
                    className={`min-h-[36px] rounded-md px-3 font-semibold ${writeMode === m ? 'bg-accent-amber/20 text-accent-amber' : 'text-text-secondary'}`}
                  >
                    {m === 'form' ? 'AI 채팅' : '수동'}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowWorkspace((v) => !v)}
              aria-label="작업공간 설정"
              title="작업공간 (글꼴·줄간격·너비·테마)"
              aria-expanded={showWorkspace}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2 text-xs text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Type className="h-4 w-4" aria-hidden /> 작업공간
            </button>
            <button
              type="button"
              onClick={() => setShowAISettings(true)}
              aria-label="로컬 AI 설정"
              title="로컬 AI (최대 3)"
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-border px-2 text-xs text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Settings className="h-4 w-4" aria-hidden /> AI
            </button>
          </div>
        </header>
        {showWorkspace && <WorkspacePanel prefs={prefs} onChange={updatePrefs} onClose={() => setShowWorkspace(false)} />}

        {/* 집필 = AI 채팅 / 수동(에디터+기능) · 메모 = 스크래치패드 · 그 외 = 채팅 */}
        {tab === 'write' ? (
          writeMode === 'manual' ? (
            <WritingManualMode manuscript={manuscript} setManuscript={setManuscript} prefs={prefs} contextItems={contextItems} />
          ) : (
            <WritingChatMode contextItems={contextItems} manuscript={manuscript} setManuscript={setManuscript} prefs={prefs} />
          )
        ) : tab === 'memo' ? (
          <MemoBoard prefs={prefs} />
        ) : tab === 'revision' ? (
          <RevisionPanel manuscript={manuscript} prefs={prefs} contextItems={contextItems} />
        ) : tab === 'export' ? (
          <ExportPanel manuscript={manuscript} />
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-[var(--sp-lg)]">
              {messages.length === 0 ? (
                <div className="mt-10 mx-auto max-w-md text-center text-sm">
                  <p className="mb-3 text-text-secondary">💬 채팅으로 인터뷰 → [정리]로 양식 → [확정]으로 누적</p>
                  <p className="mb-2 text-text-tertiary">예시 입력 (클릭해서 보내기):</p>
                  <div className="space-y-1.5">
                    {(tab === 'world' ? ['마법은 시전자의 마나를 소비한다. 마나 고갈 시 사망.', '이 세계 화폐는 금화·은화 2종.']
                      : tab === 'character' ? ['강민우. 복수에 사로잡힌 마법검사. 누이를 잃은 과거.', '이서연. 냉정한 길드장. 약자 보호가 신념.']
                      : tab === 'scene' ? ['12화: 주인공이 흡혈마와 첫 대면. 분노 폭주 직전.', '15화: 동료에게 과거를 처음 털어놓음.']
                      : tab === 'direction' ? ['컷1 클로즈업 칼날, 컷2 와이드 적의 미소, 색감 한기.', '슬로우 모션 + 톤 다운 → 절정에서 컷 빠르게.']
                      : tab === 'structure' ? ['로그라인: 복수를 향해 가다 진짜 적이 자신이었음을 깨닫는 검사.', '아크: 1부 동기 → 2부 충돌 → 3부 자각 → 4부 변화.']
                      : []).map((ex, i) => (
                      <button key={i} type="button" onClick={() => setInput(ex)} className="block w-full rounded-lg border border-border bg-bg-secondary/40 px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">{ex}</button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-accent-blue/15' : 'bg-bg-secondary'}`}>
                    {m.text}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-border p-[var(--sp-md)]">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={activeTab.placeholder}
                className="flex-1 rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              />
              <button type="button" onClick={send} className="min-h-[44px] rounded-xl bg-bg-secondary px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent-blue">보내기</button>
              <button type="button" onClick={organize} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-accent-amber px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent-blue">
                <Sparkles className="h-4 w-4" aria-hidden /> 정리
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── 우: 캔버스(정리 시 팝업) ── */}
      {canvasOpen && (
        <aside className="flex w-[420px] flex-col border-l border-border bg-bg-secondary/40">
          <div className="flex items-center justify-between border-b border-border px-[var(--sp-md)] py-[var(--sp-sm)]">
            <span className="text-xs font-mono uppercase tracking-widest text-text-tertiary">캔버스 · {activeTab.label} 양식</span>
            <button type="button" onClick={() => setCanvasOpen(false)} aria-label="캔버스 닫기" className="rounded-md p-1 hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent-blue">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-[var(--sp-md)]">
            {tab === 'world' && draft ? (
              <WorldFactCanvas draft={draft} committed={committed} />
            ) : domainDraft ? (
              <DomainFormCanvas form={domainDraft} committed={committed} onField={updateDomainField} />
            ) : (
              <p className="mt-8 text-center text-sm text-text-tertiary">{activeTab.label} — 채팅 인터뷰 후 [정리]로 양식을 채웁니다.</p>
            )}
          </div>
          {((tab === 'world' && draft) || domainDraft) && (
            <div className="flex flex-col gap-2 border-t border-border p-[var(--sp-md)]">
              <div className="flex gap-2">
                <button type="button" onClick={commit} disabled={committed} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent-green/40 bg-accent-green/10 px-3 text-sm font-semibold text-accent-green disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-accent-blue">
                  <Check className="h-4 w-4" aria-hidden /> {committed ? '확정됨' : '확정(canon)'}
                </button>
                <button type="button" onClick={saveToFolder} className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-amber px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent-blue">
                  <Save className="h-4 w-4" aria-hidden /> 로컬 저장
                </button>
              </div>
              {savedPath && <p className="text-[11px] text-text-tertiary">저장됨: {savedPath}</p>}
            </div>
          )}
        </aside>
      )}

      {showAISettings && <LocalAISettings onClose={() => setShowAISettings(false)} />}
    </div>
  );
}

// ============================================================
// PART 3 — 세계관 WorldFact 캔버스 양식
// ============================================================

function WorldFactCanvas({ draft, committed }: { draft: WorldFactEntry; committed: boolean }) {
  const fm = draft.frontMatter;
  const v = validateWorldFact(draft);
  const origin = committed ? 'USER' : draft.provenance?.origin ?? 'ENGINE_DRAFT';
  return (
    <div className="space-y-3">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${origin === 'USER' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-amber/15 text-accent-amber'}`}>
        {origin === 'USER' ? <Check className="h-3 w-3" aria-hidden /> : <Sparkles className="h-3 w-3" aria-hidden />}
        {origin === 'USER' ? '작가 확정 (canon)' : 'AI 초안 · 검토 필요'}
      </span>
      <Row label="fact" value={fm.fact} />
      <div className="grid grid-cols-2 gap-2">
        <Row label="category" value={fm.category} />
        <Row label="tier" value={String(fm.tier)} />
      </div>
      <Row label="confidence 게이트" value={v.confidenceGate} />
      <div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary">본문</span>
        <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-bg-primary p-2 text-xs text-text-secondary">{draft.bodyRaw}</pre>
      </div>
    </div>
  );
}

// ============================================================
// PART 3b — 도메인 폼 캔버스 (캐릭터·씬시트·연출·구성)
// ============================================================

function DomainFormCanvas({
  form,
  committed,
  onField,
}: {
  form: FilledForm;
  committed: boolean;
  onField: (key: string, value: string) => void;
}) {
  const def = getDomainForm(form.domainId);
  const origin = committed ? 'USER' : form.origin;
  // quality-checklist(00_핵심) 흡수 — 도메인 양식 충족도
  const checklistDomains: ChecklistDomain[] = ['character', 'scene', 'direction'];
  const completeness = checklistDomains.includes(form.domainId as ChecklistDomain)
    ? checklistCompleteness(form.domainId as ChecklistDomain, Object.entries(form.values).filter(([, v]) => Boolean(v && v.trim())).map(([k]) => k))
    : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${origin === 'USER' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-amber/15 text-accent-amber'}`}>
          {origin === 'USER' ? <Check className="h-3 w-3" aria-hidden /> : <Sparkles className="h-3 w-3" aria-hidden />}
          {origin === 'USER' ? '작가 확정' : 'AI 초안 · 검토 필요'}
        </span>
        {completeness !== null && <span className="text-[11px] text-text-tertiary" title="00_핵심 체크리스트">양식 충족 {completeness}%</span>}
      </div>
      {(def?.fields ?? []).map((f) => (
        <div key={f.key} className="flex flex-col gap-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary">{f.label}</span>
          {f.hint && <span className="text-[10px] leading-snug text-text-tertiary/80">💡 {f.hint}</span>}
          {f.kind === 'textarea' ? (
            <textarea
              value={form.values[f.key] ?? ''}
              onChange={(e) => onField(f.key, e.target.value)}
              className="min-h-[60px] resize-y rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            />
          ) : (
            <input
              value={form.values[f.key] ?? ''}
              onChange={(e) => onField(f.key, e.target.value)}
              className="rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PART 4 — 집필: AI 채팅(세계~연출 반영 생성) + 수동(에디터+집필 기능)
// ============================================================

function ContextRef({ contextItems }: { contextItems: ContextItem[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-bg-secondary/50 p-[var(--sp-md)]">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-widest text-text-tertiary">참조 컨텍스트 · 세계관~연출 ({contextItems.length})</span>
        {contextItems.length > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[11px] text-text-secondary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
            {expanded ? 'AI 주입 미리보기 닫기' : 'AI 주입 미리보기'}
          </button>
        )}
      </div>
      {contextItems.length === 0 ? (
        <p className="text-xs text-text-tertiary">각 탭에서 정리·확정하면 집필이 그 맥락을 읽습니다.</p>
      ) : expanded ? (
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-bg-primary p-2 text-[11px] text-text-secondary">{buildContextBlock(contextItems)}</pre>
      ) : (
        <ul className="space-y-0.5 text-xs">
          {contextItems.map((c, i) => (
            <li key={i}><span className="font-semibold text-accent-amber">[{c.label}]</span> {c.fact} {c.details && c.details !== c.fact && <span className="text-text-tertiary">({c.details.length}자 풀텍스트 주입)</span>}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** AI 채팅 집필 — 장면 지시 → AI가 컨텍스트 반영해 본문 생성(누적). 다른 탭과 동일한 채팅형. */
function WritingChatMode({
  contextItems,
  manuscript,
  setManuscript,
  prefs,
}: {
  contextItems: ContextItem[];
  manuscript: string;
  setManuscript: (v: string) => void;
  prefs: WorkspacePrefs;
}) {
  const [scene, setScene] = useState('');
  const [busy, setBusy] = useState(false);
  const [genre, setGenre] = useState(''); // genre-matrix(02) 흡수

  const write = async () => {
    const s = scene.trim();
    if (!s || busy) return;
    setBusy(true);
    const genrePrefix = genre ? `장르: ${getGenreProfile(genre).label} (템포 ${getGenreProfile(genre).tempo}).` : '';
    // P0 수리: contextItems의 details + 직전 본문 약점 피드백 + writing-agent-registry 'studio-draft' 시스템 프롬프트 통합.
    if (!isLocalAIConfigured()) {
      // Blocker #3 수리: placeholder를 manuscript에 누적하지 않음 — 토스트로 명확히 안내.
      pushToast({ kind: 'warn', message: '로컬 AI 미연결 — 상단 ⚙AI에서 슬롯 설정 후 다시 시도하세요. (또는 수동 모드)', ttl: 5000 });
      setBusy(false);
      return;
    }
    const prompt = buildAIWritePrompt({ contextItems, scene: s, manuscript, genrePrefix, useAgentRegistry: true });
    if (typeof window !== 'undefined') console.info('[AI-PROMPT]', { chars: prompt.length, prompt });
    const out = await localAIChat(prompt, { temperature: 0.6, maxTokens: 1500 });
    if (!out) {
      pushToast({ kind: 'error', message: 'AI 응답 실패 — 슬롯 baseUrl·model 확인.' });
      setBusy(false);
      return;
    }
    setManuscript(manuscript ? `${manuscript}\n\n${out}` : out);
    setScene('');
    setBusy(false);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-[var(--sp-lg)]">
        <div style={{ ...prefsToStyle(prefs), fontFamily: fontStackById(prefs.fontFamily ?? 'system') }}>
          <ContextRef contextItems={contextItems} />
          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-bg-primary p-[var(--sp-md)] text-text-primary" style={{ minHeight: 220 }}>
            {manuscript || <span className="text-text-tertiary">장면을 지시하면 AI가 세계~연출을 반영해 본문을 씁니다. (예: &quot;주인공이 적과 처음 대면, 긴장감 있게&quot;)</span>}
          </div>
        </div>
      </div>
      <WritingStatsStrip text={manuscript} />
      <div className="flex items-center gap-2 border-t border-border p-[var(--sp-md)]">
        <select value={genre} onChange={(e) => setGenre(e.target.value)} title="장르 (02_장르)" className="min-h-[44px] shrink-0 rounded-xl border border-border bg-bg-secondary px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
          <option value="">장르</option>
          {Object.values(GENRES).map((gg) => <option key={gg} value={gg}>{getGenreProfile(gg).label}</option>)}
        </select>
        <input
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && write()}
          placeholder="장면 지시 (예: 주인공이 적과 대면하는 긴장된 장면)"
          className="flex-1 rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        />
        <button type="button" onClick={write} disabled={busy || !scene.trim()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-accent-amber px-4 text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
          <Sparkles className="h-4 w-4" aria-hidden /> {busy ? '쓰는 중…' : 'AI 집필'}
        </button>
      </div>
    </div>
  );
}

/** 하단 위젯 스트립 (Muvel bottom dock 흡수) — 글자수·속도계·대사·반복도 + 접기. */
function WritingStatsStrip({ text }: { text: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const s = analyzeText(text);
  const start = useRef<{ t: number; chars: number } | null>(null);
  const [cpm, setCpm] = useState(0);
  useEffect(() => {
    if (!start.current && text.length > 0) start.current = { t: Date.now(), chars: text.length };
    if (start.current) {
      const delta = text.length - start.current.chars;
      setCpm(computeCPM(Math.max(0, delta), Date.now() - start.current.t));
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={() => setCollapsed((v) => !v)}
      aria-expanded={!collapsed}
      aria-label="통계 위젯 접기/펼치기"
      className="flex w-full items-center gap-2 border-t border-border bg-bg-secondary/40 px-[var(--sp-lg)] py-1 text-[11px] text-text-tertiary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
    >
      <Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="font-semibold text-text-secondary">{s.chars.toLocaleString()}자</span>
      {!collapsed && (
        <span className="truncate">· {s.sentences}문장 · 평균 {s.avgLen} · 대사 {s.dialoguePct}% · 반복 {s.repetitionPct}% · 속도 {cpm}자/분</span>
      )}
      {collapsed ? <ChevronUp className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden /> : <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden />}
    </button>
  );
}

/** 수동 집필 — 에디터 + 기능(AI 이어쓰기·다듬기) + 하단 통계 스트립. */
function WritingManualMode({ manuscript, setManuscript, prefs, contextItems }: { manuscript: string; setManuscript: (v: string) => void; prefs: WorkspacePrefs; contextItems: ContextItem[] }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const run = async (kind: 'continue' | 'polish') => {
    if (busy || !manuscript.trim()) return;
    setBusy(true);
    setNotice('');
    if (!isLocalAIConfigured()) {
      setNotice('로컬 AI 미연결 — 상단 ⚙AI에서 슬롯을 설정하면 이어쓰기·다듬기가 작동합니다.');
      setBusy(false);
      return;
    }
    // Blocker #4 수리: 수동 모드도 buildAIWritePrompt + writing-agent-registry 통일.
    const sceneInstr = kind === 'continue'
      ? `다음 본문을 자연스럽게 이어서 1~2문단 더 써라. 본문만, 한국어.\n\n${manuscript.slice(-1800)}`
      : `다음 본문을 의미·캐릭터·설정 유지하며 다듬어라(show 위주·반복어 제거·tell 회피). 다듬은 본문만.\n\n${manuscript.slice(0, 4000)}`;
    const prompt = buildAIWritePrompt({ contextItems, scene: sceneInstr, manuscript: kind === 'continue' ? manuscript : '', useAgentRegistry: true });
    if (typeof window !== 'undefined') console.info('[AI-PROMPT-MANUAL]', { kind, chars: prompt.length, prompt });
    const out = await localAIChat(prompt, { temperature: 0.5, maxTokens: 1500 });
    if (out) setManuscript(kind === 'continue' ? `${manuscript}\n\n${out}` : out);
    else setNotice('AI 응답을 받지 못했습니다 — 슬롯 baseUrl·모델을 확인하세요.');
    setBusy(false);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-[var(--sp-lg)] py-2 text-xs">
        <span className="text-text-tertiary">수동 집필</span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => run('continue')} disabled={busy || !manuscript.trim()} className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-border px-2.5 font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> AI 이어쓰기
          </button>
          <button type="button" onClick={() => run('polish')} disabled={busy || !manuscript.trim()} className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-border px-2.5 font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
            <Wand2 className="h-3.5 w-3.5" aria-hidden /> AI 다듬기
          </button>
        </div>
      </div>
      <textarea
        value={manuscript}
        onChange={(e) => setManuscript(e.target.value)}
        placeholder="직접 집필하세요. 하단 글자수·속도계·반복도, AI 이어쓰기·다듬기 사용 가능."
        className="flex-1 resize-none bg-bg-primary p-[var(--sp-lg)] text-text-primary focus-visible:outline-none"
        style={{ ...prefsToStyle(prefs), fontFamily: fontStackById(prefs.fontFamily ?? 'system') }}
      />
      {busy && <div className="border-t border-border px-[var(--sp-lg)] py-1 text-xs text-accent-amber">AI 처리 중…</div>}
      {!busy && notice && <div className="border-t border-border px-[var(--sp-lg)] py-1 text-xs text-accent-amber" role="status">{notice}</div>}
      <WritingStatsStrip text={manuscript} />
    </div>
  );
}

/** 작업공간 설정 (Muvel 흡수) — 글꼴크기·줄간격·편집창너비·테마. */
function WorkspacePanel({ prefs, onChange, onClose }: { prefs: WorkspacePrefs; onChange: (p: WorkspacePrefs) => void; onClose: () => void }) {
  const set = (patch: Partial<WorkspacePrefs>) => onChange({ ...prefs, ...patch });
  return (
    <div className="border-b border-border bg-bg-secondary/60 px-[var(--sp-lg)] py-[var(--sp-md)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-widest text-text-tertiary">작업공간 · 글꼴·줄간격·너비·테마</span>
        <button type="button" onClick={onClose} aria-label="작업공간 닫기" className="rounded-md p-1 hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-accent-blue"><X className="h-4 w-4" aria-hidden /></button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary">글꼴 크기 {prefs.fontSize}px</span>
          <input type="range" min={12} max={24} step={1} value={prefs.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} className="accent-accent-blue" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary">줄간격 {prefs.lineHeight.toFixed(1)}</span>
          <input type="range" min={1.2} max={2.4} step={0.1} value={prefs.lineHeight} onChange={(e) => set({ lineHeight: Number(e.target.value) })} className="accent-accent-blue" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary">편집창 너비 {prefs.editorWidth}px</span>
          <input type="range" min={480} max={1100} step={20} value={prefs.editorWidth} onChange={(e) => set({ editorWidth: Number(e.target.value) })} className="accent-accent-blue" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary">테마</span>
          <select value={prefs.theme} onChange={(e) => set({ theme: e.target.value as WorkspacePrefs['theme'] })} className="min-h-[36px] rounded-md border border-border bg-bg-primary px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
            <option value="system">시스템</option>
            <option value="light">라이트</option>
            <option value="dark">다크</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text-secondary">글꼴 ({fontLabel(prefs.fontFamily ?? 'system')})</span>
          <select value={prefs.fontFamily ?? 'system'} onChange={(e) => set({ fontFamily: e.target.value })} className="min-h-[36px] rounded-md border border-border bg-bg-primary px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
            {FONT_FAMILIES.map((ff) => <option key={ff.id} value={ff.id}>{ff.label}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

// ── 메모 기둥 (Muvel 4부 흡수) — 즉흥 아이디어 스크래치패드, localStorage 영속 ──
interface MemoCard { id: string; text: string; at: number }
const MEMO_KEY = 'noa_desktop_memos_v1';
function loadMemos(): MemoCard[] {
  if (typeof window === 'undefined') return [];
  try { const r = window.localStorage.getItem(MEMO_KEY); return r ? (JSON.parse(r) as MemoCard[]) : []; } catch { return []; }
}
function saveMemos(m: MemoCard[]): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(MEMO_KEY, JSON.stringify(m)); } catch { /* quota */ }
}

function MemoBoard({ prefs }: { prefs: WorkspacePrefs }) {
  const [memos, setMemos] = useState<MemoCard[]>([]);
  const [draft, setDraft] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 1회 memo 하이드레이션
  useEffect(() => { setMemos(loadMemos()); }, []);
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    const next = [{ id: `${Date.now()}_${memos.length}`, text: t, at: Date.now() }, ...memos];
    setMemos(next); saveMemos(next); setDraft('');
  };
  const remove = (id: string) => { const next = memos.filter((m) => m.id !== id); setMemos(next); saveMemos(next); };
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border p-[var(--sp-md)]">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="즉흥 아이디어를 적고 Enter — 아직 설정이 아닌 것들"
          className="flex-1 rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        />
        <button type="button" onClick={add} disabled={!draft.trim()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-accent-amber px-4 text-sm font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
          <StickyNote className="h-4 w-4" aria-hidden /> 메모
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-[var(--sp-lg)]">
        {memos.length > 0 && (
          <p className="mb-3 text-[11px] text-text-tertiary" title="작업노트 대시보드 (09_보조)">작업노트: {summarizeNotes(memos.map((mm) => ({ id: mm.id, phase: 'plan' as WorkPhase, note: mm.text, at: mm.at })))}</p>
        )}
        {memos.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-tertiary">즉흥 아이디어·메모를 모으는 곳. 정리되면 세계관·캐릭터 탭으로 옮기세요.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" style={{ fontSize: `${Math.min(15, prefs.fontSize)}px` }}>
            {memos.map((m) => (
              <li key={m.id} className="group relative rounded-xl border border-border bg-bg-secondary/50 p-3">
                <p className="whitespace-pre-wrap pr-6 text-text-primary">{m.text}</p>
                <button type="button" onClick={() => remove(m.id)} aria-label="메모 삭제" className="absolute right-2 top-2 rounded p-1 text-text-tertiary opacity-0 hover:bg-bg-hover group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** 퇴고 패널 (claude 06_퇴고출고 흡수) — 5지표 + 문제 검출 + 심화 + 통합등급. */
function RevisionPanel({ manuscript, prefs, contextItems }: { manuscript: string; prefs: WorkspacePrefs; contextItems: ContextItem[] }) {
  const m = analyzeRevision(manuscript);
  const issues = revisionIssues(m);
  // 창작 Batch 2 흡수: AI 시그니처(05)·리듬 다층(05)·복선 5-state(05)
  const sig = scanAISignature(manuscript);
  const rhythm = analyzeRhythm(manuscript);
  const fore = foreshadowHealth(scanForeshadows(manuscript));
  const style = observeStyle(manuscript); // 문체 관측 (05 집필전 문체제작)
  const [cliche, setCliche] = useState(''); // cliche-transform(05) 흡수
  const transforms = cliche.trim() ? suggestTransforms(cliche) : [];
  // Batch 4 흡수: QA 감사원 A/B/C/D(08/01) · 16 페르소나 독자 패널(01)
  const audit = auditManuscript(manuscript);
  const verdict = auditVerdict(audit);
  const panel = panelReaction(manuscript);
  const QA_LABEL: Record<AuditPerspective, string> = { consistency: 'A 정합', outsider: 'B 외부독자', refuter: 'C 반증', structure: 'D 구조' };
  // 통합등급(08) — 측정 가능 축(writing/revision) + 컨텍스트 보유 축 도출
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  const has = (t: string) => contextItems.some((c) => c.tab === t);
  const grade = computeIntegratedGrade({
    writing: clamp(100 - sig.score),
    revision: clamp(100 - m.tellPct - m.repetitionPct / 2),
    world: has('world') ? 75 : 45,
    character: has('character') ? 75 : 45,
    scene: has('scene') ? 75 : 45,
    direction: has('direction') ? 75 : 45,
  });
  const metric = (label: string, val: string, warn?: boolean) => (
    <div className="rounded-xl border border-border bg-bg-secondary/40 p-3">
      <div className="text-[11px] text-text-tertiary">{label}</div>
      <div className={`text-lg font-bold ${warn ? 'text-accent-amber' : 'text-text-primary'}`}>{val}</div>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-[var(--sp-lg)]">
      {manuscript.trim() ? (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-tertiary"><ClipboardCheck className="h-4 w-4" aria-hidden /> 퇴고 지표 (06_퇴고출고)</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metric('자수', m.chars.toLocaleString())}
            {metric('설명형(tell)', `${m.tellPct}%`, m.tellPct >= 25)}
            {metric('반복어', `${m.repetitionPct}%`, m.repetitionPct >= 35)}
            {metric('대사 비율', `${m.dialoguePct}%`)}
            {metric('문장 다양성', `${m.sentenceVariety}`, m.chars >= 300 && m.sentenceVariety < 25)}
            {metric('평균 문장', `${m.avgLen}자`)}
          </div>
          <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-tertiary"><Wand2 className="h-4 w-4" aria-hidden /> 심화 분석 (05_집필)</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metric('AI 시그니처', `${sig.score}`, sig.score >= 40)}
            {metric('리듬 burstiness', `${rhythm.micro.burstiness.toFixed(2)}`)}
            {metric('복선 미회수', `${fore.unresolved}/${fore.total}`, fore.unresolved > 0)}
            {metric('문체 다양성', `${style.rhythmVariety}`)}
            {metric('독자 패널 몰입', `${panel.avgEngagement}`, panel.avgEngagement < 50)}
            {metric('이탈 페르소나', `${panel.dropoutCount}/16`, panel.dropoutCount > 4)}
          </div>
          <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-tertiary"><ClipboardCheck className="h-4 w-4" aria-hidden /> QA 감사원 A/B/C/D (08·비수렴) — {verdict.passed ? '통과' : '보류'}</div>
          {audit.length === 0 ? (
            <p className="rounded-xl border border-border bg-bg-secondary/40 p-3 text-sm text-text-secondary">4관점 감사 — 발견된 결함 없음.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {audit.slice(0, 8).map((f, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-bg-secondary/40 p-2">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${f.severity === 'high' ? 'bg-accent-amber/20 text-accent-amber' : 'text-text-tertiary'}`}>{QA_LABEL[f.perspective]}</span>
                  <span className="text-text-secondary">{f.issue}</span>
                </li>
              ))}
            </ul>
          )}
          {sig.hits.length > 0 && (
            <p className="mt-2 text-[11px] text-text-tertiary">AI 시그니처 적중: {sig.hits.slice(0, 4).map((h) => `${h.pattern}(${h.count})`).join(' · ')}</p>
          )}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-bg-secondary/40 p-3">
            <div className="text-2xl font-bold text-accent-amber">{grade.grade}</div>
            <div className="text-xs text-text-secondary">통합등급 {grade.weighted}점 · 최약축 {grade.weakest} <span className="text-text-tertiary">(08_검증측정 산식)</span></div>
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">클리셰 변형 (05_집필 · 낯설게하기)</div>
            <input value={cliche} onChange={(e) => setCliche(e.target.value)} placeholder="클리셰 입력 (예: 회귀·먼치킨·계약결혼) → 변형 기법 제안" className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue" />
            {transforms.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {transforms.map((t, i) => (
                  <li key={i} className="rounded-lg border border-border bg-bg-secondary/40 p-2"><span className="font-semibold text-accent-amber">{techniqueLabel(t.technique)}</span> <span className="text-text-secondary">{t.hint}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4">
            <div className="mb-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">퇴고 이슈 ({issues.length})</div>
            {issues.length === 0 ? (
              <p className="rounded-xl border border-border bg-bg-secondary/40 p-3 text-sm text-text-secondary">지표 양호 — 발견된 이슈 없음.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl border border-border bg-bg-secondary/40 p-3 text-sm">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${it.severity === 'warn' ? 'text-accent-amber' : 'text-text-tertiary'}`} aria-hidden />
                    <span className="text-text-secondary">{it.hint}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-bg-primary p-[var(--sp-md)] text-text-primary" style={{ ...prefsToStyle(prefs), fontFamily: fontStackById(prefs.fontFamily ?? 'system') }}>{manuscript}</div>
        </>
      ) : (
        <p className="mt-10 text-center text-sm text-text-tertiary">집필 탭에서 원고를 작성하면 퇴고 지표(show/tell·반복어·문장 다양성·대사비율)와 이슈가 여기 표시됩니다.</p>
      )}
    </div>
  );
}

/** 출고 패널 (claude 06_퇴고출고 §4 흡수) — 자수·플랫폼 규격·정제 export. */
function ExportPanel({ manuscript }: { manuscript: string }) {
  const [platform, setPlatform] = useState('munpia');
  const [ip, setIp] = useState({ rights: 60, market: 60, adaptation: 60, assetPackage: 60, riskControl: 60 });
  const [receipt, setReceipt] = useState('');
  const fit = checkPlatformFit(manuscript, platform);
  const lenScore = scoreLength(fit.chars, 'mid'); // 분량 점수제 (08 chg_168)
  const ipResult = computeIPReadiness(ip);
  const issueReceipt = () => {
    const r = analyzeRevision(manuscript);
    setReceipt(buildReceipt({
      did: [
        { action: '출고 정제 (마크다운·이모지 제거 §1.3)', evidence: `${countChars(manuscript).toLocaleString()}자` },
        { action: `플랫폼 적합 검사 (${getPlatformSpec(platform).label})`, evidence: fit.note },
      ],
      skipped: fit.withinRange ? [] : [{ action: '플랫폼 자수 충족', reason: fit.note }],
      metrics: { chars: countChars(manuscript), dialogueRatio: r.dialoguePct },
    }));
  };
  const download = (ext: 'txt' | 'md') => {
    if (typeof document === 'undefined') return;
    const clean = ext === 'txt' ? stripForExport(manuscript) : manuscript;
    const blob = new Blob([clean], { type: ext === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `출고_${countChars(manuscript)}자.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const box = (label: string, val: string, warn?: boolean) => (
    <div className="rounded-xl border border-border bg-bg-secondary/40 p-3">
      <div className="text-[11px] text-text-tertiary">{label}</div>
      <div className={`text-sm font-bold ${warn ? 'text-accent-amber' : 'text-text-primary'}`}>{val}</div>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-[var(--sp-lg)]">
      {manuscript.trim() ? (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-text-tertiary"><FileDown className="h-4 w-4" aria-hidden /> 출고 규격 (06_퇴고출고 §4)</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {box('자수 (공백 포함)', fit.chars.toLocaleString())}
            {box('자수 (공백 제외)', fit.charsNoSpace.toLocaleString())}
            {box('플랫폼 적합', fit.note, !fit.withinRange)}
            {box('분량 점수 (중편)', `${lenScore.score}`, !lenScore.withinRange)}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="text-xs text-text-secondary">플랫폼
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="ml-2 min-h-[36px] rounded-md border border-border bg-bg-primary px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
                {PLATFORM_SPECS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <span className="text-[11px] text-text-tertiary">{getPlatformSpec(platform).note}</span>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => download('txt')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-accent-amber px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"><FileDown className="h-4 w-4" aria-hidden /> TXT (정제)</button>
              <button type="button" onClick={() => download('md')} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"><FileDown className="h-4 w-4" aria-hidden /> MD</button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-text-tertiary">TXT 출고는 마크다운·이모지 잔여 자동 제거(§1.3). EPUB/DOCX는 스튜디오 export 사용.</p>
          <div className="mt-5 border-t border-border pt-4">
            <div className="mb-2 text-xs font-mono uppercase tracking-widest text-text-tertiary">IP 준비도 (07_IP자산화 · Layer 60)</div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {([['rights', '권리성'], ['market', '시장성'], ['adaptation', '매체전환성'], ['assetPackage', '패키지성'], ['riskControl', '리스크관리']] as const).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="w-20 shrink-0">{lbl}</span>
                  <input type="range" min={0} max={100} value={ip[k]} onChange={(e) => setIp((s) => ({ ...s, [k]: Number(e.target.value) }))} className="flex-1 accent-accent-blue" />
                  <span className="w-8 text-right tabular-nums">{ip[k]}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-bg-secondary/40 p-3">
              <div className="text-2xl font-bold text-accent-amber">{ipResult.tier}</div>
              <div className="text-xs text-text-secondary">IPReadinessScore {ipResult.score}점 <span className="text-text-tertiary">(권리25·시장20·전환25·패키지20·리스크10 가중 + cap)</span></div>
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <button type="button" onClick={issueReceipt} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"><ClipboardCheck className="h-4 w-4" aria-hidden /> 작업 영수증 발급 (00_핵심)</button>
            {receipt && <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-bg-primary p-3 text-xs text-text-secondary">{receipt}</pre>}
          </div>
        </>
      ) : (
        <p className="mt-10 text-center text-sm text-text-tertiary">집필 탭에서 원고를 작성하면 자수·플랫폼 규격 적합도와 출고(TXT/MD)가 여기 표시됩니다.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary">{label}</span>
      <div className="rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm">{value}</div>
    </div>
  );
}
