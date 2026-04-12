// ============================================================
// PART 1 — Story Bible Context Builder
// 망각 방지 동적 시스템 프롬프트 생성
// ============================================================

import type { Character, StoryConfig, EpisodeManuscript } from '@/lib/studio-types';
import { buildContinuityReport, type ContinuityReport } from './continuity-tracker';

// ============================================================
// PART 2 — 데이터 추출 헬퍼
// ============================================================

/** 원고에서 마지막 문단(3문장) 추출 — 꼬리물기용 */
function extractLastScene(content: string): string {
  if (!content) return '';
  const sentences = content.split(/(?<=[.!?。！？\n])\s*/).filter(s => s.trim().length > 5);
  return sentences.slice(-3).join(' ').trim().slice(0, 500);
}

/** 캐릭터 상태를 마크다운 텍스트로 변환 */
function formatCharacterStates(report: ContinuityReport): string {
  if (!report.episodes.length) return '';
  const latest = report.episodes[report.episodes.length - 1];
  const activeChars = latest.characters.filter(c => c.present);
  if (!activeChars.length) return '';

  return activeChars.map(c => {
    const states = c.stateFlags.length ? c.stateFlags.join(', ') : '정상';
    return `- ${c.name}: ${states}${c.dialogueCount > 0 ? ` (대사 ${c.dialogueCount}회)` : ''}`;
  }).join('\n');
}

/** 미해결 복선 중 상위 2개 추출 */
function formatOpenThreads(report: ContinuityReport): string {
  if (!report.episodes.length) return '';
  const allOpen: string[] = [];
  for (const ep of report.episodes) {
    for (const t of ep.openThreads) {
      if (!allOpen.includes(t)) allOpen.push(t);
    }
  }
  // 오래된 것 우선 (먼저 등장한 것)
  return allOpen.slice(0, 2).map((t, i) => `${i + 1}. ${t}`).join('\n');
}

// ============================================================
// PART 3 — Story Bible 프롬프트 생성
// ============================================================

export interface StoryBibleInput {
  config: StoryConfig;
  manuscripts: EpisodeManuscript[];
  currentEpisode: number;
  language: 'KO' | 'EN' | 'JP' | 'CN';
}

/**
 * 망각 방지 시스템 프롬프트(Story Bible)를 동적으로 생성.
 * useStudioAI에서 AI 호출 직전에 시스템 프롬프트에 주입.
 * 토큰 예산: ~800토큰 이내 (14B 4K 컨텍스트의 20%)
 */
export function buildStoryBible(input: StoryBibleInput): string {
  const { config, manuscripts, currentEpisode, language } = input;
  const isKO = language === 'KO';

  // 연속성 리포트 생성
  const report = buildContinuityReport(
    manuscripts,
    config.characters || [],
    currentEpisode,
    5, // 최근 5화 윈도우
  );

  // 직전 화 마지막 씬 추출
  const prevMs = manuscripts.find(m => m.episode === currentEpisode - 1);
  const lastScene = extractLastScene(prevMs?.content || '');

  // 현재 위치 (가장 최근 에피소드)
  const latestEp = report.episodes[report.episodes.length - 1];
  const currentLocation = latestEp?.location || '';

  // 캐릭터 상태
  const charStates = formatCharacterStates(report);

  // 미해결 복선
  const openThreads = formatOpenThreads(report);

  // 이전 회차 요약 (AI 요약 우선, 없으면 첫 2줄 fallback)
  const recentSummaries = manuscripts
    .filter(m => m.episode >= currentEpisode - 3 && m.episode < currentEpisode && m.content)
    .map(m => {
      const summary = m.summary
        || m.content.split(/\n/).filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 150);
      return `- ${m.episode}화: ${summary}`;
    })
    .join('\n');

  // 작가 수정 패턴 분석 (최근 corrections에서 스타일 힌트 추출)
  const allCorrections = manuscripts
    .filter(m => m.corrections && m.corrections.length > 0)
    .flatMap(m => m.corrections || [])
    .slice(-10); // 최근 10개

  let writerStyleHint = '';
  if (allCorrections.length >= 3) {
    const patterns: string[] = [];
    const rewriteCount = allCorrections.filter(c => c.action === 'rewrite').length;
    const compressCount = allCorrections.filter(c => c.action === 'compress').length;
    const expandCount = allCorrections.filter(c => c.action === 'expand').length;
    if (rewriteCount >= 2) patterns.push(isKO ? '문장 표현을 자주 다듬음' : 'Frequently polishes phrasing');
    if (compressCount >= 2) patterns.push(isKO ? '간결한 문체 선호' : 'Prefers concise style');
    if (expandCount >= 2) patterns.push(isKO ? '상세한 묘사 선호' : 'Prefers detailed description');
    if (patterns.length > 0) {
      writerStyleHint = (isKO ? '\n\n📝 작가 스타일 메모:\n' : '\n\n📝 Writer Style Notes:\n')
        + patterns.map(p => `- ${p}`).join('\n');
    }
  }

  // 프롬프트 조립 (800토큰 이내)
  const sections: string[] = [];

  // 헤더
  sections.push(isKO
    ? `# 작품 사전 (Story Bible) — ${config.title || '무제'}`
    : `# Story Bible — ${config.title || 'Untitled'}`);

  // 현재 장소 (P0)
  if (currentLocation) {
    sections.push(isKO
      ? `\n📍 현재 장소: ${currentLocation}\n(※ 명시적 이동 묘사 없이 장소를 바꾸지 마십시오.)`
      : `\n📍 Current Location: ${currentLocation}\n(※ Do not change location without explicit movement description.)`);
  }

  // 캐릭터 상태 (P0)
  if (charStates) {
    sections.push(isKO
      ? `\n👥 캐릭터 상태:\n${charStates}\n(※ 부상/상태가 있는 캐릭터의 행동 묘사에 반드시 반영하십시오.)`
      : `\n👥 Character States:\n${charStates}\n(※ Reflect injuries/states in character actions.)`);
  }

  // 이전 줄거리 (P0)
  if (recentSummaries) {
    sections.push(isKO
      ? `\n📜 이전 줄거리:\n${recentSummaries}`
      : `\n📜 Story So Far:\n${recentSummaries}`);
  }

  // 미해결 복선 (P1 — 소프트)
  if (openThreads) {
    sections.push(isKO
      ? `\n🧩 미해결 복선 (흐름에 맞으면 자연스럽게 언급):\n${openThreads}`
      : `\n🧩 Active Hooks (weave naturally if fitting):\n${openThreads}`);
  }

  // 직전 화 꼬리물기 (P0 — 최우선)
  if (lastScene) {
    sections.push(isKO
      ? `\n---\n🔥 직전 화 마지막 씬:\n"${lastScene}"\n\n위 장면에서 1초의 단절도 없이 바로 다음 행동/대사로 시작하십시오. 배경 설명이나 과거 회상으로 시작하지 마십시오.`
      : `\n---\n🔥 Last Scene (Episode ${currentEpisode - 1}):\n"${lastScene}"\n\nContinue IMMEDIATELY from this scene. No background exposition or flashbacks to start.`);
  }

  // 작가 스타일 메모 (수정 패턴 기반)
  if (writerStyleHint) {
    sections.push(writerStyleHint);
  }

  return sections.join('\n');
}
