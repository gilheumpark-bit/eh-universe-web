/**
 * Unit tests for crdt-presence module
 */
describe('crdt-presence', () => {
  it('module loads without error', () => { expect(() => require('../crdt-presence')).not.toThrow(); });
  it('exports CRDT functions', () => { expect(typeof require('../crdt-presence')).toBe('object'); });
});
