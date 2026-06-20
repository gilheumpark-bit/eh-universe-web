/**
 * Unit tests for Studio import project scope helpers.
 */

describe('useStudioImport project scope', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('불러오기 과정기록 경계는 localStorage 미러가 아니라 현재 프로젝트 ID를 따른다', () => {
    window.localStorage.setItem('noa_studio_currentProjectId', 'project-polluted');
    const { resolveStudioImportProjectScopeId } = require('../useStudioImport');

    expect(resolveStudioImportProjectScopeId(' project-current ')).toBe('project-current');
    expect(resolveStudioImportProjectScopeId('')).toBeNull();
    expect(resolveStudioImportProjectScopeId(undefined)).toBeNull();
    expect(resolveStudioImportProjectScopeId(null)).toBeNull();
    expect(window.localStorage.getItem('noa_studio_currentProjectId')).toBe('project-polluted');
  });
});
