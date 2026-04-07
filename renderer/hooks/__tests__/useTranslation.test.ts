/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for useTranslation hook
 */
describe('useTranslation', () => {
  it('module loads without error', () => { expect(() => require('../useTranslation')).not.toThrow(); });
  it('exports hook function', () => {
    const mod = require('../useTranslation');
    expect(typeof mod.useTranslation === 'function' || typeof mod.default === 'function').toBe(true);
  });
});
