// ============================================================
// PART 1 — Module Header
// ============================================================
//
// story-context.ts — 작품 누적 상태 → AI prompt-ready 텍스트.
//
// 사상: 검증과 생성 분리 해소.
//   Long-Arc / Symbol Index / Story Debugger / Reader Sim 검증 결과를
//   AI 채팅·생성 prompt 에 자동 주입 → AI 가 "현재 작품 상태" 인지하고 응답.
//
// 토큰 예산: 500자 cap (시스템 프롬프트 30% guard 정합).
// 우선순위: severity error > warning > info > 일반 정보.
//
// [C] 입력 누락 시 빈 string / 토큰 초과 시 LRU drop
// [G] 단일 패스 — 5 영역 통합 1회 빌드
// [K] 단일 책임 — 텍스트 빌드만, 호출/주입은 외부
// ============================================================

import type { Character, EpisodeManuscript, StoryConfig } from '@/lib/studio-types';
import type { AppLanguage } from '@/lib/studio-types';
import type { VerifierReport, ForeshadowMarker } from '@/lib/long-arc-verifier/types';
import type { CharacterVariableState } from '@/lib/story-debugger/types';

// ============================================================
// PART 2 — Input / Output Types
// ============================================================

export interface StoryContextSnapshot {
  /** 활성 episode id (config.episode 기준) */
  episodeId: number;
  /** Long-Arc 보고서 (있으면) — 위반 우선순위 사용 */
  longArcReport?: VerifierReport;
  /** 미회수 떡밥 marker (있으면) */
  foreshadowMarkers?: ForeshadowMarker[];
  /** 활성 시점 캐릭터 상태 (Story Debugger frame 또는 buildCharacterStateAt 결과) */
  characterStates?: CharacterVariableState[];
  /** 직전 화 텐션 점수 (있으면) */
  recentTension?: number;
  /** 작품 캐릭터 풀 (이름 / role 짧은 정보) */
  characters?: Character[];
}

export interface BuildOptions {
  /** 토큰 cap (자모자 단위) — 기본 500 */
  charCap?: number;
  /** 언어 (4종) */
  language: AppLanguage;
}

// ============================================================
// PART 3 — Section builders (우선순위 순)
// ============================================================

function buildEpisodeHeader(
  snapshot: StoryContextSnapshot,
  language: AppLanguage,
): string {
  const isKO = language === 'KO';
  return isKO
    ? `현재 화: EP${snapshot.episodeId}`
    : `Active episode: EP${snapshot.episodeId}`;
}

function buildErrorViolations(
  snapshot: StoryContextSnapshot,
  language: AppLanguage,
): string {
  const report = snapshot.longArcReport;
  if (!report) return '';
  const errors = report.prioritized.filter((v) => v.severity === 'error').slice(0, 3);
  if (errors.length === 0) return '';

  const isKO = language === 'KO';
  const langKey = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';
  const lines = errors.map((v) => {
    const ep = v.episodeId ? `EP${v.episodeId} ` : '';
    const msg = v.messages[langKey] ?? v.messages.ko;
    return `  - ${ep}${msg}`;
  });
  return (isKO ? '심각 위반:\n' : 'Critical violations:\n') + lines.join('\n');
}

function buildUnresolvedForeshadow(
  snapshot: StoryContextSnapshot,
  language: AppLanguage,
): string {
  const markers = snapshot.foreshadowMarkers;
  if (!markers || markers.length === 0) return '';
  const unresolved = markers.filter((m) => m.payoffEpisode === undefined).slice(0, 5);
  if (unresolved.length === 0) return '';

  const isKO = language === 'KO';
  const lines = unresolved.map((m) => {
    const gap = snapshot.episodeId - m.setupEpisode;
    return `  - [${m.id}] EP${m.setupEpisode} setup, ${gap}${isKO ? '화 경과' : ' eps passed'}`;
  });
  return (isKO ? '미회수 떡밥:\n' : 'Unresolved foreshadow:\n') + lines.join('\n');
}

function buildCharacterStates(
  snapshot: StoryContextSnapshot,
  language: AppLanguage,
): string {
  const states = snapshot.characterStates;
  if (!states || states.length === 0) return '';
  // 의미 있는 상태 (emotion / inventory / knowledge 중 하나라도) 만
  const meaningful = states
    .filter(
      (s) =>
        s.emotion ||
        (s.inventory && s.inventory.length > 0) ||
        (s.knowledge && s.knowledge.length > 0),
    )
    .slice(0, 5);
  if (meaningful.length === 0) return '';

  const isKO = language === 'KO';
  const lines = meaningful.map((s) => {
    const parts: string[] = [];
    if (s.emotion) parts.push(`${isKO ? '감정' : 'emotion'}=${s.emotion}`);
    if (s.inventory && s.inventory.length > 0) {
      parts.push(`${isKO ? '소지' : 'inv'}=${s.inventory.slice(0, 3).join(',')}`);
    }
    if (s.knowledge && s.knowledge.length > 0) {
      parts.push(`${isKO ? '지식' : 'know'}=${s.knowledge.slice(0, 2).join(',')}`);
    }
    return `  - ${s.characterName}: ${parts.join(' / ')}`;
  });
  return (isKO ? '캐릭터 상태:\n' : 'Character states:\n') + lines.join('\n');
}

function buildRecentTension(
  snapshot: StoryContextSnapshot,
  language: AppLanguage,
): string {
  const t = snapshot.recentTension;
  if (typeof t !== 'number') return '';
  const isKO = language === 'KO';
  return isKO
    ? `직전 화 텐션: ${t}/100`
    : `Recent tension: ${t}/100`;
}

function buildOverallScore(
  snapshot: StoryContextSnapshot,
  language: AppLanguage,
): string {
  const report = snapshot.longArcReport;
  if (!report) return '';
  const isKO = language === 'KO';
  return isKO
    ? `검증 종합: ${report.overallScore}/100 (위반 ${report.totalViolations}건)`
    : `Verifier overall: ${report.overallScore}/100 (${report.totalViolations} violations)`;
}

// ============================================================
// PART 4 — Public API: buildStoryContextModifier
// ============================================================

/**
 * 작품 누적 상태 → AI prompt 자동 주입 텍스트.
 * 토큰 cap 초과 시 우선순위 낮은 섹션부터 drop (LRU).
 */
export function buildStoryContextModifier(
  snapshot: StoryContextSnapshot | null | undefined,
  options: BuildOptions,
): string {
  if (!snapshot) return '';
  const cap = options.charCap ?? 500;
  const lang = options.language;

  // 우선순위 순 sections — error > foreshadow > character > tension > overall > header
  const sections = [
    buildErrorViolations(snapshot, lang),    // P0
    buildUnresolvedForeshadow(snapshot, lang), // P1
    buildCharacterStates(snapshot, lang),    // P2
    buildRecentTension(snapshot, lang),      // P3
    buildOverallScore(snapshot, lang),       // P4
    buildEpisodeHeader(snapshot, lang),      // P5 — 항상 포함
  ].filter((s) => s.length > 0);

  if (sections.length === 0) return '';

  // header 우선 + 나머지 우선순위 순으로 추가하되 cap 초과 시 drop
  const header = sections[sections.length - 1]; // header 가 마지막
  const rest = sections.slice(0, -1);

  const lines: string[] = [
    lang === 'KO' ? '[작품 맥락 — 자동 주입]' : '[Story Context — auto]',
    header,
  ];
  let used = lines.reduce((acc, l) => acc + l.length + 1, 0);

  for (const s of rest) {
    if (used + s.length + 1 > cap) break;
    lines.push(s);
    used += s.length + 1;
  }

  return lines.join('\n');
}

// ============================================================
// PART 5 — Snapshot collector helper
// ============================================================

import { extractAllForeshadowMarkers } from '@/lib/long-arc-verifier/foreshadow-tracker';
import { buildCharacterStateAt } from '@/lib/story-debugger/state-snapshot';

/**
 * StoryConfig + episodes → StoryContextSnapshot.
 * Long-Arc report 는 호출 측에서 별도 주입 (비동기 + 비싼 호출 회피).
 */
export function collectStoryContext(input: {
  config: StoryConfig | null | undefined;
  episodes: EpisodeManuscript[] | null | undefined;
  longArcReport?: VerifierReport;
  recentTension?: number;
}): StoryContextSnapshot | null {
  if (!input.config) return null;
  const epId = input.config.episode ?? 1;
  const eps = input.episodes ?? input.config.manuscripts ?? [];

  const foreshadowMarkers = extractAllForeshadowMarkers(eps);
  const characterStates = buildCharacterStateAt(input.config.characters, eps, epId);

  return {
    episodeId: epId,
    longArcReport: input.longArcReport,
    foreshadowMarkers,
    characterStates,
    recentTension: input.recentTension,
    characters: input.config.characters,
  };
}
