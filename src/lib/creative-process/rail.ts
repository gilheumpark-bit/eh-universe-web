// ============================================================
// Creative Rail — dual-rail(IP/저작) 분류기 (Phase 1 토대 · 2026-06-25)
// ============================================================
//
// dual-rail 핵심 축: IP 레일(세계관~연출 = 소유·원천·AI공개, AI협업 정상) /
// 저작 레일(집필 산문 = 인간 직필 = 저작권 성립요건, 인간비율 프리미엄은 여기만).
// CreativeEvent.stage(+ translate 는 actorType)만으로 레일을 파생한다 —
// 신규 데이터·로깅 0. HCI·확인서·출고가 이 단일 헬퍼로 레일을 일관 소비한다(향후 배선).
//
// translate(번역) 분기 근거: 인간 번역가의 번역은 2차적저작물(저작권 성립) → authorship,
// 기계(AI)·시스템 번역은 저작 아님 → ip. (전수 스캔 cross-conflict §1 정합 — 기계번역을
// 저작 레일에 넣는 over-claim 차단.)
//
// [C] 순수 함수 — 결정론적, 데이터모델 변경 0
// [K] 단일 책임 — 레일 분류만 (types-only import → 순환참조 0)
// ============================================================

import type { CreativeActorType, CreativeEvent, CreativeStage } from './types';

/** 자산 레일 — IP(소유·원천) / 저작(인간 직필) / 미분류(legacy·publish 등). */
export type CreativeRail = 'ip' | 'authorship' | 'unclassified';

/** 분류 입력 — 전체 CreativeEvent 가 아니라 stage·actorType 만 필요(테스트·재사용 용이). */
export type RailClassifiable = Pick<CreativeEvent, 'stage' | 'actorType'>;

const IP_STAGES: ReadonlySet<CreativeStage> = new Set<CreativeStage>([
  'world',
  'character',
  'plot',
  'scene-sheet',
  'direction',
]);

const AUTHORSHIP_STAGES: ReadonlySet<CreativeStage> = new Set<CreativeStage>([
  'writing',
  'revision',
]);

/** 인간 저작 주체(저작권 성립 가능) — 작가 본인·외부 협업자. AI·시스템 제외. */
function isHumanAuthor(actorType: CreativeActorType): boolean {
  return actorType === 'human' || actorType === 'collaborator';
}

/**
 * 이벤트를 자산 레일로 분류 (단일 진실 원천).
 * - IP: world·character·plot·scene-sheet·direction (기획존 — AI협업 정상)
 * - 저작: writing·revision (산문 — 인간 직필이 프리미엄)
 * - translate: 인간 번역 → 저작(2차적저작물), AI·시스템 번역 → IP
 * - publish / stage 없음(legacy) / 미지: unclassified (어느 레일 메트릭도 오염 X)
 */
export function classifyRail(event: RailClassifiable): CreativeRail {
  const stage = event.stage;
  if (!stage) return 'unclassified';
  if (IP_STAGES.has(stage)) return 'ip';
  if (AUTHORSHIP_STAGES.has(stage)) return 'authorship';
  if (stage === 'translate') return isHumanAuthor(event.actorType) ? 'authorship' : 'ip';
  return 'unclassified'; // 'publish' 등 — 창작 자산 아님
}

/** 이벤트 배열을 레일별로 분할 (HCI·확인서 레일별 산출의 모집단 분리용). */
export function partitionEventsByRail<T extends RailClassifiable>(
  events: readonly T[],
): Record<CreativeRail, T[]> {
  const out: Record<CreativeRail, T[]> = { ip: [], authorship: [], unclassified: [] };
  for (const event of events) {
    out[classifyRail(event)].push(event);
  }
  return out;
}
