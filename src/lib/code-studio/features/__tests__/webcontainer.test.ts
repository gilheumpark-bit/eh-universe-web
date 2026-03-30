/**
 * Unit tests for webcontainer module
 */
describe('webcontainer', () => {
  it('module loads without error', () => { expect(() => require('../webcontainer')).not.toThrow(); });
  it('exports webcontainer types', () => { expect(typeof require('../webcontainer')).toBe('object'); });
});
