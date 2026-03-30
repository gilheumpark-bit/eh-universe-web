/**
 * Unit tests for network-types module
 */
describe('network-types', () => {
  it('module loads without error', () => { expect(() => require('../network-types')).not.toThrow(); });
  it('exports type definitions', () => { expect(typeof require('../network-types')).toBe('object'); });
});
