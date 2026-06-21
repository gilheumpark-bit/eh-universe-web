 
/**
 * Unit tests for useStudioAI hook
 */
describe('useStudioAI', () => {
  it('module loads without error', () => { expect(() => require('../useStudioAI')).not.toThrow(); });
  it('exports hook', () => { expect(typeof require('../useStudioAI')).toBe('object'); });

  it('노아 기록 경계는 localStorage 미러가 아니라 현재 프로젝트 ID를 따른다', () => {
    window.localStorage.setItem('noa_studio_currentProjectId', 'project-polluted');
    const { resolveNoaProjectScopeId } = require('../useStudioAI');

    expect(resolveNoaProjectScopeId(' project-current ')).toBe('project-current');
    expect(resolveNoaProjectScopeId('')).toBeNull();
    expect(resolveNoaProjectScopeId(undefined)).toBeNull();
    expect(resolveNoaProjectScopeId(null)).toBeNull();
    expect(window.localStorage.getItem('noa_studio_currentProjectId')).toBe('project-polluted');
  });
});
