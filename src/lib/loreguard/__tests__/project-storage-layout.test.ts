import {
  buildProjectStorageLayout,
  buildProjectStoragePath,
  isInsideProjectStorage,
  listProjectStorageFolders,
  normalizeProjectStorageSegment,
} from '@/lib/loreguard/project-storage-layout';

describe('project-storage-layout', () => {
  it('프로젝트 저장 루트를 projects/{projectId} 아래로 고정한다', () => {
    const layout = buildProjectStorageLayout('작품 A');

    expect(layout.root).toBe('projects/작품-A');
    expect(layout.files.projectJson).toBe('projects/작품-A/project.json');
    expect(layout.files.worldSetting).toBe('projects/작품-A/world/setting.json');
    expect(layout.files.receiptDecisionLog).toBe('projects/작품-A/receipts/decisions.jsonl');
    expect(layout.files.noaComposeNote).toBe('projects/작품-A/work-notes/noa-compose.md');
  });

  it('경로 위험 문자를 저장소 세그먼트에서 제거한다', () => {
    expect(normalizeProjectStorageSegment('my/project #1')).toBe('my-project-1');
    expect(normalizeProjectStorageSegment('')).toBe('no-project');
  });

  it('회차 원고와 번역 회차 경로를 표준 폴더에 만든다', () => {
    expect(
      buildProjectStoragePath({
        projectId: 'project-A',
        kind: 'episodeManuscript',
        episode: 7,
        extension: 'md',
      }),
    ).toBe('projects/project-A/manuscripts/episode-007.md');

    expect(
      buildProjectStoragePath({
        projectId: 'project-A',
        kind: 'translatedEpisode',
        language: 'JA',
        episode: 7,
        extension: 'md',
      }),
    ).toBe('projects/project-A/translations/ja/episode-007.md');
  });

  it('컴포즈, 과정기록, 작업노트, 출고 패키지 경로를 분리한다', () => {
    expect(
      buildProjectStoragePath({
        projectId: 'project-A',
        kind: 'composePlan',
        composeId: '컴포즈 1',
      }),
    ).toBe('projects/project-A/compose/컴포즈-1.json');

    expect(
      buildProjectStoragePath({
        projectId: 'project-A',
        kind: 'receiptLog',
        receiptName: 'exports',
      }),
    ).toBe('projects/project-A/receipts/exports.jsonl');

    expect(
      buildProjectStoragePath({
        projectId: 'project-A',
        kind: 'workNote',
        noteName: 'noa-session',
      }),
    ).toBe('projects/project-A/work-notes/noa-session.md');

    expect(
      buildProjectStoragePath({
        projectId: 'project-A',
        kind: 'exportPackage',
        packageId: 'final-1',
      }),
    ).toBe('projects/project-A/exports/final-1.zip');
  });

  it('프로젝트가 없을 때도 no-project 격리 폴더를 쓴다', () => {
    expect(
      buildProjectStoragePath({
        projectId: null,
        kind: 'episodeManuscript',
        episode: 3,
      }),
    ).toBe('projects/no-project/manuscripts/episode-003.md');
  });

  it('필수 폴더 목록과 프로젝트 내부 여부를 판정한다', () => {
    const folders = listProjectStorageFolders('project-A');

    expect(folders).toContain('projects/project-A/world');
    expect(folders).toContain('projects/project-A/receipts');
    expect(isInsideProjectStorage('project-A', 'projects/project-A/receipts/compose.jsonl')).toBe(true);
    expect(isInsideProjectStorage('project-A', 'projects/project-B/receipts/compose.jsonl')).toBe(false);
  });
});
