"use client";

/**
 * CodexDomainSelector — Codex 객체 생성 도메인 선택 dropdown.
 *
 * 작가가 자기 언어와 다른 도메인 (예: 영어로 무협 / 한국어로 라노벨) 을
 * 명시 선택할 수 있도록 한다. 기본은 "자동" (언어 기반 매핑).
 *
 * Mount 위치 권장:
 *   - Studio Settings → Advanced 탭의 Codex 섹션 (아카이브 카테고리 옆)
 *   - 또는 Codex 화면 상단 (RULEBOOK / REFERENCE / GUIDE 탭 위)
 *
 * 사용:
 *   import CodexDomainSelector from '@/components/codex/CodexDomainSelector';
 *   <CodexDomainSelector language="ko" onChange={(d) => console.log(d)} />
 *
 * [C] 안전성: localStorage 사용 불가 환경 안전 fallback
 * [G] 성능: 4 옵션만, 단순 select 박스
 * [K] 간결성: 단일 컴포넌트 + 4언어 라벨
 */

import { useEffect, useState } from 'react';
import type { CodexDomain } from '@/lib/ai/codex-prompts';
import {
  getStoredCodexDomain,
  setStoredCodexDomain,
  ALL_CODEX_DOMAINS,
} from '@/lib/ai/codex-domain-storage';

// ============================================================
// PART 1 — 4언어 라벨
// ============================================================

const DOMAIN_LABELS: Record<CodexDomain, { ko: string; en: string; ja: string; zh: string }> = {
  'korean-webnovel': { ko: '한국 웹소설', en: 'Korean Web Novel', ja: '韓国ウェブ小説', zh: '韩国网络小说' },
  'western-fantasy': { ko: '서양 판타지', en: 'Western Fantasy', ja: '西洋ファンタジー', zh: '西方奇幻' },
  'japanese-lightnovel': { ko: '일본 라노벨', en: 'Japanese Light Novel', ja: '日本ライトノベル', zh: '日本轻小说' },
  'chinese-xianxia': { ko: '중국 선협', en: 'Chinese Xianxia', ja: '中国仙侠', zh: '中国仙侠' },
};

const AUTO_LABELS = {
  ko: '자동 (언어 기반)',
  en: 'Auto (by language)',
  ja: '自動 (言語ベース)',
  zh: '自动 (按语言)',
} as const;

const SECTION_LABELS = {
  ko: 'Codex 도메인',
  en: 'Codex Domain',
  ja: 'Codex ドメイン',
  zh: 'Codex 领域',
} as const;

// ============================================================
// PART 2 — Component
// ============================================================

interface Props {
  language?: 'ko' | 'en' | 'ja' | 'zh';
  /** 선택 변경 callback. null 은 "자동" 선택. */
  onChange?: (domain: CodexDomain | null) => void;
  /** label 노출 여부 (기본 true). false 면 select 만. */
  showLabel?: boolean;
  className?: string;
}

export default function CodexDomainSelector({
  language = 'ko',
  onChange,
  showLabel = true,
  className = '',
}: Props) {
  const [selected, setSelected] = useState<CodexDomain | ''>('');

  useEffect(() => {
    // [legitimate read-on-mount] localStorage read 후 state sync.
    const stored = getStoredCodexDomain();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSelected(stored);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as CodexDomain | '';
    setSelected(value);
    const domain = value === '' ? null : value;
    setStoredCodexDomain(domain);
    onChange?.(domain);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showLabel && (
        <label
          htmlFor="codex-domain-select"
          className="text-text-secondary text-xs font-mono tracking-wider uppercase"
        >
          {SECTION_LABELS[language]}
        </label>
      )}
      <select
        id="codex-domain-select"
        value={selected}
        onChange={handleChange}
        className="px-3 py-2 border border-border bg-bg-primary text-text-primary text-sm font-mono rounded-none focus-visible:ring-2 ring-accent-blue min-h-[44px]"
        aria-label={SECTION_LABELS[language]}
      >
        <option value="">{AUTO_LABELS[language]}</option>
        {ALL_CODEX_DOMAINS.map(d => (
          <option key={d} value={d}>{DOMAIN_LABELS[d][language]}</option>
        ))}
      </select>
    </div>
  );
}
