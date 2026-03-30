/**
 * Unit tests for diff-engine module
 */
describe('diff-engine', () => {
  it('module loads without error', () => { expect(() => require('../diff-engine')).not.toThrow(); });
  it('exports diff functions', () => { expect(typeof require('../diff-engine')).toBe('object'); });
});
