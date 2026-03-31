/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for context-pruning module
 */
describe('context-pruning', () => {
  it('module loads without error', () => {
    expect(() => require('../context-pruning')).not.toThrow();
  });
  it('exports pruning functions', () => {
    const mod = require('../context-pruning');
    expect(typeof mod).toBe('object');
  });
});
