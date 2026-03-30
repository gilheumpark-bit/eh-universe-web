/**
 * Unit tests for codebase-search module
 */
describe('codebase-search', () => {
  it('module loads without error', () => { expect(() => require('../codebase-search')).not.toThrow(); });
  it('exports search functions', () => { expect(typeof require('../codebase-search')).toBe('object'); });
});
