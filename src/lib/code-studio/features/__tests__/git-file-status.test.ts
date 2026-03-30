/**
 * Unit tests for git-file-status module
 */
describe('git-file-status', () => {
  it('module loads without error', () => { expect(() => require('../git-file-status')).not.toThrow(); });
  it('exports status utilities', () => { expect(typeof require('../git-file-status')).toBe('object'); });
});
