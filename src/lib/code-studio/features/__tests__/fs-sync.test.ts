/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for fs-sync module
 */
describe('fs-sync', () => {
  it('module loads without error', () => { expect(() => require('../fs-sync')).not.toThrow(); });
  it('exports sync functions', () => { expect(typeof require('../fs-sync')).toBe('object'); });
});
