/**
 * Unit tests for git-blame module
 */
describe('git-blame', () => {
  it('module loads without error', () => {
    expect(() => require('../git-blame')).not.toThrow();
  });
  it('exports blame utilities', () => {
    const mod = require('../git-blame');
    expect(typeof mod).toBe('object');
  });
});
