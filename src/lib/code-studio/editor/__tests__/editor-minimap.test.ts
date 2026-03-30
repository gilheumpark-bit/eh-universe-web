/**
 * Unit tests for editor-minimap module
 */
describe('editor-minimap', () => {
  it('module loads without error', () => { expect(() => require('../editor-minimap')).not.toThrow(); });
  it('exports minimap functions', () => { expect(typeof require('../editor-minimap')).toBe('object'); });
});
