/**
 * Unit tests for gutter-actions module
 */
describe('gutter-actions', () => {
  it('module loads without error', () => { expect(() => require('../gutter-actions')).not.toThrow(); });
  it('exports gutter action types', () => { expect(typeof require('../gutter-actions')).toBe('object'); });
});
