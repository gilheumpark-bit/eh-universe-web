/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for code-indexer module
 */
describe('code-indexer', () => {
  it('module loads without error', () => { expect(() => require('../code-indexer')).not.toThrow(); });
  it('exports indexer functions', () => { expect(typeof require('../code-indexer')).toBe('object'); });
});
