/**
 * Unit tests for error-reporter module
 */
describe('error-reporter', () => {
  it('module loads without error', () => { expect(() => require('../error-reporter')).not.toThrow(); });
  it('exports reporter functions', () => { expect(typeof require('../error-reporter')).toBe('object'); });
});
