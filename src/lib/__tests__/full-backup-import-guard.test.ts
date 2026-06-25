jest.mock('@/lib/project-migration', () => ({
  loadProjects: jest.fn(() => []),
  saveProjects: jest.fn(() => true),
  STORAGE_KEY_PROJECTS: 'noa_projects',
}));

import { importFullBundle } from '@/lib/full-backup';

describe('full-backup · import guard', () => {
  it('rejects oversized import before reading file content', async () => {
    const text = jest.fn(async () => JSON.stringify({ version: '1.0' }));
    const file = {
      name: 'backup.json',
      type: 'application/json',
      size: 26 * 1024 * 1024,
      text,
    } as unknown as File;

    const result = await importFullBundle(file);

    expect(result.success).toBe(false);
    expect(result.warnings).toContain('parse failed');
    expect(text).not.toHaveBeenCalled();
  });
});
