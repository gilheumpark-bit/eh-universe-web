import { predictReaderEngagement } from '../dropout-predictor';
import type { EpisodeManuscript } from '@/lib/studio-types';

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('predictReaderEngagement', () => {
  test('빈 episodes → 빈 결과', () => {
    const r = predictReaderEngagement([]);
    expect(r.points).toEqual([]);
    expect(r.predictions).toEqual([]);
  });

  test('정상 입력 → 5 페르소나 모두 점수', () => {
    const eps = [ep(1, '김준이 외쳤다! 검을 휘둘렀다. 마법이 폭발했다.')];
    const r = predictReaderEngagement(eps);
    expect(r.points).toHaveLength(1);
    expect(Object.keys(r.points[0].perPersona)).toHaveLength(5);
    expect(r.points[0].average).toBeGreaterThan(0);
  });

  test('너무 짧은 본문 → 비판적 독자 이탈', () => {
    const eps = [ep(1, '짧'), ep(2, '짧'), ep(3, '짧'), ep(4, '짧'), ep(5, '짧')];
    const r = predictReaderEngagement(eps);
    const lastPred = r.predictions[r.predictions.length - 1];
    // 최소 1명 이탈
    expect(Object.values(lastPred.perPersona).some(Boolean)).toBe(true);
  });

  test('이탈은 누적 — 한번 이탈하면 유지', () => {
    const eps = [
      ep(1, '짧'), // 짧음 → 이탈 다수
      ep(2, '김준이 외쳤다! 검을 휘둘렀다 마법 전투'.repeat(50)), // 긴 좋은 본문
    ];
    const r = predictReaderEngagement(eps);
    // EP1에서 이탈한 페르소나는 EP2에서도 이탈 상태
    for (const pid of Object.keys(r.predictions[0].perPersona) as Array<keyof typeof r.predictions[0]['perPersona']>) {
      if (r.predictions[0].perPersona[pid]) {
        expect(r.predictions[1].perPersona[pid]).toBe(true);
      }
    }
  });
});
