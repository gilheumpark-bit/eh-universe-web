import { getActFromEpisode, GENRE_TENSION_PARAMS } from '../types';

describe('getActFromEpisode', () => {
  it('episode 1/25 = Act 1 (Setup)', () => {
    const act = getActFromEpisode(1, 25);
    expect(act.act).toBe(1);
    expect(act.nameEN).toBe('Setup');
  });

  it('episode 8/25 = Act 2 (Rising)', () => {
    const act = getActFromEpisode(8, 25);
    expect(act.act).toBe(2);
  });

  it('episode 13/25 = Act 3 (Midpoint)', () => {
    const act = getActFromEpisode(13, 25);
    expect(act.act).toBe(3);
  });

  it('episode 18/25 = Act 4 (Falling)', () => {
    const act = getActFromEpisode(18, 25);
    expect(act.act).toBe(4);
  });

  it('episode 24/25 = Act 5 (Climax)', () => {
    const act = getActFromEpisode(24, 25);
    expect(act.act).toBe(5);
    expect(act.nameEN).toBe('Climax');
  });

  it('progress is between 0 and 1', () => {
    for (let ep = 1; ep <= 25; ep++) {
      const act = getActFromEpisode(ep, 25);
      expect(act.progress).toBeGreaterThanOrEqual(0);
      expect(act.progress).toBeLessThanOrEqual(1.001); // float precision
    }
  });

  it('all 7 genres have tension params', () => {
    const genres = ['SF', 'FANTASY', 'ROMANCE', 'THRILLER', 'HORROR', 'SYSTEM_HUNTER', 'FANTASY_ROMANCE'];
    genres.forEach(g => {
      expect(GENRE_TENSION_PARAMS[g]).toBeDefined();
      expect(GENRE_TENSION_PARAMS[g].base).toBeGreaterThan(0);
    });
  });
});
