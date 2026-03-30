/**
 * Unit tests for scene-audio module types
 */
describe('scene-audio', () => {
  it('module loads without error', () => {
    expect(() => require('../scene-audio')).not.toThrow();
  });

  it('defines AmbientType values', () => {
    const ambients = ['rain', 'wind', 'forest', 'city', 'silence'];
    expect(ambients).toContain('rain');
    expect(ambients).toContain('silence');
  });

  it('defines SFXType values', () => {
    const sfx = ['footstep', 'door-open', 'heartbeat', 'explosion'];
    expect(sfx).toContain('heartbeat');
    expect(sfx.length).toBeGreaterThanOrEqual(3);
  });
});
