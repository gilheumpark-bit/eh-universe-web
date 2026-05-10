// ============================================================
// PART 1 — Module Header
// ============================================================
//
// korean-genre-matrix.ts — 한국 웹소설 장르별 클리셰·어휘·구조 매트릭스.
//
// 시장 분석 4차 §3 §4 §5 핵심 요구:
//   "장르별 클리셰 이해 / 한국식 회차 리듬 / 빠른 전개 구조"
//
// Market track 전용. Stage 4 cultural immersion 시 prompt 영역에 주입.
// Faithful track 은 원본 그대로 보존이 우선이므로 이 매트릭스 미사용.
//
// 8 장르:
//   - hunter        헌터물 (게이트·각성·등급·던전)
//   - regression    회귀물 (회귀·전생·미래 정보)
//   - romantasy     로판 (빙의·악녀·황녀·공작)
//   - romance       로맨스 (재벌·키차이·서브남)
//   - fantasy       판타지 (마법·검사·마탑)
//   - sf            SF (디스토피아·우주·AI)
//   - martial-arts  무협 (정파·사파·무공·의형제)
//   - generic       일반 (기본값)
//
// [C] 정적 lookup table — runtime 비용 0
// [G] 단일 책임 — 매트릭스 lookup 만, prompt 조립은 buildPrompt
// [K] LLM hint 형식으로 출력 — Stage 4 prompt 통합 시 그대로 삽입
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export type KoreanGenreId =
  | 'hunter'
  | 'regression'
  | 'romantasy'
  | 'romance'
  | 'fantasy'
  | 'sf'
  | 'martial-arts'
  | 'generic';

export interface KoreanGenreProfile {
  id: KoreanGenreId;
  /** 4언어 라벨 */
  label: { ko: string; en: string; ja: string; zh: string };
  /** 핵심 클리셰 (LLM hint) */
  cliches: string[];
  /** 빈출 어휘 (한국어) */
  vocabulary: string[];
  /** 회차 리듬 권장 */
  pacingHint: string;
  /** 회차 끝 hook 패턴 */
  cliffhangerPatterns: string[];
}

// ============================================================
// PART 3 — 매트릭스
// ============================================================

const MATRIX: Record<KoreanGenreId, KoreanGenreProfile> = {
  hunter: {
    id: 'hunter',
    label: { ko: '헌터물', en: 'Hunter', ja: 'ハンター物', zh: '猎人' },
    cliches: [
      'Gates appear in modern cities, monsters spawn from them',
      'Awakening — main character gains supernatural powers',
      'Hunter rank system: F / E / D / C / B / A / S (S being the highest)',
      'Dungeon clearing parties (4-6 members typical)',
      'Mana / aura / status window (game-like progression)',
      'Guild politics, ranked associations',
      'Dual-wielding swords, magic, or both',
    ],
    vocabulary: [
      '게이트', '각성자', '헌터', '던전', '몬스터', '보스', '마정석', '아티팩트',
      '길드', '협회', '파티', '레이드', 'S급', '랭커', '스킬', '스탯',
    ],
    pacingHint:
      'Fast scene transitions. Action-heavy with quick dialogue. Power escalation per chapter.',
    cliffhangerPatterns: [
      'Boss appearance / boss attack',
      'Skill awakening',
      'Status window message',
      'Ranking announcement',
    ],
  },
  regression: {
    id: 'regression',
    label: { ko: '회귀물', en: 'Regression', ja: '回帰物', zh: '回归' },
    cliches: [
      'Main character dies and returns to past with full memory',
      '"This time, I will not fail" inner monologue',
      'Future knowledge exploitation (stocks, events, enemies)',
      'Pre-emptive strikes against future villains',
      'Family / loved ones saved this time',
      'Tutorial-like first chapter recap',
    ],
    vocabulary: [
      '회귀', '전생', '재시작', '두 번째 삶', '미래의 기억', '복수', '예지',
    ],
    pacingHint: 'Each chapter ends with a successful "knowledge advantage" payoff.',
    cliffhangerPatterns: [
      'Future knowledge revelation',
      'Enemy appearance from "before"',
      'Successful prevention of past tragedy',
    ],
  },
  romantasy: {
    id: 'romantasy',
    label: { ko: '로판', en: 'Romantasy', ja: 'ロマンファンタジー', zh: '罗曼幻想' },
    cliches: [
      'Possession / reincarnation into a novel as a side or villain character',
      'Imperial court / aristocracy setting',
      'Cold-faced male lead (duke / prince / archduke)',
      'Tea time / ball / debutante scenes',
      '"악역 영애" / villainess survival theme',
      'Prophecy / curse / hidden bloodline reveal',
    ],
    vocabulary: [
      '빙의', '환생', '영애', '공작', '황녀', '황태자', '마법사', '저주',
      '예언', '디저트', '드레스', '무도회',
    ],
    pacingHint:
      'Slower romantic tension build-up. Internal monologue heavy. Detailed setting description allowed.',
    cliffhangerPatterns: [
      'Male lead unexpected behavior',
      'Court intrigue revelation',
      'Past life flashback',
    ],
  },
  romance: {
    id: 'romance',
    label: { ko: '로맨스', en: 'Romance', ja: 'ロマンス', zh: '罗曼史' },
    cliches: [
      'Office romance / chaebol (재벌) heir',
      'Height difference banter',
      'Second male lead (서브남) syndrome',
      'Misunderstanding driven plot',
      'Skinship escalation per chapter',
    ],
    vocabulary: ['재벌', '실장님', '본부장', '서브남', '키차이', '눈물', '자상한'],
    pacingHint: 'Dialogue-driven. Emotional beats per chapter. Intimacy escalates gradually.',
    cliffhangerPatterns: [
      'Confession',
      'Misunderstanding',
      'Rival appearance',
    ],
  },
  fantasy: {
    id: 'fantasy',
    label: { ko: '판타지', en: 'Fantasy', ja: 'ファンタジー', zh: '奇幻' },
    cliches: [
      'Mage tower / sword saint hierarchy',
      'Elemental / divine magic systems',
      'Demon king / hero cycle',
      'Adventurer guild quest structure',
    ],
    vocabulary: ['마탑', '검성', '용병', '모험가', '마왕', '용사', '용족', '엘프'],
    pacingHint: 'World-building can breathe. Action set pieces per arc.',
    cliffhangerPatterns: ['Boss reveal', 'Power awakening', 'Prophecy fulfillment'],
  },
  sf: {
    id: 'sf',
    label: { ko: 'SF', en: 'SF', ja: 'SF', zh: '科幻' },
    cliches: [
      'Post-apocalyptic / dystopia',
      'AI companion / hostile AI',
      'Space colonization',
      'Cybernetic enhancements',
    ],
    vocabulary: ['디스토피아', '아포칼립스', 'AI', '사이보그', '안드로이드', '우주선'],
    pacingHint: 'Tech exposition balanced with character moments. Concept-driven hooks.',
    cliffhangerPatterns: ['System anomaly', 'AI betrayal', 'Discovery'],
  },
  'martial-arts': {
    id: 'martial-arts',
    label: { ko: '무협', en: 'Martial Arts', ja: '武侠', zh: '武侠' },
    cliches: [
      'Orthodox vs unorthodox sects (정파 / 사파)',
      'Sworn brotherhood (의형제)',
      'Hidden martial techniques (비전무공)',
      'Tournaments / sect wars',
      'Master-disciple bonds',
    ],
    vocabulary: ['정파', '사파', '무공', '내공', '경공', '의형제', '비전', '문파'],
    pacingHint: 'Action choreography detailed. Honor / hierarchy heavy dialogue.',
    cliffhangerPatterns: ['Technique reveal', 'Sect betrayal', 'Master appearance'],
  },
  generic: {
    id: 'generic',
    label: { ko: '일반', en: 'Generic', ja: '一般', zh: '一般' },
    cliches: [],
    vocabulary: [],
    pacingHint: 'Match source pacing. No specific genre conventions applied.',
    cliffhangerPatterns: [],
  },
};

// ============================================================
// PART 4 — exports
// ============================================================

export function getKoreanGenreProfile(id: KoreanGenreId): KoreanGenreProfile {
  return MATRIX[id] ?? MATRIX.generic;
}

export function listKoreanGenres(): KoreanGenreProfile[] {
  return Object.values(MATRIX);
}

/**
 * 장르 → buildPrompt Stage 4 (market) 의 cultural immersion hint 생성.
 *
 * 출력 예 (LLM 이 Stage 4 prompt 의 [Genre Hints] 섹션에 받음):
 *   [Genre Hints — Market track, 헌터물]:
 *   Cliches: Gates / Awakening / S-rank ...
 *   Vocabulary: 게이트, 각성자, 헌터, ...
 *   Pacing: Fast scene transitions ...
 *   Cliffhangers: Boss appearance / Skill awakening ...
 */
export function buildGenreHint(id: KoreanGenreId, _lang: 'ko' | 'en' = 'en'): string {
  const profile = getKoreanGenreProfile(id);
  if (id === 'generic') return '';
  const labelKo = profile.label.ko;
  const labelEn = profile.label.en;
  return `[Genre Hints — Market track, ${labelEn} (${labelKo})]
Cliches the target market expects:
${profile.cliches.map((c) => `  - ${c}`).join('\n')}
Vocabulary (Korean web novel native terms):
  ${profile.vocabulary.join(', ')}
Pacing: ${profile.pacingHint}
Chapter-end hook patterns:
${profile.cliffhangerPatterns.map((c) => `  - ${c}`).join('\n')}
`;
}
