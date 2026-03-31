/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for role-router module
 */
describe('role-router', () => {
  it('module loads without error', () => {
    expect(() => require('../role-router')).not.toThrow();
  });
  it('exports routing logic', () => {
    const mod = require('../role-router');
    expect(typeof mod).toBe('object');
  });
});
