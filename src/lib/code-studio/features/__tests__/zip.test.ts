/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for zip module
 */
describe('zip', () => {
  it('module loads without error', () => { expect(() => require('../zip')).not.toThrow(); });
  it('exports zip utilities', () => { expect(typeof require('../zip')).toBe('object'); });
});
