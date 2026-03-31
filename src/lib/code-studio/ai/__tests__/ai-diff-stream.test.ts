/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for ai-diff-stream module
 */
describe('ai-diff-stream', () => {
  it('module loads without error', () => { expect(() => require('../ai-diff-stream')).not.toThrow(); });
  it('exports diff stream types', () => { expect(typeof require('../ai-diff-stream')).toBe('object'); });
});
