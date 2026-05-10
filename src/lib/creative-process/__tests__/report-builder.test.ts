// ============================================================
// report-builder.test.ts — 빌더 4 케이스
// ============================================================

import { LIMITATION_TEXT_4LANG } from '../limitation-text';

// IndexedDB 의존 함수 mock
jest.mock('../event-recorder', () => ({
  listCreativeEvents: jest.fn().mockResolvedValue([]),
  recordCreativeEvent: jest.fn(),
  countCreativeEvents: jest.fn().mockResolvedValue(0),
  CREATIVE_EVENT_CAPTURED: 'noa:creative-event-captured',
}));

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

describe('report-builder — buildCertificate', () => {
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
