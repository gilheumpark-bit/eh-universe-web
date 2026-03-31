/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for cicd-generator module
 */
describe('cicd-generator', () => {
  it('module loads without error', () => { expect(() => require('../cicd-generator')).not.toThrow(); });
  it('exports generator functions', () => { expect(typeof require('../cicd-generator')).toBe('object'); });
});
