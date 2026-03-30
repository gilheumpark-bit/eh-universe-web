/**
 * Unit tests for deploy module
 */
describe('deploy', () => {
  it('module loads without error', () => { expect(() => require('../deploy')).not.toThrow(); });
  it('exports deploy types', () => { expect(typeof require('../deploy')).toBe('object'); });
});
