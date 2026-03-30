/**
 * Unit tests for lint-ai-loop module
 */
describe('lint-ai-loop', () => {
  it('module loads without error', () => { expect(() => require('../lint-ai-loop')).not.toThrow(); });
  it('exports lint loop types', () => { expect(typeof require('../lint-ai-loop')).toBe('object'); });
});
