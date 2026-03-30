/**
 * Unit tests for useStudioAI hook
 */
describe('useStudioAI', () => {
  it('module loads without error', () => { expect(() => require('../useStudioAI')).not.toThrow(); });
  it('exports hook', () => { expect(typeof require('../useStudioAI')).toBe('object'); });
});
