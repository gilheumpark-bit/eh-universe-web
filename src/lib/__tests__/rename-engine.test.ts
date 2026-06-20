/**
 * rename-engine.test — Pure-logic tests for bulk rename engine.
 */

import {
  previewRename,
  applyRename,
  buildRenameRegex,
  escapeRegex,
  filterSessionsForScope,
} from '../rename-engine';
import type { Project, ChatSession, StoryConfig } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';

// ============================================================
// PART 1 — Test fixtures
// ============================================================

function baseConfig(): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '카이로스',
    setting: '전투의 신 카이로스는 냉혹한 제국에 태어났다.',
    primaryEmotion: 'tense',
    episode: 1,
    title: '카이로스 전설',
    totalEpisodes: 10,
    guardrails: { min: 2000, max: 6000 },
    characters: [
      { id: 'c1', name: '카이로스', role: '주인공', traits: '냉혹하고 강함', appearance: '', dna: 50 },
      { id: 'c2', name: '레오나', role: '조력자', traits: '카이로스를 따른다', appearance: '', dna: 40 },
    ],
    charRelations: [],
    items: [
      { id: 'i1', name: '카이로스의 검', category: 'weapon', rarity: 'legendary',
        description: '카이로스만이 휘두를 수 있는 검', effect: '', obtainedFrom: '' },
    ],
    platform: PlatformType.MOBILE,
    corePremise: '카이로스가 복수를 위해 제국에 맞서는 이야기',
    worldHistory: '제국은 천 년의 역사를 가진다',
    synopsis: '카이로스는 복수의 화신이다',
  };
}

function makeSession(id: string, title: string, messages: string[], config?: StoryConfig): ChatSession {
  return {
    id,
    title,
    config: config ?? baseConfig(),
    messages: messages.map((content, i) => ({
      id: `m-${id}-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content,
      timestamp: Date.now(),
    })),
    lastUpdate: Date.now(),
  };
}

function makeProject(id: string, sessions: ChatSession[]): Project {
  return {
    id,
    name: `project-${id}`,
    description: '',
    genre: Genre.FANTASY,
    createdAt: Date.now(),
    lastUpdate: Date.now(),
    sessions,
  };
}

// ============================================================
// PART 2 — Unit helpers
// ============================================================

describe('escapeRegex', () => {
  it('escapes regex metacharacters so they are treated literally', () => {
    expect(escapeRegex('a.b')).toBe('a\\.b');
    expect(escapeRegex('foo*bar?')).toBe('foo\\*bar\\?');
    expect(escapeRegex('(a)[b]{c}')).toBe('\\(a\\)\\[b\\]\\{c\\}');
  });

  it('returns empty for empty input', () => {
    expect(escapeRegex('')).toBe('');
  });
});

describe('buildRenameRegex', () => {
  it('returns null on empty from', () => {
    expect(buildRenameRegex({ from: '', to: 'x' })).toBeNull();
  });

  it('case-insensitive by default', () => {
    const rx = buildRenameRegex({ from: 'kai', to: 'x' });
    expect(rx).not.toBeNull();
    expect(rx!.flags.includes('i')).toBe(true);
    expect(rx!.test('KAI')).toBe(true);
  });

  it('case-sensitive when flag set', () => {
    const rx = buildRenameRegex({ from: 'kai', to: 'x', caseSensitive: true });
    expect(rx).not.toBeNull();
    expect(rx!.flags.includes('i')).toBe(false);
    expect(rx!.test('KAI')).toBe(false);
    expect(rx!.test('kai')).toBe(true);
  });

  it('wholeWord uses boundary anchors', () => {
    const rx = buildRenameRegex({ from: 'hero', to: 'x', wholeWord: true, caseSensitive: true });
    expect(rx!.test('hero fights')).toBe(true);
    expect(rx!.test('heroes')).toBe(false);
  });
});

// ============================================================
// PART 3 — Scope + preview
// ============================================================

describe('filterSessionsForScope', () => {
  const s1 = makeSession('s1', 'EP1', ['hi'], baseConfig());
  const s2 = makeSession('s2', 'EP2', ['hi'], baseConfig());
  const s3 = makeSession('s3', 'EP3', ['hi'], baseConfig());
  const p1 = makeProject('p1', [s1, s2]);
  const p2 = makeProject('p2', [s3]);

  it('scope=all returns every session', () => {
    const out = filterSessionsForScope([p1, p2], [s1, s2, s3], {
      from: 'x', to: 'y', scope: 'all',
    });
    expect(out).toHaveLength(3);
  });

  it('scope=session returns only the current session', () => {
    const out = filterSessionsForScope([p1, p2], [s1, s2, s3], {
      from: 'x', to: 'y', scope: 'session', currentSessionId: 's2',
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('s2');
  });

  it('scope=project returns only sessions in the current project', () => {
    const out = filterSessionsForScope([p1, p2], [s1, s2, s3], {
      from: 'x', to: 'y', scope: 'project', currentProjectId: 'p1',
    });
    expect(out.map(s => s.id).sort()).toEqual(['s1', 's2']);
  });
});

describe('previewRename', () => {
  it('simple rename — 카이로스 → 카이로르 finds matches in character/world/message', () => {
    const session = makeSession('s1', '카이로스의 이야기', [
      '카이로스가 칼을 뽑았다.',
      '레오나는 카이로스를 따랐다.',
    ]);
    const project = makeProject('p1', [session]);
    const preview = previewRename([project], [session], {
      from: '카이로스', to: '카이로르', scope: 'all',
    });
    expect(preview.totalMatches).toBeGreaterThan(0);
    // First match snippet contains the old name and its replacement.
    expect(preview.matches[0].before).toContain('카이로스');
    expect(preview.matches[0].after).toContain('카이로르');
  });

  it('from=to returns zero matches (noop)', () => {
    const session = makeSession('s1', '카이로스의 이야기', ['카이로스']);
    const project = makeProject('p1', [session]);
    const preview = previewRename([project], [session], {
      from: '카이로스', to: '카이로스', scope: 'all',
    });
    expect(preview.totalMatches).toBe(0);
  });

  it('no matches for absent term', () => {
    const session = makeSession('s1', 'story', ['only mentions leona']);
    const project = makeProject('p1', [session]);
    const preview = previewRename([project], [session], {
      from: 'zenith', to: 'apex', scope: 'all',
    });
    expect(preview.totalMatches).toBe(0);
    expect(preview.matches).toHaveLength(0);
  });

  it('case-sensitive preview respects capitalization', () => {
    const cfg = baseConfig();
    cfg.setting = 'kai and KAI are different';
    const session = makeSession('s1', 't', ['kai'], cfg);
    const preview = previewRename([makeProject('p', [session])], [session], {
      from: 'kai', to: 'zen', caseSensitive: true, scope: 'all',
    });
    // Only the lowercase "kai" occurrences (message + config.setting) should match,
    // not "KAI".
    const total = preview.totalMatches;
    expect(total).toBe(2);
  });

  it('wholeWord does not match inside larger word', () => {
    const cfg = baseConfig();
    cfg.setting = 'hero heroic heroes';
    const session = makeSession('s1', 't', [], cfg);
    const preview = previewRename([makeProject('p', [session])], [session], {
      from: 'hero', to: 'champion', wholeWord: true, caseSensitive: true, scope: 'all',
    });
    // Only literal "hero" at word boundary — "heroic" and "heroes" excluded.
    expect(preview.totalMatches).toBe(1);
  });

  it('special regex characters are escaped (literal match)', () => {
    const cfg = baseConfig();
    cfg.setting = 'label: item.v1 plus item.v2';
    const session = makeSession('s1', 't', [], cfg);
    const preview = previewRename([makeProject('p', [session])], [session], {
      from: 'item.v1', to: 'item.v9', caseSensitive: true, scope: 'all',
    });
    // "." must be literal: exactly one match.
    expect(preview.totalMatches).toBe(1);
  });

  it('character name field is detected', () => {
    const session = makeSession('s1', 't', ['unrelated msg']);
    const preview = previewRename([makeProject('p', [session])], [session], {
      from: '카이로스', to: 'X', scope: 'all',
    });
    const nameMatch = preview.matches.find(m => m.path.includes('characters[0].name'));
    expect(nameMatch).toBeDefined();
    expect(nameMatch?.matchCount).toBe(1);
  });

  it('config.setting is scanned', () => {
    const session = makeSession('s1', 't', []);
    const preview = previewRename([makeProject('p', [session])], [session], {
      from: '냉혹한 제국', to: '자비로운 제국', scope: 'all',
    });
    const settingMatch = preview.matches.find(m => m.path.includes('.config.setting'));
    expect(settingMatch).toBeDefined();
  });

  it('session.messages content is scanned', () => {
    const session = makeSession('s1', 't', ['메시지에 카이로스 등장']);
    const preview = previewRename([makeProject('p', [session])], [session], {
      from: '카이로스', to: '카이로르', scope: 'all',
    });
    const msgMatch = preview.matches.find(m => m.path.includes('messages[0].content'));
    expect(msgMatch).toBeDefined();
  });

  it('scope=session limits to the current session only', () => {
    const s1 = makeSession('s1', 'S1', ['카이로스 s1']);
    const s2 = makeSession('s2', 'S2', ['카이로스 s2']);
    const p = makeProject('p', [s1, s2]);
    const preview = previewRename([p], [s1, s2], {
      from: '카이로스', to: '카이로르', scope: 'session', currentSessionId: 's1',
    });
    // Only s1 messages/config should be considered, but both configs are the
    // same baseConfig — we still expect matches from only s1 paths.
    const fromS1 = preview.matches.filter(m => m.path.includes('session[s1]'));
    const fromS2 = preview.matches.filter(m => m.path.includes('session[s2]'));
    expect(fromS1.length).toBeGreaterThan(0);
    expect(fromS2.length).toBe(0);
  });
});

// ============================================================
// PART 4 — applyRename
// ============================================================

describe('applyRename', () => {
  it('applies replacement and returns fresh projects+sessions with changed count', () => {
    const session = makeSession('s1', '카이로스 전설', ['카이로스가 칼을 뽑았다']);
    const project = makeProject('p1', [session]);
    const result = applyRename([project], [session], {
      from: '카이로스', to: '카이로르', scope: 'all',
    });
    expect(result.changedCount).toBeGreaterThan(0);
    // Original inputs must be untouched (immutable contract).
    expect(project.sessions[0].config.characters[0].name).toBe('카이로스');
    // New session has replaced data.
    const newSession = result.sessions[0];
    expect(newSession.config.characters[0].name).toBe('카이로르');
    expect(newSession.title).toBe('카이로르 전설');
    expect(newSession.messages[0].content).toContain('카이로르');
  });

  it('does nothing when from=to', () => {
    const session = makeSession('s1', 't', ['카이로스']);
    const project = makeProject('p1', [session]);
    const result = applyRename([project], [session], {
      from: '카이로스', to: '카이로스', scope: 'all',
    });
    expect(result.changedCount).toBe(0);
    // Same references returned (no clone needed).
    expect(result.projects[0]).toBe(project);
    expect(result.sessions[0]).toBe(session);
  });

  it('does nothing when from is empty', () => {
    const session = makeSession('s1', 't', ['x']);
    const project = makeProject('p1', [session]);
    const result = applyRename([project], [session], {
      from: '', to: 'zen', scope: 'all',
    });
    expect(result.changedCount).toBe(0);
  });

  it('scope=project only mutates sessions in current project', () => {
    const s1 = makeSession('s1', 'S1', ['카이로스 x']);
    const s2 = makeSession('s2', 'S2', ['카이로스 y']);
    const p1 = makeProject('p1', [s1]);
    const p2 = makeProject('p2', [s2]);
    const result = applyRename([p1, p2], [s1, s2], {
      from: '카이로스', to: '카이로르', scope: 'project', currentProjectId: 'p1',
    });
    expect(result.changedCount).toBeGreaterThan(0);
    // s1 mutated; s2 pristine.
    const newS1 = result.sessions.find(s => s.id === 's1');
    const newS2 = result.sessions.find(s => s.id === 's2');
    expect(newS1?.messages[0].content).toContain('카이로르');
    expect(newS2?.messages[0].content).toContain('카이로스');
    // Reference equality: s2 untouched.
    expect(newS2).toBe(s2);
  });

  it('updates nested project.sessions[] array to match new session ids', () => {
    const session = makeSession('s1', 't', ['카이로스']);
    const project = makeProject('p1', [session]);
    const result = applyRename([project], [session], {
      from: '카이로스', to: '카이로르', scope: 'all',
    });
    const nestedSession = result.projects[0].sessions[0];
    expect(nestedSession).toBe(result.sessions[0]);
    expect(nestedSession.messages[0].content).toContain('카이로르');
  });

  it('handles zero matches — returns original references, count 0', () => {
    const session = makeSession('s1', 't', ['unrelated']);
    const project = makeProject('p1', [session]);
    const result = applyRename([project], [session], {
      from: 'nonexistent', to: 'x', scope: 'all',
    });
    expect(result.changedCount).toBe(0);
    expect(result.sessions[0]).toBe(session);
  });
});
