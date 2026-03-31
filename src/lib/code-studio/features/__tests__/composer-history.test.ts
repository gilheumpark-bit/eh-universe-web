/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for composer-history module
 */
describe('composer-history', () => {
  it('module loads without error', () => { expect(() => require('../composer-history')).not.toThrow(); });
  it('exports history interface', () => { expect(typeof require('../composer-history')).toBe('object'); });
});
