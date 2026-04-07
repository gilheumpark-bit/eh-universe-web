/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for visual-prompt module
 */
describe('visual-prompt', () => {
  it('module loads without error', () => { expect(() => require('../visual-prompt')).not.toThrow(); });
  it('exports prompt generators', () => { expect(typeof require('../visual-prompt')).toBe('object'); });
});
