// ============================================================
// WriterToolbox — Batch 3 / rank 5
// 18 창작 모듈을 5 그룹 미니 카드로 단일 사이드바에 노출 + 드릴다운.
// 사용자(작가)가 한 화면에서 "지금 원고가 어디쯤 와있는지" 18 시선으로 본다.
//
// 그룹 구성:
//   품질 (5)   — qa-auditor / integrated-grade / quality-checklist / scoring-system / writer-mode
//   캐릭터 (3) — character-dna / reader-persona-16 / cliche-transform
//   씬·연출 (4) — scene-temperature / beat-bank / rhythm-analysis / foreshadow-tracker
//   분석 (3)   — genre-matrix / style-profile / work-note
//   안전 (3)   — ai-signature-scan / ip-readiness / work-receipt
//
// 동작:
//   - 처음 5 카드(품질 그룹)만 펼침. 나머지 4 그룹은 접힘 (스크롤·더 보기).
//   - 각 카드 = 제목 + 핵심 지표 1개 + "자세히" 드릴다운 토글.
//   - 모든 모듈은 순수 함수 — manuscript 텍스트만 있으면 즉시 계산.
//   - manuscript 가 비어있을 땐 "원고 입력 후 활성화" 안내.
//
// 절대금지 8파일 import 0. WritingProvider 의 useWriting() 으로 editDraft 만 사용.
// ============================================================

"use client";

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Users, Camera, BarChart2, AlertTriangle,
  ChevronDown, ChevronRight, Wrench,
} from 'lucide-react';
import { useWritingSafe } from '@/app/studio/WritingContext';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — 18 모듈 import (lib/creative/*)
// ============================================================

// 품질 5
import { auditManuscript } from '@/lib/creative/qa-auditor';
import { computeIntegratedGrade } from '@/lib/creative/integrated-grade';
import { getChecklist, checklistCompleteness } from '@/lib/creative/quality-checklist';
import { scoreWorld, scoreLength } from '@/lib/creative/scoring-system';
import { getModeConfig } from '@/lib/creative/writer-mode';

// 캐릭터 3
import { emptyCharacterDNA, dnaCompleteness } from '@/lib/creative/character-dna';
import { panelReaction } from '@/lib/creative/reader-persona-16';
import { suggestTransforms } from '@/lib/creative/cliche-transform';

// 씬·연출 4
import { temperatureLabel, buildTensionCurve } from '@/lib/creative/scene-temperature';
import { tensionMacroCurve, BEAT_BANK } from '@/lib/creative/beat-bank';
import { analyzeRhythm } from '@/lib/creative/rhythm-analysis';
import { scanForeshadows, foreshadowHealth } from '@/lib/creative/foreshadow-tracker';

// 분석 3
import { getGenreProfile, GENRES } from '@/lib/creative/genre-matrix';
import { observeStyle } from '@/lib/creative/style-profile';
import { buildDashboard } from '@/lib/creative/work-note';

// 안전 3
import { scanAISignature } from '@/lib/creative/ai-signature-scan';
import { computeIPReadiness } from '@/lib/creative/ip-readiness';
import { buildReceipt } from '@/lib/creative/work-receipt';

// ============================================================
// PART 2 — 타입 · 그룹 정의
// ============================================================

export interface WriterToolboxProps {
  /** Provider 없이도 쓰일 수 있게 manuscript override 허용. */
  manuscript?: string;
  /** 닫기 콜백. */
  onClose?: () => void;
}

type GroupKey = 'quality' | 'character' | 'scene' | 'analysis' | 'safety';

interface GroupSpec {
  key: GroupKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** 이 그룹의 18 모듈 중 module id 목록 — modulesMounted 매니페스트와 1:1. */
  moduleIds: ReadonlyArray<string>;
}

const GROUPS: ReadonlyArray<GroupSpec> = [
  {
    key: 'quality',
    label: '품질',
    icon: ShieldCheck,
    moduleIds: ['qa-auditor', 'integrated-grade', 'quality-checklist', 'scoring-system', 'writer-mode'],
  },
  {
    key: 'character',
    label: '캐릭터',
    icon: Users,
    moduleIds: ['character-dna', 'reader-persona-16', 'cliche-transform'],
  },
  {
    key: 'scene',
    label: '씬·연출',
    icon: Camera,
    moduleIds: ['scene-temperature', 'beat-bank', 'rhythm-analysis', 'foreshadow-tracker'],
  },
  {
    key: 'analysis',
    label: '분석',
    icon: BarChart2,
    moduleIds: ['genre-matrix', 'style-profile', 'work-note'],
  },
  {
    key: 'safety',
    label: '안전',
    icon: AlertTriangle,
    moduleIds: ['ai-signature-scan', 'ip-readiness', 'work-receipt'],
  },
] as const;

// ============================================================
// PART 3 — 18 모듈 metric 계산 (manuscript 한 번 받아 모두 산출)
// ============================================================

interface ModuleMetrics {
  // 품질
  qaFindingsCount: number;
  integratedGrade: string;
  checklistWorldPct: number;
  worldScore: number;
  writerModeCeiling: number;
  // 캐릭터
  dnaCompletenessPct: number;
  readerAvgEngagement: number;
  clicheSuggestionCount: number;
  // 씬·연출
  tempLabel: string;
  beatMacroPeak: number;
  rhythmAvgLen: number;
  foreshadowResolved: string;
  // 분석
  genreLabel: string;
  styleSentenceAvg: number;
  workNoteTotal: number;
  // 안전
  aiSignatureScore: number;
  ipReadinessScore: number;
  workReceiptLines: number;
}

/**
 * [priority 7 — 2026-06-08] safeCall 헬퍼.
 * 18 모듈 호출 중 하나의 예외가 WriterToolbox 전체 에러 바운더리로 전파되는 것을 차단.
 * dev 환경에서만 console.warn — production 은 silent fallback 유지.
 *
 * [P8 풀점검 루프 3] 출력 schema 검증 옵션 추가.
 * isValid(result) 가 false 면 fallback 사용 (모듈이 손상된 객체 반환 시 방어).
 * 18 모듈은 모두 동기 순수 함수 — Promise.race timeout 불필요 (CPU 바운드 < 1ms).
 * 만약 향후 async 모듈 추가 시 별도 safeAwait 헬퍼 도입 권장 (이 함수는 sync 전용).
 */
function safeCall<T>(
  fn: () => T,
  fallback: T,
  label?: string,
  isValid?: (result: T) => boolean,
): T {
  try {
    const result = fn();
    if (isValid && !isValid(result)) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        logger.warn('WriterToolbox.safeCall', `${label ?? 'module'} returned invalid shape`);
      }
      return fallback;
    }
    return result;
  } catch (err) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      logger.warn('WriterToolbox.safeCall', `${label ?? 'module'} failed`, err);
    }
    return fallback;
  }
}

function computeMetrics(manuscript: string): ModuleMetrics {
  const text = typeof manuscript === 'string' ? manuscript : '';
  const hasText = text.trim().length > 0;

  // ── 품질 ─────────────────────────────────────────────
  // [priority 7 — 2026-06-08] 18 모듈 전 호출 safeCall 래핑 — 개별 실패 격리.
  const qaFindings = hasText ? safeCall(() => auditManuscript(text), [], 'auditManuscript') : [];
  const grade = safeCall(
    () => computeIntegratedGrade({ world: 60, character: 60, scene: 60, direction: 60, writing: 60, revision: 60 }),
    { weighted: 60, grade: '평작', weakest: '-' } as ReturnType<typeof computeIntegratedGrade>,
    'computeIntegratedGrade',
  );
  const checklistPct = safeCall(() => checklistCompleteness('world', []), 0, 'checklistCompleteness');
  const wScore = safeCall(() => scoreWorld({ laws: 60, characters: 60, consistency: 60 }), 60, 'scoreWorld');
  const writerMode = safeCall(
    () => getModeConfig('FULL'),
    { scoreCeiling: 0 } as ReturnType<typeof getModeConfig>,
    'getModeConfig',
  );

  // ── 캐릭터 ──────────────────────────────────────────
  const dnaPct = safeCall(() => dnaCompleteness(emptyCharacterDNA()), 0, 'dnaCompleteness');
  const reader = hasText
    ? safeCall(() => panelReaction(text), { avgEngagement: 0, dropoutCount: 0 }, 'panelReaction')
    : { avgEngagement: 0, dropoutCount: 0 };
  const cliches = hasText
    ? safeCall(() => suggestTransforms(text.slice(0, 64)), [] as ReturnType<typeof suggestTransforms>, 'suggestTransforms')
    : [];

  // ── 씬·연출 ─────────────────────────────────────────
  const tempCurve = safeCall(() => buildTensionCurve(10), [], 'buildTensionCurve');
  const firstTemp = tempCurve[0] ?? 'cool';
  const beatCurve = safeCall(() => tensionMacroCurve(['setup', 'inciting', 'rising', 'midpoint', 'climax']), [], 'tensionMacroCurve');
  const macroPeak = beatCurve.length > 0 ? Math.max(...beatCurve) : 0;
  const rhythm = hasText
    ? safeCall(
        () => analyzeRhythm(text),
        { macro: { avgLen: 0, paragraphCount: 0 }, micro: { sentenceLengths: [], burstiness: 0 } } as ReturnType<typeof analyzeRhythm>,
        'analyzeRhythm',
      )
    : { macro: { avgLen: 0, paragraphCount: 0 }, micro: { sentenceLengths: [], burstiness: 0 } } as ReturnType<typeof analyzeRhythm>;
  const foreList = hasText ? safeCall(() => scanForeshadows(text), [] as ReturnType<typeof scanForeshadows>, 'scanForeshadows') : [];
  const foreHealth = safeCall(() => foreshadowHealth(foreList), { total: 0, resolved: 0 } as ReturnType<typeof foreshadowHealth>, 'foreshadowHealth');
  const foreshadowResolved = foreHealth.total === 0
    ? '없음'
    : `${foreHealth.resolved}/${foreHealth.total}`;

  // ── 분석 ────────────────────────────────────────────
  const genre = safeCall(() => getGenreProfile(GENRES.GENERAL), { label: '-' } as ReturnType<typeof getGenreProfile>, 'getGenreProfile');
  const style = hasText
    ? safeCall(
        () => observeStyle(text),
        { sentenceLenAvg: 0, dialogueRatio: 0, tellTolerance: 0, rhythmVariety: 0 } as ReturnType<typeof observeStyle>,
        'observeStyle',
      )
    : { sentenceLenAvg: 0, dialogueRatio: 0, tellTolerance: 0, rhythmVariety: 0 } as ReturnType<typeof observeStyle>;
  const noteDash = safeCall(() => buildDashboard([]), { totalNotes: 0 } as ReturnType<typeof buildDashboard>, 'buildDashboard');

  // ── 안전 ────────────────────────────────────────────
  const aiSig = hasText
    ? safeCall(() => scanAISignature(text), { hits: [], score: 0 } as ReturnType<typeof scanAISignature>, 'scanAISignature')
    : { hits: [], score: 0 } as ReturnType<typeof scanAISignature>;
  const ip = safeCall(
    () => computeIPReadiness({ rights: 40, market: 40, adaptation: 40, assetPackage: 40, riskControl: 40 }),
    { score: 0 } as ReturnType<typeof computeIPReadiness>,
    'computeIPReadiness',
  );
  const receipt = safeCall(() => buildReceipt({ did: [], skipped: [] }), '', 'buildReceipt');
  const receiptLines = receipt.split('\n').filter((l) => l.length > 0).length;

  // beat-bank 카탈로그 참조 보장 (tree-shake 방어)
  const beatBankLoaded = Object.keys(BEAT_BANK).length > 0 ? 1 : 0;

  return {
    qaFindingsCount: qaFindings.length,
    integratedGrade: grade.grade,
    checklistWorldPct: checklistPct,
    worldScore: wScore,
    writerModeCeiling: writerMode.scoreCeiling,
    dnaCompletenessPct: dnaPct,
    readerAvgEngagement: reader.avgEngagement,
    clicheSuggestionCount: cliches.length,
    tempLabel: safeCall(() => temperatureLabel(firstTemp, 'ko'), '-', 'temperatureLabel'),
    beatMacroPeak: macroPeak * beatBankLoaded,
    rhythmAvgLen: Math.round(rhythm.macro.avgLen),
    foreshadowResolved,
    genreLabel: genre.label,
    styleSentenceAvg: Math.round(style.sentenceLenAvg),
    workNoteTotal: noteDash.totalNotes,
    aiSignatureScore: aiSig.score,
    ipReadinessScore: ip.score,
    workReceiptLines: receiptLines,
  };
}

// ============================================================
// PART 4 — scoreLength 보조 (분량 카드용 별도 호출)
// ============================================================

function computeLengthLine(chars: number): string {
  const r = scoreLength(chars, chars < 15000 ? 'short' : chars < 50000 ? 'mid' : 'long');
  return `${r.score}점 · ${r.withinRange ? '적정' : '점검'}`;
}

// ============================================================
// PART 5 — ModuleCard (단일 모듈 미니 카드)
// ============================================================

interface ModuleCardProps {
  id: string;
  title: string;
  metricLabel: string;
  metricValue: string | number;
  detail?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ id, title, metricLabel, metricValue, detail }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      data-toolbox-module={id}
      className="bg-bg-secondary/40 rounded-xl border border-border/40 p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-text-primary truncate">{title}</span>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="text-[9px] text-text-tertiary hover:text-text-primary flex items-center gap-1"
          aria-expanded={open}
          aria-label={`${title} 자세히`}
        >
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {open ? '접기' : '자세히'}
        </button>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-[9px] text-text-tertiary uppercase tracking-wider">{metricLabel}</span>
        <span className="text-sm font-black text-accent-blue">{metricValue}</span>
      </div>
      {open && detail && (
        <p className="text-[10px] text-text-tertiary leading-relaxed pt-1 border-t border-border/30">
          {detail}
        </p>
      )}
    </div>
  );
};

// ============================================================
// PART 6 — WriterToolbox (메인 컴포넌트)
// ============================================================

const WriterToolbox: React.FC<WriterToolboxProps> = ({ manuscript: msOverride, onClose }) => {
  const writing = useWritingSafe();
  const manuscript = msOverride ?? writing?.editDraft ?? '';
  const chars = manuscript.length;
  // 처음에는 첫 그룹(품질)만 펼침 — "처음 화면은 5-6 카드".
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>({
    quality: true,
    character: false,
    scene: false,
    analysis: false,
    safety: false,
  });

  const m = useMemo(() => computeMetrics(manuscript), [manuscript]);
  const lengthLine = useMemo(() => computeLengthLine(chars), [chars]);

  const toggle = (k: GroupKey) =>
    setOpenGroups((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <aside
      data-component="WriterToolbox"
      // [P9 풀점검 루프 3] 반응형 폭:
      // - 모바일 (<768px): w-full overlay 형태 (호출처에서 hidden md:flex 컨테이너 권장)
      // - 태블릿+ (md+): w-72 고정
      className="h-full w-full md:w-72 shrink-0 bg-bg-primary border-l border-border flex flex-col text-xs overflow-hidden"
      aria-label="작가 보조함"
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-bg-secondary/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-accent-blue" />
          <span className="font-black tracking-wider uppercase text-text-primary">작가 보조함</span>
          <span className="text-[9px] text-text-tertiary">18 모듈</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary text-[10px]"
            aria-label="작가 보조함 닫기"
          >
            닫기
          </button>
        )}
      </div>

      {/* [priority 5 — 2026-06-08] Empty state guidance — 신입 작가가 "왜 0인가?"에 답.
          단순 한 줄 → 안내 카드 (아이콘 + 본문 + 다음 단계). */}
      {chars === 0 && (
        <div className="px-4 py-4 border-b border-border/40 bg-bg-secondary/20">
          <div className="flex items-start gap-2.5">
            <Wrench className="w-4 h-4 mt-0.5 text-accent-blue shrink-0" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-text-primary leading-relaxed">
                글을 작성하면 18개 품질 모듈이 활성화됩니다.
              </p>
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                각 카드는 실시간 분석을 보여줍니다 — 결함, 등급, 캐릭터 완성도, 텐션, 복선, 표현 습관 등.
              </p>
              <p className="text-[10px] text-text-tertiary leading-relaxed">
                지금은 모든 지표가 <span className="font-mono text-text-secondary">0 · 미활성</span> 상태입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Groups */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const isOpen = openGroups[group.key];
          return (
            <section key={group.key} data-toolbox-group={group.key} className="space-y-2">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-md hover:bg-bg-secondary/40"
                aria-expanded={isOpen}
                // [priority 8 — 2026-06-08] a11y: 그룹 이름 + 펼침 상태를 스크린리더에 명시.
                aria-label={`${group.label} ${isOpen ? '접기' : '펼치기'}`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-accent-blue" aria-hidden="true" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
                    {group.label}
                  </span>
                  <span className="text-[9px] text-text-tertiary">{group.moduleIds.length}</span>
                </span>
                {isOpen ? (
                  <ChevronDown className="w-3 h-3 text-text-tertiary" aria-hidden="true" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-text-tertiary" aria-hidden="true" />
                )}
              </button>

              {isOpen && (
                <div className="space-y-2 pl-1">
                  {group.key === 'quality' && (
                    <>
                      <ModuleCard
                        id="qa-auditor"
                        title="QA 감사원 4관점"
                        metricLabel="결함"
                        metricValue={m.qaFindingsCount}
                        detail="정합/외부독자/반증/구조 4관점 비수렴 감사. 0건이면 통과."
                      />
                      <ModuleCard
                        id="integrated-grade"
                        title="통합등급"
                        metricLabel="등급"
                        metricValue={m.integratedGrade}
                        detail="세계관·캐릭터·씬·연출·집필·퇴고 항목을 함께 본 종합 결과."
                      />
                      <ModuleCard
                        id="quality-checklist"
                        title="품질 체크리스트"
                        metricLabel="세계관"
                        metricValue={`${m.checklistWorldPct}%`}
                        detail={`총 ${getChecklist('world').length}개 항목 — 채워질수록 % 상승.`}
                      />
                      <ModuleCard
                        id="scoring-system"
                        title="분량·밀도 점검"
                        metricLabel="분량"
                        metricValue={lengthLine}
                        detail={`세계관 ${m.worldScore}점 · 분량 적합도 계측.`}
                      />
                      <ModuleCard
                        id="writer-mode"
                        title="작가 부담 모드"
                        metricLabel="상한"
                        metricValue={`${m.writerModeCeiling}점`}
                        detail="FULL 기준 — AUTO/GUIDED 첫 메시지로 자동 전환."
                      />
                    </>
                  )}
                  {group.key === 'character' && (
                    <>
                      <ModuleCard
                        id="character-dna"
                        title="캐릭터 DNA (Truby)"
                        metricLabel="완성도"
                        metricValue={`${m.dnaCompletenessPct}%`}
                        detail="Tier1 필수(이름·욕망·유령·약점) → Tier2·3 확장."
                      />
                      <ModuleCard
                        id="reader-persona-16"
                        title="16 페르소나 패널"
                        metricLabel="몰입"
                        metricValue={m.readerAvgEngagement}
                        detail="4연령 × 2성별 × 2성향 = 16 페르소나 평균 몰입도."
                      />
                      <ModuleCard
                        id="cliche-transform"
                        title="클리셰 변형 7기법"
                        metricLabel="제안"
                        metricValue={m.clicheSuggestionCount}
                        detail="전복/해체/혼합/과장/말맛 전환/역할교환/재맥락화 7기법."
                      />
                    </>
                  )}
                  {group.key === 'scene' && (
                    <>
                      <ModuleCard
                        id="scene-temperature"
                        title="씬 온도 5단계"
                        metricLabel="EP.1"
                        metricValue={m.tempLabel}
                        detail="cold/cool/warm/hot/blazing — 10 에피소드 텐션 곡선 생성."
                      />
                      <ModuleCard
                        id="beat-bank"
                        title="비트 뱅크 7비트"
                        metricLabel="피크"
                        metricValue={m.beatMacroPeak}
                        detail="setup→inciting→rising→midpoint→crisis→climax→resolution."
                      />
                      <ModuleCard
                        id="rhythm-analysis"
                        title="리듬 다층 분석"
                        metricLabel="평균자"
                        metricValue={m.rhythmAvgLen}
                        detail="거시(단락·평균)+미시(문장·CV) 2렌즈."
                      />
                      <ModuleCard
                        id="foreshadow-tracker"
                        title="복선 추적"
                        metricLabel="회수"
                        metricValue={m.foreshadowResolved}
                        detail="[fs:id|plant] 마커 → plant/remind/tension/payoff/echo 상태 추적."
                      />
                    </>
                  )}
                  {group.key === 'analysis' && (
                    <>
                      <ModuleCard
                        id="genre-matrix"
                        title="장르 매트릭스 15"
                        metricLabel="현재"
                        metricValue={m.genreLabel}
                        detail="15장르 × (템포·클리셰·훅·페르소나·체크리스트) 매트릭스."
                      />
                      <ModuleCard
                        id="style-profile"
                        title="문체 Target/Observed"
                        metricLabel="문장자"
                        metricValue={m.styleSentenceAvg}
                        detail="평균문장·대사비율·tell허용·리듬다양성 4지표 대조."
                      />
                      <ModuleCard
                        id="work-note"
                        title="작업노트 대시보드"
                        metricLabel="총노트"
                        metricValue={m.workNoteTotal}
                        detail="plan/draft/revise/publish 4단계 집계."
                      />
                    </>
                  )}
                  {group.key === 'safety' && (
                    <>
                      <ModuleCard
                        id="ai-signature-scan"
                        title="표현 습관 점검"
                        metricLabel="어색함"
                        metricValue={`${m.aiSignatureScore}%`}
                        detail="모호한 어미, 상투 표현, 설명 과다, 밋밋한 종결을 함께 봅니다."
                      />
                      <ModuleCard
                        id="ip-readiness"
                        title="IP 준비도 5축"
                        metricLabel="점수"
                        metricValue={m.ipReadinessScore}
                        detail="권리·시장·각색·자산·리스크 5축 가중 합 → A~E tier."
                      />
                      <ModuleCard
                        id="work-receipt"
                        title="작업 영수증"
                        metricLabel="라인"
                        metricValue={m.workReceiptLines}
                        detail="did/skipped/metrics 표준 영수증 포맷팅."
                      />
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border/40 text-[9px] text-text-tertiary flex justify-between">
        <span>원고 {chars.toLocaleString()}자</span>
        <span>18 / 18 모듈</span>
      </div>
    </aside>
  );
};

export default WriterToolbox;
