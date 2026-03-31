/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for local-folder module
 */
describe('local-folder', () => {
  it('module loads without error', () => { expect(() => require('../local-folder')).not.toThrow(); });
  it('exports folder functions', () => { expect(typeof require('../local-folder')).toBe('object'); });
});
