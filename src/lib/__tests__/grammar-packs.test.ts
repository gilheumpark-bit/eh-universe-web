/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for grammar-packs module
 */
describe('grammar-packs', () => {
  it('module loads without error', () => { expect(() => require('../grammar-packs')).not.toThrow(); });
  it('exports grammar definitions', () => { expect(typeof require('../grammar-packs')).toBe('object'); });
});
