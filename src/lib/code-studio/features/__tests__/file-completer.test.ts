/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for file-completer module
 */
describe('file-completer', () => {
  it('module loads without error', () => { expect(() => require('../file-completer')).not.toThrow(); });
  it('exports completer functions', () => { expect(typeof require('../file-completer')).toBe('object'); });
});
