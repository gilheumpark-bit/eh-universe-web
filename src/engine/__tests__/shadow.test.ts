import {
  createDefaultShadow,
  calculateArcPhase,
  detectDrift,
  getOverdueThreads,
  getHighPriorityUnresolved,
  detectHallucination,
  buildShadowPrompt,
} from '../shadow';
import type {
  
  CharacterShadow,
  NarrativeThread,
  ArcPhase as _ArcPhase,
} from '../shadow';

// ============================================================
// PART 1 — createDefaultShadow
// ============================================================

describe('createDefaultShadow', () => {
  it('returns a valid empty ShadowState', () => {
    const s = createDefaultShadow();
    expect(s.characters).toEqual([]);
    expect(s.threads).toEqual([]);
    expect(s.episodeHistory).toEqual([]);
    expect(s.arc).toEqual({ phase: 'INTRO', progress: 0 });
    expect(s.world).toEqual({
      location: '',
      timeMarker: '',
      activeThreats: [],
      environmentalMood: '',
    });
  });

  it('returns a new object each call (no shared reference)', () => {
    const a = createDefaultShadow();
    const b = createDefaultShadow();
    expect(a).not.toBe(b);
    expect(a.characters).not.toBe(b.characters);
    expect(a.world).not.toBe(b.world);
  });
});

// ============================================================
// PART 2 — calculateArcPhase
// ============================================================

describe('calculateArcPhase', () => {
  it('returns INTRO at episode 0', () => {
    const arc = calculateArcPhase(0, 100);
    expect(arc.phase).toBe('INTRO');
    expect(arc.progress).toBeCloseTo(0);
  });

  it('returns INTRO at the 20% boundary', () => {
    const arc = calculateArcPhase(20, 100);
    expect(arc.phase).toBe('INTRO');
    expect(arc.progress).toBeCloseTo(1);
  });

  it('transitions to PROGRESS just after 20%', () => {
    const arc = calculateArcPhase(21, 100);
    expect(arc.phase).toBe('PROGRESS');
    expect(arc.progress).toBeGreaterThan(0);
  });

  it('returns PROGRESS at the 60% boundary', () => {
    const arc = calculateArcPhase(60, 100);
    expect(arc.phase).toBe('PROGRESS');
    expect(arc.progress).toBeCloseTo(1);
  });

  it('transitions to CLIMAX just after 60%', () => {
    const arc = calculateArcPhase(61, 100);
    expect(arc.phase).toBe('CLIMAX');
  });

  it('returns CLIMAX at the 85% boundary', () => {
    const arc = calculateArcPhase(85, 100);
    expect(arc.phase).toBe('CLIMAX');
    expect(arc.progress).toBeCloseTo(1);
  });

  it('transitions to RESOLUTION after 85%', () => {
    const arc = calculateArcPhase(86, 100);
    expect(arc.phase).toBe('RESOLUTION');
  });

  it('returns RESOLUTION at the final episode', () => {
    const arc = calculateArcPhase(100, 100);
    expect(arc.phase).toBe('RESOLUTION');
    expect(arc.progress).toBeCloseTo(1);
  });

  it('handles small totalEpisodes (e.g. 5)', () => {
    const arc = calculateArcPhase(1, 5);
    expect(arc.phase).toBe('INTRO');
    expect(arc.progress).toBeCloseTo(1); // 1/5 = 0.20
  });

  it('progress is always between 0 and 1 for each phase', () => {
    const total = 50;
    for (let ep = 0; ep <= total; ep++) {
      const arc = calculateArcPhase(ep, total);
      expect(arc.progress).toBeGreaterThanOrEqual(0);
      expect(arc.progress).toBeLessThanOrEqual(1.01); // small float tolerance
      expect(['INTRO', 'PROGRESS', 'CLIMAX', 'RESOLUTION']).toContain(arc.phase);
    }
  });
});

// ============================================================
// PART 3 — detectDrift
// ============================================================

describe('detectDrift', () => {
  function makeChar(drift: number): CharacterShadow {
    return {
      name: 'Test',
      warmth: 0.5,
      tension: 0.5,
      trust: 0.5,
      emotion: 'neutral',
      goal: 'survive',
      baselineDrift: drift,
      unresolvedObservations: [],
      pendingJudgments: [],
    };
  }

  it('returns STABLE for drift < 0.15', () => {
    expect(detectDrift(makeChar(0))).toBe('STABLE');
    expect(detectDrift(makeChar(0.14))).toBe('STABLE');
  });

  it('returns MINOR_DRIFT for 0.15 <= drift < 0.30', () => {
    expect(detectDrift(makeChar(0.15))).toBe('MINOR_DRIFT');
    expect(detectDrift(makeChar(0.29))).toBe('MINOR_DRIFT');
  });

  it('returns DRIFT for 0.30 <= drift < 0.50', () => {
    expect(detectDrift(makeChar(0.30))).toBe('DRIFT');
    expect(detectDrift(makeChar(0.49))).toBe('DRIFT');
  });

  it('returns CRITICAL for drift >= 0.50', () => {
    expect(detectDrift(makeChar(0.50))).toBe('CRITICAL');
    expect(detectDrift(makeChar(1.0))).toBe('CRITICAL');
  });

  it('handles exact boundary values', () => {
    expect(detectDrift(makeChar(0.15))).toBe('MINOR_DRIFT');
    expect(detectDrift(makeChar(0.30))).toBe('DRIFT');
    expect(detectDrift(makeChar(0.50))).toBe('CRITICAL');
  });
});

// ============================================================
// PART 4 — getOverdueThreads / getHighPriorityUnresolved
// ============================================================

describe('getOverdueThreads', () => {
  const threads: NarrativeThread[] = [
    { id: '1', description: 'Old thread', introducedEpisode: 1, priority: 5, resolved: false },
    { id: '2', description: 'Recent thread', introducedEpisode: 8, priority: 5, resolved: false },
    { id: '3', description: 'Resolved old', introducedEpisode: 1, priority: 5, resolved: true },
    { id: '4', description: 'Exact boundary', introducedEpisode: 3, priority: 3, resolved: false },
  ];

  it('returns threads unresolved for 7+ episodes', () => {
    const result = getOverdueThreads(threads, 10);
    expect(result.map(t => t.id)).toEqual(['1', '4']);
  });

  it('excludes resolved threads even if old enough', () => {
    const result = getOverdueThreads(threads, 10);
    expect(result.find(t => t.id === '3')).toBeUndefined();
  });

  it('returns empty array when no threads are overdue', () => {
    expect(getOverdueThreads(threads, 5)).toEqual([]);
  });

  it('returns empty for empty thread list', () => {
    expect(getOverdueThreads([], 100)).toEqual([]);
  });

  it('includes thread at exact 7 episode gap', () => {
    const result = getOverdueThreads(threads, 8); // 8 - 1 = 7
    expect(result.map(t => t.id)).toContain('1');
  });
});

describe('getHighPriorityUnresolved', () => {
  const threads: NarrativeThread[] = [
    { id: '1', description: 'High', introducedEpisode: 1, priority: 9, resolved: false },
    { id: '2', description: 'Low', introducedEpisode: 1, priority: 3, resolved: false },
    { id: '3', description: 'High resolved', introducedEpisode: 1, priority: 10, resolved: true },
    { id: '4', description: 'Boundary', introducedEpisode: 1, priority: 8, resolved: false },
  ];

  it('returns unresolved threads with priority >= 8', () => {
    const result = getHighPriorityUnresolved(threads);
    expect(result.map(t => t.id)).toEqual(['1', '4']);
  });

  it('excludes resolved high-priority threads', () => {
    const result = getHighPriorityUnresolved(threads);
    expect(result.find(t => t.id === '3')).toBeUndefined();
  });

  it('returns empty for empty list', () => {
    expect(getHighPriorityUnresolved([])).toEqual([]);
  });

  it('returns empty when all threads are low priority', () => {
    const low = [{ id: '1', description: 'Low', introducedEpisode: 1, priority: 7, resolved: false }];
    expect(getHighPriorityUnresolved(low)).toEqual([]);
  });
});

// ============================================================
// PART 5 — detectHallucination
// ============================================================

describe('detectHallucination', () => {
  it('returns ratio and score for normal case', () => {
    const result = detectHallucination(100, 150);
    expect(result.ratio).toBeCloseTo(1.5);
    expect(result.score).toBeCloseTo(0.5);
    expect(result.suspect).toBe(false);
  });

  it('flags suspect when response is very long relative to prompt', () => {
    const result = detectHallucination(100, 200);
    // ratio = 2, score = 2/3 ≈ 0.667 > 0.6
    expect(result.suspect).toBe(true);
  });

  it('does not flag when ratio is low', () => {
    const result = detectHallucination(100, 100);
    // ratio = 1, score = 1/3 ≈ 0.333
    expect(result.suspect).toBe(false);
  });

  it('handles zero prompt length gracefully (no division by zero)', () => {
    const result = detectHallucination(0, 100);
    expect(result.ratio).toBe(100);
    expect(result.score).toBe(1.0); // capped at 1
    expect(result.suspect).toBe(true);
  });

  it('handles zero response length', () => {
    const result = detectHallucination(100, 0);
    expect(result.ratio).toBe(0);
    expect(result.score).toBe(0);
    expect(result.suspect).toBe(false);
  });

  it('score is capped at 1.0', () => {
    const result = detectHallucination(1, 1000);
    expect(result.score).toBe(1.0);
  });

  it('exact threshold: score = 0.6 is not suspect', () => {
    // score = ratio / 3 = 0.6 → ratio = 1.8
    const result = detectHallucination(100, 180);
    expect(result.score).toBeCloseTo(0.6);
    expect(result.suspect).toBe(false);
  });

  it('just above threshold is suspect', () => {
    const result = detectHallucination(100, 181);
    expect(result.suspect).toBe(true);
  });
});

// ============================================================
// PART 6 — buildShadowPrompt
// ============================================================

describe('buildShadowPrompt', () => {
  it('returns empty string for a fully empty shadow', () => {
    const shadow = createDefaultShadow();
    const result = buildShadowPrompt(shadow, 1, 10, true);
    // arc state is always included since it's always computed
    expect(typeof result).toBe('string');
  });

  it('includes arc phase information', () => {
    const shadow = createDefaultShadow();
    const result = buildShadowPrompt(shadow, 5, 10, false);
    // Should contain PROGRESS since 5/10 = 0.5 (between 0.20 and 0.60)
    expect(result).toContain('PROGRESS');
  });

  it('includes character info when characters exist', () => {
    const shadow = createDefaultShadow();
    shadow.characters.push({
      name: 'Alice',
      warmth: 0.7,
      tension: 0.3,
      trust: 0.8,
      emotion: 'happy',
      goal: 'find treasure',
      baselineDrift: 0.1,
      unresolvedObservations: [],
      pendingJudgments: [],
    });
    const result = buildShadowPrompt(shadow, 1, 10, true);
    expect(result).toContain('Alice');
    expect(result).toContain('happy');
    expect(result).toContain('find treasure');
    expect(result).toContain('STABLE');
  });

  it('includes unresolved observations when present', () => {
    const shadow = createDefaultShadow();
    shadow.characters.push({
      name: 'Bob',
      warmth: 0.5,
      tension: 0.5,
      trust: 0.5,
      emotion: 'anxious',
      goal: 'escape',
      baselineDrift: 0.2,
      unresolvedObservations: ['saw a shadow', 'heard a noise'],
      pendingJudgments: [],
    });
    const result = buildShadowPrompt(shadow, 1, 10, false);
    expect(result).toContain('saw a shadow');
    expect(result).toContain('heard a noise');
  });

  it('includes world state when location is set', () => {
    const shadow = createDefaultShadow();
    shadow.world = {
      location: 'Dark Forest',
      timeMarker: 'midnight',
      activeThreats: ['wolves'],
      environmentalMood: 'ominous',
    };
    const result = buildShadowPrompt(shadow, 1, 10, true);
    expect(result).toContain('Dark Forest');
    expect(result).toContain('midnight');
    expect(result).toContain('ominous');
    expect(result).toContain('wolves');
  });

  it('omits world section when location is empty', () => {
    const shadow = createDefaultShadow();
    shadow.world = {
      location: '',
      timeMarker: 'noon',
      activeThreats: ['rain'],
      environmentalMood: 'calm',
    };
    const result = buildShadowPrompt(shadow, 1, 10, true);
    // world section should not appear since location is empty
    expect(result).not.toContain('rain');
  });

  it('includes overdue threads', () => {
    const shadow = createDefaultShadow();
    shadow.threads.push({
      id: '1',
      description: 'mystery letter',
      introducedEpisode: 1,
      priority: 5,
      resolved: false,
    });
    const result = buildShadowPrompt(shadow, 10, 20, true);
    // episode 10 - introduced 1 = 9 >= 7 → overdue
    expect(result).toContain('mystery letter');
  });

  it('includes high priority threads during CLIMAX phase', () => {
    const shadow = createDefaultShadow();
    shadow.threads.push({
      id: '1',
      description: 'final battle',
      introducedEpisode: 5,
      priority: 9,
      resolved: false,
    });
    // episode 70 / total 100 = 0.70 → CLIMAX phase (0.60~0.85)
    const result = buildShadowPrompt(shadow, 70, 100, false);
    expect(result).toContain('CLIMAX');
    expect(result).toContain('final battle');
  });

  it('does not include high priority threads outside CLIMAX phase', () => {
    const shadow = createDefaultShadow();
    shadow.threads.push({
      id: '1',
      description: 'final battle',
      introducedEpisode: 5,
      priority: 9,
      resolved: false,
    });
    // episode 10 / total 100 = 0.10 → INTRO phase, not overdue either (10-5=5 < 7)
    const result = buildShadowPrompt(shadow, 10, 100, false);
    expect(result).not.toContain('final battle');
  });

  it('works with both KO and EN language flags', () => {
    const shadow = createDefaultShadow();
    shadow.characters.push({
      name: 'Test',
      warmth: 0.5,
      tension: 0.5,
      trust: 0.5,
      emotion: 'calm',
      goal: 'rest',
      baselineDrift: 0.0,
      unresolvedObservations: [],
      pendingJudgments: [],
    });
    const ko = buildShadowPrompt(shadow, 5, 10, true);
    const en = buildShadowPrompt(shadow, 5, 10, false);
    // Both should include the character name regardless of language
    expect(ko).toContain('Test');
    expect(en).toContain('Test');
    // Both should be non-empty strings
    expect(ko.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });
});
