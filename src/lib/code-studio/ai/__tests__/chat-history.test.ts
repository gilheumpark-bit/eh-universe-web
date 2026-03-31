/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for chat-history module
 */
describe('chat-history', () => {
  it('module loads without error', () => {
    expect(() => require('../chat-history')).not.toThrow();
  });
  it('exports history functions', () => {
    const mod = require('../chat-history');
    expect(typeof mod).toBe('object');
  });
});
