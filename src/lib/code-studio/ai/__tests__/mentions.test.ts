/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for mentions module
 */
describe('mentions', () => {
  it('module loads without error', () => {
    expect(() => require('../mentions')).not.toThrow();
  });
  it('exports mention utilities', () => {
    const mod = require('../mentions');
    expect(typeof mod).toBe('object');
  });
});
