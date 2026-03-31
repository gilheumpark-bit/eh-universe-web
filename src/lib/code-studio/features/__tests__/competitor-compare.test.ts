/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for competitor-compare module
 */
describe('competitor-compare', () => {
  it('module loads without error', () => { expect(() => require('../competitor-compare')).not.toThrow(); });
  it('exports compare interface', () => { expect(typeof require('../competitor-compare')).toBe('object'); });
});
