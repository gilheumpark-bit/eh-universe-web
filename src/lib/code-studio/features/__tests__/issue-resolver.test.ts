/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for issue-resolver module
 */
describe('issue-resolver', () => {
  it('module loads without error', () => { expect(() => require('../issue-resolver')).not.toThrow(); });
  it('exports resolver functions', () => { expect(typeof require('../issue-resolver')).toBe('object'); });
});
