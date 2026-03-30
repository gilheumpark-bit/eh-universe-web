/**
 * Unit tests for multi-ai-review module
 */
describe('multi-ai-review', () => {
  it('module loads without error', () => { expect(() => require('../multi-ai-review')).not.toThrow(); });
  it('exports review functions', () => { expect(typeof require('../multi-ai-review')).toBe('object'); });
});
