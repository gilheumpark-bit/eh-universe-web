/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for ai-director module
 */
describe('ai-director', () => {
  it('module loads without error', () => { expect(() => require('../ai-director')).not.toThrow(); });
  it('exports director functions', () => { expect(typeof require('../ai-director')).toBe('object'); });
});
