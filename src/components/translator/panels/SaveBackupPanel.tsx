'use client';

import React, { useRef, useState, useMemo, useEffect, type ChangeEvent } from 'react';
import { Save, Download, Upload, FileStack, Send, Link2, Check } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { getAdapter, SUPPORTED_PLATFORMS, PLATFORM_LABELS, type PlatformId } from '@/lib/translation/platform-adapters';
import { loadProjects, saveProjects } from '@/lib/project-migration';
import type { Project, ChatSession, TranslatedManuscriptEntry, AppLanguage } from '@/lib/studio-types';

/** 번역 스튜디오·챕터 사이드바와 동일한 대표 보내기 5형식 */
const EXPORT_FORMATS = ['txt', 'md', 'json', 'html', 'csv'] as const;

// ============================================================
// Bridge to Novel Studio — 번역본을 소설 스튜디오 프로젝트에 자동 주입
// ============================================================
function BridgeToNovelStudioSection({
  chapters,
  from,
  to,
  langKo,
}: {
  chapters: { name: string; content: string; result: string; isDone: boolean }[];
  from: string;
  to: string;
  langKo: boolean;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [savedCount, setSavedCount] = useState<number>(0);

  // Novel Studio 프로젝트 로드
  useEffect(() => {
    try {
      const list = loadProjects();
      setProjects(list);
      if (list.length > 0 && !selectedProjectId) {
        setSelectedProjectId(list[0].id);
        if (list[0].sessions.length > 0) {
          setSelectedSessionId(list[0].sessions[0].id);
        }
      }
    } catch {
      setProjects([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const availableSessions: ChatSession[] = selectedProject?.sessions ?? [];

  // 프로젝트 바뀌면 세션 선택 초기화
  useEffect(() => {
    if (selectedProject && selectedProject.sessions.length > 0) {
      const currentExists = selectedProject.sessions.some(s => s.id === selectedSessionId);
      if (!currentExists) setSelectedSessionId(selectedProject.sessions[0].id);
    } else {
      setSelectedSessionId(null);
    }
  }, [selectedProjectId, selectedProject, selectedSessionId]);

  // from → AppLanguage
  const normalizeLang = (code: string): AppLanguage => {
    const u = (code || '').toUpperCase();
    if (u === 'KO' || u === 'KOREAN') return 'KO';
    if (u === 'EN' || u === 'ENGLISH') return 'EN';
    if (u === 'JP' || u === 'JA' || u === 'JAPANESE') return 'JP';
    if (u === 'CN' || u === 'ZH' || u === 'CHINESE') return 'CN';
    return 'KO';
  };

  // to → TranslatedManuscriptEntry targetLang
  const normalizeTarget = (code: string): TranslatedManuscriptEntry['targetLang'] => {
    const u = (code || '').toUpperCase();
    if (u === 'KO' || u === 'KOREAN') return 'KO';
    if (u === 'EN' || u === 'ENGLISH') return 'EN';
    if (u === 'JP' || u === 'JA' || u === 'JAPANESE') return 'JP';
    if (u === 'CN' || u === 'ZH' || u === 'CHINESE') return 'CN';
    return 'EN';
  };

  const completed = chapters.filter(c => (c.result || '').trim().length > 0);
  const canBridge = completed.length > 0 && !!selectedProjectId && !!selectedSessionId;

  const handleBridge = () => {
    if (!canBridge) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      const sourceLang = normalizeLang(from);
      const targetLang = normalizeTarget(to);
      const now = Date.now();

      // Translator chapters → TranslatedManuscriptEntry[]
      const newEntries: TranslatedManuscriptEntry[] = completed.map((ch, idx) => ({
        episode: idx + 1,
        sourceLang,
        targetLang,
        mode: 'fidelity',
        translatedTitle: ch.name || `Episode ${idx + 1}`,
        translatedContent: ch.result,
        charCount: ch.result.length,
        avgScore: 0,
        band: 0.5,
        lastUpdate: now,
      }));

      // 프로젝트 업데이트
      const updatedProjects = projects.map(p => {
        if (p.id !== selectedProjectId) return p;
        return {
          ...p,
          sessions: p.sessions.map(s => {
            if (s.id !== selectedSessionId) return s;
            const existing = s.config.translatedManuscripts ?? [];
            // 같은 targetLang + episode 조합은 덮어쓰기
            const merged: TranslatedManuscriptEntry[] = [...existing];
            for (const entry of newEntries) {
              const idx = merged.findIndex(
                e => e.targetLang === entry.targetLang && e.episode === entry.episode
              );
              if (idx >= 0) merged[idx] = entry;
              else merged.push(entry);
            }
            return {
              ...s,
              config: { ...s.config, translatedManuscripts: merged },
              lastUpdate: now,
            };
          }),
          lastUpdate: now,
        };
      });

      const ok = saveProjects(updatedProjects);
      if (!ok) {
        setStatus('error');
        setErrorMsg('localStorage 저장 실패 (용량 초과?)');
        return;
      }
      setProjects(updatedProjects);
      setSavedCount(newEntries.length);
      setStatus('done');
      // 3초 후 idle로 복귀
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  };

  if (projects.length === 0) {
    return (
      <p className="text-[11px] text-text-tertiary italic text-center py-2">
        {langKo
          ? '소설 스튜디오에 저장된 프로젝트가 없습니다. /studio 에서 먼저 프로젝트를 만드세요.'
          : 'No Novel Studio projects found. Create one at /studio first.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-text-tertiary leading-relaxed">
        {langKo
          ? '완료된 번역 회차를 소설 스튜디오 세션의 translatedManuscripts에 저장합니다. 같은 언어·화 조합은 덮어씁니다. 소설 스튜디오의 GitHub 동기화로 translations/<lang>/volumes/... 경로에 자동 커밋됩니다.'
          : 'Saves completed translations into a Novel Studio session. Same (lang, episode) combos overwrite. GitHub sync from Novel Studio will push to translations/<lang>/volumes/...'}
      </p>

      {/* 프로젝트 드롭다운 */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {langKo ? '프로젝트' : 'Project'}
        </label>
        <select
          value={selectedProjectId ?? ''}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full bg-bg-primary border border-border rounded-md px-2 py-1.5 text-[12px] text-text-primary focus:border-accent-amber outline-none"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sessions.length} 세션)
            </option>
          ))}
        </select>
      </div>

      {/* 세션 드롭다운 */}
      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {langKo ? '세션' : 'Session'}
        </label>
        <select
          value={selectedSessionId ?? ''}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="w-full bg-bg-primary border border-border rounded-md px-2 py-1.5 text-[12px] text-text-primary focus:border-accent-amber outline-none disabled:opacity-50"
          disabled={availableSessions.length === 0}
        >
          {availableSessions.length === 0 ? (
            <option value="">(세션 없음)</option>
          ) : (
            availableSessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.title} — {(s.config.translatedManuscripts?.length ?? 0)} 기존 번역본
              </option>
            ))
          )}
        </select>
      </div>

      {/* 요약 */}
      <div className="rounded-md bg-white/[0.02] border border-white/5 p-2 text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="text-text-tertiary">완료 회차</span>
          <span className="font-mono text-text-secondary">{completed.length}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">언어 방향</span>
          <span className="font-mono text-text-secondary">{(from || '').toUpperCase()} → {(to || '').toUpperCase()}</span>
        </div>
      </div>

      {/* 실행 버튼 */}
      <button
        type="button"
        onClick={handleBridge}
        disabled={!canBridge || status === 'saving'}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent-purple/30 bg-accent-purple/10 py-2.5 text-[11px] font-semibold text-accent-purple transition-colors hover:bg-accent-purple/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'saving' ? (
          <>저장 중…</>
        ) : status === 'done' ? (
          <><Check className="w-3.5 h-3.5" /> {savedCount}개 주입 완료</>
        ) : (
          <><Link2 className="w-3.5 h-3.5" /> {langKo ? `소설 스튜디오에 ${completed.length}개 회차 주입` : `Bridge ${completed.length} chapters`}</>
        )}
      </button>

      {status === 'error' && errorMsg && (
        <div className="text-[10px] text-accent-red bg-accent-red/5 border border-accent-red/20 rounded p-2">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Platform Export Section — 플랫폼 규격별 TXT 내보내기
// ============================================================
function PlatformExportSection({
  chapters,
  langKo,
}: {
  chapters: { name: string; content: string; result: string; isDone: boolean }[];
  langKo: boolean;
}) {
  const [platformId, setPlatformId] = useState<PlatformId>('novelpia');
  const [includeNumber, setIncludeNumber] = useState(true);
  const adapter = useMemo(() => getAdapter(platformId), [platformId]);

  const completed = chapters.filter(c => (c.result || '').trim().length > 0);
  const canExport = adapter !== null && completed.length > 0;

  const handleDownload = () => {
    if (!adapter || completed.length === 0) return;
    const parts: string[] = [];
    completed.forEach((ch, idx) => {
      const episode = { episode: idx + 1, title: ch.name || `Episode ${idx + 1}`, content: ch.result };
      const body = adapter.toText(episode, { includeTitle: true, includeChapterNumber: includeNumber });
      parts.push(`====== ${episode.title} ======\n\n${body}`);
    });
    const combined = parts.join('\n\n\n');
    if (typeof window === 'undefined') return;
    try {
      const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${platformId}-export-${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* no-op */ }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-text-tertiary leading-relaxed">
        {langKo
          ? '각 플랫폼 규격(HTML 제거·공백줄 정규화·제약 적용)으로 전체 회차를 TXT로 묶어 받습니다.'
          : 'Export all chapters as platform-regulated TXT (HTML strip, blank normalize).'}
      </p>

      {/* 플랫폼 선택 */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {langKo ? '플랫폼' : 'Platform'}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {SUPPORTED_PLATFORMS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => setPlatformId(id)}
              className={`rounded-lg border py-2 text-[11px] font-semibold transition-colors ${
                platformId === id
                  ? 'border-accent-amber/50 bg-accent-amber/15 text-accent-amber'
                  : 'border-white/10 bg-white/[0.02] text-text-secondary hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              {langKo ? PLATFORM_LABELS[id].ko : PLATFORM_LABELS[id].en}
            </button>
          ))}
        </div>
      </div>

      {/* 제약 요약 */}
      {adapter && (
        <div className="rounded-md bg-white/[0.02] border border-white/5 p-2 space-y-1 text-[10px] text-text-tertiary">
          <div className="flex justify-between">
            <span>{langKo ? '제목 한도' : 'Title max'}</span>
            <span className="font-mono text-text-secondary">{adapter.constraints.titleMaxLength}자</span>
          </div>
          <div className="flex justify-between">
            <span>{langKo ? '태그 한도' : 'Tag max'}</span>
            <span className="font-mono text-text-secondary">{adapter.constraints.tagMaxCount}개{adapter.constraints.tagMaxLength ? ` / ${adapter.constraints.tagMaxLength}자` : ''}</span>
          </div>
          <div className="flex justify-between">
            <span>{langKo ? 'HTML' : 'HTML'}</span>
            <span className="font-mono text-text-secondary">{adapter.constraints.allowHtml ? 'OK' : '제거'}</span>
          </div>
          <div className="flex justify-between">
            <span>{langKo ? '연속 빈 줄' : 'Max blanks'}</span>
            <span className="font-mono text-text-secondary">{adapter.constraints.maxConsecutiveBlanks}줄</span>
          </div>
        </div>
      )}

      {/* 옵션 */}
      <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={includeNumber}
          onChange={(e) => setIncludeNumber(e.target.checked)}
          className="w-3.5 h-3.5 accent-accent-amber"
        />
        {langKo ? '회차 번호 앞에 "N화." 붙이기' : 'Prefix with "Chapter N."'}
      </label>

      {/* 다운로드 버튼 */}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!canExport}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent-amber/30 bg-accent-amber/10 py-2.5 text-[11px] font-semibold text-accent-amber transition-colors hover:bg-accent-amber/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        {langKo
          ? `${adapter?.name ?? '플랫폼'} 규격 TXT 받기 (${completed.length}회차)`
          : `Download ${adapter?.name ?? 'platform'} TXT (${completed.length} chapters)`}
      </button>
      {completed.length === 0 && (
        <p className="text-[10px] text-text-tertiary text-center italic">
          {langKo ? '번역 완료된 회차가 없습니다.' : 'No completed translations.'}
        </p>
      )}
    </div>
  );
}

/**
 * 소설 스튜디오「EXPORT (5형식)」와 동일 — 번역 결과는 TXT/MD/JSON/HTML/CSV를 메인으로 둠.
 * 프로젝트 전체 이전용 JSON은 고급(접힘).
 */
export function SaveBackupPanel() {
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const docImportRef = useRef<HTMLInputElement>(null);
  const {
    langKo,
    autoSaveLabel,
    chapters,
    from,
    to,
    exportData,
    importData,
    importDocument,
    downloadAllResults,
  } = useTranslator();

  const hasChapters = chapters.length > 0;

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <Save className="w-4 h-4 text-accent-amber" />
          <span className="text-[13px] font-medium">
            {langKo ? '저장 · 백업 · 보내기' : 'Save · Backup · Export'}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-text-tertiary leading-relaxed">
          {langKo
            ? '번역본 보내기는 TXT · MD · JSON · HTML · CSV 대표 5형식을 씁니다. 다른 기기로 옮길 때는 5형식으로 받거나, 아래「프로젝트 전체」JSON을 쓰세요.'
            : 'Use the five export formats (TXT, MD, JSON, HTML, CSV) for translated output. For full workspace transfer, use project JSON below.'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pointer-events-auto custom-scrollbar">
        {/* 대표 5형식 — 항상 펼침, ChapterSidebar EXPORT와 동일 역할 */}
        <div className="rounded-xl border border-accent-amber/25 bg-linear-to-b from-accent-amber/10 to-black/30 p-3 space-y-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-accent-amber/90">
              {langKo ? '보내기 (대표 5형식)' : 'Export (5 formats)'}
            </span>
            <span className="text-[10px] text-text-tertiary leading-relaxed">
              {langKo
                ? '모든 챕터의 번역 결과를 한 파일로 받습니다. (TXT, MD, JSON, HTML, CSV)'
                : 'Download all chapter translations in one file.'}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={!hasChapters}
                onClick={() => downloadAllResults(fmt)}
                className="rounded-lg border border-white/15 bg-black/40 py-2.5 text-[9px] font-black uppercase tracking-wider text-text-primary transition-colors hover:border-accent-amber/40 hover:bg-accent-amber/15 hover:text-accent-amber disabled:cursor-not-allowed disabled:opacity-30"
              >
                {fmt}
              </button>
            ))}
          </div>
          {!hasChapters && (
            <p className="text-[10px] text-amber-400/80 text-center">
              {langKo ? '챕터를 먼저 불러오거나 만든 뒤 사용하세요.' : 'Add or import chapters first.'}
            </p>
          )}
        </div>

        {/* 로컬 자동 저장 */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
            {langKo ? '브라우저 자동 저장' : 'Browser autosave'}
          </div>
          <div className="flex justify-between gap-2 text-[12px]">
            <span className="text-text-tertiary shrink-0">{langKo ? '마지막 반영' : 'Last saved'}</span>
            <span className="text-emerald-400/90 font-mono text-[11px] text-right break-all">{autoSaveLabel}</span>
          </div>
          <p className="text-[11px] text-text-tertiary leading-relaxed">
            {langKo
              ? '편집 내용은 이 브라우저(localStorage)에 자동 저장됩니다. 번역본 파일로 남기려면 위 5형식을 쓰면 됩니다.'
              : 'Edits autosave locally. Use the five formats above to keep translation files.'}
          </p>
        </div>

        {/* 소설 스튜디오로 브릿지 (translatedManuscripts 주입) */}
        <details className="group rounded-xl border border-accent-purple/25 bg-accent-purple/[0.03] open:border-accent-purple/35">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              <Link2 className="h-3.5 w-3.5 text-accent-purple opacity-80" />
              {langKo ? '소설 스튜디오로 브릿지 (자동 주입)' : 'Bridge to Novel Studio'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="border-t border-white/5 px-3 py-3">
            <BridgeToNovelStudioSection chapters={chapters} from={from} to={to} langKo={langKo} />
          </div>
        </details>

        {/* 플랫폼 규격 내보내기 — 노벨피아/문피아 */}
        <details className="group rounded-xl border border-accent-amber/20 bg-accent-amber/[0.03] open:border-accent-amber/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              <Send className="h-3.5 w-3.5 text-accent-amber opacity-80" />
              {langKo ? '플랫폼 규격 내보내기 (노벨피아·문피아)' : 'Platform export (Novelpia · Munpia)'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="border-t border-white/5 px-3 py-3">
            <PlatformExportSection chapters={chapters} langKo={langKo} />
          </div>
        </details>

        {/* 프로젝트 전체 — JSON만, 접어 둠 */}
        <details className="group rounded-xl border border-white/10 bg-black/25 open:border-white/15">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              {langKo ? '고급: 프로젝트 전체 (JSON)' : 'Advanced: full project (JSON)'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-2 border-t border-white/5 px-3 py-3">
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              {langKo
                ? '용어집·스토리 바이블·챕터 구조까지 한 번에 옮길 때만 사용합니다. API 키는 포함되지 않습니다.'
                : 'For moving glossary, bible, and chapter structure together. API keys are not included.'}
            </p>
            <button
              type="button"
              onClick={() => void exportData()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent-amber/25 hover:bg-accent-amber/10 hover:text-accent-amber"
            >
              <Download className="h-3.5 w-3.5" />
              {langKo ? '프로젝트 JSON보내기' : 'Export project JSON'}
            </button>
            <input
              ref={jsonImportRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => importData(e)}
            />
            <button
              type="button"
              onClick={() => jsonImportRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent-amber/25 hover:bg-accent-amber/10 hover:text-accent-amber"
            >
              <Upload className="h-3.5 w-3.5" />
              {langKo ? '프로젝트 JSON 가져오기' : 'Import project JSON'}
            </button>
          </div>
        </details>

        {/* 원문 문서 가져오기 */}
        <details className="group rounded-xl border border-white/10 bg-black/25 open:border-white/15">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              <FileStack className="h-3.5 w-3.5 text-accent-indigo opacity-80" />
              {langKo ? '원문 문서 읽어오기' : 'Import source documents'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-2 border-t border-white/5 px-3 py-3">
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              {langKo
                ? 'TXT, MD, EPUB, PDF, DOCX — 챕터로 불러옵니다.'
                : 'TXT, MD, EPUB, PDF, DOCX — loads as chapters.'}
            </p>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent-indigo/25 bg-accent-indigo/10 py-2.5 text-[11px] font-semibold text-accent-indigo transition-colors hover:bg-accent-indigo/20">
              <Upload className="h-3.5 w-3.5" />
              {langKo ? '파일 선택' : 'Choose files'}
              <input
                ref={docImportRef}
                type="file"
                multiple
                className="hidden"
                accept=".txt,.md,.epub,.pdf,.docx"
                onChange={(e: ChangeEvent<HTMLInputElement>) => importDocument(e)}
              />
            </label>
          </div>
        </details>
      </div>
    </div>
  );
}
