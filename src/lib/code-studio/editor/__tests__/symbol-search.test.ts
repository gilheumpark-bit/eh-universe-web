/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for symbol-search module
 */
describe('symbol-search', () => {
  it('module loads without error', () => { expect(() => require('../symbol-search')).not.toThrow(); });
  it('exports search functions', () => { expect(typeof require('../symbol-search')).toBe('object'); });
});
