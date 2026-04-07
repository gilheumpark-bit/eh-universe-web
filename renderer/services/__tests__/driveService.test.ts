import { getOrCreateAppFolder, saveProjectFile, loadProjectFile, listProjectFiles } from '../driveService';
import { Genre } from '@/lib/studio-types';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const MOCK_TOKEN = 'test-token-123';
const MOCK_FOLDER_ID = 'folder-abc';

const MOCK_PROJECT = {
  id: 'project-1',
  name: 'Test Novel',
  description: 'A test project',
  genre: Genre.FANTASY,
  createdAt: Date.now(),
  lastUpdate: Date.now(),
  sessions: [],
};

beforeEach(() => {
  mockFetch.mockReset();
});

describe('getOrCreateAppFolder', () => {
  it('returns existing folder ID when found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ files: [{ id: MOCK_FOLDER_ID, name: 'NOA Studio' }] }),
    });

    const result = await getOrCreateAppFolder(MOCK_TOKEN);
    expect(result).toBe(MOCK_FOLDER_ID);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('creates folder when none found', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ files: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-folder-id' }) });

    const result = await getOrCreateAppFolder(MOCK_TOKEN);
    expect(result).toBe('new-folder-id');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(getOrCreateAppFolder(MOCK_TOKEN)).rejects.toThrow('Drive search failed: 401');
  });
});

describe('listProjectFiles', () => {
  it('returns file list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [
          { id: 'file-1', name: 'Novel_project-1.json', modifiedTime: '2026-01-01T00:00:00Z' },
        ],
      }),
    });

    const result = await listProjectFiles(MOCK_TOKEN, MOCK_FOLDER_ID);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Novel_project-1.json');
  });
});

describe('saveProjectFile', () => {
  it('creates new file via multipart upload', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'new-file-id' }) });

    const fileId = await saveProjectFile(MOCK_TOKEN, MOCK_FOLDER_ID, MOCK_PROJECT);
    expect(fileId).toBe('new-file-id');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('uploadType=multipart');
    expect(options.method).toBe('POST');
  });

  it('updates existing file via PATCH', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'existing-file' }) });

    const fileId = await saveProjectFile(MOCK_TOKEN, MOCK_FOLDER_ID, MOCK_PROJECT, 'existing-file');
    expect(fileId).toBe('existing-file');

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('existing-file');
    expect(options.method).toBe('PATCH');
  });
});

describe('loadProjectFile', () => {
  it('downloads and parses JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(MOCK_PROJECT),
    });

    const result = await loadProjectFile(MOCK_TOKEN, 'file-1');
    expect(result.id).toBe('project-1');
    expect(result.name).toBe('Test Novel');
  });

  it('throws on download error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    await expect(loadProjectFile(MOCK_TOKEN, 'bad-id')).rejects.toThrow('Drive download failed: 404');
  });
});
