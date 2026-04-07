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
