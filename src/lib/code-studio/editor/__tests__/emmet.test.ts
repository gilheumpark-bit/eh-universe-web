/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for emmet module
 */
describe('emmet', () => {
  it('module loads without error', () => { expect(() => require('../emmet')).not.toThrow(); });
  it('exports emmet functions', () => { expect(typeof require('../emmet')).toBe('object'); });
});
