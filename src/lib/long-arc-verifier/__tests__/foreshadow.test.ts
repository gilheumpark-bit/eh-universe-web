import { runForeshadowAxis, extractAllForeshadowMarkers } from '../foreshadow-tracker';
import type { EpisodeManuscript } from '@/lib/studio-types';

function ep(num: number, content: string): EpisodeManuscript {
  return { episode: num, title: `EP${num}`, content, charCount: content.length, lastUpdate: 0 };
}

describe('runForeshadowAxis', () => {
  test('마커 0 → score 100', () => {
    const r = runForeshadowAxis([ep(1, '마커 없음')]);
    expect(r.score).toBe(100);
    expect(r.violations).toEqual([]);
  });

  test('회수된 떡밥 → 위반 없음', () => {
    const eps = [ep(1, '[떡밥-검은검]'), ep(5, '[회수-검은검]')];
    const r = runForeshadowAxis(eps);
    expect(r.violations).toEqual([]);
    expect(r.score).toBe(100);
  });

  test('미회수 떡밥 → 위반', () => {
    const eps = [ep(1, '[떡밥-숨겨진왕가]'), ep(50, '아무 내용')];
    const r = runForeshadowAxis(eps);
    expect(r.violations.length).toBe(1);
    expect(r.violations[0].kind).toBe('foreshadow-unresolved');
  });

  test('30화 이상 미회수 → severity error', () => {
    const eps = [ep(1, '[떡밥-위험]'), ep(40, '아무')];
    const r = runForeshadowAxis(eps);
    expect(r.violations[0].severity).toBe('error');
  });

  test('extractAllForeshadowMarkers — 다중 추출', () => {
    const eps = [ep(1, '[떡밥-A] [복선-B]'), ep(3, '[회수-A]')];
    const markers = extractAllForeshadowMarkers(eps);
    expect(markers.length).toBe(2);
    const a = markers.find((m) => m.id === 'A');
    expect(a?.payoffEpisode).toBe(3);
  });
});
