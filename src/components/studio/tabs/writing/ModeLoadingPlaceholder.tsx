"use client";

// ============================================================
// PART 1 — ModeLoadingPlaceholder: 고급 모드 dynamic 로드 스켈레톤
// ============================================================
//
// M2.2 Day 9-10: Canvas / Refine / Advanced 를 dynamic import 로 분리.
// 로딩 동안 레이아웃 점프 없이 자연스러운 전환을 위해 스켈레톤 + 레이블을 노출.
//
// 역할:
//   - 모드별 아이콘/문구 4언어
//   - aria-live=polite 로 스크린리더 공지
//   - 최소 높이 유지 (레이아웃 점프 방지)
//
// [C] `mode` 는 타입 리터럴 유니언 — 신규 모드 추가 시 컴파일러가 누락 감지.
// [K] 단일 파일로 모드별 분기 — 3개 스켈레톤 파일 만들 필요 없음.
// ============================================================

import React from 'react';
import { Layers, Wand2, Settings2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 2 — Props
// ============================================================

export interface ModeLoadingPlaceholderProps {
  language: AppLanguage;
  mode: 'canvas' | 'refine' | 'advanced';
}

// ============================================================
// PART 3 — 모드별 레이블
// ============================================================

function getModeLabels(language: AppLanguage, mode: ModeLoadingPlaceholderProps['mode']): {
  title: string;
  hint: string;
} {
  switch (mode) {
    case 'canvas':
      return {
        title: L4(language, {
          ko: '3단계 캔버스 로딩 중...',
          en: 'Loading 3-Step Canvas...',
          ja: '3ステップキャンバス読込中...',
          zh: '正在加载 3 步骤画布...',
        }),
        hint: L4(language, {
          ko: '뼈대 → 초안 → 다듬기',
          en: 'Skeleton → Draft → Polish',
          ja: '骨組み → 下書き → 仕上げ',
          zh: '骨架 → 草稿 → 润色',
        }),
      };
    case 'refine':
      return {
        title: L4(language, {
          ko: '다듬기 엔진 로딩 중...',
          en: 'Loading Refine Engine...',
          ja: 'リファインエンジン読込中...',
          zh: '正在加载润色引擎...',
        }),
        hint: L4(language, {
          ko: '기존 원고를 30% 다듬습니다',
          en: 'Polish existing draft by 30%',
          ja: '既存原稿を30%仕上げます',
          zh: '将现有稿件润色 30%',
        }),
      };
    case 'advanced':
      return {
        title: L4(language, {
          ko: '고급 설정 로딩 중...',
          en: 'Loading Advanced Settings...',
          ja: '高度設定読込中...',
          zh: '正在加载高级设置...',
        }),
        hint: L4(language, {
          ko: 'temperature / top-p / 페널티',
          en: 'temperature / top-p / penalties',
          ja: 'temperature / top-p / ペナルティ',
          zh: 'temperature / top-p / 惩罚',
        }),
      };
    default: {
      // [C] exhaustive check
      const _exhaustive: never = mode;
      return { title: String(_exhaustive), hint: '' };
    }
  }
}

// ============================================================
// PART 4 — 컴포넌트
// ============================================================

export function ModeLoadingPlaceholder({ language, mode }: ModeLoadingPlaceholderProps): React.ReactElement {
  const { title, hint } = getModeLabels(language, mode);
  const Icon = mode === 'canvas' ? Layers : mode === 'refine' ? Wand2 : Settings2;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid={`mode-loading-${mode}`}
      className="flex flex-col items-center justify-center gap-3 min-h-[240px] px-4 py-10 rounded-2xl border border-dashed border-border/60 bg-bg-secondary/30 animate-in fade-in duration-300"
    >
      <Icon className="w-8 h-8 text-text-tertiary/60 animate-pulse" aria-hidden="true" />
      <div className="text-sm font-bold text-text-secondary">{title}</div>
      <div className="text-[11px] text-text-tertiary">{hint}</div>
      {/* [K] 스켈레톤 블록 3개 — 실제 컨텐츠 높이와 유사 */}
      <div className="w-full max-w-md mt-2 space-y-2">
        <div className="h-4 rounded bg-bg-tertiary/60 animate-pulse" />
        <div className="h-4 rounded bg-bg-tertiary/60 animate-pulse w-5/6" />
        <div className="h-4 rounded bg-bg-tertiary/60 animate-pulse w-4/6" />
      </div>
    </div>
  );
}

export default ModeLoadingPlaceholder;
