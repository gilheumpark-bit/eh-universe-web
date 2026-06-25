// ============================================================
// genre-matrix 단위 테스트
// 정상 / 빈입력 / null·undefined / 비표준 입력 / 경계(폴백) 커버
// ============================================================

import {
  GENRES,
  GENRE_PROFILES,
  getGenreProfile,
  activatePersonasForGenre,
  genreChecklist,
} from '../genre-matrix';

describe('GENRE_PROFILES', () => {
  it('15개 장르 전부 매핑 + 각 프로필 필드 무결성', () => {
    const ids = Object.values(GENRES);
    expect(ids).toHaveLength(15);
    for (const id of ids) {
      const p = GENRE_PROFILES[id];
      expect(p).toBeDefined();
      expect(p.id).toBe(id);
      expect(typeof p.label).toBe('string');
      expect(p.label.length).toBeGreaterThan(0);
      expect(['fast', 'mid', 'slow']).toContain(p.tempo);
      // 클리셰/훅 풀은 비어있지 않아야 집필 지침으로 유효
      expect(p.clichePool.length).toBeGreaterThan(0);
      expect(p.hookTypes.length).toBeGreaterThan(0);
    }
  });

  it('대표 장르의 템포가 시장 관습과 일치 (헌터=fast, 현대로맨스=slow, 무협=mid)', () => {
    expect(GENRE_PROFILES[GENRES.HUNTER].tempo).toBe('fast');
    expect(GENRE_PROFILES[GENRES.ROMANCE].tempo).toBe('slow');
    expect(GENRE_PROFILES[GENRES.MARTIAL_ARTS].tempo).toBe('mid');
  });
});

describe('getGenreProfile', () => {
  it('정상: enum 값으로 정확한 프로필 반환', () => {
    expect(getGenreProfile(GENRES.HUNTER).label).toBe('헌터물');
    expect(getGenreProfile(GENRES.XIANXIA).label).toBe('선협');
  });

  it('정상: 문자열 슬러그/대소문자/공백 흡수', () => {
    expect(getGenreProfile('hunter').id).toBe(GENRES.HUNTER);
    expect(getGenreProfile('  HUNTER  ').id).toBe(GENRES.HUNTER);
    expect(getGenreProfile('Romance-Fantasy').id).toBe(GENRES.ROMANCE_FANTASY);
  });

  it('이상값/빈입력/null: 알 수 없는 id → GENERAL 폴백', () => {
    expect(getGenreProfile('isekai-mecha').id).toBe(GENRES.GENERAL);
    expect(getGenreProfile('').id).toBe(GENRES.GENERAL);
    expect(getGenreProfile(null).id).toBe(GENRES.GENERAL);
    expect(getGenreProfile(undefined).id).toBe(GENRES.GENERAL);
    expect(getGenreProfile(42).id).toBe(GENRES.GENERAL);
  });
});

describe('activatePersonasForGenre', () => {
  it('정상: 장르별 페르소나 + 보편 페르소나(casual-reader) 포함', () => {
    const hunter = activatePersonasForGenre(GENRES.HUNTER);
    expect(hunter).toContain('power-fantasy-fan');
    expect(hunter).toContain('casual-reader');
    // 보편 페르소나는 중복 없이 정확히 1회
    expect(hunter.filter((p) => p === 'casual-reader')).toHaveLength(1);
  });

  it('정상: 반환 배열에 중복 키 없음', () => {
    const personas = activatePersonasForGenre(GENRES.GAME_FANTASY);
    expect(new Set(personas).size).toBe(personas.length);
  });

  it('이상값/null: 알 수 없는 id → GENERAL 페르소나 폴백 (casual-reader 포함)', () => {
    const fallback = activatePersonasForGenre('nonexistent');
    expect(fallback).toEqual(activatePersonasForGenre(GENRES.GENERAL));
    expect(fallback).toContain('casual-reader');
    expect(activatePersonasForGenre(null)).toContain('casual-reader');
  });
});

describe('genreChecklist', () => {
  it('정상: 장르 고유 체크 + 보편 체크가 함께 포함', () => {
    const list = genreChecklist(GENRES.REGRESSION);
    expect(list.length).toBeGreaterThanOrEqual(3);
    // 장르 고유 항목
    expect(list.some((c) => c.includes('회귀'))).toBe(true);
    // 보편 항목(클리프행어)
    expect(list.some((c) => c.includes('클리프행어'))).toBe(true);
  });

  it('정상: 체크리스트에 중복 항목 없음', () => {
    const list = genreChecklist(GENRES.ACADEMY);
    expect(new Set(list).size).toBe(list.length);
  });

  it('이상값/빈입력: 알 수 없는 id / 빈 문자열 → GENERAL 체크리스트 폴백', () => {
    const general = genreChecklist(GENRES.GENERAL);
    expect(genreChecklist('???')).toEqual(general);
    expect(genreChecklist('')).toEqual(general);
    expect(genreChecklist(undefined)).toEqual(general);
  });
});
