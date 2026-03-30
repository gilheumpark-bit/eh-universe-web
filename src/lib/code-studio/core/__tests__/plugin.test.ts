/**
 * Unit tests for plugin module
 */
describe('plugin', () => {
  it('module loads without error', () => { expect(() => require('../plugin')).not.toThrow(); });
  it('exports plugin types', () => { expect(typeof require('../plugin')).toBe('object'); });
});
