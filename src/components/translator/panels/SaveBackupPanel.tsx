'use client';

import React, { useRef, useState, useMemo, type ChangeEvent } from 'react';
import { Save, Download, Upload, FileStack, Send, Link2, Check, BookOpen } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { getAdapter, SUPPORTED_PLATFORMS, PLATFORM_LABELS, type PlatformId } from '@/lib/translation/platform-adapters';
import { buildEpubFiles, type EpubChapter } from '@/lib/translation/epub-export';
import type { PublishMetadata } from '@/lib/translation/publish-metadata';
import { logger } from '@/lib/logger';
import SaveBackupBridgeSection from './SaveBackupBridgeSection';

/** 번역 스튜디오·회차 사이드바와 동일한 대표 보내기 5형식 */
const EXPORT_FORMATS = ['txt', 'md', 'json', 'html', 'csv'] as const;

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
      <label className="relative flex min-h-[44px] items-center gap-2 text-[11px] text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={includeNumber}
          onChange={(e) => setIncludeNumber(e.target.checked)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            includeNumber ? 'border-accent-amber bg-accent-amber text-white' : 'border-border bg-bg-primary'
          }`}
        >
          {includeNumber ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
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

// ============================================================
// PART N — EPUB Export Section (책 형식으로 내보내기)
// ============================================================
// buildEpubFiles + JSZip 번들 → .epub 다운로드.
// mimetype 엔트리만 STORE 압축, 나머지는 DEFLATE (EPUB 3 규격).
function EpubExportSection({
  chapters,
  projectName,
  to,
  langKo,
}: {
  chapters: { name: string; content: string; result: string; isDone: boolean }[];
  projectName: string;
  to: string;
  langKo: boolean;
}) {
  const [author, setAuthor] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const completed = useMemo(
    () => chapters.filter(c => (c.result || '').trim().length > 0),
    [chapters],
  );
  const canExport = completed.length > 0;

  const handleExport = async (): Promise<void> => {
    if (!canExport) return;
    setStatus('exporting');
    setErrorMsg('');
    try {
      // 1) 완료 챕터를 EpubChapter[] 로 변환
      const epubChapters: EpubChapter[] = completed.map((c, i) => ({
        title: (c.name || '').trim() || (langKo ? `${i + 1}화` : `Chapter ${i + 1}`),
        content: c.result,
        episode: i + 1,
      }));

      // 2) 최소 PublishMetadata 구성. 노아 활용 메타는 선택 기능
      const fallbackTitle = langKo ? '무제' : 'Untitled';
      const fallbackAuthor = langKo ? '미상' : 'Unknown';
      const resolvedTitle = (projectName || '').trim() || fallbackTitle;
      const resolvedAuthor = author.trim() || fallbackAuthor;
      const meta: PublishMetadata = {
        title: resolvedTitle,
        titleTranslated: resolvedTitle,
        author: resolvedAuthor,
        authorRomanized: resolvedAuthor,
        synopsis: '',
        synopsisTranslated: '',
        genre: [],
        tags: [],
        tagsTranslated: [],
        targetLang: (to || 'en').toLowerCase(),
      };

      // 3) buildEpubFiles: 모든 EPUB 구조 문자열 맵 생성
      const files = buildEpubFiles(epubChapters, meta);

      // 4) JSZip 동적 import. 기존 full-backup.ts 와 동일 패턴
      const JSZipMod = (await import('jszip' as string)) as {
        default?: new () => JSZipInstance;
      } & (new () => JSZipInstance);
      const JSZipCtor = (JSZipMod as { default?: new () => JSZipInstance }).default ?? (JSZipMod as unknown as new () => JSZipInstance);
      const zip = new JSZipCtor();

      // mimetype은 반드시 STORE 압축 + 첫 엔트리 (EPUB 3 요구사항)
      const mimetype = files['mimetype'];
      if (typeof mimetype !== 'string') {
        throw new Error('buildEpubFiles did not produce mimetype entry');
      }
      zip.file('mimetype', mimetype, { compression: 'STORE' });

      // 나머지는 DEFLATE
      for (const [path, content] of Object.entries(files)) {
        if (path === 'mimetype') continue;
        zip.file(path, content, { compression: 'DEFLATE' });
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/epub+zip',
      });

      // 5) 다운로드 트리거
      const safeName = resolvedTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName || 'translation'}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('done');
      window.setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      logger.warn('SaveBackupPanel', 'EPUB export failed', err);
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : langKo
            ? 'EPUB 생성 중 오류 발생'
            : 'EPUB generation failed',
      );
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-text-tertiary leading-relaxed">
        {langKo
          ? '번역 완료된 모든 회차를 한 권의 전자책(.epub)으로 묶어 내려받습니다. Amazon KDP · Apple Books · Kobo 등 국제 EPUB 표준(3.0) 호환.'
          : 'Bundle all completed chapters into a single e-book (.epub). Compatible with Amazon KDP · Apple Books · Kobo (EPUB 3.0).'}
      </p>

      {/* 저자 입력 — 빈 값이면 "미상" */}
      <label className="flex flex-col gap-1 text-[10px] text-text-tertiary">
        <span className="font-mono uppercase tracking-wider">
          {langKo ? '저자 (선택)' : 'Author (optional)'}
        </span>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={langKo ? '비워두면 "미상"' : 'Blank = "Unknown"'}
          className="w-full min-h-[44px] bg-bg-primary border border-border rounded-md px-2 py-1.5 text-[12px] text-text-primary focus:border-accent-emerald outline-none"
          maxLength={80}
        />
      </label>

      {/* 요약 */}
      <div className="rounded-md bg-white/[0.02] border border-white/5 p-2 text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="text-text-tertiary">{langKo ? '완료 회차' : 'Completed'}</span>
          <span className="font-mono text-text-secondary">{completed.length}{langKo ? '개' : ''}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">{langKo ? '언어' : 'Language'}</span>
          <span className="font-mono text-text-secondary">{(to || 'en').toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-tertiary">{langKo ? '제목' : 'Title'}</span>
          <span className="font-mono text-text-secondary truncate ml-2 max-w-[180px]" title={projectName || '-'}>
            {projectName || (langKo ? '(무제)' : '(Untitled)')}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { void handleExport(); }}
        disabled={!canExport || status === 'exporting'}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-accent-emerald/30 bg-accent-emerald/10 py-2.5 text-[11px] font-semibold text-accent-emerald transition-colors hover:bg-accent-emerald/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'exporting' ? (
          <>{langKo ? '생성 중…' : 'Building…'}</>
        ) : status === 'done' ? (
          <><Check className="w-3.5 h-3.5" /> {langKo ? 'EPUB 저장 완료' : 'EPUB downloaded'}</>
        ) : (
          <><BookOpen className="w-3.5 h-3.5" /> {langKo ? `EPUB으로 내보내기 (${completed.length}회차)` : `Export as EPUB (${completed.length})`}</>
        )}
      </button>

      {status === 'error' && errorMsg && (
        <div className="text-[10px] text-accent-red bg-accent-red/5 border border-accent-red/20 rounded p-2">
          {errorMsg}
        </div>
      )}
      {!canExport && (
        <p className="text-[10px] text-text-tertiary text-center italic">
          {langKo ? '번역 완료된 회차가 없습니다.' : 'No completed translations.'}
        </p>
      )}

      {/* [C.1 — 2026-05-08] DOCX export — dual track 지원 (편집사 제출용) */}
      <DocxExportButton
        chapters={chapters}
        projectName={projectName}
        author={author}
        to={to}
        langKo={langKo}
      />
    </div>
  );
}

// [C.1 — 2026-05-08] DOCX export 버튼 — Faithful/Market/Both track.
function DocxExportButton({
  chapters,
  projectName,
  author,
  to,
  langKo,
}: {
  chapters: { name: string; content: string; result: string; resultFaithful?: string; resultMarket?: string; isDone: boolean }[];
  projectName: string;
  author: string;
  to: string;
  langKo: boolean;
}) {
  const [track, setTrack] = useState<'faithful' | 'market' | 'both'>('market');
  const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  const completed = useMemo(
    () => chapters.filter((c) => (c.result || c.resultMarket || c.resultFaithful || '').trim().length > 0),
    [chapters],
  );
  const canExport = completed.length > 0;

  const handleExport = async (): Promise<void> => {
    if (!canExport) return;
    setStatus('exporting');
    try {
      const docxMod = await import('@/lib/translation/docx-export');
      const docxChapters = completed.map((c, i) => ({
        title: (c.name || '').trim() || (langKo ? `${i + 1}장` : `Chapter ${i + 1}`),
        contentFaithful: c.resultFaithful,
        contentMarket: c.resultMarket ?? c.result,
        content: c.result,
      }));
      const fallbackTitle = langKo ? '무제' : 'Untitled';
      const fallbackAuthor = langKo ? '미상' : 'Unknown';
      const bundle = docxMod.buildDocxBundle(docxChapters, {
        title: (projectName || '').trim() || fallbackTitle,
        author: author.trim() || fallbackAuthor,
        track,
        lang: (to || 'en').toLowerCase(),
      });
      const files = docxMod.docxBundleToFiles(bundle);

      // JSZip 동적 import
      const JSZipMod = (await import('jszip' as string)) as {
        default?: new () => JSZipInstance;
      } & (new () => JSZipInstance);
      const JSZipCtor = (JSZipMod as { default?: new () => JSZipInstance }).default ?? (JSZipMod as unknown as new () => JSZipInstance);
      const zip = new JSZipCtor();
      Object.entries(files).forEach(([path, content]) => zip.file(path, content, { compression: 'DEFLATE' }));
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      const safeName = ((projectName || '').trim() || 'translation').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-${track}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('done');
      window.setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      logger.warn('SaveBackupPanel', 'DOCX export failed', err);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
      <p className="text-[10px] text-text-tertiary leading-relaxed">
        {langKo
          ? 'DOCX (편집자·출판사 제출용). 보존안/현지화안/둘 다 중 선택할 수 있습니다.'
          : 'DOCX (for editor/publisher submission). Faithful/Market/Both tracks.'}
      </p>
      <div className="flex items-center gap-1">
        {(['faithful', 'market', 'both'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrack(t)}
            className={`flex-1 min-h-[44px] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors ${
              track === t
                ? 'bg-accent-purple/15 border-accent-purple/50 text-accent-purple'
                : 'bg-white/[0.02] border-white/10 text-text-tertiary'
            }`}
          >
            {langKo
              ? t === 'faithful'
                ? '보존안'
                : t === 'market'
                  ? '현지화안'
                  : '둘 다'
              : t}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => { void handleExport(); }}
        disabled={!canExport || status === 'exporting'}
        className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-accent-blue/30 bg-accent-blue/10 py-2 text-[11px] font-semibold text-accent-blue transition-colors hover:bg-accent-blue/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === 'exporting'
          ? (langKo ? 'DOCX 생성 중…' : 'Building DOCX…')
          : status === 'done'
            ? (langKo ? 'DOCX 저장 완료' : 'DOCX downloaded')
            : (langKo
              ? `DOCX으로 내보내기 — ${
                track === 'faithful' ? '보존안' : track === 'market' ? '현지화안' : '둘 다'
              }`
              : `Export as DOCX — ${track}`)}
      </button>
    </div>
  );
}

// JSZip 인스턴스 최소 타입 (dynamic import 용)
interface JSZipInstance {
  file(path: string, content: string, options?: { compression?: 'STORE' | 'DEFLATE' }): void;
  generateAsync(options: { type: 'blob'; mimeType?: string }): Promise<Blob>;
}

/**
 * 창작 스튜디오「보내기 5형식」과 동일 — 번역 결과는 TXT/MD/JSON/HTML/CSV를 메인으로 둠.
 * 작업실 전체 이전용 JSON은 고급(접힘).
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
    projectName,
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
        <p className="mt-2 text-[11px] text-text-secondary leading-relaxed">
          {langKo
            ? '번역본 보내기는 TXT · MD · JSON · HTML · CSV 대표 5형식을 씁니다. 다른 기기로 옮길 때는 5형식으로 받거나, 아래「작업실 전체」JSON을 쓰세요.'
            : 'Use the five export formats (TXT, MD, JSON, HTML, CSV) for translated output. For full workspace transfer, use workspace JSON below.'}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pointer-events-auto custom-scrollbar">
        {/* 대표 5형식 — 항상 펼침, ChapterSidebar EXPORT와 동일 역할 */}
        <div className="rounded-xl border border-accent-amber/25 bg-linear-to-b from-accent-amber/10 to-black/30 p-3 space-y-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-accent-amber/90">
              {langKo ? '보내기 (대표 5형식)' : 'Export (5 formats)'}
            </span>
            <span className="text-[10px] text-text-secondary leading-relaxed">
              {langKo
                ? '모든 회차의 번역 결과를 한 파일로 받습니다. (TXT, MD, JSON, HTML, CSV)'
                : 'Download all chapter translations in one file.'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={!hasChapters}
                onClick={() => downloadAllResults(fmt)}
                className="min-h-[44px] rounded-lg border border-border bg-bg-secondary px-2 py-2 text-[11px] font-black uppercase tracking-normal text-text-primary transition-colors hover:border-accent-amber/40 hover:bg-accent-amber/15 hover:text-accent-amber disabled:cursor-not-allowed disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
              >
                {fmt}
              </button>
            ))}
          </div>
          {!hasChapters && (
            <p className="text-[10px] text-amber-400/80 text-center">
              {langKo ? '회차를 먼저 불러오거나 만든 뒤 사용하세요.' : 'Add or import chapters first.'}
            </p>
          )}
        </div>

        {/* 로컬 자동 저장 */}
        <div className="rounded-xl border border-accent-green/25 bg-accent-green/10 p-3 space-y-2">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
            {langKo ? '브라우저 자동 저장' : 'Browser autosave'}
          </div>
          <div className="flex justify-between gap-2 text-[12px]">
            <span className="text-text-secondary shrink-0">{langKo ? '마지막 반영' : 'Last saved'}</span>
            <span className="text-accent-green font-mono text-[11px] text-right break-all">{autoSaveLabel}</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            {langKo
              ? '편집 내용은 이 브라우저에 자동 저장됩니다. 번역본 파일로 남기려면 위 5형식을 쓰면 됩니다.'
              : 'Edits autosave locally. Use the five formats above to keep translation files.'}
          </p>
        </div>

        {/* 창작 스튜디오로 보내기 */}
        <details className="group rounded-xl border border-accent-purple/25 bg-accent-purple/[0.03] open:border-accent-purple/35">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              <Link2 className="h-3.5 w-3.5 text-accent-purple opacity-80" />
              {langKo ? '창작 스튜디오로 보내기' : 'Send to creative studio'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="border-t border-white/5 px-3 py-3">
            <SaveBackupBridgeSection chapters={chapters} from={from} to={to} langKo={langKo} />
          </div>
        </details>

        {/* 플랫폼 규격 내보내기 — 노벨피아/문피아 */}
        <details className="group rounded-xl border border-accent-amber/20 bg-accent-amber/[0.03] open:border-accent-amber/30">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
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

        {/* EPUB 책 형식 내보내기 — Amazon KDP / Apple Books / Kobo 호환 */}
        <details className="group rounded-xl border border-accent-emerald/25 bg-accent-emerald/[0.03] open:border-accent-emerald/35">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              <BookOpen className="h-3.5 w-3.5 text-accent-emerald opacity-80" />
              {langKo ? 'EPUB 책으로 내보내기 (KDP·Apple Books 호환)' : 'Export as EPUB (KDP · Apple Books)'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="border-t border-white/5 px-3 py-3">
            <EpubExportSection chapters={chapters} projectName={projectName} to={to} langKo={langKo} />
          </div>
        </details>

        {/* 작업실 전체 — JSON만, 접어 둠 */}
        <details className="group rounded-xl border border-white/10 bg-black/25 open:border-white/15">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              {langKo ? '고급: 작업실 전체 (JSON)' : 'Advanced: full workspace (JSON)'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-2 border-t border-white/5 px-3 py-3">
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              {langKo
                ? '용어집·설정집·회차 구조까지 한 번에 옮길 때만 사용합니다. 연결 키는 포함되지 않습니다.'
                : 'For moving glossary, bible, and chapter structure together. Connection keys are not included.'}
            </p>
            <button
              type="button"
              onClick={() => void exportData()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent-amber/25 hover:bg-accent-amber/10 hover:text-accent-amber"
            >
              <Download className="h-3.5 w-3.5" />
              {langKo ? '작업실 백업 내보내기' : 'Export workspace backup'}
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
              {langKo ? '작업실 백업 가져오기' : 'Import workspace backup'}
            </button>
          </div>
        </details>

        {/* 원문 문서 가져오기 */}
        <details className="group rounded-xl border border-white/10 bg-black/25 open:border-white/15">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 select-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
              <FileStack className="h-3.5 w-3.5 text-accent-indigo opacity-80" />
              {langKo ? '원문 문서 읽어오기' : 'Import source documents'}
            </span>
            <span className="text-[9px] text-text-tertiary transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-2 border-t border-white/5 px-3 py-3">
            <p className="text-[10px] text-text-tertiary leading-relaxed">
              {langKo
                ? 'TXT, MD, EPUB, PDF, DOCX — 회차로 불러옵니다.'
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
