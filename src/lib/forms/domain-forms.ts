// ============================================================
// 도메인 폼 스키마 — 각 탭(캐릭터·씬시트·연출·구성)의 양식 정의
// claude 창작 양식 흡수: Character DNA · SceneSheet 8영역 · Storyboard · 구성 3계층.
// 세계관(world)은 worldgraph WorldFact(별도·더 정교)라 여기 미포함.
// 격리: studio-types import 0 (구조적 정의).
// ============================================================

import { temperatureLabel, type SceneTemperature } from '@/lib/creative/scene-temperature';
import { BEAT_BANK } from '@/lib/creative/beat-bank';

export type FieldKind = 'text' | 'textarea' | 'list';

// scene-temperature(04 AI 온도 씬시트) 흡수 — 온도 옵션 가이드를 라이브러리에서 생성
const TEMPS: SceneTemperature[] = ['cold', 'cool', 'warm', 'hot', 'blazing'];
const TEMP_GUIDE = TEMPS.map((t) => temperatureLabel(t, 'ko')).join('/');
// beat-bank(04 긴장도 macro) 흡수 — 표준 비트 시퀀스 가이드
const BEAT_GUIDE = Object.values(BEAT_BANK).map((b) => b.label).join('→');

export interface FormField {
  key: string;
  label: string;
  kind: FieldKind;
  /** 작가 학습용 짧은 설명·예시 (Blocker #5 — 작가가 desire/ghost가 뭔지 모름) */
  hint?: string;
}

export interface DomainForm {
  id: string;
  label: string;
  fields: FormField[];
}

// ============================================================
// PART 1 — 도메인 폼 레지스트리 (창작 양식 근거)
// ============================================================

export const DOMAIN_FORMS: Record<string, DomainForm> = {
  // 캐릭터: _template_character.md (3-tier DNA · Truby · voice)
  character: {
    id: 'character',
    label: '캐릭터',
    fields: [
      { key: 'name', label: '이름', kind: 'text' },
      { key: 'role', label: '역할 (주연/조연/적대)', kind: 'text' },
      { key: 'tier', label: 'Tier (T0~T5 · 양식 깊이)', kind: 'text' },
      { key: 'desire', label: 'desire (욕망 · Tier1)', kind: 'textarea', hint: '캐릭터가 의식적으로 원하는 외적 목표. 보여지는 동기. 예: "복수", "왕좌", "잃은 누이 찾기".' },
      { key: 'ghost', label: 'ghost (과거 상처/결핍 · Tier1)', kind: 'textarea', hint: 'desire를 만든 과거 사건/트라우마. 직접 말하지 말고 행동·말투에 묻혀 노출. 예: "어릴 때 누이가 흡혈마에게 살해당함".' },
      { key: 'weakness', label: 'weakness (약점 · Tier1)', kind: 'textarea', hint: 'desire 추구를 방해하는 내적 결함. 변화의 시작점. 예: "분노 통제 불능", "타인을 믿지 못함".' },
      { key: 'need', label: 'need (진짜 필요 · Tier2)', kind: 'textarea', hint: 'desire 뒤에 숨은 진짜 필요. 작품 끝에서 얻거나 잃는 것. 예: "복수가 아니라 용서가 필요했다".' },
      { key: 'values', label: 'values (가치관 목록 · Tier2)', kind: 'list', hint: '캐릭터가 절대 양보 못 하는 신념들. 갈등의 축. 예: "약자 보호", "거짓말 금기".' },
      { key: 'arc', label: 'arc (변화 궤적 · Tier2)', kind: 'textarea', hint: '시작 상태 → 중간 위기 → 결말 변화. need를 얻거나 거부하거나. 예: "분노→자제→자기 용서".' },
      { key: 'voiceFingerprint', label: 'voice DNA (말투 시그니처 · 자동변환 금지 · Tier2)', kind: 'textarea', hint: '이 캐릭터만의 말투/어휘/리듬. AI가 흉내 못 내는 시그니처. 예: "단답형 + 군대식 경어 + 비속어 회피".' },
      { key: 'relationships', label: 'relationships (관계망 · Tier3)', kind: 'list', hint: '다른 캐릭터와의 관계. "이름: 역할/감정". 예: "이서연: 동료, 미묘한 호감".' },
      { key: 'signaturePhrases', label: 'signature phrases (입버릇 · Tier3)', kind: 'list', hint: '자주 쓰는 짧은 말. 정체성 식별자. 예: "글쎄.", "끝내주마.".' },
    ],
  },
  // 씬시트: _씬시트_표준_양식.md 8영역
  scene: {
    id: 'scene',
    label: '씬시트',
    fields: [
      { key: 'episode', label: '에피소드', kind: 'text', hint: '몇 화인지. 예: "12화", "1권 3장".' },
      { key: 'chapterType', label: '회차 성격 (전투/협상/대치/각성/일상…)', kind: 'text', hint: '이번 화의 지배 모드. 한 단어로. 예: "전투", "각성".' },
      { key: 'aiTemperature', label: `AI 온도 (${TEMP_GUIDE})`, kind: 'text', hint: 'cold=정보 중심, cool=객관, warm=감정 균형, hot=고조, blazing=절정 폭발.' },
      { key: 'emotionCurve', label: '감정 곡선 (기→상승→위기→절정→해소)', kind: 'textarea', hint: '회차 내 감정 흐름. 5단계로 짧게. 예: "기: 평온 → 상승: 위협 등장 → ..."' },
      { key: 'rewardLoop', label: '리워드 (고구마/사이다/카타르시스)', kind: 'textarea', hint: '독자에게 줄 보상. 고구마(답답) → 사이다(해소)→ 카타르시스(폭발) 순서나 비율.' },
      { key: 'hook', label: '훅 (절단신공 · 마지막 3문장)', kind: 'textarea', hint: '회차 끝의 다음화 유도 문장. 강한 떡밥·반전·위협 등. 마지막 3문장이 다음 결제를 만든다.' },
      { key: 'infoGate', label: '정보 게이트 (필요 숫자/날짜/풀네임만)', kind: 'textarea', hint: '독자에게 노출할 정보의 양과 시기. 너무 많으면 정보 과부하, 적으면 혼란. 화별 1~3 정보 권장.' },
    ],
  },
  // 연출: Storyboard (컷 풀)
  direction: {
    id: 'direction',
    label: '연출',
    fields: [
      { key: 'shots', label: '컷 구성 (컷별 액션)', kind: 'textarea' },
      { key: 'camera', label: '카메라 무빙', kind: 'text' },
      { key: 'lighting', label: '조명', kind: 'text' },
      { key: 'color', label: '색감 (컬러스크립트)', kind: 'text' },
      { key: 'imagePrompt', label: '이미지 프롬프트 (영문 core)', kind: 'textarea' },
    ],
  },
  // 구성: 작품/아크/화 3계층
  structure: {
    id: 'structure',
    label: '구성',
    fields: [
      { key: 'logline', label: '작품 로그라인', kind: 'textarea' },
      { key: 'arc', label: '아크 구조 (메인 스토리)', kind: 'textarea' },
      { key: 'episodeBeats', label: `화 비트 (${BEAT_GUIDE})`, kind: 'textarea' },
    ],
  },
  // 번역: claude2 dual-pipeline(faithful/market) + 플랫폼 어댑터(novelpia/kakaopage/munpia/joara)
  translate: {
    id: 'translate',
    label: '번역',
    fields: [
      { key: 'sourceLang', label: '원문 언어 (ko/en/ja/zh)', kind: 'text' },
      { key: 'targetLang', label: '번역 언어 (ko/en/ja/zh)', kind: 'text' },
      { key: 'track', label: '트랙 (faithful=원문보존 / market=시장친화)', kind: 'text' },
      { key: 'platform', label: '출고 플랫폼 (novelpia/kakaopage/munpia/joara)', kind: 'text' },
      { key: 'glossary', label: '용어집·호칭 메모 (화자→청자 관계)', kind: 'textarea' },
      { key: 'sourceText', label: '원문 (세그먼트 단위)', kind: 'textarea' },
    ],
  },
};

/** TabId → domainId (world/write/revision/export 는 도메인 폼 미사용 → null) */
export function tabToDomain(tabId: string): string | null {
  return DOMAIN_FORMS[tabId] ? tabId : null;
}

export function getDomainForm(domainId: string): DomainForm | null {
  return DOMAIN_FORMS[domainId] ?? null;
}
