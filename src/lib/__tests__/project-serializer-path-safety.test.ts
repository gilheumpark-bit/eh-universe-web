import { configToRepoFiles, normalizeSafeRepoPath } from '@/lib/project-serializer';

describe('project-serializer · repo path safety', () => {
  it('rejects traversal, absolute, and git paths', () => {
    expect(normalizeSafeRepoPath('../escape.md')).toBeNull();
    expect(normalizeSafeRepoPath('/absolute.md')).toBeNull();
    expect(normalizeSafeRepoPath('C:/tmp/escape.md')).toBeNull();
    expect(normalizeSafeRepoPath('.git/config')).toBeNull();
  });

  it('falls back to generated episode path when stored manuscript filePath is unsafe', () => {
    const files = configToRepoFiles({
      manuscripts: [
        {
          episode: 3,
          title: 'safe title',
          content: 'body',
          filePath: '../outside.md',
        },
      ],
    } as never);

    expect(files.some((file) => file.path === '../outside.md')).toBe(false);
    expect(files.some((file) => file.path.includes('ep-003.md'))).toBe(true);
  });
});
