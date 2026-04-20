// ============================================================
// payload-extractor.test — M1.5.3 탭별 추출 함수 검증
// ============================================================
//
// 검증 축:
//   1) 정상 경로 — 각 operation 별 field 추출
//   2) Null-safe — 빈 projects / 미존재 sessionId / 누락 config
//   3) 해시 독립성 — Rulebook 편집이 Character payload 를 바꾸지 않음
//   4) Canonical 안정 — 동일 입력 동일 출력
//
// 해시는 @/lib/save-engine/hash 의 canonicalJson + sha256 을 직접 호출해
// 상호 작용 검증 (extractor 출력이 canonical JSON 직렬화 가능한지).

import type { Project } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import {
  extractManuscript,
  extractSceneDirection,
  extractCharacters,
  extractWorldSim,
  extractStyle,
} from '@/lib/save-engine/payload-extractor';
import { canonicalJson, sha256, utf8Encode } from '@/lib/save-engine/hash';

// ============================================================
// PART 1 — Fixtures
// ============================================================

function makeSession(sessionId: string, overrides: Partial<{
  manuscripts: { episode: number; content: string }[];
  sceneDirection: { writerNotes?: string } & Record<string, unknown>;
  characters: { id: string; name: string }[];
  worldSim: { civs?: { name: string; era: string; color: string; traits: string[] }[] };
  style: { selectedDNA?: number[]; sliders?: Record<string, number> };
  corePremise: string;
  currentEpisode: number;
}> = {}): Project['sessions'][number] {
  return {
    id: sessionId,
    title: sessionId,
    messages: [],
    config: {
      genre: Genre.SF,
      povCharacter: '',
      setting: '',
      primaryEmotion: '',
      episode: overrides.currentEpisode ?? 1,
      title: '',
      totalEpisodes: 25,
      guardrails: { min: 3000, max: 5000 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      platform: 'MOBILE' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      characters: (overrides.characters ?? []) as any,
      manuscripts: (overrides.manuscripts ?? []).map((m) => ({
        episode: m.episode,
        title: `Ep ${m.episode}`,
        content: m.content,
        charCount: m.content.length,
        lastUpdate: 1,
      })),
      corePremise: overrides.corePremise ?? '',
      sceneDirection: overrides.sceneDirection ?? undefined,
      worldSimData: overrides.worldSim,
      styleProfile: overrides.style as never,
    },
    lastUpdate: 1_700_000_000_000,
  };
}

function makeProjects(sessions: Project['sessions']): Project[] {
  return [
    {
      id: 'p-1',
      name: 'P1',
      description: '',
      genre: Genre.SF,
      createdAt: 1,
      lastUpdate: 1,
      sessions,
    },
  ];
}

async function hashOf(payload: unknown): Promise<string> {
  return sha256(utf8Encode(canonicalJson(payload)));
}

// ============================================================
// PART 2 — extractManuscript
// ============================================================

describe('payload-extractor — extractManuscript', () => {
  test('정상: 현재 에피소드 원고 추출', () => {
    const s = makeSession('s-1', {
      manuscripts: [
        { episode: 1, content: 'body1' },
        { episode: 2, content: 'body2' },
      ],
      currentEpisode: 2,
    });
    const payload = extractManuscript(makeProjects([s]), 's-1');
    expect(payload.sessionId).toBe('s-1');
    expect(payload.episode).toBe(2);
    expect(payload.manuscript?.content).toBe('body2');
  });

  test('episode 명시 인자 우선', () => {
    const s = makeSession('s-1', {
      manuscripts: [
        { episode: 1, content: 'body1' },
        { episode: 2, content: 'body2' },
      ],
      currentEpisode: 2,
    });
    const payload = extractManuscript(makeProjects([s]), 's-1', 1);
    expect(payload.episode).toBe(1);
    expect(payload.manuscript?.content).toBe('body1');
  });

  test('미존재 sessionId → manuscript=null, sessionId는 입력 그대로', () => {
    const s = makeSession('s-1');
    const payload = extractManuscript(makeProjects([s]), 's-ghost');
    expect(payload.sessionId).toBe('s-ghost');
    expect(payload.manuscript).toBeNull();
  });

  test('sessionId null → sentinel 사용 + manuscript null', () => {
    const s = makeSession('s-1');
    const payload = extractManuscript(makeProjects([s]), null);
    expect(payload.manuscript).toBeNull();
    expect(payload.sessionId.length).toBeGreaterThan(0);
  });

  test('빈 projects → null-safe', () => {
    const payload = extractManuscript([], 's-1', 1);
    expect(payload.manuscript).toBeNull();
    expect(payload.episode).toBe(1);
  });

  test('에피소드 미존재 → manuscript=null, episode는 타겟값 유지', () => {
    const s = makeSession('s-1', {
      manuscripts: [{ episode: 1, content: 'x' }],
    });
    const payload = extractManuscript(makeProjects([s]), 's-1', 99);
    expect(payload.episode).toBe(99);
    expect(payload.manuscript).toBeNull();
  });
});

// ============================================================
// PART 3 — extractSceneDirection
// ============================================================

describe('payload-extractor — extractSceneDirection', () => {
  test('정상: sceneDirection + episodeSceneSheets 묶음', () => {
    const s = makeSession('s-1', {
      sceneDirection: { writerNotes: 'note-1' },
    });
    const payload = extractSceneDirection(makeProjects([s]), 's-1');
    expect(payload.sessionId).toBe('s-1');
    expect(payload.sceneDirection?.writerNotes).toBe('note-1');
    expect(payload.episodeSceneSheets).toEqual([]);
  });

  test('sceneDirection 누락 → null', () => {
    const s = makeSession('s-1');
    const payload = extractSceneDirection(makeProjects([s]), 's-1');
    expect(payload.sceneDirection).toBeNull();
  });

  test('미존재 sessionId — 빈 값 반환', () => {
    const payload = extractSceneDirection(makeProjects([]), 's-ghost');
    expect(payload.sceneDirection).toBeNull();
    expect(payload.episodeSceneSheets).toEqual([]);
  });
});

// ============================================================
// PART 4 — extractCharacters
// ============================================================

describe('payload-extractor — extractCharacters', () => {
  test('정상: characters 배열', () => {
    const s = makeSession('s-1', {
      characters: [
        { id: 'c-1', name: 'Alice' },
        { id: 'c-2', name: 'Bob' },
      ],
    });
    const payload = extractCharacters(makeProjects([s]), 's-1');
    expect(payload.characters.length).toBe(2);
    expect(payload.characters[0].name).toBe('Alice');
    expect(payload.charRelations).toEqual([]);
  });

  test('null config — 빈 배열', () => {
    const payload = extractCharacters([], null);
    expect(payload.characters).toEqual([]);
    expect(payload.charRelations).toEqual([]);
  });
});

// ============================================================
// PART 5 — extractWorldSim
// ============================================================

describe('payload-extractor — extractWorldSim', () => {
  test('정상: worldSimData + worldFields 스냅샷', () => {
    const s = makeSession('s-1', {
      worldSim: { civs: [{ name: 'Arca', era: 'iron', color: '#000', traits: ['magic'] }] },
      corePremise: 'gods sleep',
    });
    const payload = extractWorldSim(makeProjects([s]), 's-1');
    expect(payload.worldSimData?.civs?.[0].name).toBe('Arca');
    expect(payload.worldFields.corePremise).toBe('gods sleep');
    // 누락된 스칼라는 '' 로 정규화
    expect(payload.worldFields.powerStructure).toBe('');
  });

  test('미존재 sessionId — worldFields 전부 "" ', () => {
    const payload = extractWorldSim([], 's-ghost');
    expect(payload.worldSimData).toBeNull();
    expect(Object.values(payload.worldFields).every((v) => v === '')).toBe(true);
  });
});

// ============================================================
// PART 6 — extractStyle
// ============================================================

describe('payload-extractor — extractStyle', () => {
  test('정상: styleProfile 추출', () => {
    const s = makeSession('s-1', {
      style: { selectedDNA: [0, 1], sliders: { s1: 3 } },
    });
    const payload = extractStyle(makeProjects([s]), 's-1');
    expect(payload.styleProfile?.selectedDNA).toEqual([0, 1]);
  });

  test('누락 → null', () => {
    const s = makeSession('s-1');
    const payload = extractStyle(makeProjects([s]), 's-1');
    expect(payload.styleProfile).toBeNull();
  });
});

// ============================================================
// PART 7 — 해시 독립성 (G5 교차 오염 방지)
// ============================================================

describe('payload-extractor — 해시 독립성 (operation 간 격리)', () => {
  test('sceneDirection 변경은 character 해시 영향 없음', async () => {
    const baseChar = [{ id: 'c-1', name: 'Alice' }];
    const s1 = makeSession('s-1', {
      characters: baseChar,
      sceneDirection: { writerNotes: 'note-A' },
    });
    const s2 = makeSession('s-1', {
      characters: baseChar,
      sceneDirection: { writerNotes: 'note-B' }, // only sceneDirection changed
    });
    const hashCharA = await hashOf(extractCharacters(makeProjects([s1]), 's-1'));
    const hashCharB = await hashOf(extractCharacters(makeProjects([s2]), 's-1'));
    expect(hashCharA).toBe(hashCharB); // character 해시 불변

    const hashSceneA = await hashOf(extractSceneDirection(makeProjects([s1]), 's-1'));
    const hashSceneB = await hashOf(extractSceneDirection(makeProjects([s2]), 's-1'));
    expect(hashSceneA).not.toBe(hashSceneB); // sceneDirection 해시는 변경됨
  });

  test('manuscript 변경은 style 해시 영향 없음', async () => {
    const baseStyle = { selectedDNA: [0, 1], sliders: { s1: 2 } };
    const s1 = makeSession('s-1', {
      manuscripts: [{ episode: 1, content: 'old' }],
      style: baseStyle,
      currentEpisode: 1,
    });
    const s2 = makeSession('s-1', {
      manuscripts: [{ episode: 1, content: 'NEW' }],
      style: baseStyle,
      currentEpisode: 1,
    });
    const styleA = await hashOf(extractStyle(makeProjects([s1]), 's-1'));
    const styleB = await hashOf(extractStyle(makeProjects([s2]), 's-1'));
    expect(styleA).toBe(styleB);

    const msA = await hashOf(extractManuscript(makeProjects([s1]), 's-1'));
    const msB = await hashOf(extractManuscript(makeProjects([s2]), 's-1'));
    expect(msA).not.toBe(msB);
  });

  test('worldSim 변경은 manuscript 해시 영향 없음', async () => {
    const baseManu = [{ episode: 1, content: 'body' }];
    const s1 = makeSession('s-1', {
      manuscripts: baseManu,
      corePremise: 'v1',
      currentEpisode: 1,
    });
    const s2 = makeSession('s-1', {
      manuscripts: baseManu,
      corePremise: 'v2',
      currentEpisode: 1,
    });
    const msA = await hashOf(extractManuscript(makeProjects([s1]), 's-1'));
    const msB = await hashOf(extractManuscript(makeProjects([s2]), 's-1'));
    expect(msA).toBe(msB);

    const wA = await hashOf(extractWorldSim(makeProjects([s1]), 's-1'));
    const wB = await hashOf(extractWorldSim(makeProjects([s2]), 's-1'));
    expect(wA).not.toBe(wB);
  });
});

// ============================================================
// PART 8 — Canonical 안정 / 직렬화
// ============================================================

describe('payload-extractor — canonical JSON 직렬화', () => {
  test('모든 extractor 결과는 canonicalJson 실행 가능', () => {
    const s = makeSession('s-1', {
      manuscripts: [{ episode: 1, content: 'x' }],
      characters: [{ id: 'c-1', name: 'A' }],
      worldSim: { civs: [] },
      style: { selectedDNA: [], sliders: {} },
      sceneDirection: { writerNotes: 'n' },
    });
    const projects = makeProjects([s]);
    // 모든 5 추출 결과를 canonical 직렬화 — throw 없음
    expect(() => canonicalJson(extractManuscript(projects, 's-1'))).not.toThrow();
    expect(() => canonicalJson(extractSceneDirection(projects, 's-1'))).not.toThrow();
    expect(() => canonicalJson(extractCharacters(projects, 's-1'))).not.toThrow();
    expect(() => canonicalJson(extractWorldSim(projects, 's-1'))).not.toThrow();
    expect(() => canonicalJson(extractStyle(projects, 's-1'))).not.toThrow();
  });

  test('동일 입력 → 동일 canonical 문자열', () => {
    const s = makeSession('s-1', {
      characters: [{ id: 'c-1', name: 'A' }],
    });
    const p = makeProjects([s]);
    const a = canonicalJson(extractCharacters(p, 's-1'));
    const b = canonicalJson(extractCharacters(p, 's-1'));
    expect(a).toBe(b);
  });
});

// IDENTITY_SEAL: PART-1..8 | role=payload-extractor-tests | inputs=projects+sessionId | outputs=14 cases
