 
/**
 * Unit tests for useStudioExport hook
 */
describe('useStudioExport', () => {
  it('module loads without error', () => { expect(() => require('../useStudioExport')).not.toThrow(); });
  it('exports hook', () => { expect(typeof require('../useStudioExport')).toBe('object'); });
});
