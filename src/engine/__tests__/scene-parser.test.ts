/**
 * Unit tests for scene-parser module types
 */
describe('scene-parser', () => {
  it('module loads without error', () => {
    expect(() => require('../scene-parser')).not.toThrow();
  });

  it('defines BeatType values', () => {
    const beatTypes = ['dialogue', 'narration', 'action', 'thought', 'description'];
    expect(beatTypes).toContain('dialogue');
    expect(beatTypes).toContain('narration');
    expect(beatTypes).toHaveLength(5);
  });

  it('defines Tempo values', () => {
    const tempos = ['fast', 'normal', 'slow'];
    expect(tempos).toContain('fast');
    expect(tempos).toHaveLength(3);
  });

  it('defines CameraAngle values', () => {
    const angles = ['wide', 'medium', 'close', 'pov'];
    expect(angles).toContain('pov');
    expect(angles).toHaveLength(4);
  });
});
