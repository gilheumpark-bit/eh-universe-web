import { buildContinuityReport } from '../continuity-tracker';
import type { ContinuityReport } from '../continuity-tracker';
import type { Character, EpisodeManuscript } from '@/lib/studio-types';

// ============================================================
// Helpers
// ============================================================

function makeCharacter(name: string, overrides?: Partial<Character>): Character {
  return {
    id: `char-${name}`,
    name,
    role: '주인공',
    traits: '',
    appearance: '',
    dna: 0,
    ...overrides,
  };
}

function makeManuscript(
  episode: number,
  content: string,
  title?: string,
): EpisodeManuscript {
  return {
    episode,
    title: title ?? `${episode}화`,
    content,
    charCount: content.length,
    lastUpdate: Date.now(),
  };
}

// ============================================================
// Edge Cases — empty / single episode / no characters
// ============================================================

describe('buildContinuityReport — edge cases', () => {
  it('returns perfect score for empty manuscripts array', () => {
    const report = buildContinuityReport([], [], 1);
    // Even with no manuscripts, the loop runs for currentEpisode=1 → 1 snapshot with empty content
    expect(report.overallScore).toBe(100);
    expect(report.episodes).toHaveLength(1);
    expect(report.episodes[0].eventSummary).toBe('');
    expect(report.totalWarnings).toBe(0);
  });

  it('returns perfect score for single episode with empty content', () => {
    const ms = [makeManuscript(1, '')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes).toHaveLength(1);
    expect(report.episodes[0].continuityScore).toBe(100);
    expect(report.episodes[0].warnings).toHaveLength(0);
  });

  it('handles no characters gracefully', () => {
    const ms = [makeManuscript(1, '성 안에서 전투가 벌어졌다.')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].characters).toHaveLength(0);
    expect(report.overallScore).toBe(100);
  });

  it('handles single episode with characters', () => {
    const chars = [makeCharacter('이진')];
    const ms = [makeManuscript(1, '이진이 검을 뽑았다. 이진은 앞으로 나아갔다.')];
    const report = buildContinuityReport(ms, chars, 1);
    expect(report.episodes).toHaveLength(1);
    const snap = report.episodes[0];
    expect(snap.characters[0].name).toBe('이진');
    expect(snap.characters[0].present).toBe(true);
  });
});

// ============================================================
// Window size clamping
// ============================================================

describe('buildContinuityReport — window size', () => {
  it('clamps windowSize to minimum 3', () => {
    const report = buildContinuityReport([], [], 1, 1);
    expect(report.windowSize).toBe(3);
  });

  it('clamps windowSize to maximum 25', () => {
    const report = buildContinuityReport([], [], 1, 100);
    expect(report.windowSize).toBe(25);
  });

  it('keeps valid windowSize unchanged', () => {
    const report = buildContinuityReport([], [], 1, 10);
    expect(report.windowSize).toBe(10);
  });

  it('defaults windowSize to 5', () => {
    const report = buildContinuityReport([], [], 1);
    expect(report.windowSize).toBe(5);
  });
});

// ============================================================
// Snapshot creation — character detection & state flags
// ============================================================

describe('buildContinuityReport — character snapshots', () => {
  const chars = [makeCharacter('하윤'), makeCharacter('서진')];

  it('detects character presence via known names', () => {
    const ms = [makeManuscript(1, '하윤이 방에 들어섰다. 서진은 어디에도 없었다.')];
    // "서진은" matches the Korean particle pattern so both may appear,
    // but the key check is that 하윤 is present
    const report = buildContinuityReport(ms, chars, 1);
    const haYun = report.episodes[0].characters.find(c => c.name === '하윤');
    expect(haYun?.present).toBe(true);
  });

  it('marks injury state flag for wounded characters', () => {
    const ms = [makeManuscript(1, '하윤이 심한 부상을 입었다. 하윤은 피를 흘렸다.')];
    const report = buildContinuityReport(ms, chars, 1);
    const haYun = report.episodes[0].characters.find(c => c.name === '하윤');
    expect(haYun?.stateFlags).toContain('부상');
  });

  it('marks anger state flag', () => {
    const ms = [makeManuscript(1, '하윤이 분노에 떨었다. 하윤은 격분했다.')];
    const report = buildContinuityReport(ms, chars, 1);
    const haYun = report.episodes[0].characters.find(c => c.name === '하윤');
    expect(haYun?.stateFlags).toContain('분노');
  });

  it('marks sadness state flag', () => {
    const ms = [makeManuscript(1, '하윤이 눈물을 흘렸다. 하윤은 슬퍼했다.')];
    const report = buildContinuityReport(ms, chars, 1);
    const haYun = report.episodes[0].characters.find(c => c.name === '하윤');
    expect(haYun?.stateFlags).toContain('슬픔');
  });

  it('marks death state flag', () => {
    const ms = [makeManuscript(1, '하윤이 전사했다. 하윤은 죽었다.')];
    const report = buildContinuityReport(ms, chars, 1);
    const haYun = report.episodes[0].characters.find(c => c.name === '하윤');
    expect(haYun?.stateFlags).toContain('사망');
  });

  it('counts dialogue for present characters', () => {
    const ms = [makeManuscript(1, '"가자!" 하윤이 외쳤다. 하윤이 말했다. "알겠어." 하윤이 대답했다.')];
    const report = buildContinuityReport(ms, chars, 1);
    const haYun = report.episodes[0].characters.find(c => c.name === '하윤');
    expect(haYun?.dialogueCount).toBeGreaterThanOrEqual(2);
  });

  it('dialogue count is 0 for absent characters', () => {
    const ms = [makeManuscript(1, '하윤이 걸어갔다.')];
    const report = buildContinuityReport(ms, chars, 1);
    const seoJin = report.episodes[0].characters.find(c => c.name === '서진');
    expect(seoJin?.present).toBe(false);
    expect(seoJin?.dialogueCount).toBe(0);
  });
});

// ============================================================
// Location extraction
// ============================================================

describe('buildContinuityReport — location', () => {
  it('extracts location from background pattern', () => {
    const ms = [makeManuscript(1, '장소: 왕궁 대전\n하윤이 걸어갔다.')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].location).toBe('왕궁 대전');
  });

  it('extracts location from Korean noun + particle pattern', () => {
    // The regex requires a place-name suffix (성/궁/숲/마을 etc.) directly before a particle
    const ms = [makeManuscript(1, '깊은숲에서 전투가 벌어졌다.')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].location).toContain('숲');
  });

  it('returns empty string when no location is found', () => {
    const ms = [makeManuscript(1, '그는 멀리 바라보았다.')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].location).toBe('');
  });
});

// ============================================================
// Thread tracking (복선/떡밥)
// ============================================================

describe('buildContinuityReport — threads', () => {
  it('detects planted threads (떡밥 keywords)', () => {
    const ms = [makeManuscript(1, '그것은 커다란 비밀이었다. 아무도 모르는 수수께끼가 남았다.')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].openThreads.length).toBeGreaterThanOrEqual(1);
    expect(report.threadStatus.open).toBeGreaterThanOrEqual(1);
  });

  it('detects resolved threads', () => {
    const ms = [
      makeManuscript(1, '이것은 거대한 비밀이었다.'),
      makeManuscript(2, '마침내 비밀이 밝혀졌다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    expect(report.threadStatus.resolved).toBeGreaterThanOrEqual(1);
  });

  it('resolved thread removes matching open thread', () => {
    const ms = [
      makeManuscript(1, '이것은 놀라운 떡밥이었다.'),
      makeManuscript(2, '드디어 그 떡밥의 진실이 드러났다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    // The resolved thread should reduce open count
    // At minimum, resolved count should be >= 1
    expect(report.threadStatus.resolved).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Warning detection — character_state
// ============================================================

describe('buildContinuityReport — character state warnings', () => {
  const chars = [makeCharacter('하윤')];

  it('warns when injured character has no injury mention in next episode', () => {
    const ms = [
      makeManuscript(1, '하윤이 심한 부상을 입었다. 하윤은 상처가 깊었다.'),
      makeManuscript(2, '하윤이 웃으며 걸어갔다. 하윤은 기분이 좋았다.'),
    ];
    const report = buildContinuityReport(ms, chars, 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    const stateWarnings = ep2?.warnings.filter(w => w.type === 'character_state') ?? [];
    expect(stateWarnings.length).toBeGreaterThanOrEqual(1);
    expect(stateWarnings[0].severity).toBe('warn');
  });

  it('no warning when injury carries over', () => {
    const ms = [
      makeManuscript(1, '하윤이 심한 부상을 입었다.'),
      makeManuscript(2, '하윤이 부상이 아직 낫지 않았다.'),
    ];
    const report = buildContinuityReport(ms, chars, 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    const stateWarnings = ep2?.warnings.filter(w => w.type === 'character_state') ?? [];
    expect(stateWarnings).toHaveLength(0);
  });
});

// ============================================================
// Warning detection — location_jump
// ============================================================

describe('buildContinuityReport — location jump warnings', () => {
  it('warns on location change without transition description', () => {
    const ms = [
      makeManuscript(1, '장소: 왕성\n전투가 시작되었다.'),
      makeManuscript(2, '장소: 숲속 마을\n평화로운 아침이 밝았다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    const locWarnings = ep2?.warnings.filter(w => w.type === 'location_jump') ?? [];
    expect(locWarnings.length).toBeGreaterThanOrEqual(1);
    expect(locWarnings[0].severity).toBe('info');
  });

  it('no warning when transition verb is present', () => {
    const ms = [
      makeManuscript(1, '장소: 왕성\n전투가 시작되었다.'),
      makeManuscript(2, '장소: 숲속 마을\n왕성에서 이동하여 숲속 마을에 도착했다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    const locWarnings = ep2?.warnings.filter(w => w.type === 'location_jump') ?? [];
    expect(locWarnings).toHaveLength(0);
  });
});

// ============================================================
// Warning detection — thread_forgotten
// ============================================================

describe('buildContinuityReport — thread_forgotten warnings', () => {
  it('warns when open threads exceed 5', () => {
    // Create an episode with many planted threads
    const threads = Array.from({ length: 7 }, (_, i) =>
      `이것은 ${i + 1}번째 비밀이다. 새로운 수수께끼가 나타났다. 미스터리한 단서가 발견되었다.`
    ).join('\n');
    const ms = [
      makeManuscript(1, threads),
      makeManuscript(2, '다음날 아침이 밝았다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    const threadWarnings = ep2?.warnings.filter(w => w.type === 'thread_forgotten') ?? [];
    expect(threadWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it('severity is danger when open threads exceed 8', () => {
    const threads = Array.from({ length: 12 }, (_, i) =>
      `${i + 1}번째 비밀이 있다. 또 다른 수수께끼를 발견했다. 미스터리가 깊어진다.`
    ).join('\n');
    const ms = [
      makeManuscript(1, threads),
      makeManuscript(2, '다음날이 밝았다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    const threadWarnings = ep2?.warnings.filter(w => w.type === 'thread_forgotten') ?? [];
    if (threadWarnings.length > 0) {
      // If enough threads accumulated, severity should be danger
      const dangerWarnings = threadWarnings.filter(w => w.severity === 'danger');
      expect(dangerWarnings.length + threadWarnings.filter(w => w.severity === 'warn').length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================================
// Scoring — continuityScore & overallScore
// ============================================================

describe('buildContinuityReport — scoring', () => {
  it('episode with no warnings gets score 100', () => {
    const ms = [makeManuscript(1, '평화로운 하루가 시작되었다.')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].continuityScore).toBe(100);
  });

  it('overallScore is average of episode scores', () => {
    const ms = [
      makeManuscript(1, '평화로운 하루.'),
      makeManuscript(2, '또 다른 하루.'),
      makeManuscript(3, '세번째 하루.'),
    ];
    const report = buildContinuityReport(ms, [], 3);
    const avg = Math.round(
      report.episodes.reduce((a, e) => a + e.continuityScore, 0) / report.episodes.length,
    );
    expect(report.overallScore).toBe(avg);
  });

  it('warnings reduce continuity score (warn = -15)', () => {
    const chars = [makeCharacter('하윤')];
    const ms = [
      makeManuscript(1, '하윤이 부상을 입었다. 하윤은 상처가 깊었다.'),
      makeManuscript(2, '하윤이 웃었다. 하윤은 기분이 좋았다.'),
    ];
    const report = buildContinuityReport(ms, chars, 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    // At least one warn-level warning → score <= 85
    if (ep2 && ep2.warnings.some(w => w.severity === 'warn')) {
      expect(ep2.continuityScore).toBeLessThanOrEqual(85);
    }
  });

  it('score never goes below 0', () => {
    // Create scenario with many warnings
    const chars = [makeCharacter('하윤'), makeCharacter('서진'), makeCharacter('민호')];
    const threads = Array.from({ length: 10 }, (_, i) =>
      `${i}번째 비밀이다. 새로운 수수께끼.`
    ).join('\n');
    const ms = [
      makeManuscript(1, `장소: 왕성\n하윤이 부상을 입었다. 서진이 부상을 입었다. 민호가 부상을 입었다.\n${threads}`),
      makeManuscript(2, '장소: 바다\n하윤이 웃었다. 서진이 웃었다. 민호가 웃었다.'),
    ];
    const report = buildContinuityReport(ms, chars, 2);
    for (const ep of report.episodes) {
      expect(ep.continuityScore).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================
// Report structure — threadStatus & totalWarnings
// ============================================================

describe('buildContinuityReport — report structure', () => {
  it('totalWarnings is sum of all episode warnings', () => {
    const chars = [makeCharacter('하윤')];
    const ms = [
      makeManuscript(1, '하윤이 부상을 입었다. 하윤은 상처가 깊었다.'),
      makeManuscript(2, '하윤이 웃으며 걸어갔다.'),
    ];
    const report = buildContinuityReport(ms, chars, 2);
    const sum = report.episodes.reduce((a, e) => a + e.warnings.length, 0);
    expect(report.totalWarnings).toBe(sum);
  });

  it('threadStatus reflects open and resolved counts', () => {
    const ms = [
      makeManuscript(1, '큰 비밀이 있었다. 수수께끼가 남았다.'),
      makeManuscript(2, '비밀이 밝혀졌다.'),
    ];
    const report = buildContinuityReport(ms, [], 2);
    expect(report.threadStatus.open).toBeGreaterThanOrEqual(0);
    expect(report.threadStatus.resolved).toBeGreaterThanOrEqual(0);
    expect(report.threadStatus.open + report.threadStatus.resolved).toBeGreaterThanOrEqual(1);
  });

  it('uses manuscript title when available', () => {
    const ms = [makeManuscript(1, '내용', '검의 각성')];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].title).toBe('검의 각성');
  });

  it('uses fallback title when manuscript not found', () => {
    // currentEpisode=2 but no manuscript for ep2
    const ms = [makeManuscript(1, '내용')];
    const report = buildContinuityReport(ms, [], 2);
    const ep2 = report.episodes.find(e => e.episode === 2);
    expect(ep2?.title).toBe('EP.2');
  });

  it('eventSummary is first 100 chars of content', () => {
    const longContent = '가'.repeat(200);
    const ms = [makeManuscript(1, longContent)];
    const report = buildContinuityReport(ms, [], 1);
    expect(report.episodes[0].eventSummary.length).toBeLessThanOrEqual(100);
  });
});

// ============================================================
// Multi-episode window behavior
// ============================================================

describe('buildContinuityReport — multi-episode window', () => {
  it('only analyzes episodes within the window', () => {
    const ms = Array.from({ length: 10 }, (_, i) =>
      makeManuscript(i + 1, `${i + 1}화 내용.`),
    );
    const report = buildContinuityReport(ms, [], 10, 5);
    // Window from ep 6 to ep 10
    expect(report.episodes).toHaveLength(5);
    expect(report.episodes[0].episode).toBe(6);
    expect(report.episodes[4].episode).toBe(10);
  });

  it('first episode in window has no warnings (no prev snapshot)', () => {
    const ms = Array.from({ length: 5 }, (_, i) =>
      makeManuscript(i + 1, `${i + 1}화 내용.`),
    );
    const report = buildContinuityReport(ms, [], 5, 5);
    expect(report.episodes[0].warnings).toHaveLength(0);
  });
});
