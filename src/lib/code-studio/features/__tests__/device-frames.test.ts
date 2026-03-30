/**
 * Unit tests for device-frames module
 */
describe('device-frames', () => {
  it('module loads without error', () => { expect(() => require('../device-frames')).not.toThrow(); });
  it('exports frame definitions', () => { expect(typeof require('../device-frames')).toBe('object'); });
});
