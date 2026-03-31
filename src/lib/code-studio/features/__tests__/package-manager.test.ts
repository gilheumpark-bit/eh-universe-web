/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for package-manager module
 */
describe('package-manager', () => {
  it('module loads without error', () => { expect(() => require('../package-manager')).not.toThrow(); });
  it('exports package manager utilities', () => { expect(typeof require('../package-manager')).toBe('object'); });
});
