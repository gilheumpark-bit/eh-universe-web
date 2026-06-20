// ============================================================
// reader-persona-16 단위 테스트
// 정상 / 빈입력 / 경계 / 이상값 / 결정론 커버
// ============================================================

import {
  PERSONAS_16,
  evalPersonaReaction,
  panelReaction,
  type Persona16,
} from '../reader-persona-16';

// 테스트용 본문 (다양한 표면 신호)
const DIALOGUE_HEAVY = '"가자!" 그가 외쳤다. "어디로?" "북쪽으로." 짧은 대화가 오갔다.';
const TELL_HEAVY =
  '그는 슬펐다. 그녀는 기뻤다. 나는 두려웠다. 모두 불안했다. 그는 화가 났다. 그녀는 행복했다.';
const LONG_NARRATION =
  '끝없이 펼쳐진 황무지 위로 잿빛 구름이 낮게 드리워졌고 바람은 마른 풀잎을 스치며 메마른 소리를 냈으며 멀리 지평선에는 폐허가 된 성채의 윤곽이 흐릿하게 떠올라 있었고 그 사이로 한 줄기 길이 구불구불 이어져 어딘가로 향하고 있었다.';

describe('PERSONAS_16 매트릭스', () => {
  it('정확히 16개 페르소나 (4 연령 × 2 성별 × 2 성향)', () => {
    expect(PERSONAS_16).toHaveLength(16);
  });

  it('모든 id가 고유 + tolerance가 0~1 범위', () => {
    const ids = new Set(PERSONAS_16.map((p) => p.id));
    expect(ids.size).toBe(16);
    for (const p of PERSONAS_16) {
      expect(p.tolerance).toBeGreaterThanOrEqual(0);
      expect(p.tolerance).toBeLessThanOrEqual(1);
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.preference.length).toBeGreaterThan(0);
    }
  });

  it('결정론: 두 번 참조해도 동일한 매트릭스 (frozen)', () => {
    expect(Object.isFrozen(PERSONAS_16)).toBe(true);
    // deep 성향이 fast 성향보다 평균 인내가 높다 (휴리스틱 일관성)
    const fast = PERSONAS_16.filter((p) => p.id.endsWith('-fast'));
    const deep = PERSONAS_16.filter((p) => p.id.endsWith('-deep'));
    const avg = (xs: Persona16[]) => xs.reduce((s, p) => s + p.tolerance, 0) / xs.length;
    expect(avg(deep)).toBeGreaterThan(avg(fast));
  });
});

describe('evalPersonaReaction', () => {
  const sample = PERSONAS_16[0];

  it('빈입력: 빈 문자열 → 중립 몰입, 이탈 위험 없음', () => {
    const r = evalPersonaReaction('', sample);
    expect(r.engagement).toBeGreaterThanOrEqual(0);
    expect(r.engagement).toBeLessThanOrEqual(100);
    expect(r.dropoutRisk).toBe(false);
  });

  it('이상값: persona 누락(null/undefined) → 중립 반응, 크래시 없음', () => {
    // @ts-expect-error 의도적 null
    const r1 = evalPersonaReaction(DIALOGUE_HEAVY, null);
    // @ts-expect-error 의도적 undefined
    const r2 = evalPersonaReaction(DIALOGUE_HEAVY, undefined);
    expect(r1.dropoutRisk).toBe(false);
    expect(r2.dropoutRisk).toBe(false);
  });

  it('이상값: text가 null/비문자열 → 빈 본문 취급, 안전', () => {
    // @ts-expect-error 의도적 null
    const r = evalPersonaReaction(null, sample);
    expect(r.engagement).toBeGreaterThanOrEqual(0);
    expect(r.engagement).toBeLessThanOrEqual(100);
  });

  it('정상: engagement는 항상 0~100 경계 안', () => {
    for (const text of [DIALOGUE_HEAVY, TELL_HEAVY, LONG_NARRATION]) {
      for (const p of PERSONAS_16) {
        const r = evalPersonaReaction(text, p);
        expect(r.engagement).toBeGreaterThanOrEqual(0);
        expect(r.engagement).toBeLessThanOrEqual(100);
      }
    }
  });

  it('휴리스틱: tell 폭주 본문은 인내 낮은 fast 독자의 몰입을 떨어뜨린다', () => {
    // 가장 인내 낮은 페르소나 (teen-male-fast 근처) 선택
    const lowTol = [...PERSONAS_16].sort((a, b) => a.tolerance - b.tolerance)[0];
    const tellR = evalPersonaReaction(TELL_HEAVY, lowTol);
    const dialogueR = evalPersonaReaction(DIALOGUE_HEAVY, lowTol);
    expect(dialogueR.engagement).toBeGreaterThan(tellR.engagement);
  });

  it('휴리스틱: 긴 서술은 인내 높은 deep 독자가 fast 독자보다 잘 견딘다', () => {
    const highTol = [...PERSONAS_16].sort((a, b) => b.tolerance - a.tolerance)[0];
    const lowTol = [...PERSONAS_16].sort((a, b) => a.tolerance - b.tolerance)[0];
    const high = evalPersonaReaction(LONG_NARRATION, highTol);
    const low = evalPersonaReaction(LONG_NARRATION, lowTol);
    expect(high.engagement).toBeGreaterThanOrEqual(low.engagement);
  });
});

describe('panelReaction', () => {
  it('빈입력: 빈 문자열 → 이탈 0, 평균 0~100', () => {
    const p = panelReaction('');
    expect(p.dropoutCount).toBe(0);
    expect(p.avgEngagement).toBeGreaterThanOrEqual(0);
    expect(p.avgEngagement).toBeLessThanOrEqual(100);
  });

  it('정상: 16 전수 집계 — dropoutCount 0~16, avg 0~100', () => {
    for (const text of [DIALOGUE_HEAVY, TELL_HEAVY, LONG_NARRATION]) {
      const p = panelReaction(text);
      expect(p.dropoutCount).toBeGreaterThanOrEqual(0);
      expect(p.dropoutCount).toBeLessThanOrEqual(16);
      expect(p.avgEngagement).toBeGreaterThanOrEqual(0);
      expect(p.avgEngagement).toBeLessThanOrEqual(100);
    }
  });

  it('결정론: 동일 입력 → 동일 출력 (반복 호출 안정)', () => {
    const a = panelReaction(LONG_NARRATION);
    const b = panelReaction(LONG_NARRATION);
    expect(a).toEqual(b);
  });

  it('휴리스틱: 대사 위주 본문이 tell 폭주 본문보다 평균 몰입이 높다', () => {
    const dialogue = panelReaction(DIALOGUE_HEAVY);
    const tell = panelReaction(TELL_HEAVY);
    expect(dialogue.avgEngagement).toBeGreaterThan(tell.avgEngagement);
  });
});
