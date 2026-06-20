jest.mock('@/engine/pipeline', () => ({
  stripEngineArtifacts: jest.fn((text: string) => text.replace(/\[artifact\]/g, '')),
}));

import { sanitizeLoadedProjects, sanitizeLoadedText } from '@/lib/project-sanitize';
import type { Project } from '@/lib/studio-types';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj1',
    name: 'Test',
    description: '',
    genre: 'SF' as never,
    createdAt: 0,
    lastUpdate: 0,
    sessions: [],
    ...overrides,
  };
}

function makeSession(messages: Array<{ role: 'user' | 'assistant'; content: string; versions?: string[] }>, manuscripts?: Array<{ episode: number; title: string; content: string; charCount: number; lastUpdate: number }>) {
  return {
    id: 's1',
    title: 'Session',
    messages: messages.map((m, i) => ({ id: `m${i}`, timestamp: Date.now(), ...m })),
    config: {
      genre: 'SF' as never,
      povCharacter: '',
      setting: '',
      primaryEmotion: '',
      episode: 1,
      title: '',
      totalEpisodes: 1,
      guardrails: { min: 0, max: 100 },
      characters: [],
      platform: 'kakao' as never,
      manuscripts,
    },
    lastUpdate: 0,
  };
}

describe('sanitizeLoadedProjects', () => {
  it('removes visible AI-TEST-INPUT residue from a restored text fragment', () => {
    expect(sanitizeLoadedText('AI-TEST-INPUT 본문')).toBe('본문');
  });

  it('removes visible QA manuscript and project-name residue from restored text', () => {
    expect(
      sanitizeLoadedText(
        '제목: 프로젝트-D-500660\nexport zip manuscript for Loreguard package download check. Author controls the final direction and the package records the process.\nD 권리 500660',
      ),
    ).toBe('제목: 새 작품\n\n권리/IP 메모');
  });

  it('strips artifacts from assistant message content', () => {
    const projects = [
      makeProject({
        sessions: [
          makeSession([
            { role: 'user', content: 'hello [artifact]' },
            { role: 'assistant', content: 'response [artifact] text' },
          ]),
        ],
      }),
    ];

    const result = sanitizeLoadedProjects(projects);
    // user messages should be untouched
    expect(result[0].sessions[0].messages[0].content).toBe('hello [artifact]');
    // assistant messages should be cleaned
    expect(result[0].sessions[0].messages[1].content).toBe('response text');
  });

  it('strips artifacts from message versions', () => {
    const projects = [
      makeProject({
        sessions: [
          makeSession([
            { role: 'assistant', content: 'ok', versions: ['v1 [artifact]', 'v2 [artifact]'] },
          ]),
        ],
      }),
    ];

    const result = sanitizeLoadedProjects(projects);
    expect(result[0].sessions[0].messages[0].versions).toEqual(['v1 ', 'v2 ']);
  });

  it('strips artifacts from manuscripts and recalculates charCount', () => {
    const projects = [
      makeProject({
        sessions: [
          makeSession(
            [{ role: 'user', content: 'x' }],
            [{ episode: 1, title: 'Ep1', content: 'abc[artifact]def', charCount: 999, lastUpdate: 0 }],
          ),
        ],
      }),
    ];

    const result = sanitizeLoadedProjects(projects);
    const ms = result[0].sessions[0].config.manuscripts!;
    expect(ms[0].content).toBe('abcdef');
    expect(ms[0].charCount).toBe(6);
  });

  it('removes visible AI-TEST-INPUT residue from restored project data', () => {
    const projects = [
      makeProject({
        name: 'AI-TEST-INPUT 저장된 작품',
        sessions: [
          makeSession(
            [
              { role: 'user', content: 'AI-TEST-INPUT 작가 메모' },
              { role: 'assistant', content: 'AI-TEST-INPUT 응답 [artifact]' },
            ],
            [{ episode: 1, title: 'Ep1', content: 'AI-TEST-INPUT 본문', charCount: 999, lastUpdate: 0 }],
          ),
        ],
      }),
    ];

    const result = sanitizeLoadedProjects(projects);

    expect(result[0].name).toBe('저장된 작품');
    expect(result[0].sessions[0].messages[0].content).toBe('작가 메모');
    expect(result[0].sessions[0].messages[1].content).toBe('응답 ');
    expect(result[0].sessions[0].config.manuscripts![0].content).toBe('본문');
    expect(result[0].sessions[0].config.manuscripts![0].charCount).toBe(2);
  });

  it('handles empty projects array', () => {
    expect(sanitizeLoadedProjects([])).toEqual([]);
  });

  it('preserves session config when no manuscripts exist', () => {
    const projects = [
      makeProject({
        sessions: [makeSession([{ role: 'assistant', content: '[artifact]' }])],
      }),
    ];

    const result = sanitizeLoadedProjects(projects);
    expect(result[0].sessions[0].config.manuscripts).toBeUndefined();
  });
});
