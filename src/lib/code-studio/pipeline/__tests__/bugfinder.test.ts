/**
 * Unit tests for bugfinder module
 */
describe('bugfinder', () => {
  it('module loads without error', () => {
    expect(() => require('../bugfinder')).not.toThrow();
  });

  it('exports bugfinder functions', () => {
    const mod = require('../bugfinder');
    expect(typeof mod).toBe('object');
  });
});
