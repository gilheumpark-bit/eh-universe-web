import { ChatSession } from '../studio-types';
import JSZip from 'jszip';

// Mock browser APIs before importing the module
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn((_blob?: unknown) => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    parts: unknown[];
    options: unknown;
    constructor(parts: unknown[], options?: unknown) {
      this.parts = parts;
      this.options = options;
    }
  },
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(() => ({
    href: '',
    download: '',
    click: mockClick,
  })),
});

import { exportEPUB, exportDOCX, exportHWPX } from '../export-utils';

function makeSession(overrides: Partial<ChatSession> = {}): ChatSession {
  return {
    id: 'test-session-1',
    title: 'Test Story',
    messages: [],
    config: {
      genre: 'fantasy' as never,
      povCharacter: 'Alice',
      setting: 'Medieval',
      primaryEmotion: 'tension',
      episode: 1,
      title: 'My Story',
      totalEpisodes: 10,
      guardrails: { rating: 'teen', violence: 'medium', sexual: 'none', language: 'mild', drugs: 'none' } as never,
      characters: [],
      platform: 'KAKAO' as never,
    },
    lastUpdate: Date.now(),
    ...overrides,
  };
}

describe('export-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportEPUB', () => {
    it('guards against empty manuscripts (alerts + early return, no blob created)', () => {
      const session = makeSession({ messages: [] });
      // Current behavior: empty manuscripts + no assistant messages => alert + return
      exportEPUB(session);
      // Blob should NOT be created since export was aborted
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it('exports from assistant messages', () => {
      const session = makeSession({
        messages: [
          { id: 'm1', role: 'assistant', content: 'Chapter one content.', timestamp: 1 },
          { id: 'm2', role: 'user', content: 'Continue', timestamp: 2 },
          { id: 'm3', role: 'assistant', content: 'Chapter two content.', timestamp: 3 },
        ],
      });
      exportEPUB(session);
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('exports from manuscripts when available', () => {
      const session = makeSession();
      (session.config as unknown as Record<string, unknown>).manuscripts = [
        { episode: 1, title: 'EP1', content: 'First episode text.' },
        { episode: 2, title: 'EP2', content: 'Second episode text.' },
      ];
      exportEPUB(session);
      expect(mockClick).toHaveBeenCalled();
    });

    it('handles single assistant message', () => {
      const session = makeSession({
        messages: [
          { id: 'm1', role: 'assistant', content: 'Only one message.', timestamp: 1 },
        ],
      });
      exportEPUB(session);
      expect(mockClick).toHaveBeenCalled();
    });

    it('strips json code blocks from messages', () => {
      const session = makeSession({
        messages: [
          { id: 'm1', role: 'assistant', content: 'Text before ```json\n{"key":"val"}\n``` text after', timestamp: 1 },
        ],
      });
      exportEPUB(session);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportDOCX', () => {
    it('exports DOCX with assistant messages', () => {
      const session = makeSession({
        messages: [
          { id: 'm1', role: 'assistant', content: 'Hello world\nSecond line', timestamp: 1 },
        ],
      });
      exportDOCX(session);
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('exports DOCX with empty lines', () => {
      const session = makeSession({
        messages: [
          { id: 'm1', role: 'assistant', content: 'Line one\n\nLine three', timestamp: 1 },
        ],
      });
      exportDOCX(session);
      expect(mockClick).toHaveBeenCalled();
    });

    it('handles special XML characters', () => {
      const session = makeSession({
        messages: [
          { id: 'm1', role: 'assistant', content: '<div>Test & "quotes"</div>', timestamp: 1 },
        ],
      });
      exportDOCX(session);
      expect(mockClick).toHaveBeenCalled();
    });

    it('uses fallback title when config.title is empty', () => {
      const session = makeSession({
        title: 'Fallback Title',
        messages: [
          { id: 'm1', role: 'assistant', content: 'Content', timestamp: 1 },
        ],
      });
      session.config.title = '';
      exportDOCX(session);
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportHWPX', () => {
    it('exports HWPX from saved manuscripts', async () => {
      const session = makeSession();
      (session.config as unknown as Record<string, unknown>).manuscripts = [
        { episode: 1, title: '제 1화', content: '첫 회차 원고입니다.' },
      ];

      exportHWPX(session);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      const results = (document.createElement as jest.Mock).mock.results;
      const anchor = results[results.length - 1]?.value as { download?: string };
      expect(anchor.download).toBe('My Story.hwpx');

      const objectUrlCalls = mockCreateObjectURL.mock.calls;
      const blobArg = objectUrlCalls[objectUrlCalls.length - 1]?.[0] as { parts?: unknown[] };
      const zipBytes = blobArg.parts?.[0] as Uint8Array;
      const zip = await JSZip.loadAsync(zipBytes);
      expect(zip.file('mimetype')).toBeTruthy();
      expect(zip.file('Contents/section0.xml')).toBeTruthy();
      const sectionXml = await zip.file('Contents/section0.xml')!.async('string');
      expect(sectionXml).toContain('제 1화');
      expect(sectionXml).toContain('첫 회차 원고입니다.');
    });
  });
});
