"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// Compliance Section — Settings 아코디언 그룹 1개.
// - AI 사용 고지 자동 삽입 on/off (Export 시)
// - 커스텀 고지문 (선택)
// - 플랫폼 AI 라벨 요구 안내
// ============================================================

import React, { useEffect, useState } from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { ChevronDown, ShieldCheck, Info } from 'lucide-react';
import {
  isDisclosureEnabled,
  setDisclosureEnabled,
} from '@/lib/ai-usage-tracker';

interface ComplianceSectionProps {
  language: AppLanguage;
}

const CUSTOM_TEXT_KEY = 'noa_ai_disclosure_custom';
const MAX_CUSTOM_LEN = 600;

// ============================================================
// PART 2 — Component
// ============================================================

const ComplianceSection: React.FC<ComplianceSectionProps> = ({ language }) => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [custom, setCustom] = useState<string>('');

  // 최초 마운트 시 localStorage 값 hydrate
  useEffect(() => {
    setEnabled(isDisclosureEnabled());
    try {
      const raw = localStorage.getItem(CUSTOM_TEXT_KEY);
      if (raw !== null) setCustom(raw);
    } catch (err) {
      logger.warn('ComplianceSection', 'read custom disclosure failed', err);
    }
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setDisclosureEnabled(next);
  };

  const onCustomChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // [C] 길이 제한 — 과도한 입력 방지
    const v = e.target.value.slice(0, MAX_CUSTOM_LEN);
    setCustom(v);
    try {
      if (v) localStorage.setItem(CUSTOM_TEXT_KEY, v);
      else localStorage.removeItem(CUSTOM_TEXT_KEY);
    } catch (err) {
      logger.warn('ComplianceSection', 'save custom disclosure failed', err);
    }
  };

  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <ShieldCheck className="w-4 h-4 text-accent-green shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, {
            ko: 'AI 사용 고지 · 규제 대응',
            en: 'AI Disclosure & Compliance',
            ja: 'AI使用開示・規制対応',
            zh: 'AI 使用声明与合规',
          })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>

      <div className="p-4 md:p-6 space-y-4">
        {/* 인포 박스 */}
        <div className="flex gap-3 p-3 rounded-xl bg-bg-primary/40 border border-border text-[12px] text-text-secondary leading-relaxed">
          <Info className="w-4 h-4 shrink-0 text-accent-blue mt-0.5" />
          <p>
            {L4(language, {
              ko: 'Amazon KDP · Apple Books · Royal Road 등 일부 플랫폼은 AI 생성 여부 공개를 요구합니다. Export(EPUB/DOCX) 시 AI 사용 고지가 본문 끝에 자동 삽입됩니다.',
              en: 'Amazon KDP, Apple Books, Royal Road and others require AI disclosure. When exporting (EPUB/DOCX), a notice is auto-inserted at the end.',
              ja: 'Amazon KDP・Apple Books・Royal Roadなど一部プラットフォームはAI生成の開示を求めます。Export(EPUB/DOCX)時に本文末尾へ自動挿入されます。',
              zh: 'Amazon KDP · Apple Books · Royal Road 等平台要求披露 AI 使用。导出 (EPUB/DOCX) 时会自动在文末插入声明。',
            })}
          </p>
        </div>

        {/* On/Off 토글 */}
        <div
          onClick={toggle}
          role="switch"
          tabIndex={0}
          aria-checked={enabled}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              toggle();
            }
          }}
          className="flex items-center justify-between gap-3 p-4 hover:bg-bg-secondary/40 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <div className="min-w-0">
            <div className="text-xs md:text-sm font-bold text-text-primary">
              {L4(language, {
                ko: 'AI 사용 고지 자동 삽입',
                en: 'Auto-Insert AI Disclosure',
                ja: 'AI使用開示を自動挿入',
                zh: '自动插入 AI 声明',
              })}
            </div>
            <div className="text-[12px] text-text-tertiary mt-0.5">
              {L4(language, {
                ko: '끄면 개별 Export에서만 수동 삽입됩니다. (기본 on)',
                en: 'Off = manually insert per export only. (Default: on)',
                ja: 'オフにすると個別Export時に手動挿入のみ。(既定: オン)',
                zh: '关闭后仅在单次导出时手动插入。（默认开启）',
              })}
            </div>
          </div>
          <div
            className={`relative w-10 h-6 rounded-full flex items-center transition-colors duration-300 shrink-0 ${
              enabled ? 'bg-accent-green justify-end' : 'bg-bg-tertiary justify-start'
            }`}
          >
            <div className="w-4 h-4 bg-white rounded-full shadow-md transform transition-transform mx-1" />
          </div>
        </div>

        {/* 커스텀 문구 */}
        <div className="p-4 rounded-2xl border border-border">
          <label className="block text-[12px] font-bold text-text-secondary mb-2">
            {L4(language, {
              ko: '커스텀 고지문 (선택)',
              en: 'Custom Disclosure Text (optional)',
              ja: 'カスタム開示文 (任意)',
              zh: '自定义声明文本（可选）',
            })}
          </label>
          <textarea
            value={custom}
            onChange={onCustomChange}
            rows={3}
            maxLength={MAX_CUSTOM_LEN}
            placeholder={L4(language, {
              ko: '비워두면 4개 언어 기본 문구가 삽입됩니다.',
              en: 'Leave blank to use the default 4-language text.',
              ja: '空欄の場合、4言語の既定文が挿入されます。',
              zh: '留空则使用 4 种语言的默认文本。',
            })}
            className="w-full text-sm bg-bg-primary border border-border rounded-xl p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue resize-none"
          />
          <div className="text-[11px] text-text-tertiary mt-1 text-right">
            {custom.length} / {MAX_CUSTOM_LEN}
          </div>
        </div>
      </div>
    </details>
  );
};

export default ComplianceSection;
