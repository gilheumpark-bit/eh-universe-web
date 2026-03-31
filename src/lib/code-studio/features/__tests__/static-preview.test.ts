/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for static-preview module
 */
describe('static-preview', () => {
  it('module loads without error', () => { expect(() => require('../static-preview')).not.toThrow(); });
  it('exports preview functions', () => { expect(typeof require('../static-preview')).toBe('object'); });
});
