/**
 * Unit tests for inline-diff module
 */
describe('inline-diff', () => {
  it('module loads without error', () => { expect(() => require('../inline-diff')).not.toThrow(); });
  it('exports inline diff utilities', () => { expect(typeof require('../inline-diff')).toBe('object'); });
});
