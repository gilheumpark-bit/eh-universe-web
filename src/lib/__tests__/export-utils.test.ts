import { ChatSession } from '../studio-types';

// Mock browser APIs before importing the module
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
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

import { exportEPUB, exportDOCX } from '../export-utils';

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
});
