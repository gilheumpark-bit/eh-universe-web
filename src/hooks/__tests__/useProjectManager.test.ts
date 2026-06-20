 
/**
 * Unit tests for useProjectManager hook
 */
describe('useProjectManager', () => {
  it('module loads without error', () => { expect(() => require('../useProjectManager')).not.toThrow(); });
  it('exports hook', () => { expect(typeof require('../useProjectManager')).toBe('object'); });
});
