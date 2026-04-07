import {
  createEmptyProfile,
  updateProfile,
  saveProfile,
  loadProfile,
  buildProfileHint,
} from '../writer-profile';

// ============================================================
// PART 1 — createEmptyProfile
// ============================================================

describe('createEmptyProfile', () => {
  it('returns a profile with default id', () => {
    const p = createEmptyProfile();
    expect(p.id).toBe('default');
    expect(p.episodeCount).toBe(0);
    expect(p.skillLevel).toBe('beginner');
    expect(p.commonIssues).toEqual({});
  });

  it('accepts a custom id', () => {
    const p = createEmptyProfile('author-42');
    expect(p.id).toBe('author-42');
  });
});

// ============================================================
// PART 2 — updateProfile
// ============================================================

const sampleMetrics = {
  text: '「안녕하세요」라고 말했다.\n그는 고개를 끄덕였다.\n「네, 반갑습니다」',
  grade: 'A',
  directorScore: 80,
  eosScore: 60,
  tension: 50,
  pacing: 65,
  immersion: 70,
  findings: [{ kind: 'repetition' }, { kind: 'pacing-gap' }],
  wasRegenerated: false,
  wasOverridden: false,
};

describe('updateProfile', () => {
  it('increments episodeCount on first update', () => {
    const base = createEmptyProfile();
    const updated = updateProfile(base, sampleMetrics);
    expect(updated.episodeCount).toBe(1);
  });

  it('sets avgGrade from grade string', () => {
    const base = createEmptyProfile();
    const updated = updateProfile(base, sampleMetrics);
    // 'A' maps to 80
    expect(updated.avgGrade).toBe(80);
  });

  it('tracks commonIssues from findings', () => {
    const base = createEmptyProfile();
    const updated = updateProfile(base, sampleMetrics);
    expect(updated.commonIssues['repetition']).toBe(1);
    expect(updated.commonIssues['pacing-gap']).toBe(1);
  });

  it('accumulates commonIssues across multiple updates', () => {
    let p = createEmptyProfile();
    p = updateProfile(p, sampleMetrics);
    p = updateProfile(p, sampleMetrics);
    expect(p.commonIssues['repetition']).toBe(2);
  });

  it('calculates regenerateRate when wasRegenerated is true', () => {
    const base = createEmptyProfile();
    const metrics = { ...sampleMetrics, wasRegenerated: true };
    const updated = updateProfile(base, metrics);
    expect(updated.regenerateRate).toBe(1); // 1 out of 1
  });

  it('calculates overrideRate when wasOverridden is true', () => {
    const base = createEmptyProfile();
    const metrics = { ...sampleMetrics, wasOverridden: true };
    const updated = updateProfile(base, metrics);
    expect(updated.overrideRate).toBe(1);
  });

  it('returns beginner for low episode count', () => {
    const base = createEmptyProfile();
    const updated = updateProfile(base, sampleMetrics);
    expect(updated.skillLevel).toBe('beginner');
  });

  it('uses EMA for second update onwards', () => {
    let p = createEmptyProfile();
    p = updateProfile(p, sampleMetrics);
    const firstGrade = p.avgGrade;
    p = updateProfile(p, { ...sampleMetrics, grade: 'S' });
    // EMA: 0.3 * 90 + 0.7 * 80 = 83
    expect(p.avgGrade).toBeCloseTo(83, 0);
    expect(p.avgGrade).not.toBe(firstGrade);
  });

  it('sets levelConfidence based on episodeCount', () => {
    const base = createEmptyProfile();
    const updated = updateProfile(base, sampleMetrics);
    expect(updated.levelConfidence).toBeCloseTo(1 / 30, 5);
  });

  it('handles unknown grade gracefully (defaults to 70)', () => {
    const base = createEmptyProfile();
    const updated = updateProfile(base, { ...sampleMetrics, grade: 'Z' });
    expect(updated.avgGrade).toBe(70);
  });

  it('determines intermediate level at 10+ episodes with avgGrade >= 70', () => {
    let p = createEmptyProfile();
    for (let i = 0; i < 10; i++) {
      p = updateProfile(p, { ...sampleMetrics, grade: 'A' });
    }
    expect(p.skillLevel).toBe('intermediate');
  });

  it('determines advanced level at 30+ episodes with high grade and override', () => {
    let p = createEmptyProfile();
    for (let i = 0; i < 30; i++) {
      p = updateProfile(p, { ...sampleMetrics, grade: 'A+', wasOverridden: true });
    }
    expect(p.skillLevel).toBe('advanced');
    expect(p.levelConfidence).toBe(1);
  });
});

// ============================================================
// PART 3 — saveProfile / loadProfile (localStorage)
// ============================================================

describe('saveProfile / loadProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads a profile', () => {
    const p = createEmptyProfile('test-author');
    saveProfile(p);
    const loaded = loadProfile('test-author');
    expect(loaded.id).toBe('test-author');
    expect(loaded.episodeCount).toBe(0);
  });

  it('returns empty profile if nothing is stored', () => {
    const loaded = loadProfile('nonexistent');
    expect(loaded.id).toBe('nonexistent');
    expect(loaded.episodeCount).toBe(0);
  });

  it('returns empty profile for corrupted data', () => {
    localStorage.setItem('eh-writer-profile-bad', 'not-json!!!');
    const loaded = loadProfile('bad');
    expect(loaded.episodeCount).toBe(0);
  });

  it('returns empty profile if stored object is missing required fields', () => {
    localStorage.setItem('eh-writer-profile-incomplete', JSON.stringify({ foo: 'bar' }));
    const loaded = loadProfile('incomplete');
    expect(loaded.episodeCount).toBe(0);
  });
});

// ============================================================
// PART 4 — buildProfileHint
// ============================================================

describe('buildProfileHint', () => {
  it('returns empty string if episodeCount < 5', () => {
    const p = createEmptyProfile();
    p.episodeCount = 4;
    expect(buildProfileHint(p, true)).toBe('');
  });

  it('generates KO hints with common issues', () => {
    const p = createEmptyProfile();
    p.episodeCount = 10;
    p.commonIssues = { repetition: 5, 'pacing-gap': 3, flat: 2 };
    p.dialogueRatio = 0.3;
    const hint = buildProfileHint(p, true);
    expect(hint).toContain('작가 패턴 보정');
    expect(hint).toContain('repetition');
  });

  it('generates EN hints with common issues', () => {
    const p = createEmptyProfile();
    p.episodeCount = 10;
    p.commonIssues = { repetition: 5 };
    p.dialogueRatio = 0.3;
    const hint = buildProfileHint(p, false);
    expect(hint).toContain('Writer Pattern Correction');
  });

  it('adds dialogue preference hint for high dialogue ratio', () => {
    const p = createEmptyProfile();
    p.episodeCount = 10;
    p.dialogueRatio = 0.7;
    p.commonIssues = {};
    const hint = buildProfileHint(p, true);
    expect(hint).toContain('대화를 선호');
  });

  it('adds narration preference hint for low dialogue ratio', () => {
    const p = createEmptyProfile();
    p.episodeCount = 10;
    p.dialogueRatio = 0.1;
    p.commonIssues = {};
    const hint = buildProfileHint(p, true);
    expect(hint).toContain('서술을 선호');
  });

  it('returns EN narration hint when dialogueRatio < 0.2', () => {
    const p = createEmptyProfile();
    p.episodeCount = 10;
    p.dialogueRatio = 0.1;
    p.commonIssues = {};
    const hint = buildProfileHint(p, false);
    expect(hint).toContain('prefers narration');
  });
});
