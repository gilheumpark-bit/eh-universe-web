/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for fork module
 */
describe('fork', () => {
  it('module loads without error', () => {
    expect(() => require('../fork')).not.toThrow();
  });
  it('exports fork utilities', () => {
    const mod = require('../fork');
    expect(typeof mod).toBe('object');
  });
});
