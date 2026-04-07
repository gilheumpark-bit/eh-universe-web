'use client';

import React, { useRef, type ChangeEvent } from 'react';
import { Save, Download, Upload, FileStack } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';

/** 번역 스튜디오·챕터 사이드바와 동일한 대표 보내기 5형식 */
const EXPORT_FORMATS = ['txt', 'md', 'json', 'html', 'csv'] as const;

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
