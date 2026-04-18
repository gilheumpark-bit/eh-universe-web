// ============================================================
// PART 1 — Imports & shared setup
// ============================================================

import {
  serializeWorldBible,
  inferRegisterFromProfile,
  mergeGlossaries,
  buildProjectTranslationContext,
  loadLocalGlossary,
  saveLocalGlossary,
  type TranslationGlossaryEntry,
} from '../project-bridge';

beforeEach(() => {
  // [C] localStorage clean — 각 테스트가 독립적으로 작동
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  jest.restoreAllMocks();
});

// ============================================================
// PART 2 — serializeWorldBible
// ============================================================

describe('serializeWorldBible', () => {
  it('null/undefined → 빈 문자열', () => {
    expect(serializeWorldBible(null)).toBe('');
    expect(serializeWorldBible(undefined)).toBe('');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(serializeWorldBible('')).toBe('');
  });

  it('string 입력 → 그대로 반환 (maxChars 제한)', () => {
    const text = 'a'.repeat(5000);
    const result = serializeWorldBible(text, 100);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result).toBe('a'.repeat(100));
  });

  it('객체 입력(StoryConfig) → markdown 헤더 평탄화', () => {
    const wb = {
      corePremise: 'A premise',
      powerStructure: 'Hierarchy',
    };
    const result = serializeWorldBible(wb);
    expect(result).toContain('## corePremise');
    expect(result).toContain('A premise');
    expect(result).toContain('## powerStructure');
  });

  it('일반 객체 + 배열 값 → "- " 리스트화', () => {
    const wb = {
      factions: ['A', 'B', 'C'],
    };
    const result = serializeWorldBible(wb);
    expect(result).toContain('## factions');
    expect(result).toContain('- A');
    expect(result).toContain('- B');
    expect(result).toContain('- C');
  });

  it('숫자/객체 값은 무시 (string/array만 채택)', () => {
    const wb = { count: 42, raw: { nested: 'val' } };
    const result = serializeWorldBible(wb);
    // count는 number라 stringified가 안 됨
    expect(result).not.toContain('## count');
  });
});

// ============================================================
// PART 3 — inferRegisterFromProfile
// ============================================================

describe('inferRegisterFromProfile', () => {
  it('null/undefined → undefined', () => {
    expect(inferRegisterFromProfile(null)).toBeUndefined();
    expect(inferRegisterFromProfile(undefined)).toBeUndefined();
  });

  it('비객체 입력 → undefined', () => {
    expect(inferRegisterFromProfile('string')).toBeUndefined();
    expect(inferRegisterFromProfile(42)).toBeUndefined();
  });

  it('한국어 키워드 "반말" → casual tone', () => {
    const reg = inferRegisterFromProfile({ speechStyle: '반말 위주, 친근함' });
    expect(reg?.tone).toBe('casual');
  });

  it('한국어 키워드 "존댓말" → formal tone', () => {
    const reg = inferRegisterFromProfile({ speechStyle: '존댓말로 정중하게' });
    expect(reg?.tone).toBe('formal');
  });

  it('영어 키워드 rough → rough tone', () => {
    const reg = inferRegisterFromProfile({ personality: 'rough and aggressive' });
    expect(reg?.tone).toBe('rough');
  });

  it('영어 키워드 polite → polite tone', () => {
    const reg = inferRegisterFromProfile({ traits: 'polite and well-mannered' });
    expect(reg?.tone).toBe('polite');
  });

  it('힌트 필드 없음 → tone undefined', () => {
    const reg = inferRegisterFromProfile({ name: 'X' });
    expect(reg?.tone).toBeUndefined();
  });

  it('age/role 필드 매핑', () => {
    const reg = inferRegisterFromProfile({ age: 25, role: 'soldier' });
    expect(reg?.age).toBe('25');
    expect(reg?.role).toBe('soldier');
  });

  it('socialProfile 우선 (직접 필드보다 우선)', () => {
    const reg = inferRegisterFromProfile({
      age: 25,
      role: 'foo',
      socialProfile: { ageRegister: 'adult', professionRegister: 'soldier' },
    });
    expect(reg?.age).toBe('adult');
    expect(reg?.role).toBe('soldier');
  });

  it('speechExample 200자 절단', () => {
    const longSpeech = 'a'.repeat(500);
    const reg = inferRegisterFromProfile({ speechExample: longSpeech });
    expect(reg?.speechHint?.length).toBeLessThanOrEqual(200);
  });
});

// ============================================================
// PART 4 — mergeGlossaries
// ============================================================

describe('mergeGlossaries', () => {
  it('빈 입력 → 빈 배열', () => {
    expect(mergeGlossaries([], [])).toEqual([]);
  });

  it('source 키 기준 dedup — 프로젝트 우선', () => {
    const local = [{ source: 'A', target: 'localA', locked: false }];
    const project = [{ source: 'A', target: 'projectA', locked: true }];
    const merged = mergeGlossaries(local, project);
    expect(merged).toHaveLength(1);
    expect(merged[0].target).toBe('projectA');
  });

  it('프로젝트 locked 기본값 true', () => {
    const project = [{ source: 'X', category: 'character' }];
    const merged = mergeGlossaries([], project);
    expect(merged[0].locked).toBe(true);
  });

  it('로컬 locked 기본값 false', () => {
    const local = [{ source: 'Y' }];
    const merged = mergeGlossaries(local, []);
    expect(merged[0].locked).toBe(false);
  });

  it('빈 source 항목 제외', () => {
    const local = [{ source: '   ', target: 'foo' }];
    const project = [{ source: '', target: 'bar' }];
    const merged = mergeGlossaries(local, project);
    expect(merged).toHaveLength(0);
  });

  it('카테고리는 프로젝트 값 우선 (general 기본)', () => {
    const project = [{ source: 'P', target: 'p', category: 'place' }];
    const merged = mergeGlossaries([], project);
    expect(merged[0].category).toBe('place');
  });
});

// ============================================================
// PART 5 — buildProjectTranslationContext
// ============================================================

describe('buildProjectTranslationContext', () => {
  it('null/undefined 입력 → null', () => {
    expect(buildProjectTranslationContext(null)).toBeNull();
    expect(buildProjectTranslationContext(undefined)).toBeNull();
  });

  it('비객체 입력 → null', () => {
    expect(buildProjectTranslationContext('string')).toBeNull();
    expect(buildProjectTranslationContext(42)).toBeNull();
  });

  it('projectId 없음 → null', () => {
    const project = { config: { title: 'foo' } };
    expect(buildProjectTranslationContext(project)).toBeNull();
  });

  it('id가 있으면 projectId 채워짐', () => {
    const project = { id: 'p1', config: { title: 'Test' } };
    const ctx = buildProjectTranslationContext(project);
    expect(ctx?.projectId).toBe('p1');
  });

  it('projectId fallback (id → projectId)', () => {
    const project = { projectId: 'p2', config: { title: 'Test' } };
    const ctx = buildProjectTranslationContext(project);
    expect(ctx?.projectId).toBe('p2');
  });

  it('characters 배열 → TranslationCharacter로 매핑 (inferRegister 호출)', () => {
    const project = {
      id: 'p1',
      config: {
        title: 'X',
        characters: [
          { name: 'Alice', aliases: ['A'], speechStyle: '반말 친근' },
          { name: 'Bob', personality: 'formal 정중한' },
        ],
      },
    };
    const ctx = buildProjectTranslationContext(project);
    expect(ctx?.characters).toHaveLength(2);
    expect(ctx?.characters[0].name).toBe('Alice');
    expect(ctx?.characters[0].register?.tone).toBe('casual');
    expect(ctx?.characters[1].register?.tone).toBe('formal');
  });

  it('이름 없는 캐릭터 필터링', () => {
    const project = {
      id: 'p1',
      config: { characters: [{ name: '' }, { name: 'Valid' }] },
    };
    const ctx = buildProjectTranslationContext(project);
    expect(ctx?.characters).toHaveLength(1);
    expect(ctx?.characters[0].name).toBe('Valid');
  });

  it('recentEpisodes — currentEpisodeNo cutoff 기준 이전 화만', () => {
    const project = {
      id: 'p1',
      config: {
        manuscripts: [
          { episode: 1, title: 'E1', summary: 's1' },
          { episode: 2, title: 'E2', summary: 's2' },
          { episode: 3, title: 'E3', summary: 's3' },
        ],
      },
    };
    const ctx = buildProjectTranslationContext(project, { currentEpisodeNo: 3, recentCount: 5 });
    // ep 1,2만 (3 미만)
    expect(ctx?.recentEpisodes.map((e) => e.no)).toEqual([1, 2]);
  });

  it('recentEpisodes recentCount 옵션 제한', () => {
    const project = {
      id: 'p1',
      config: {
        manuscripts: Array.from({ length: 10 }, (_, i) => ({
          episode: i + 1,
          title: `t${i}`,
          content: `c${i}`,
        })),
      },
    };
    const ctx = buildProjectTranslationContext(project, { currentEpisodeNo: 100, recentCount: 3 });
    expect(ctx?.recentEpisodes).toHaveLength(3);
  });

  it('worldBible source: config.worldBible 우선', () => {
    const project = {
      id: 'p1',
      config: { worldBible: { corePremise: 'WB Test' } },
    };
    const ctx = buildProjectTranslationContext(project);
    expect(ctx?.worldBible).toContain('WB Test');
  });

  it('genre 필드 그대로 노출', () => {
    const project = { id: 'p1', config: { genre: 'ROMANCE' } };
    const ctx = buildProjectTranslationContext(project);
    expect(ctx?.genre).toBe('ROMANCE');
  });

  it('options.sourceLang 전달 → ctx에 반영', () => {
    const project = { id: 'p1', config: {} };
    const ctx = buildProjectTranslationContext(project, { sourceLang: 'EN' });
    expect(ctx?.sourceLang).toBe('EN');
  });

  it('characters는 자동으로 locked glossary 항목으로 추가', () => {
    const project = {
      id: 'p1',
      config: { characters: [{ name: 'Hero' }] },
    };
    const ctx = buildProjectTranslationContext(project);
    const heroEntry = ctx?.glossary.find((g: TranslationGlossaryEntry) => g.source === 'Hero');
    expect(heroEntry).toBeDefined();
    expect(heroEntry?.locked).toBe(true);
    expect(heroEntry?.category).toBe('character');
  });
});

// ============================================================
// PART 6 — loadLocalGlossary / saveLocalGlossary
// ============================================================

describe('loadLocalGlossary / saveLocalGlossary', () => {
  it('빈 저장소 → 빈 배열', () => {
    expect(loadLocalGlossary()).toEqual([]);
  });

  it('round-trip — save → load 동일', () => {
    const entries = [
      { source: 'A', target: 'a', locked: true },
      { source: 'B', target: 'b' },
    ];
    expect(saveLocalGlossary(entries)).toBe(true);
    const loaded = loadLocalGlossary();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].source).toBe('A');
  });

  it('JSON 깨짐 → 빈 배열', () => {
    localStorage.setItem('noa_translation_glossary', '{[invalid');
    expect(loadLocalGlossary()).toEqual([]);
  });

  it('배열 아닌 JSON → 빈 배열', () => {
    localStorage.setItem('noa_translation_glossary', '{"not":"array"}');
    expect(loadLocalGlossary()).toEqual([]);
  });

  it('빈 source 항목 필터링', () => {
    saveLocalGlossary([{ source: '   ' }, { source: 'Valid' }]);
    const loaded = loadLocalGlossary();
    // 저장 시 sanitize 됨
    expect(loaded.every((e) => e.source.trim().length > 0)).toBe(true);
  });

  it('비배열 입력 → 저장 실패 (false)', () => {
    expect(saveLocalGlossary(null as unknown as Array<{ source: string }>)).toBe(false);
  });

  it('localStorage quota 에러 → false (throw 안 함)', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    const result = saveLocalGlossary([{ source: 'A' }]);
    expect(result).toBe(false);
    spy.mockRestore();
  });
});
