/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for file-drop module
 */
describe('file-drop', () => {
  it('module loads without error', () => { expect(() => require('../file-drop')).not.toThrow(); });
  it('exports file drop handlers', () => { expect(typeof require('../file-drop')).toBe('object'); });
});
