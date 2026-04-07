/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for articles-reports module
 */
describe('articles-reports', () => {
  it('module loads without error', () => { expect(() => require('../articles-reports')).not.toThrow(); });
  it('exports report definitions', () => { expect(typeof require('../articles-reports')).toBe('object'); });
});
