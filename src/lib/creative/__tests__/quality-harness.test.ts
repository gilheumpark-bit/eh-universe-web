// ============================================================
// quality-harness 테스트 — 장르별 차이·저장/로드 왕복·publish-audit 무파괴
// ============================================================

import {
  buildHarness,
  loadOrBuildHarness,
  markHarnessUsed,
  isHarnessMatch,
  harnessToAuditOptions,
  summarizeHarness,
  koreanGenreIdFromStoryGenre,
  gradeFromPrismMode,
  type HarnessInput,
  type QualityHarness,
} from '@/lib/creative/quality-harness';
import { runPublishAudit } from '@/lib/translation/publish-audit';

const HUNTER_INPUT: HarnessInput = { genre: 'hunter', grade: 'all', platform: 'MUNPIA' };
const ROMANTASY_INPUT: HarnessInput = { genre: 'romantasy', grade: 'adult19', platform: 'NONE' };

describe('buildHarness — 장르별 하네스 차이', () => {
  it('헌터물(fast)과 로판(slow)은 구조 가중·임계가 다르다', () => {
    const hunter = buildHarness(HUNTER_INPUT, 1000);
    const romantasy = buildHarness(ROMANTASY_INPUT, 1000);

    // id 매칭 키 차이
    expect(hunter.id).toBe('hunter_all_MUNPIA_v1');
    expect(romantasy.id).toBe('romantasy_adult19_NONE_v1');

    // 구조(긴 문장) 가중 — fast 1.5 > slow 0.75
    expect(hunter.weights.structure).toBe(1.5);
    expect(romantasy.weights.structure).toBe(0.75);

    // 리듬 평균 문장 길이 상한 — fast 50 < slow 80
    const avgLenOf = (h: QualityHarness) =>
      h.checks.find((c) => c.id === 'rhythm:max-avg-len')?.threshold;
    expect(avgLenOf(hunter)).toBe(50);
    expect(avgLenOf(romantasy)).toBe(80);

    // AI티 임계 — fast 30, slow 25
    const aiSigOf = (h: QualityHarness) =>
      h.checks.find((c) => c.id === 'ai-signature:max-score')?.threshold;
    expect(aiSigOf(hunter)).toBe(30);
    expect(aiSigOf(romantasy)).toBe(25);
  });

  it('등급 → IP 필터 강도, 플랫폼 → 맞춤법·미완 가중', () => {
    const hunter = buildHarness(HUNTER_INPUT, 1000); // all + 한국 플랫폼
    const romantasy = buildHarness(ROMANTASY_INPUT, 1000); // adult19 + NONE

    const ipOf = (h: QualityHarness) =>
      h.checks.find((c) => c.id === 'ip-filter:strength')?.threshold;
    expect(ipOf(hunter)).toBe(2); // 전체 등급 = 강
    expect(ipOf(romantasy)).toBe(0); // 19금 = 완화

    expect(hunter.weights.spelling).toBe(1.25); // MUNPIA = 한국 플랫폼 맞춤법 가중
    expect(hunter.weights.completeness).toBe(1.5); // 출고 대상 플랫폼
    expect(romantasy.weights.spelling).toBe(1);
    expect(romantasy.weights.completeness).toBe(1); // NONE
  });

  it('검증 셋 = 출판감사 6 + AI티 1 + 리듬 2 + IP 1 = 10종, 가중 전부 양수', () => {
    const h = buildHarness(HUNTER_INPUT, 1000);
    expect(h.checks).toHaveLength(10);
    expect(h.checks.every((c) => c.enabled)).toBe(true);
    expect(Object.values(h.weights).every((w) => Number.isFinite(w) && w > 0)).toBe(true);
  });

  it('이상 입력 방어 — 미지 장르/등급/빈 플랫폼은 generic/all/NONE 폴백', () => {
    const h = buildHarness(
      { genre: 'no-such' as never, grade: 'no-such' as never, platform: '' },
      1000,
    );
    expect(h.genre).toBe('generic');
    expect(h.grade).toBe('all');
    expect(h.platform).toBe('NONE');
  });
});

describe('저장/로드 왕복 — config.qualityHarness 재사용', () => {
  it('JSON 직렬화 왕복 후 같은 입력이면 그대로 load (reused: true)', () => {
    const built = buildHarness(HUNTER_INPUT, 1000);
    const revived = JSON.parse(JSON.stringify(built)) as QualityHarness; // setConfig 영속 모사
    const { harness, reused } = loadOrBuildHarness(revived, HUNTER_INPUT, 2000);
    expect(reused).toBe(true);
    expect(harness).toEqual(built); // load 는 변형 없음 (사용 기록은 markHarnessUsed 책임)
  });

  it('장르/등급/플랫폼이 바뀌면 재생성 (reused: false)', () => {
    const saved = buildHarness(HUNTER_INPUT, 1000);
    const { harness, reused } = loadOrBuildHarness(saved, ROMANTASY_INPUT, 2000);
    expect(reused).toBe(false);
    expect(harness.id).toBe('romantasy_adult19_NONE_v1');
    expect(harness.createdAt).toBe(2000);
  });

  it('저장본 없음(undefined/null) → 신규 생성', () => {
    expect(loadOrBuildHarness(undefined, HUNTER_INPUT, 3000).reused).toBe(false);
    expect(loadOrBuildHarness(null, HUNTER_INPUT, 3000).reused).toBe(false);
  });

  it('markHarnessUsed — useCount/lastUsedAt 불변 갱신, 원본 비변경', () => {
    const h = buildHarness(HUNTER_INPUT, 1000);
    const used = markHarnessUsed(h, 5000);
    expect(used.useCount).toBe(1);
    expect(used.lastUsedAt).toBe(5000);
    expect(h.useCount).toBe(0); // 원본 그대로
    expect(h.lastUsedAt).toBe(1000);
    // 재사용 매칭은 사용 기록과 무관하게 유지
    expect(isHarnessMatch(used, HUNTER_INPUT)).toBe(true);
  });
});

describe('입력 정규화 — StoryConfig → HarnessInput', () => {
  it('Genre enum 문자열 → KoreanGenreId 매핑 (미매핑은 generic)', () => {
    expect(koreanGenreIdFromStoryGenre('SYSTEM_HUNTER')).toBe('hunter');
    expect(koreanGenreIdFromStoryGenre('FANTASY_ROMANCE')).toBe('romantasy');
    expect(koreanGenreIdFromStoryGenre('WUXIA')).toBe('martial-arts');
    expect(koreanGenreIdFromStoryGenre('MODERN_FANTASY')).toBe('fantasy');
    expect(koreanGenreIdFromStoryGenre('THRILLER')).toBe('generic');
    expect(koreanGenreIdFromStoryGenre(undefined)).toBe('generic');
  });

  it('prismMode → 등급 (M18=adult19 / T15=teen15 / 그 외=all)', () => {
    expect(gradeFromPrismMode('M18')).toBe('adult19');
    expect(gradeFromPrismMode('T15')).toBe('teen15');
    expect(gradeFromPrismMode('ALL')).toBe('all');
    expect(gradeFromPrismMode('OFF')).toBe('all');
    expect(gradeFromPrismMode(undefined)).toBe('all');
  });
});

describe('harnessToAuditOptions + summarizeHarness', () => {
  it('활성 publish-audit 카테고리 6종 + weights 를 옵션으로 변환', () => {
    const h = buildHarness(HUNTER_INPUT, 1000);
    const opts = harnessToAuditOptions(h);
    expect(opts.enabledCategories).toEqual([
      'punctuation',
      'spacing',
      'spelling',
      'structure',
      'consistency',
      'completeness',
    ]);
    expect(opts.categoryWeights).toEqual(h.weights);
  });

  it('요약 1줄 — 장르·등급·플랫폼·검증 수 (ko/en)', () => {
    const s = summarizeHarness(buildHarness(HUNTER_INPUT, 1000));
    expect(s.ko).toBe('헌터물 · 전체 등급 · 문피아 — 검증 10종');
    expect(s.en).toBe('Hunter · All ages · Munpia — 10 checks');
  });
});

describe('runPublishAudit — 기존 호출 무파괴 + 하네스 옵션 적용', () => {
  // 검출 보장 텍스트: 쉼표 연속(high) + TODO(high) + 느낌표 3연속(medium)
  const TEXT = '문장이다,, 다음 문장!!! 그리고 TODO 남음.';

  it('옵션 미지정 = undefined 옵션 = 기존 결과와 완전 동일 (무파괴)', () => {
    const legacy = runPublishAudit(TEXT);
    const withUndefined = runPublishAudit(TEXT, undefined);
    expect(withUndefined).toEqual(legacy);
    expect(legacy.findings.length).toBeGreaterThan(0);
    expect(Number.isInteger(legacy.overallScore)).toBe(true);
  });

  it('빈 텍스트는 옵션과 무관하게 zero 리포트', () => {
    const opts = harnessToAuditOptions(buildHarness(HUNTER_INPUT, 1000));
    expect(runPublishAudit('', opts).findings).toEqual([]);
    expect(runPublishAudit('', opts).overallScore).toBe(0);
  });

  it('enabledCategories 필터 — 지정 카테고리만 남는다', () => {
    const r = runPublishAudit(TEXT, { enabledCategories: ['completeness'] });
    expect(r.findings.length).toBeGreaterThan(0);
    expect(r.findings.every((f) => f.category === 'completeness')).toBe(true);
  });

  it('enabledCategories 빈 배열 = 필터 없음 (전 검사 비활성 사고 방어)', () => {
    const r = runPublishAudit(TEXT, { enabledCategories: [] });
    expect(r).toEqual(runPublishAudit(TEXT));
  });

  it('categoryWeights — 가중 0이면 해당 카테고리 페널티 0 (검출 자체는 유지)', () => {
    const base = runPublishAudit(TEXT);
    const zeroed = runPublishAudit(TEXT, {
      categoryWeights: { punctuation: 0, completeness: 0 },
    });
    expect(zeroed.findings).toEqual(base.findings); // 검출 목록 동일
    expect(zeroed.overallScore).toBeGreaterThan(base.overallScore); // 페널티 감소
  });

  it('categoryWeights — 음수/NaN 은 1로 방어 (기존 점수 동일)', () => {
    const base = runPublishAudit(TEXT);
    const bad = runPublishAudit(TEXT, {
      categoryWeights: { punctuation: -5, completeness: Number.NaN },
    });
    expect(bad.overallScore).toBe(base.overallScore);
  });

  it('하네스 옵션 통합 경로 — 헌터물 하네스로 실행해도 stats 는 동일', () => {
    const opts = harnessToAuditOptions(buildHarness(HUNTER_INPUT, 1000));
    const r = runPublishAudit(TEXT, opts);
    expect(r.stats).toEqual(runPublishAudit(TEXT).stats);
    expect(r.overallScore).toBeGreaterThanOrEqual(0);
    expect(r.overallScore).toBeLessThanOrEqual(100);
  });
});
