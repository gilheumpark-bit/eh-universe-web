import { migrateSessionsToProjects, loadProjects, saveProjects, STORAGE_KEY_SESSIONS_LEGACY, STORAGE_KEY_PROJECTS } from '../project-migration';
import { Genre, PlatformType } from '../studio-types';

// Mock localStorage + window
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  // Ensure window is defined for SSR guard checks
  (global as unknown as Record<string, unknown>).window = global;
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; },
    },
    writable: true,
  });
});

const MOCK_SESSION = {
  id: 'session-1',
  title: 'Test Novel',
  messages: [],
  config: {
    genre: Genre.SF,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '',
    totalEpisodes: 25,
    guardrails: { min: 3000, max: 5000 },
    characters: [],
    platform: PlatformType.MOBILE,
  },
  lastUpdate: Date.now(),
};

describe('migrateSessionsToProjects', () => {
  it('returns empty when no legacy data', () => {
    expect(migrateSessionsToProjects()).toEqual([]);
  });

  it('wraps legacy sessions into default project', () => {
    store[STORAGE_KEY_SESSIONS_LEGACY] = JSON.stringify([MOCK_SESSION]);
    const result = migrateSessionsToProjects();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('미분류');
    expect(result[0].sessions).toHaveLength(1);
    expect(result[0].sessions[0].id).toBe('session-1');
  });

  it('handles corrupted legacy data', () => {
    store[STORAGE_KEY_SESSIONS_LEGACY] = 'not valid json{{{';
    expect(migrateSessionsToProjects()).toEqual([]);
  });

  it('handles empty array', () => {
    store[STORAGE_KEY_SESSIONS_LEGACY] = '[]';
    expect(migrateSessionsToProjects()).toEqual([]);
  });
});

describe('loadProjects', () => {
  it('returns existing projects when available', () => {
    const projects = [{ id: 'p1', name: 'My Novel', description: '', genre: Genre.FANTASY, createdAt: 1, lastUpdate: 1, sessions: [] }];
    store[STORAGE_KEY_PROJECTS] = JSON.stringify(projects);
    const result = loadProjects();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Novel');
  });

  it('migrates from legacy when no projects key', () => {
    store[STORAGE_KEY_SESSIONS_LEGACY] = JSON.stringify([MOCK_SESSION]);
    const result = loadProjects();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('미분류');
    // Should have saved to new key
    expect(store[STORAGE_KEY_PROJECTS]).toBeDefined();
  });

  it('returns empty when no data at all', () => {
    expect(loadProjects()).toEqual([]);
  });
});

describe('saveProjects', () => {
  it('round-trips correctly', () => {
    const projects = [{ id: 'p1', name: 'Test', description: '', genre: Genre.SF, createdAt: 1, lastUpdate: 1, sessions: [MOCK_SESSION] }];
    saveProjects(projects);
    const loaded = loadProjects();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].sessions).toHaveLength(1);
    expect(loaded[0].sessions[0].title).toBe('Test Novel');
  });
});

// [QA-robustness (4)] QuotaExceededError 구분 + 사용자 고지 (침묵 false 금지).
describe('saveProjects — QuotaExceededError 고지', () => {
  const projects = [{ id: 'p1', name: 'T', description: '', genre: Genre.SF, createdAt: 1, lastUpdate: 1, sessions: [] }];

  function makeQuotaError(): DOMException {
    // jsdom 환경: DOMException 생성자 사용 (name='QuotaExceededError').
    return new DOMException('quota', 'QuotaExceededError');
  }

  it('정리 후에도 quota 초과면 noa:toast(error) 발화 + false 반환', () => {
    // setItem 은 항상 QuotaExceededError throw (정리 후 재시도도 실패).
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: () => { throw makeQuotaError(); },
        removeItem: (k: string) => { delete store[k]; },
        get length() { return Object.keys(store).length; },
        key: (i: number) => Object.keys(store)[i] ?? null,
      },
      writable: true,
    });

    const toastSpy = jest.fn();
    window.addEventListener('noa:toast', toastSpy);

    const ok = saveProjects(projects);

    expect(ok).toBe(false);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    const detail = (toastSpy.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.variant).toBe('error');
    expect(detail.message).toMatch(/저장 공간|내보내기/);

    window.removeEventListener('noa:toast', toastSpy);
  });

  it('재시도(정리 후)에서 성공하면 toast 없이 true 반환', () => {
    let calls = 0;
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          calls += 1;
          if (calls === 1) throw makeQuotaError(); // 1차 실패
          store[k] = v;                            // 정리 후 2차 성공
        },
        removeItem: (k: string) => { delete store[k]; },
        get length() { return Object.keys(store).length; },
        key: (i: number) => Object.keys(store)[i] ?? null,
      },
      writable: true,
    });

    const toastSpy = jest.fn();
    window.addEventListener('noa:toast', toastSpy);

    const ok = saveProjects(projects);

    expect(ok).toBe(true);
    expect(toastSpy).not.toHaveBeenCalled(); // 성공 시 고지 없음

    window.removeEventListener('noa:toast', toastSpy);
  });
});
