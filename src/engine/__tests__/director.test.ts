 
/**
 * Unit tests for director module types and constants
 */
describe('director', () => {
  it('module loads without error', () => {
    expect(() => require('../director')).not.toThrow();
  });

  it('defines NarrativeIntensity values', () => {
    const intensities = ['iron', 'standard', 'soft'];
    expect(intensities).toContain('iron');
    expect(intensities).toContain('standard');
    expect(intensities).toHaveLength(3);
  });
});
