// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for ghost module
 */
describe('ghost', () => {
  it('module loads without error', () => {
    expect(() => require('../ghost')).not.toThrow();
  });
  it('exports ghost completion types', () => {
    const mod = require('../ghost');
    expect(typeof mod).toBe('object');
  });
});
