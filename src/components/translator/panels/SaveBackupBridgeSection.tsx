'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import { loadProjects, saveProjects } from '@/lib/project-migration';
import type { AppLanguage, ChatSession, Project, TranslatedManuscriptEntry } from '@/lib/studio-types';

type SaveBackupBridgeSectionProps = {
  chapters: { name: string; content: string; result: string; isDone: boolean }[];
  from: string;
  to: string;
  langKo: boolean;
};

function normalizeLang(code: string): AppLanguage {
  const upper = (code || '').toUpperCase();
  if (upper === 'KO' || upper === 'KOREAN') return 'KO';
  if (upper === 'EN' || upper === 'ENGLISH') return 'EN';
  if (upper === 'JP' || upper === 'JA' || upper === 'JAPANESE') return 'JP';
  if (upper === 'CN' || upper === 'ZH' || upper === 'CHINESE') return 'CN';
  return 'KO';
}

function normalizeTarget(code: string): TranslatedManuscriptEntry['targetLang'] {
  const upper = (code || '').toUpperCase();
  if (upper === 'KO' || upper === 'KOREAN') return 'KO';
  if (upper === 'EN' || upper === 'ENGLISH') return 'EN';
  if (upper === 'JP' || upper === 'JA' || upper === 'JAPANESE') return 'JP';
  if (upper === 'CN' || upper === 'ZH' || upper === 'CHINESE') return 'CN';
  return 'EN';
}

export default function SaveBackupBridgeSection({
  chapters,
  from,
  to,
  langKo,
}: SaveBackupBridgeSectionProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [savedCount, setSavedCount] = useState<number>(0);

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
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const availableSessions: ChatSession[] = selectedProject?.sessions ?? [];

  useEffect(() => {
    if (selectedProject && selectedProject.sessions.length > 0) {
      const currentExists = selectedProject.sessions.some((session) => session.id === selectedSessionId);
      if (!currentExists) setSelectedSessionId(selectedProject.sessions[0].id);
    } else {
      setSelectedSessionId(null);
    }
  }, [selectedProject, selectedSessionId]);

  const completed = chapters.filter((chapter) => (chapter.result || '').trim().length > 0);
  const canBridge = completed.length > 0 && Boolean(selectedProjectId) && Boolean(selectedSessionId);

  const handleBridge = () => {
    if (!canBridge) return;
    setStatus('saving');
    setErrorMsg('');
    try {
      const sourceLang = normalizeLang(from);
      const targetLang = normalizeTarget(to);
      const now = Date.now();
      const newEntries: TranslatedManuscriptEntry[] = completed.map((chapter, index) => ({
        episode: index + 1,
        sourceLang,
        targetLang,
        mode: 'fidelity',
        translatedTitle: chapter.name || `Episode ${index + 1}`,
        translatedContent: chapter.result,
        charCount: chapter.result.length,
        avgScore: 0,
        band: 0.5,
        lastUpdate: now,
      }));
      const updatedProjects = projects.map((project) => {
        if (project.id !== selectedProjectId) return project;
        return {
          ...project,
          sessions: project.sessions.map((session) => {
            if (session.id !== selectedSessionId) return session;
            const merged: TranslatedManuscriptEntry[] = [...(session.config.translatedManuscripts ?? [])];
            for (const entry of newEntries) {
              const index = merged.findIndex(
                (item) => item.targetLang === entry.targetLang && item.episode === entry.episode,
              );
              if (index >= 0) merged[index] = entry;
              else merged.push(entry);
            }
            return {
              ...session,
              config: { ...session.config, translatedManuscripts: merged },
              lastUpdate: now,
            };
          }),
          lastUpdate: now,
        };
      });

      const ok = saveProjects(updatedProjects);
      if (!ok) {
        setStatus('error');
        setErrorMsg('브라우저 저장 공간이 부족해 반영하지 못했습니다.');
        return;
      }
      setProjects(updatedProjects);
      setSavedCount(newEntries.length);
      setStatus('done');
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
          ? '창작 스튜디오에 저장된 작품이 없습니다. /studio에서 먼저 작품을 만드세요.'
          : 'No creative-studio projects found. Create one at /studio first.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-text-tertiary leading-relaxed">
        {langKo
          ? '완료된 번역 회차를 창작 스튜디오의 번역본 목록에 반영합니다. 같은 언어·화 조합은 덮어씁니다. 저장·동기화 설정을 켜면 번역 폴더에도 함께 남길 수 있습니다.'
          : 'Saves completed translations into the creative-studio translation list. Same language/episode pairs overwrite.'}
      </p>

      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {langKo ? '프로젝트' : 'Project'}
        </label>
        <select
          value={selectedProjectId ?? ''}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="w-full bg-bg-primary border border-border rounded-md px-2 py-1.5 text-[12px] text-text-primary focus:border-accent-amber outline-none"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({project.sessions.length} 세션)
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
          {langKo ? '세션' : 'Session'}
        </label>
        <select
          value={selectedSessionId ?? ''}
          onChange={(event) => setSelectedSessionId(event.target.value)}
          className="w-full bg-bg-primary border border-border rounded-md px-2 py-1.5 text-[12px] text-text-primary focus:border-accent-amber outline-none disabled:opacity-50"
          disabled={availableSessions.length === 0}
        >
          {availableSessions.length === 0 ? (
            <option value="">(세션 없음)</option>
          ) : (
            availableSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title} — {(session.config.translatedManuscripts?.length ?? 0)} 기존 번역본
              </option>
            ))
          )}
        </select>
      </div>

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
          <><Link2 className="w-3.5 h-3.5" /> {langKo ? `창작 스튜디오에 ${completed.length}개 회차 반영` : `Send ${completed.length} chapters`}</>
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
