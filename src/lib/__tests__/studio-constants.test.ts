/**
 * Unit tests for studio-constants module
 */
describe('studio-constants', () => {
  it('module loads without error', () => { expect(() => require('../studio-constants')).not.toThrow(); });
  it('exports constants', () => { expect(typeof require('../studio-constants')).toBe('object'); });
});
