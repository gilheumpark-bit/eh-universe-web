/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Unit tests for voice-input module
 */
describe('voice-input', () => {
  it('module loads without error', () => { expect(() => require('../voice-input')).not.toThrow(); });
  it('exports voice input utilities', () => { expect(typeof require('../voice-input')).toBe('object'); });
});
