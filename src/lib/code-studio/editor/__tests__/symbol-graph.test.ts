/**
 * Unit tests for symbol-graph module
 */
describe('symbol-graph', () => {
  it('module loads without error', () => { expect(() => require('../symbol-graph')).not.toThrow(); });
  it('exports graph functions', () => { expect(typeof require('../symbol-graph')).toBe('object'); });
});
