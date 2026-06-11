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

import { useEffect, useRef, useState } from 'react';
import type { CodexDomain } from '@/lib/ai/codex-prompts';
import type { AppLanguage } from '@/lib/studio-types';
import {
  getStoredCodexDomain,
  setStoredCodexDomain,
  ALL_CODEX_DOMAINS,
  CODEX_DOMAIN_STORAGE_KEY,
} from '@/lib/ai/codex-domain-storage';

// ============================================================
// PART 0 — Language → Default Domain (auto-select helper, 2026-06-07)
// ============================================================

/**
 * AppLanguage → 기본 CodexDomain 매핑.
 * Codex 진입 시 사용자 명시 override 가 localStorage 에 없을 때
 * 작품 언어 기반으로 자동 선택 (rank 15).
 *
 * KO → 'korean-webnovel'
 * EN → 'western-fantasy'
 * JP → 'japanese-lightnovel'
 * CN → 'chinese-xianxia'
 *
 * codex-prompts/types.ts 의 defaultDomainFor 와 동일 매핑이나,
 * UI 레이어에서 즉시 사용 가능하도록 컴포넌트 모듈에서도 export.
 */
export function defaultDomainForLanguage(lang: AppLanguage): CodexDomain {
  switch (lang) {
    case 'KO': return 'korean-webnovel';
    case 'EN': return 'western-fantasy';
    case 'JP': return 'japanese-lightnovel';
    case 'CN': return 'chinese-xianxia';
    default: return 'korean-webnovel';
  }
}

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

  // [P7 풀점검 루프 3] CustomEvent 에 latestVersion 타임스탬프 부착 → stale 이벤트 무시.
  // 빠른 토글 (T1→T2→T3) 시 listener 큐에서 늦게 도착한 T1 이벤트가 최신 T3 상태를
  // 덮어쓰는 race 방어. version 단조 증가 비교만 통과시킴.
  const latestVersionRef = useRef<number>(0);

  // [priority 14 — 2026-06-08] storage + CustomEvent listener 를 단일 useEffect 로 통합.
  // [P7 풀점검 루프 3] version 비교로 stale dispatch 폐기.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // [legitimate read-on-mount] localStorage read 후 state sync.
    const stored = getStoredCodexDomain();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read-on-mount: 로컬스토리지 값으로 초기 동기화
    if (stored) setSelected(stored);

    // 다른 탭/창 동기화 — 표준 storage 이벤트.
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== CODEX_DOMAIN_STORAGE_KEY) return;
      const next = getStoredCodexDomain();
      setSelected(next ?? '');
    };
    // 같은 탭 내 다른 마운트(Settings, Codex 헤더 등) 동기화 — CustomEvent broadcast.
    // setStoredCodexDomain 호출처가 dispatchEvent('codex-domain-changed', {detail:{domain, version}}) 발화.
    // [P7] version 비교로 stale 이벤트 폐기.
    const handleSameTab = (e: Event) => {
      const detail = (e as CustomEvent<{ domain: CodexDomain | null; version?: number }>).detail;
      const version = typeof detail?.version === 'number' ? detail.version : 0;
      if (version < latestVersionRef.current) return;
      latestVersionRef.current = version;
      setSelected(detail?.domain ?? '');
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('codex-domain-changed', handleSameTab);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('codex-domain-changed', handleSameTab);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as CodexDomain | '';
    setSelected(value);
    const domain = value === '' ? null : value;
    setStoredCodexDomain(domain);
    // [Codex multi-mount sync — 2026-06-07] 같은 탭 broadcast
    // [P7 풀점검 루프 3] version 타임스탬프 부착 → 다른 selector 들이 stale 이벤트 폐기 가능.
    if (typeof window !== 'undefined') {
      const version = Date.now();
      latestVersionRef.current = version;
      window.dispatchEvent(
        new CustomEvent('codex-domain-changed', { detail: { domain, version } }),
      );
    }
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
