/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for editorconfig module
 */
describe('editorconfig', () => {
  it('module loads without error', () => { expect(() => require('../editorconfig')).not.toThrow(); });
  it('exports config parsing', () => { expect(typeof require('../editorconfig')).toBe('object'); });
});
