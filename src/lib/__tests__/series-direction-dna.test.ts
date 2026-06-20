/**
 * series-direction-dna — 시리즈 DNA 집계 테스트
 */

import { analyzeSeriesDNA, renderDNAReport } from '../series-direction-dna';
import type { SceneDirectionData } from '@/lib/studio-types';

// ============================================================
// PART 1 — Empty input
// ============================================================

describe('analyzeSeriesDNA — empty', () => {
  test('빈 입력 → 0 기본값', () => {
    const r = analyzeSeriesDNA({});
    expect(r.totalEpisodes).toBe(0);
    expect(r.episodesAnalyzed).toBe(0);
    expect(r.topGogumas).toEqual([]);
    expect(r.personalPatterns.cliffhangerUsage).toBe(0);
    expect(r.personalPatterns.foreshadowDepth).toBe(0);
  });
});

// ============================================================
// PART 2 — Aggregation
// ============================================================

describe('analyzeSeriesDNA — aggregation', () => {
  test('totalEpisodes는 최대 화수', () => {
    const r = analyzeSeriesDNA({
      1: {},
      3: {},
      5: {},
    });
    expect(r.totalEpisodes).toBe(5);
    expect(r.episodesAnalyzed).toBe(3);
  });

  test('topGogumas — 빈도 desc', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { goguma: [{ type: 'goguma', intensity: 'small', desc: '' }, { type: 'goguma', intensity: 'small', desc: '' }] },
      2: { goguma: [{ type: 'cider', intensity: 'large', desc: '' }] },
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.topGogumas[0]).toEqual({ value: 'goguma', count: 2 });
    expect(r.topGogumas[1]).toEqual({ value: 'cider', count: 1 });
  });

  test('topCliffs — cliffhanger.cliffType 빈도', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { cliffhanger: { cliffType: 'crisis-cut', desc: '' } },
      2: { cliffhanger: { cliffType: 'crisis-cut', desc: '' } },
      3: { cliffhanger: { cliffType: 'reversal-drop', desc: '' } },
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.topCliffs[0]).toEqual({ value: 'crisis-cut', count: 2 });
    expect(r.topCliffs[1]).toEqual({ value: 'reversal-drop', count: 1 });
  });

  test('emotionDistribution', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { emotionTargets: [{ emotion: '분노', intensity: 80 }, { emotion: '슬픔', intensity: 60 }] },
      2: { emotionTargets: [{ emotion: '분노', intensity: 50 }] },
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.emotionDistribution['분노']).toBe(2);
    expect(r.emotionDistribution['슬픔']).toBe(1);
  });
});

// ============================================================
// PART 3 — Personal patterns
// ============================================================

describe('analyzeSeriesDNA — personal patterns', () => {
  test('cliffhangerUsage — 비율 계산', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { cliffhanger: { cliffType: 'a', desc: '' } },
      2: {},
      3: { cliffhanger: { cliffType: 'b', desc: '' } },
      4: {},
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.personalPatterns.cliffhangerUsage).toBe(0.5);
  });

  test('foreshadowDepth — 회수율', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: {
        foreshadows: [
          { planted: 'a', payoff: 'p', episode: 1, resolved: true },
          { planted: 'b', payoff: 'p', episode: 1, resolved: false },
          { planted: 'c', payoff: 'p', episode: 1, resolved: true },
          { planted: 'd', payoff: 'p', episode: 1, resolved: false },
        ],
      },
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.personalPatterns.foreshadowDepth).toBe(0.5);
  });

  test('avgGogumaPerEpisode — 평균', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { goguma: [{ type: 'goguma', intensity: 'small', desc: '' }, { type: 'cider', intensity: 'large', desc: '' }] },
      2: { goguma: [{ type: 'goguma', intensity: 'small', desc: '' }] },
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.personalPatterns.avgGogumaPerEpisode).toBe(1.5);
  });

  test('avgHooksPerEpisode', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: { hooks: [{ position: 'opening', hookType: 'shock', desc: '' }] },
      2: { hooks: [{ position: 'middle', hookType: 'question', desc: '' }, { position: 'ending', hookType: 'reversal', desc: '' }] },
    };
    const r = analyzeSeriesDNA(sheets);
    expect(r.personalPatterns.avgHooksPerEpisode).toBe(1.5);
  });
});

// ============================================================
// PART 4 — renderDNAReport
// ============================================================

describe('renderDNAReport', () => {
  test('빈 DNA → 데이터 부족 메시지', () => {
    const dna = analyzeSeriesDNA({});
    const md = renderDNAReport(dna, 'KO');
    expect(md).toContain('시리즈 DNA');
    expect(md).toContain('분석 데이터 부족');
  });

  test('실제 DNA → 모든 섹션 포함', () => {
    const sheets: Record<number, SceneDirectionData> = {
      1: {
        cliffhanger: { cliffType: 'crisis-cut', desc: '' },
        goguma: [{ type: 'goguma', intensity: 'small', desc: '' }],
        hooks: [{ position: 'opening', hookType: 'shock', desc: '' }],
        emotionTargets: [{ emotion: '분노', intensity: 80 }],
      },
    };
    const dna = analyzeSeriesDNA(sheets);
    const md = renderDNAReport(dna, 'KO');
    expect(md).toContain('자주 쓰는 장치');
    expect(md).toContain('작가 개인 패턴');
    expect(md).toContain('감정 분포');
  });

  test('4언어 — EN', () => {
    const dna = analyzeSeriesDNA({});
    const md = renderDNAReport(dna, 'EN');
    expect(md).toContain('Series DNA Analysis');
    expect(md).toContain('Not enough data');
  });
});
