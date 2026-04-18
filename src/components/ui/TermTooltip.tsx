'use client';

// ============================================================
// TermTooltip — 전문 용어 설명 툴팁
// 점선 밑줄 + HelpCircle 아이콘. hover/click로 열고 outside/Escape로 닫힘.
// 용어 사전은 모듈 상수 — 재렌더마다 재생성되지 않음.
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TermTooltipProps {
  /** 사전 키. 사전에 없으면 children/term 그대로 렌더 (툴팁 없음). */
  term: string;
  /** 없으면 term이 기본 표시 텍스트가 됨. */
  children?: React.ReactNode;
  className?: string;
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
  '6축 점수': {
    ko: '번역 품질 6가지 관점: 몰입/감정/문화/일관/근거/화자투명',
    en: '6-axis translation quality: immersion/emotion/cultural/consistency/grounded/voice',
    ja: '翻訳品質6軸: 没入/感情/文化/一貫/根拠/話者透明',
    zh: '翻译质量6轴: 沉浸/情感/文化/一致/根据/话者透明',
  },
  'Voice Guard': {
    ko: '캐릭터 말투 위반을 자동 감지하는 검증 엔진',
    en: 'Validation engine that auto-detects character voice violations',
    ja: 'キャラクターの話し方違反を自動検出する検証エンジン',
    zh: '自动检测角色语气违规的验证引擎',
  },
  '품질 게이트': {
    ko: 'AI 생성 결과의 품질 기준 미달 시 자동 재시도 시스템',
    en: 'Auto-retry system when AI-generated quality falls below standards',
    ja: 'AI生成結果の品質基準未達成時の自動再試行システム',
    zh: 'AI生成结果质量不达标时的自动重试系统',
  },
  '평행우주': {
    ko: 'Git 브랜치 기반 IF 전개 — 다른 선택으로 대체 시나리오 탐험',
    en: 'Git branch-based IF exploration — alternative scenarios via different choices',
    ja: 'Gitブランチベースのif展開 — 異なる選択で代替シナリオを探索',
    zh: '基于Git分支的IF展开 — 通过不同选择探索替代场景',
  },
  'RAG': {
    ko: '검색 증강 생성 — 세계관·캐릭터·과거 원고를 AI에 자동 주입',
    en: 'Retrieval-Augmented Generation — auto-inject worldview/characters/past episodes into AI',
    ja: 'RAG — 世界観・キャラクター・過去原稿をAIに自動注入',
    zh: 'RAG — 世界观·角色·过往稿件自动注入AI',
  },
  'BYOK': {
    ko: 'Bring Your Own Key — 사용자 자체 API 키 연결 (Gemini/Claude/OpenAI 등)',
    en: 'Bring Your Own Key — connect your own API keys',
    ja: 'BYOK — 自分のAPIキーを接続',
    zh: 'BYOK — 连接自己的API密钥',
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

type Lang = 'ko' | 'en' | 'ja' | 'zh';

// ============================================================
// PART 2 — 컴포넌트
// ============================================================

export function TermTooltip({ term, children, className = '' }: TermTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const def = TERM_DEFINITIONS[term];

  // TODO: 추후 LangContext 훅 연결 — 현재는 KO 고정 (다국어 사전은 이미 보유).
  const lang: Lang = 'ko';
  const explanation = def ? def[lang] ?? def.ko : '';

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
          <strong className="block mb-1">{term}</strong>
          {explanation}
        </span>
      )}
    </span>
  );
}

export default TermTooltip;
