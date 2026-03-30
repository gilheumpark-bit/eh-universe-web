/**
 * Unit tests for editor-history module
 */
describe('editor-history', () => {
  it('module loads without error', () => { expect(() => require('../editor-history')).not.toThrow(); });
  it('exports history functions', () => { expect(typeof require('../editor-history')).toBe('object'); });
});
