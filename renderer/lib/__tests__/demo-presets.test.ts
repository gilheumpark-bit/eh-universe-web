/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for demo-presets module
 */
describe('demo-presets', () => {
  it('module loads without error', () => { expect(() => require('../demo-presets')).not.toThrow(); });
  it('exports demo data', () => { expect(typeof require('../demo-presets')).toBe('object'); });
});
