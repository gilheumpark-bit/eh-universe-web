import { sliderToRadarPoints, STYLE_ARCHETYPES } from '@/lib/style-benchmarks';

describe('style-benchmarks', () => {
  describe('STYLE_ARCHETYPES', () => {
    it('exports a non-empty array of archetypes', () => {
      expect(STYLE_ARCHETYPES.length).toBeGreaterThan(0);
    });

    it('each archetype has required fields', () => {
      for (const a of STYLE_ARCHETYPES) {
        expect(a.id).toBeTruthy();
        expect(a.sliders).toBeDefined();
        expect(Object.keys(a.sliders)).toContain('s1');
      }
    });
  });

  describe('sliderToRadarPoints', () => {
    it('returns 5 points', () => {
      const points = sliderToRadarPoints({ s1: 3, s2: 3, s3: 3, s4: 3, s5: 3 }, 100, 100, 50);
      expect(points).toHaveLength(5);
    });

    it('each point is a [x, y] tuple', () => {
      const points = sliderToRadarPoints({ s1: 1, s2: 2, s3: 3, s4: 4, s5: 5 }, 0, 0, 100);
      for (const p of points) {
        expect(p).toHaveLength(2);
        expect(typeof p[0]).toBe('number');
        expect(typeof p[1]).toBe('number');
      }
    });

    it('first point (s1) is directly above center when angle = -PI/2', () => {
      const points = sliderToRadarPoints({ s1: 5, s2: 5, s3: 5, s4: 5, s5: 5 }, 100, 100, 50);
      // s1 at angle -PI/2 => x=cx, y=cy-radius
      expect(points[0][0]).toBeCloseTo(100, 5);
      expect(points[0][1]).toBeCloseTo(50, 5);
    });

    it('uses default value 3 for missing slider keys', () => {
      const points = sliderToRadarPoints({}, 0, 0, 100);
      // all sliders default to 3 => val = 3/5 = 0.6
      // first point at angle -PI/2: x=0+100*0.6*cos(-PI/2)=0, y=0+100*0.6*sin(-PI/2)=-60
      expect(points[0][0]).toBeCloseTo(0, 5);
      expect(points[0][1]).toBeCloseTo(-60, 5);
    });

    it('scales proportionally with radius', () => {
      const r50 = sliderToRadarPoints({ s1: 5, s2: 5, s3: 5, s4: 5, s5: 5 }, 0, 0, 50);
      const r100 = sliderToRadarPoints({ s1: 5, s2: 5, s3: 5, s4: 5, s5: 5 }, 0, 0, 100);
      // s1 point y should be -50 vs -100
      expect(r100[0][1]).toBeCloseTo(2 * r50[0][1], 5);
    });
  });
});
