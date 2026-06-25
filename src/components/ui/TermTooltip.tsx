'use client';

// ============================================================
// TermTooltip — 전문 용어 설명 툴팁
// 점선 밑줄 + HelpCircle 아이콘. hover/click로 열고 outside/Escape로 닫힘.
// 용어 사전은 모듈 상수 — 재렌더마다 재생성되지 않음.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

interface TermTooltipProps {
  /** 사전 키. 사전에 없으면 children/term 그대로 렌더 (툴팁 없음). */
  term: string;
  /** 없으면 term이 기본 표시 텍스트가 됨. */
  children?: React.ReactNode;
  className?: string;
  /**
   * 설명 텍스트 언어. 생략 시 KO fallback (L4 기본 동작).
   * 호출자가 컨텍스트에서 받아 넘기는 것을 권장 — 4언어 사전은 내장되어 있다.
   * 타입을 느슨하게 둔 이유: L4() 자체가 AppLanguage | Lang | string 을 받고,
   * 호출자마다 변수 이름이 `language`(대문자 KO) 또는 `lang`(소문자 ko)으로 갈려서
   * 한쪽으로 고정하면 호출부가 캐스트를 남발해야 한다.
   */
  language?: AppLanguage | string;
}

// ============================================================
// PART 1 — 용어 사전 (4개국어)
// 재렌더마다 재생성되지 않도록 모듈 상수.
// ============================================================

const TERM_DEFINITIONS: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  '씬시트': {
    ko: '장면의 긴장/분위기/캐릭터를 설계하는 구조화된 시트',
    en: 'Structured sheet for scene tension/mood/character design',
    ja: 'シーンの緊張・雰囲気・キャラクターを設計する構造化シート',
    zh: '用于设计场景紧张/氛围/角色的结构化表单',
  },
  '품질 항목': {
    ko: '번역 품질을 원문 보존과 독자 경험 관점으로 나눠 확인합니다',
    en: 'Reviews translation quality through source preservation and reader experience',
    ja: '原文保持と読者体験の観点で翻訳品質を確認します',
    zh: '从原文保留与读者体验角度检查翻译质量',
  },
  'Voice Guard': {
    ko: '캐릭터 말투 위반을 자동 감지하는 검증 엔진',
    en: 'Validation engine that auto-detects character voice violations',
    ja: 'キャラクターの話し方違反を自動検出する検証エンジン',
    zh: '自动检测角色语气违规的验证引擎',
  },
  '품질 게이트': {
    ko: '노아 제안의 품질 기준 미달 시 자동 재시도 시스템',
    en: 'Auto-retry system when Noa suggestion quality falls below standards',
    ja: 'Noa 提案の品質基準未達成時の自動再試行システム',
    zh: 'Noa 建议质量不达标时的自动重试系统',
  },
  '평행우주': {
    ko: 'Git 브랜치 기반 IF 전개. 다른 선택으로 대체 시나리오 탐험',
    en: 'Git branch-based IF exploration for alternate scenarios via different choices',
    ja: 'Gitブランチベースのif展開。異なる選択で代替シナリオを探索',
    zh: '基于Git分支的IF展开，通过不同选择探索替代场景',
  },
  'RAG': {
    ko: '검색 보강 — 현재 창작 집필 경로에는 자동 주입하지 않는 레거시 보조 방식',
    en: 'Retrieval support — a legacy helper that is not auto-injected into the creative writing path',
    ja: '検索補助 — 現在の創作執筆経路には自動注入されないレガシー補助方式',
    zh: '检索辅助 — 当前不会自动注入创作写作路径的旧版辅助方式',
  },
  '연결 키': {
    ko: '연결 키 — 사용자가 가진 모델 계정을 Loreguard에 연결하는 방식',
    en: 'Connection keys — connect your own model account to Loreguard',
    ja: '接続キー — 自分のモデルアカウントをLoreguardに接続する方式',
    zh: '连接密钥 — 将自己的模型账户连接到 Loreguard',
  },
  'Episode Memory': {
    ko: '장편 연재 시 용어/캐릭터 이름 일관성을 추적하는 메모리 그래프',
    en: 'Memory graph tracking term/character consistency across long series',
    ja: '長編連載時の用語・キャラ名の一貫性を追跡するメモリグラフ',
    zh: '追踪长篇连载中术语/角色名一致性的记忆图',
  },
  '드리프트': {
    ko: '장편 번역에서 용어가 조금씩 어긋나는 현상 (예: 마왕 → devil → satan)',
    en: 'Term drift in long translations (e.g., 마왕 → devil → satan)',
    ja: '長編翻訳での用語の少しずつのずれ',
    zh: '长篇翻译中术语逐渐偏移现象',
  },
  '포모도로': {
    ko: '25분 집중 + 5분 휴식 사이클 생산성 기법',
    en: 'Productivity technique: 25min focus + 5min break cycle',
    ja: 'ポモドーロ — 25分集中 + 5分休憩サイクル',
    zh: '番茄钟 — 25分钟专注 + 5分钟休息循环',
  },
  '글로서리': {
    ko: '용어집 — 고유명사/전문용어 번역 잠금 사전',
    en: 'Glossary — locked dictionary for proper nouns/jargon translation',
    ja: '用語集 — 固有名詞・専門用語の翻訳ロック辞書',
    zh: '词汇表 — 专有名词/术语的翻译锁定词典',
  },
  'IndexedDB': {
    ko: '브라우저 내장 대용량 저장소 (수백MB 단위)',
    en: 'Browser-native large storage (hundreds of MB)',
    ja: 'ブラウザ内蔵大容量ストレージ',
    zh: '浏览器内置大容量存储',
  },
};

const TERM_LABELS: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
  '연결 키': {
    ko: '연결 키',
    en: 'Connection keys',
    ja: '接続キー',
    zh: '连接密钥',
  },
};

// ============================================================
// PART 2 — 컴포넌트
// ============================================================

export function TermTooltip({ term, children, className = '', language }: TermTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const def = TERM_DEFINITIONS[term];

  // 2026-04-24: language prop으로 4언어 활성화. 생략 시 L4가 KO fallback.
  const explanation = def ? L4(language ?? 'KO', def) : '';
  const publicLabel = TERM_LABELS[term] ? L4(language ?? 'KO', TERM_LABELS[term]) : term;

  // [C] Outside click / Escape — open일 때만 리스너 부착 (G: 불필요한 구독 제거).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!ref.current?.contains(target)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // 사전에 없으면 투명 렌더 (children 또는 term 그대로).
  if (!def) {
    return <span className={className}>{children ?? term}</span>;
  }

  // [C] aria-describedby ID는 사전적 term 기반. 특수문자/공백은 data-key로 치환.
  const describedById = `term-${term.replace(/[^A-Za-z0-9\-_]/g, '_')}`;

  return (
    <span ref={ref} className={`relative inline-flex items-center gap-0.5 ${className}`}>
      <span
        className="underline decoration-dotted decoration-text-tertiary underline-offset-2 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-describedby={describedById}
      >
        {children ?? term}
      </span>
      <HelpCircle className="w-3 h-3 text-text-tertiary" aria-hidden="true" />
      {open && (
        <span
          id={describedById}
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-bg-primary border border-border rounded-lg shadow-lg text-sm text-text-primary whitespace-normal min-w-[200px] max-w-[320px]"
          style={{ zIndex: 'var(--z-tooltip, 600)' }}
        >
          <strong className="block mb-1">{publicLabel}</strong>
          {explanation}
        </span>
      )}
    </span>
  );
}

export default TermTooltip;
