/**
 * Unit tests for language-pack module
 */
describe('language-pack', () => {
  it('module loads without error', () => {
    expect(() => require('../language-pack')).not.toThrow();
  });

  it('exports language pack definitions', () => {
    const mod = require('../language-pack');
    expect(typeof mod).toBe('object');
  });
});
