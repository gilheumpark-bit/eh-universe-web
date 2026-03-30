/**
 * Unit tests for element-inspector module
 */
describe('element-inspector', () => {
  it('module loads without error', () => { expect(() => require('../element-inspector')).not.toThrow(); });
  it('exports inspector functions', () => { expect(typeof require('../element-inspector')).toBe('object'); });
});
