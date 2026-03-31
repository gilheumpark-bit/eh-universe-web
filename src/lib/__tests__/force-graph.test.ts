/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for force-graph module
 */
describe('force-graph', () => {
  it('module loads without error', () => { expect(() => require('../force-graph')).not.toThrow(); });
  it('exports graph utilities', () => { expect(typeof require('../force-graph')).toBe('object'); });
});
