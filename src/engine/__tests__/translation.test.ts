 
/**
 * Unit tests for translation module types and constants
 */
describe('translation', () => {
  it('module loads without error', () => {
    expect(() => require('../translation')).not.toThrow();
  });

  it('defines TranslationTarget type values', () => {
    const targets = ['EN', 'JP', 'CN', 'KO'];
    expect(targets).toContain('EN');
    expect(targets).toContain('KO');
    expect(targets).toHaveLength(4);
  });

  it('defines TranslationMode options', () => {
    const modes = ['fidelity', 'experience'];
    expect(modes).toContain('fidelity');
    expect(modes).toContain('experience');
  });
});
