// ============================================================
// PART 1 — Imports & shared setup
// ============================================================

import {
  createEmptyGraph,
  updateMemoryFromTranslation,
  detectTermDrift,
  saveGraphLocal,
  loadGraphLocal,
  getOrCreateGraph,
  buildMemoryPromptHint,
  type EpisodeMemoryGraph,
} from '../episode-memory';

beforeEach(() => {
  // [C] localStorage clean — 각 테스트 격리
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  jest.restoreAllMocks();
});

// ============================================================
// PART 2 — createEmptyGraph
// ============================================================

describe('createEmptyGraph', () => {
  it('정상 projectId → 올바른 빈 그래프', () => {
    const graph = createEmptyGraph('proj-1');
    expect(graph.projectId).toBe('proj-1');
    expect(graph.terms).toEqual({});
    expect(graph.characters).toEqual({});
    expect(graph.episodeCount).toBe(0);
    expect(typeof graph.lastUpdated).toBe('number');
    expect(graph.lastUpdated).toBeGreaterThan(0);
  });

  it('빈/falsy projectId → "anonymous"', () => {
    expect(createEmptyGraph('').projectId).toBe('anonymous');
    expect(createEmptyGraph(null as unknown as string).projectId).toBe('anonymous');
  });
});

// ============================================================
// PART 3 — updateMemoryFromTranslation
// ============================================================

describe('updateMemoryFromTranslation', () => {
  it('첫 등록 → canonical = target, driftScore = 0', () => {
    const graph = createEmptyGraph('p1');
    const updated = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
    ]);
    expect(updated.characters['민아'].canonicalTarget).toBe('Mina');
    expect(updated.characters['민아'].driftScore).toBe(0);
    expect(updated.characters['민아'].lastSeen).toBe(1);
  });

  it('같은 target 반복 → count 증가, drift 0 유지', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
    ]);
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 2, isCharacter: true },
    ]);
    const node = graph.characters['민아'];
    expect(node.translations[0].count).toBe(2);
    expect(node.driftScore).toBe(0);
    expect(node.lastSeen).toBe(2);
  });

  it('다른 target 추가 → translations 확장, canonical 재계산', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
      { source: '민아', target: 'Mina', episodeNo: 2, isCharacter: true },
    ]);
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Minah', episodeNo: 3, isCharacter: true },
    ]);
    const node = graph.characters['민아'];
    expect(node.translations).toHaveLength(2);
    // Mina가 더 많이 나왔으므로 canonical 유지
    expect(node.canonicalTarget).toBe('Mina');
    expect(node.driftScore).toBeGreaterThan(0);
  });

  it('isCharacter=true → characters 버킷에 저장', () => {
    const graph = createEmptyGraph('p1');
    const updated = updateMemoryFromTranslation(graph, [
      { source: 'X', target: 'Y', episodeNo: 1, isCharacter: true },
    ]);
    expect(updated.characters['X']).toBeDefined();
    expect(updated.terms['X']).toBeUndefined();
  });

  it('isCharacter=false → terms 버킷에 저장', () => {
    const graph = createEmptyGraph('p1');
    const updated = updateMemoryFromTranslation(graph, [
      { source: '검', target: 'sword', episodeNo: 1, isCharacter: false },
    ]);
    expect(updated.terms['검']).toBeDefined();
    expect(updated.characters['검']).toBeUndefined();
  });

  it('빈 pairs → graph 그대로 반환', () => {
    const graph = createEmptyGraph('p1');
    const updated = updateMemoryFromTranslation(graph, []);
    expect(updated).toBe(graph); // referential equality
  });

  it('graph null → 빈 그래프 생성', () => {
    const updated = updateMemoryFromTranslation(null as unknown as EpisodeMemoryGraph, []);
    expect(updated.projectId).toBe('anonymous');
  });

  it('episodeCount 갱신 — 가장 큰 episodeNo', () => {
    const graph = createEmptyGraph('p1');
    const updated = updateMemoryFromTranslation(graph, [
      { source: 'A', target: 'a', episodeNo: 5 },
      { source: 'B', target: 'b', episodeNo: 3 },
    ]);
    expect(updated.episodeCount).toBe(5);
  });

  it('잘못된 pair (source 없음) skip', () => {
    const graph = createEmptyGraph('p1');
    const updated = updateMemoryFromTranslation(graph, [
      { source: '', target: 'x', episodeNo: 1 },
    ]);
    expect(Object.keys(updated.terms)).toHaveLength(0);
  });

  it('얕은 불변성 — 입력 graph 직접 mutation 없음', () => {
    const graph = createEmptyGraph('p1');
    const before = { ...graph };
    updateMemoryFromTranslation(graph, [{ source: 'X', target: 'Y', episodeNo: 1 }]);
    expect(graph.terms).toEqual(before.terms);
  });
});

// ============================================================
// PART 4 — detectTermDrift
// ============================================================

describe('detectTermDrift', () => {
  it('graph null → 빈 배열', () => {
    expect(detectTermDrift(null, [{ source: 'X', target: 'Y' }])).toEqual([]);
  });

  it('빈 newTranslations → 빈 배열', () => {
    const graph = createEmptyGraph('p1');
    expect(detectTermDrift(graph, [])).toEqual([]);
  });

  it('그래프에 없는 source → 경고 없음', () => {
    const graph = createEmptyGraph('p1');
    const warnings = detectTermDrift(graph, [{ source: 'NEW', target: 'X' }]);
    expect(warnings).toEqual([]);
  });

  it('canonical과 같은 target → 경고 없음', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
    ]);
    const warnings = detectTermDrift(graph, [
      { source: '민아', target: 'Mina', isCharacter: true },
    ]);
    expect(warnings).toEqual([]);
  });

  it('canonical과 다름 + historyCount 3+ → "block"', () => {
    let graph = createEmptyGraph('p1');
    // 3번 등록
    for (let i = 1; i <= 3; i++) {
      graph = updateMemoryFromTranslation(graph, [
        { source: '민아', target: 'Mina', episodeNo: i, isCharacter: true },
      ]);
    }
    const warnings = detectTermDrift(graph, [
      { source: '민아', target: 'Wrong', isCharacter: true },
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('block');
    expect(warnings[0].historyCount).toBe(3);
  });

  it('canonical과 다름 + historyCount 2 이하 → "warn"', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
    ]);
    const warnings = detectTermDrift(graph, [
      { source: '민아', target: 'Wrong', isCharacter: true },
    ]);
    expect(warnings[0].severity).toBe('warn');
  });

  it('terms 버킷 분리 — isCharacter false', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '검', target: 'sword', episodeNo: 1 },
    ]);
    // terms 버킷에 있으므로 isCharacter true로 검색하면 빈 결과
    expect(
      detectTermDrift(graph, [{ source: '검', target: 'blade', isCharacter: true }]),
    ).toEqual([]);
    // false로 검색하면 경고
    const warnings = detectTermDrift(graph, [
      { source: '검', target: 'blade', isCharacter: false },
    ]);
    expect(warnings).toHaveLength(1);
  });
});

// ============================================================
// PART 5 — saveGraphLocal & loadGraphLocal
// ============================================================

describe('saveGraphLocal / loadGraphLocal', () => {
  it('round-trip — save → load 동일 결과', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: 'A', target: 'a', episodeNo: 1 },
    ]);
    expect(saveGraphLocal(graph)).toBe(true);
    const loaded = loadGraphLocal('p1');
    expect(loaded?.projectId).toBe('p1');
    expect(loaded?.terms['A'].canonicalTarget).toBe('a');
  });

  it('빈 projectId 저장 → false', () => {
    const graph = { ...createEmptyGraph('p1'), projectId: '' };
    expect(saveGraphLocal(graph)).toBe(false);
  });

  it('null/undefined graph 저장 → false', () => {
    expect(saveGraphLocal(null as unknown as EpisodeMemoryGraph)).toBe(false);
  });

  it('존재하지 않는 projectId 로드 → null', () => {
    expect(loadGraphLocal('non-existent')).toBeNull();
  });

  it('빈 projectId 로드 → null', () => {
    expect(loadGraphLocal('')).toBeNull();
  });

  it('JSON 깨짐 → null', () => {
    localStorage.setItem('noa_episode_memory_p1', '{[invalid');
    expect(loadGraphLocal('p1')).toBeNull();
  });

  it('projectId mismatch → null', () => {
    const graph = createEmptyGraph('p1');
    saveGraphLocal(graph);
    // 직접 다른 projectId로 저장된 것처럼 시뮬
    localStorage.setItem('noa_episode_memory_p2', JSON.stringify(graph));
    expect(loadGraphLocal('p2')).toBeNull(); // p1이 든 그래프인데 p2로 저장됨
  });

  it('localStorage quota 에러 → false (throw 안 함)', () => {
    const graph = createEmptyGraph('p1');
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(saveGraphLocal(graph)).toBe(false);
    spy.mockRestore();
  });
});

// ============================================================
// PART 6 — getOrCreateGraph
// ============================================================

describe('getOrCreateGraph', () => {
  it('저장된 그래프 없음 → 신규 빈 그래프', () => {
    const graph = getOrCreateGraph('new-proj');
    expect(graph.projectId).toBe('new-proj');
    expect(Object.keys(graph.terms)).toHaveLength(0);
  });

  it('저장된 그래프 있음 → 로드', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: 'X', target: 'x', episodeNo: 1 },
    ]);
    saveGraphLocal(graph);
    const loaded = getOrCreateGraph('p1');
    expect(loaded.terms['X']).toBeDefined();
  });

  it('빈 projectId → "anonymous" 신규', () => {
    const graph = getOrCreateGraph('');
    expect(graph.projectId).toBe('anonymous');
  });
});

// ============================================================
// PART 7 — buildMemoryPromptHint
// ============================================================

describe('buildMemoryPromptHint', () => {
  it('null/undefined graph → 빈 문자열', () => {
    expect(buildMemoryPromptHint(null)).toBe('');
    expect(buildMemoryPromptHint(undefined)).toBe('');
  });

  it('빈 그래프 → 빈 문자열', () => {
    const graph = createEmptyGraph('p1');
    expect(buildMemoryPromptHint(graph)).toBe('');
  });

  it('캐릭터만 있을 때 → CHARACTER NAME MEMORY 블록만', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
    ]);
    const hint = buildMemoryPromptHint(graph);
    expect(hint).toContain('[CHARACTER NAME MEMORY');
    expect(hint).toContain('민아');
    expect(hint).toContain('Mina');
    expect(hint).not.toContain('[TERM MEMORY');
  });

  it('terms만 있을 때 → TERM MEMORY 블록만', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '검', target: 'sword', episodeNo: 1 },
    ]);
    const hint = buildMemoryPromptHint(graph);
    expect(hint).toContain('[TERM MEMORY');
    expect(hint).not.toContain('[CHARACTER NAME MEMORY');
  });

  it('두 종류 모두 있을 때 → 두 블록 모두', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: '민아', target: 'Mina', episodeNo: 1, isCharacter: true },
      { source: '검', target: 'sword', episodeNo: 1 },
    ]);
    const hint = buildMemoryPromptHint(graph);
    expect(hint).toContain('[CHARACTER NAME MEMORY');
    expect(hint).toContain('[TERM MEMORY');
  });

  it('maxTerms slice 적용', () => {
    let graph = createEmptyGraph('p1');
    const pairs = Array.from({ length: 50 }, (_, i) => ({
      source: `term${i}`,
      target: `t${i}`,
      episodeNo: 1,
    }));
    graph = updateMemoryFromTranslation(graph, pairs);
    const hint = buildMemoryPromptHint(graph, 5, 10);
    // 5개만 출력
    const termLines = (hint.match(/term\d+/g) || []).length;
    expect(termLines).toBeLessThanOrEqual(5);
  });

  it('maxChars slice 적용', () => {
    let graph = createEmptyGraph('p1');
    const pairs = Array.from({ length: 50 }, (_, i) => ({
      source: `char${i}`,
      target: `C${i}`,
      episodeNo: i,
      isCharacter: true,
    }));
    graph = updateMemoryFromTranslation(graph, pairs);
    const hint = buildMemoryPromptHint(graph, 30, 5);
    const charLines = (hint.match(/char\d+/g) || []).length;
    expect(charLines).toBeLessThanOrEqual(5);
  });

  it('drift 높은 항목 우선 정렬 (terms)', () => {
    let graph = createEmptyGraph('p1');
    // term1: drift 0 (단일 번역)
    graph = updateMemoryFromTranslation(graph, [
      { source: 'term1', target: 't1', episodeNo: 1 },
    ]);
    // term2: drift > 0 (두 가지 번역)
    graph = updateMemoryFromTranslation(graph, [
      { source: 'term2', target: 't2a', episodeNo: 1 },
      { source: 'term2', target: 't2b', episodeNo: 2 },
    ]);
    const hint = buildMemoryPromptHint(graph, 30, 10);
    // term2가 먼저 등장
    const idx1 = hint.indexOf('term1');
    const idx2 = hint.indexOf('term2');
    expect(idx2).toBeLessThan(idx1);
  });

  it('lastSeen 최신 우선 정렬 (characters)', () => {
    let graph = createEmptyGraph('p1');
    graph = updateMemoryFromTranslation(graph, [
      { source: 'old', target: 'O', episodeNo: 1, isCharacter: true },
      { source: 'newer', target: 'N', episodeNo: 5, isCharacter: true },
    ]);
    const hint = buildMemoryPromptHint(graph, 30, 10);
    const idxOld = hint.indexOf('"old"');
    const idxNew = hint.indexOf('"newer"');
    expect(idxNew).toBeLessThan(idxOld);
  });
});
