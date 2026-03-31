/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for chat-fork module
 */
describe('chat-fork', () => {
  it('module loads without error', () => { expect(() => require('../chat-fork')).not.toThrow(); });
  it('exports fork utilities', () => { expect(typeof require('../chat-fork')).toBe('object'); });
});
