/**
 * Unit tests for pipeline module (code-studio internal)
 */
describe('code-studio/pipeline', () => {
  it('module loads without error', () => { expect(() => require('../pipeline')).not.toThrow(); });
  it('exports pipeline functions', () => { expect(typeof require('../pipeline')).toBe('object'); });
});
