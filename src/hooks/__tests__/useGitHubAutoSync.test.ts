jest.mock('../useGitHubSync', () => ({
  useGitHubSync: jest.fn(() => ({
    connected: false,
    syncing: false,
    lastSyncAt: null,
    error: null,
    saveFile: jest.fn(),
  })),
}));

import { buildGitHubAutoSyncPath } from '../useGitHubAutoSync';

describe('useGitHubAutoSync path scope', () => {
  it('프로젝트 ID가 있으면 프로젝트 폴더 아래로 원고를 저장한다', () => {
    expect(buildGitHubAutoSyncPath('project-A', 7)).toBe('projects/project-A/manuscripts/episode-007.md');
  });

  it('프로젝트 ID가 다르면 같은 회차도 다른 경로를 쓴다', () => {
    expect(buildGitHubAutoSyncPath('project-A', 1)).not.toBe(buildGitHubAutoSyncPath('project-B', 1));
  });

  it('프로젝트 ID의 경로 위험 문자는 안전한 세그먼트로 정리한다', () => {
    expect(buildGitHubAutoSyncPath('my/project #1', 12)).toBe('projects/my-project-1/manuscripts/episode-012.md');
  });

  it('프로젝트 ID가 없어도 루트가 아니라 no-project 격리 폴더에 저장한다', () => {
    expect(buildGitHubAutoSyncPath(null, 3)).toBe('projects/no-project/manuscripts/episode-003.md');
  });
});
