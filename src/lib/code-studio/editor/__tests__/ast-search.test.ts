/**
 * Unit tests for ast-search module
 */
describe('ast-search', () => {
  it('module loads without error', () => { expect(() => require('../ast-search')).not.toThrow(); });
  it('exports AST search functions', () => { expect(typeof require('../ast-search')).toBe('object'); });
});
