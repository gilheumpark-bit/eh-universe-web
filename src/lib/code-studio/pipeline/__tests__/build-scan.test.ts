/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for build-scan module
 */
describe('build-scan', () => {
  it('module loads without error', () => {
    expect(() => require('../build-scan')).not.toThrow();
  });

  it('exports are an object', () => {
    const mod = require('../build-scan');
    expect(typeof mod).toBe('object');
  });
});
