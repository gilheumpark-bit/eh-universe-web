// ============================================================
// PART 1 — imports, types, props (Archive + session grid tab)
// ============================================================
import React, { useState, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AppLanguage, AppTab, ChatSession, Project } from '@/lib/studio-types';
import GenreReviewChat from '@/components/studio/GenreReviewChat';
import { Edit3, Upload, Printer, X, BarChart3, Clock } from 'lucide-react';
import { createT, L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { EmptyState } from '@/components/ui/EmptyState';
import { TabHeader } from '@/components/studio/TabHeader';

// Lazy: SVG charts only render when user opens the profiler modal.
const WorkProfilerView = dynamic(
  () => import('@/components/studio/WorkProfilerView'),
  { ssr: false },
);

interface HistoryTabProps {
  language: AppLanguage;
  archiveScope: 'project' | 'all';
  setArchiveScope: (scope: 'project' | 'all') => void;
  archiveFilter: string;
  setArchiveFilter: (filter: string) => void;
  projects: Project[];
  sessions: ChatSession[];
  currentProject: Project | null;
  currentProjectId: string | null;
  setCurrentProjectId: (id: string) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  setActiveTab: (tab: AppTab) => void;
  startRename: (id: string, title: string) => void;
  renamingSessionId: string | null;
  setRenamingSessionId: (id: string | null) => void;
  renameValue: string;
  setRenameValue: (val: string) => void;
  confirmRename: () => void;
  moveSessionToProject: (sid: string, pid: string) => void;
  handlePrint: (session?: ChatSession) => void;
  deleteSession: (id: string) => void;
  currentSession: ChatSession | null;
}

type EnrichedSession = ChatSession & { _projectName?: string; _projectId?: string };

// ============================================================
// PART 2 — HistoryTab component (top-level state + memoized lists)
// ============================================================
const HistoryTab: React.FC<HistoryTabProps> = ({
  language,
  archiveScope,
  setArchiveScope,
  archiveFilter,
  setArchiveFilter,
  projects,
  sessions,
  currentProject,
  currentProjectId,
  setCurrentProjectId,
  currentSessionId,
  setCurrentSessionId,
  setActiveTab,
  startRename,
  renamingSessionId,
  setRenamingSessionId,
  renameValue,
  setRenameValue,
  confirmRename,
  moveSessionToProject,
  handlePrint,
  deleteSession,
  currentSession,
}) => {
  const t = createT(language);
  const [moveModal, setMoveModal] = useState<{ sessionId: string; others: Project[] } | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilerOpen, setProfilerOpen] = useState(false);
  // [C] 삭제 확인 다이얼로그 — 즉시 삭제 방지 (되돌리기 불가 작업 보호)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    sessionId: string;
    sessionTitle: string;
    error?: string;
  } | null>(null);
  const deleteDialogRef = useRef<HTMLDivElement | null>(null);
  const moveModalRef = useRef<HTMLDivElement | null>(null);

  // [G] 파생 데이터 메모이제이션 — 이전: 렌더마다 flatMap/Set/sort 3회 반복
  const allSessions: EnrichedSession[] = useMemo(() => {
    if (archiveScope === 'all') {
      return projects.flatMap((p) =>
        (p.sessions ?? []).map((s) => ({ ...s, _projectName: p.name, _projectId: p.id })),
      );
    }
    return (sessions ?? []).map((s) => ({
      ...s,
      _projectName: currentProject?.name,
      _projectId: currentProjectId ?? undefined,
    }));
  }, [archiveScope, projects, sessions, currentProject, currentProjectId]);

  const categories = useMemo(() => {
    const genres = Array.from(new Set(allSessions.map((s) => s.config.genre)));
    const hasWorldData = allSessions.some((s) => s.config.worldSimData?.civs?.length);
    return [
      { key: 'ALL', label: t('archive.all') },
      ...genres.map((g) => ({ key: g, label: g })),
      ...(hasWorldData ? [{ key: 'WORLD', label: t('archive.world') }] : []),
    ];
  }, [allSessions, t]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSessions
      .filter((s) => {
        if (q) {
          const title = (s.title || s.config.genre || '').toLowerCase();
          if (!title.includes(q)) return false;
        }
        if (archiveFilter === 'ALL') return true;
        if (archiveFilter === 'WORLD') return (s.config.worldSimData?.civs?.length ?? 0) > 0;
        return s.config.genre === archiveFilter;
      })
      .sort((a, b) => b.lastUpdate - a.lastUpdate);
  }, [allSessions, archiveFilter, searchQuery]);

  // [G] 카테고리별 카운트 — 카테고리당 O(n) filter 반복을 O(n) 한 패스로 축소
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allSessions.length, WORLD: 0 };
    for (const s of allSessions) {
      if ((s.config.worldSimData?.civs?.length ?? 0) > 0) counts.WORLD += 1;
      const g = s.config.genre;
      counts[g] = (counts[g] ?? 0) + 1;
    }
    return counts;
  }, [allSessions]);

  // ============================================================
  // PART 3 — stable callbacks (props drilling 정리)
  // ============================================================
  const handleMove = useCallback(
    (sessionId: string, fromProjectId: string | undefined) => {
      try {
        const others = projects.filter((p) => p.id !== (fromProjectId || currentProjectId));
        if (others.length === 1) {
          moveSessionToProject(sessionId, others[0].id);
        } else if (others.length > 1) {
          setMoveModal({ sessionId, others });
        } else {
          logger.warn('HistoryTab', 'no target project for move', { sessionId });
        }
      } catch (err) {
        logger.warn('HistoryTab', 'handleMove failed', err);
      }
    },
    [projects, currentProjectId, moveSessionToProject],
  );

  // [C] Trash 클릭 → 확인 다이얼로그 표시 (즉시 삭제 금지)
  const handleDeleteClick = useCallback(
    (sessionId: string, sessionTitle: string) => {
      setDeleteConfirm({ sessionId, sessionTitle });
    },
    [],
  );

  // [C] 확인 후 실제 삭제. 실패 시 다이얼로그 유지 + 에러 노출
  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    try {
      deleteSession(deleteConfirm.sessionId);
      setDeleteConfirm(null);
    } catch (err) {
      logger.warn('HistoryTab', 'deleteSession failed', { id: deleteConfirm.sessionId, err });
      setDeleteConfirm({
        ...deleteConfirm,
        error: L4(language, {
          ko: '삭제 실패. 다시 시도하세요.',
          en: 'Delete failed. Please try again.',
          ja: '削除に失敗しました。再試行してください。',
          zh: '删除失败。请重试。',
        }),
      });
    }
  }, [deleteConfirm, deleteSession, language]);

  const cancelDelete = useCallback(() => setDeleteConfirm(null), []);

  // [C] 이동 모달: 실패 시 모달 유지 + 에러 표시 (사용자가 실패를 인지할 수 있게)
  const handleModalSelect = useCallback(
    (pid: string) => {
      if (!moveModal) return;
      setMoveError(null);
      try {
        moveSessionToProject(moveModal.sessionId, pid);
        // 성공 시에만 모달 닫기
        setMoveModal(null);
      } catch (err) {
        logger.warn('HistoryTab', 'moveSessionToProject failed', { sessionId: moveModal.sessionId, pid, err });
        setMoveError(
          L4(language, {
            ko: '이동 실패. 다시 시도하세요.',
            en: 'Move failed. Please try again.',
            ja: '移動に失敗しました。再試行してください。',
            zh: '移动失败。请重试。',
          }),
        );
        // 모달 유지
      }
    },
    [moveModal, moveSessionToProject, language],
  );

  const closeMoveModal = useCallback(() => {
    setMoveModal(null);
    setMoveError(null);
  }, []);

  // [C] Escape 키 + focus trap for delete-confirm dialog
  useFocusTrap(deleteDialogRef, !!deleteConfirm, cancelDelete);
  // [C] Escape 키 + focus trap for move modal (기존 인라인 모달 강화)
  useFocusTrap(moveModalRef, !!moveModal, closeMoveModal);

  const openSession = useCallback(
    (s: EnrichedSession) => {
      if (s._projectId && s._projectId !== currentProjectId) setCurrentProjectId(s._projectId);
      setCurrentSessionId(s.id);
      setActiveTab('writing');
    },
    [currentProjectId, setCurrentProjectId, setCurrentSessionId, setActiveTab],
  );

  // ============================================================
  // PART 4 — render (header + grid + reviewer + move modal)
  // ============================================================
  return (
    <>
    <TabHeader
      icon="🕐"
      title={L4(language, { ko: '버전', en: 'Versions', ja: 'バージョン', zh: '版本' })}
      description={L4(language, {
        ko: '300자 이상 변경 시 자동 스냅샷',
        en: 'Auto-snapshot on 300+ character changes',
        ja: '300文字以上変更時に自動スナップショット',
        zh: '修改 300 字以上时自动快照',
      })}
    />
    <div className="p-4 md:p-10">
      {/* Archive Header: scope toggle + category filter */}
      <div className="mb-6 space-y-3">
        {projects.length > 1 && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setArchiveScope('project')}
              aria-pressed={archiveScope === 'project'}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-mono border transition-colors ${
                archiveScope === 'project'
                  ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple'
                  : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'
              }`}
            >
              {t('archive.currentProject')}
            </button>
            <button
              onClick={() => setArchiveScope('all')}
              aria-pressed={archiveScope === 'all'}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest font-mono border transition-colors ${
                archiveScope === 'all'
                  ? 'bg-accent-purple/20 border-accent-purple/30 text-accent-purple'
                  : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'
              }`}
            >
              {t('archive.allProjects')}
            </button>
          </div>
        )}
        {/* Profiler launcher — opens whole-work analytics modal */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfilerOpen(true)}
            aria-label={L4(language, {
              ko: '작품 프로파일러 열기',
              en: 'Open work profiler',
              ja: '作品プロファイラーを開く',
              zh: '打开作品分析器',
            })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest font-mono border border-border bg-bg-secondary text-text-tertiary hover:text-accent-purple hover:border-accent-purple/40 focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            {L4(language, {
              ko: '작품 프로파일러',
              en: 'Work Profiler',
              ja: '作品プロファイラー',
              zh: '作品分析器',
            })}
          </button>
        </div>
        {/* 검색 */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={L4(language, {
            ko: '세션 제목 검색',
            en: 'Search session title',
            ja: 'セッションタイトル検索',
            zh: '搜索会话标题',
          })}
          placeholder={L4(language, {
            ko: '제목 검색...',
            en: 'Search by title...',
            ja: 'タイトルで検索...',
            zh: '按标题搜索...',
          })}
          className="w-full max-w-xs px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-xs text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple transition-colors font-mono"
        />
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setArchiveFilter(cat.key)}
              aria-pressed={archiveFilter === cat.key}
              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest font-mono border transition-colors ${
                archiveFilter === cat.key
                  ? 'bg-blue-600/15 border-blue-500/30 text-blue-400'
                  : 'bg-bg-secondary border-border text-text-tertiary hover:text-text-primary'
              }`}
            >
              {cat.label}
              <span className="ml-1 text-[8px] opacity-50">{categoryCounts[cat.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Session Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Clock}
              title={L4(language, {
                ko: '저장된 버전이 없습니다',
                en: 'No saved versions',
                ja: '保存されたバージョンがありません',
                zh: '没有保存的版本',
              })}
              description={L4(language, {
                ko: '300자 이상 변경 시 자동 스냅샷이 생성됩니다.',
                en: 'Auto-snapshots are created when you change 300+ characters.',
                ja: '300文字以上変更すると自動スナップショットが作成されます。',
                zh: '修改 300 字以上时会自动创建快照。',
              })}
              compact
            />
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              onClick={() => openSession(s)}
              className={`relative group p-6 bg-bg-secondary border border-border rounded-2xl cursor-pointer hover:border-accent-purple transition-colors ${
                currentSessionId === s.id ? 'border-accent-purple ring-1 ring-accent-purple' : ''
              }`}
            >
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(s.id, s.title);
                  }}
                  aria-label={L4(language, { ko: '이름 변경', en: 'Rename', ja: '名前変更', zh: '重命名' })}
                  className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                {projects.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(s.id, s._projectId);
                    }}
                    aria-label={L4(language, { ko: '이동', en: 'Move', ja: '移動', zh: '移动' })}
                    className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-purple transition-colors"
                    title={t('project.moveSession')}
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(s);
                  }}
                  aria-label={L4(language, { ko: '인쇄', en: 'Print', ja: '印刷', zh: '打印' })}
                  className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <Printer className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(s.id, s.title || s.config.genre || 'Untitled');
                  }}
                  aria-label={L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' })}
                  className="p-1.5 bg-bg-tertiary/50 rounded-full text-text-tertiary hover:text-accent-red transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {renamingSessionId === s.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') setRenamingSessionId(null);
                  }}
                  onBlur={confirmRename}
                  onClick={(e) => e.stopPropagation()}
                  className="font-black text-sm mb-2 pr-16 w-full bg-transparent border-b border-accent-purple outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                />
              ) : (
                <h4 className="font-black text-sm mb-2 pr-16 truncate">{s.title}</h4>
              )}
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="px-1.5 py-0.5 bg-bg-tertiary/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-mono">
                  {s.config.genre}
                </span>
                <span className="px-1.5 py-0.5 bg-bg-tertiary/80 rounded text-[8px] font-bold text-text-tertiary uppercase font-mono">
                  EP.{s.config.episode}
                </span>
                {s.messages.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-bg-tertiary/80 rounded text-[8px] font-bold text-text-tertiary font-mono">
                    {s.messages.length} msg
                  </span>
                )}
                {(s.config.worldSimData?.civs?.length ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 bg-emerald-900/30 border border-emerald-500/20 rounded text-[8px] font-bold text-emerald-400 font-mono">
                    {t('archive.worldLabel')} · {s.config.worldSimData!.civs!.length}
                  </span>
                )}
                {archiveScope === 'all' && s._projectName && (
                  <span className="px-1.5 py-0.5 bg-purple-900/20 border border-purple-500/15 rounded text-[8px] font-bold text-purple-400/70 font-mono">
                    {s._projectName}
                  </span>
                )}
              </div>
              <div className="mt-2 text-[8px] text-text-tertiary font-mono">
                {new Date(s.lastUpdate).toLocaleString(language === 'KO' ? 'ko-KR' : 'en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Genre×Level Reviewer Chat */}
      {currentSession && (
        <div className="mt-8">
          <GenreReviewChat
            language={language}
            config={currentSession.config}
            manuscriptText={currentSession.messages
              .filter((m) => m.role === 'assistant')
              .map((m) => m.content)
              .join('\n\n')}
          />
        </div>
      )}

      {/* Work Profiler Modal */}
      {profilerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/60 p-3 overflow-auto"
          role="presentation"
          onClick={() => setProfilerOpen(false)}
        >
          <div
            className="w-full max-w-4xl my-4"
            role="dialog"
            aria-modal="true"
            aria-label={L4(language, {
              ko: '작품 프로파일러',
              en: 'Work Profiler',
              ja: '作品プロファイラー',
              zh: '作品分析器',
            })}
            onClick={(e) => e.stopPropagation()}
          >
            <WorkProfilerView
              sessions={archiveScope === 'all' ? projects.flatMap((p) => p.sessions ?? []) : sessions}
              characters={currentSession?.config?.characters}
              language={language}
              onEpisodeClick={(sid) => {
                setCurrentSessionId(sid);
                setProfilerOpen(false);
                setActiveTab('writing');
              }}
              onClose={() => setProfilerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Move Session Modal */}
      {moveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="presentation"
          onClick={closeMoveModal}
        >
          <div
            ref={moveModalRef}
            className="bg-bg-primary border border-border rounded-2xl p-6 w-80 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label={t('project.moveSession')}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black uppercase tracking-widest">{t('project.moveSession')}</h3>
            <select
              autoFocus
              aria-label={t('project.moveSession')}
              className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleModalSelect(e.target.value);
              }}
            >
              <option value="" disabled>
                {L4(language, {
                  ko: '프로젝트 선택...',
                  en: 'Select project...',
                  ja: 'プロジェクトを選択...',
                  zh: '选择项目...',
                })}
              </option>
              {moveModal.others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {moveError && (
              <div
                role="alert"
                className="p-2 rounded bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red"
              >
                {moveError}
              </div>
            )}
            <button
              onClick={closeMoveModal}
              className="w-full py-2 text-xs font-black uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 rounded"
            >
              {L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog — 되돌리기 불가 작업 보호 */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/60 p-4"
          style={{ zIndex: 'var(--z-modal)' }}
          role="presentation"
          onClick={cancelDelete}
        >
          <div
            ref={deleteDialogRef}
            className="bg-bg-secondary border border-border rounded-xl p-6 max-w-md w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="delete-confirm-title" className="text-lg font-semibold mb-2 text-text-primary">
              {L4(language, {
                ko: '세션 삭제',
                en: 'Delete Session',
                ja: 'セッションを削除',
                zh: '删除会话',
              })}
            </h3>
            <p id="delete-confirm-desc" className="text-sm text-text-secondary mb-2 break-words">
              {L4(language, {
                ko: `"${deleteConfirm.sessionTitle}" 세션을 정말 삭제하시겠습니까?`,
                en: `Really delete "${deleteConfirm.sessionTitle}"?`,
                ja: `「${deleteConfirm.sessionTitle}」を削除しますか?`,
                zh: `确定删除"${deleteConfirm.sessionTitle}"?`,
              })}
            </p>
            <p className="text-xs text-accent-red mb-4">
              {L4(language, {
                ko: '⚠ 이 작업은 되돌릴 수 없습니다',
                en: '⚠ This action cannot be undone',
                ja: '⚠ この操作は元に戻せません',
                zh: '⚠ 此操作无法撤销',
              })}
            </p>
            {deleteConfirm.error && (
              <div
                role="alert"
                className="mb-3 p-2 rounded bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red"
              >
                {deleteConfirm.error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 min-h-[44px] rounded-lg bg-bg-tertiary hover:bg-bg-tertiary/80 text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors"
              >
                {L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' })}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 min-h-[44px] rounded-lg bg-accent-red hover:bg-accent-red/80 text-white text-sm font-semibold focus-visible:ring-2 focus-visible:ring-accent-red transition-colors"
              >
                {L4(language, { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default HistoryTab;
