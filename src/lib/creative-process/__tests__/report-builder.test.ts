// ============================================================
// report-builder.test.ts — 빌더 4 케이스
// ============================================================

import type { CreativeEvent } from '../types';
import { LIMITATION_TEXT_4LANG } from '../limitation-text';

// IndexedDB 의존 함수 mock
jest.mock('../event-recorder', () => {
  const mockHash = async (event: Record<string, unknown>) => {
    const { eventHash: _eventHash, ...rest } = event;
    void _eventHash;
    const text = JSON.stringify(rest);
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(64, '0');
  };
  return {
    listCreativeEvents: jest.fn().mockResolvedValue([]),
    recordCreativeEvent: jest.fn(),
    countCreativeEvents: jest.fn().mockResolvedValue(0),
    computeEventHash: mockHash,
    CREATIVE_EVENT_CAPTURED: 'noa:creative-event-captured',
  };
});

jest.mock('../source-recorder', () => ({
  listSources: jest.fn().mockResolvedValue([]),
  recordSource: jest.fn(),
  countSources: jest.fn().mockResolvedValue(0),
  getSource: jest.fn(),
  // SHA-256 헬퍼는 실제 구현 사용 (Web Crypto API)
  computeSha256Hex: async (text: string) => {
    // jsdom 에 SubtleCrypto 미지원 — fallback hash
    let h = 0;
    for (let i = 0; i < text.length; i++) h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(64, '0');
  },
}));

import { buildCertificate } from '../report-builder';
import { listCreativeEvents } from '../event-recorder';

const mockedListCreativeEvents = listCreativeEvents as jest.MockedFunction<typeof listCreativeEvents>;

describe('report-builder — buildCertificate', () => {
  beforeEach(() => {
    mockedListCreativeEvents.mockResolvedValue([]);
  });

  it('빈 input → 빈 cert (summaryStats 모두 0)', async () => {
    const result = await buildCertificate({
      projectId: 'test-project',
      view: 'private',
      language: 'ko',
      projectMeta: { name: '테스트' },
      episodes: [],
    });

    expect(result.cert.summaryStats.totalEpisodes).toBe(0);
    expect(result.cert.summaryStats.totalUnits).toBe(0);
    expect(result.cert.summaryStats.aiAssistUsed).toBe(false);
    expect(result.cert.summaryStats.externalImportCount).toBe(0);
    expect(result.cert.summaryStats.humanRevisionCount).toBe(0);
  });

  it('한계 문구 byte-level 4언어 일치 (limitation-statement section)', async () => {
    const languages = ['ko', 'en', 'ja', 'zh'] as const;
    for (const lang of languages) {
      const result = await buildCertificate({
        projectId: 'test',
        view: 'private',
        language: lang,
        projectMeta: { name: 'A' },
        episodes: [{ episode: 1, content: 'Hello' }],
      });
      const limit = result.sections['limitation-statement'];
      expect(limit).toBeTruthy();
      expect(limit!.rows[0].value).toBe(LIMITATION_TEXT_4LANG[lang]);
    }
  });

  it('금지어 throw — projectMeta.name 에 보증 단어', async () => {
    await expect(
      buildCertificate({
        projectId: 'test',
        view: 'private',
        language: 'ko',
        projectMeta: { name: '보증된 작품' },
        episodes: [{ episode: 1, content: '내용' }],
      }),
    ).rejects.toThrow(/FORBIDDEN_WORD/);
  });

  it('legal view → 발급 가능 (Round 2-3, 분쟁 대응 자료)', async () => {
    const result = await buildCertificate({
      projectId: 'test',
      view: 'legal',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: 'Hello' }],
    });
    expect(result.cert.visibility).toBe('legal');
    expect(result.sections['hash-and-export-time']).toBeTruthy();
    expect(result.sections['limitation-statement']).toBeTruthy();
    expect(result.sections['external-import']).toBeTruthy(); // private 와 동일 섹션
  });

  it('작가 판단 맥락을 author-choice-summary 섹션에 포함한다', async () => {
    const decisionEvent: CreativeEvent = {
      id: '01HZXK3V9T2M4N5P6Q7R8S9T0B',
      projectId: 'test',
      targetType: 'manuscript',
      targetId: 'ep-1',
      eventType: 'accept',
      actorType: 'human',
      actorId: 'author',
      originType: 'AI_SUGGESTION',
      beforeHash: 'b'.repeat(64),
      afterHash: 'a'.repeat(64),
      createdAt: '2026-06-16T00:00:00.000Z',
      appVersion: 'test',
      decisionContext: {
        action: 'accepted',
        selectedAlternativeId: 'alt-2',
        reason: '배신 장면의 동기가 더 자연스러워서 선택',
        alternatives: [
          { id: 'alt-1', label: 'A안', charCount: 120 },
          { id: 'alt-2', label: 'B안', charCount: 140 },
        ],
        delta: { beforeChars: 1000, afterChars: 1120, insertedChars: 120, removedChars: 0, editedChars: 120 },
      },
    };
    mockedListCreativeEvents.mockResolvedValueOnce([decisionEvent]);

    const result = await buildCertificate({
      projectId: 'test',
      view: 'publisher',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: 'Hello' }],
    });

    const section = result.sections['author-choice-summary'];
    expect(section).toBeTruthy();
    expect(section!.rows).toEqual(expect.arrayContaining([
      { key: '판단 기록', value: '1' },
    ]));
    const joined = section!.rows.map((row) => `${row.key}: ${row.value}`).join('\n');
    expect(joined).toContain('선택 근거 1');
    expect(joined).toContain('B안');
    expect(joined).toContain('배신 장면의 동기가 더 자연스러워서 선택');
  });

  it('cert.id, cert.manuscriptHash, cert.timelineHash 모두 생성됨', async () => {
    const result = await buildCertificate({
      projectId: 'test',
      view: 'private',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: 'Hello' }],
    });

    expect(result.cert.id).toBeTruthy();
    expect(result.cert.id.length).toBeGreaterThan(10);
    expect(result.cert.manuscriptHash).toBeTruthy();
    expect(result.cert.timelineHash).toBeTruthy();
    expect(result.cert.sourceSummaryHash).toBeTruthy();
    expect(result.cert.generatedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('표시용 해시 섹션은 원본 64자 해시 대신 축약값을 쓴다', async () => {
    const result = await buildCertificate({
      projectId: 'test',
      view: 'private',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: 'Hello' }],
    });

    const section = result.sections['hash-and-export-time'];
    expect(section).toBeTruthy();
    const hashRows = section!.rows.slice(0, 3);
    expect(hashRows.every((row) => row.value.includes('...'))).toBe(true);
    expect(hashRows.some((row) => row.value === result.cert.manuscriptHash)).toBe(false);
  });

  it('과정기록 해시 체인이 깨져 있으면 확인서 발급을 차단한다', async () => {
    const brokenEvent: CreativeEvent = {
      id: '01HZXK3V9T2M4N5P6Q7R8S9T0A',
      projectId: 'test',
      targetType: 'manuscript',
      targetId: 'ep-1',
      eventType: 'edit',
      actorType: 'human',
      actorId: 'author',
      originType: 'HUMAN_REVISION',
      beforeHash: 'b'.repeat(64),
      afterHash: 'a'.repeat(64),
      createdAt: '2026-06-16T00:00:00.000Z',
      appVersion: 'test',
      parentEventHash: null,
      eventHash: 'f'.repeat(64),
    };
    mockedListCreativeEvents.mockResolvedValueOnce([brokenEvent]);

    await expect(
      buildCertificate({
        projectId: 'test',
        view: 'private',
        language: 'ko',
        projectMeta: { name: 'A' },
        episodes: [{ episode: 1, content: 'Hello' }],
      }),
    ).rejects.toThrow(/EVENT_CHAIN_INVALID/);
  });

  it('외부 조회 링크는 API JSON이 아니라 공개 조회 화면을 가리킨다', async () => {
    const result = await buildCertificate({
      projectId: 'test',
      view: 'public',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: '내용' }],
    });

    expect(result.cert.verificationUrl).toBe(`https://eh-universe.com/verify/${result.cert.id}`);
    expect(result.cert.verificationUrl).not.toContain('/api/cp/verify');
    expect(result.cert.verificationQrDataUrl).toBeTruthy();
  });

  it('view 별 섹션 노출 정책 — public 은 world-baseline X', async () => {
    const result = await buildCertificate({
      projectId: 'test',
      view: 'public',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: '내용' }],
    });
    expect(result.sections['world-baseline']).toBeNull();
  });

  it('view publisher 는 world-baseline 포함', async () => {
    const result = await buildCertificate({
      projectId: 'test',
      view: 'publisher',
      language: 'ko',
      projectMeta: { name: 'A' },
      episodes: [{ episode: 1, content: '내용' }],
    });
    expect(result.sections['world-baseline']).toBeTruthy();
  });
});
