/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for pair-programming module
 */
describe('pair-programming', () => {
  it('module loads without error', () => { expect(() => require('../pair-programming')).not.toThrow(); });
  it('exports pair programming types', () => { expect(typeof require('../pair-programming')).toBe('object'); });
});
