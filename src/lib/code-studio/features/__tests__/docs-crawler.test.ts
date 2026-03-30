/**
 * Unit tests for docs-crawler module
 */
describe('docs-crawler', () => {
  it('module loads without error', () => { expect(() => require('../docs-crawler')).not.toThrow(); });
  it('exports crawler functions', () => { expect(typeof require('../docs-crawler')).toBe('object'); });
});
