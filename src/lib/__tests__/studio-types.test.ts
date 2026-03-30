/**
 * Unit tests for studio-types module
 */
describe('studio-types', () => {
  it('module loads without error', () => { expect(() => require('../studio-types')).not.toThrow(); });
  it('exports type definitions', () => { expect(typeof require('../studio-types')).toBe('object'); });
});
