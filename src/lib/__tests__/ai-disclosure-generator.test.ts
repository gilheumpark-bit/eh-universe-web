// ============================================================
// PART 1 — Setup
// ============================================================

import {
  loadDisclosureThresholds,
  saveDisclosureThresholds,
  determineDisclosureGrade,
  generateDisclosureText,
  getGradeLabel,
  buildEpisodeDisclosure,
  type DisclosureGrade,
  type DisclosureThresholds,
} from '../ai-disclosure-generator';
import type { OriginStats } from '../origin-migration';
import { wrap } from '../origin-migration';
import type { SceneDirectionDataV2 } from '../studio-types';

beforeEach(() => {
  localStorage.clear();
});

function makeStats(userPct: number): OriginStats {
  // userPct 외 분포는 동등하게 채운다
  const remaining = 100 - userPct;
  const split = Math.floor(remaining / 3);
  return {
    totalEntries: 100,
    userCount: userPct,
    templateCount: split,
    engineSuggestCount: split,
    engineDraftCount: 100 - userPct - split * 2,
    userPct,
    templatePct: split,
    engineSuggestPct: split,
    engineDraftPct: 100 - userPct - split * 2,
  };
}

// ============================================================
// PART 2 — Threshold load/save
// ============================================================

describe('disclosure thresholds', () => {
  it('returns defaults when nothing saved', () => {
    const t = loadDisclosureThresholds();
    expect(t.humanAuthored).toBe(80);
    expect(t.coAuthoredHumanLed).toBe(60);
    expect(t.aiAssisted).toBe(30);
  });

  it('round-trips saved thresholds', () => {
    saveDisclosureThresholds({ humanAuthored: 90, coAuthoredHumanLed: 70, aiAssisted: 40 });
    const t = loadDisclosureThresholds();
    expect(t.humanAuthored).toBe(90);
    expect(t.coAuthoredHumanLed).toBe(70);
    expect(t.aiAssisted).toBe(40);
  });

  it('rejects invalid (out-of-order) thresholds and falls back to defaults', () => {
    // 인위적으로 잘못된 순서 저장
    localStorage.setItem('noa_disclosure_thresholds', JSON.stringify({ humanAuthored: 30, coAuthoredHumanLed: 60, aiAssisted: 80 }));
    const t = loadDisclosureThresholds();
    expect(t.humanAuthored).toBe(80);
  });

  it('rejects out-of-range values', () => {
    localStorage.setItem('noa_disclosure_thresholds', JSON.stringify({ humanAuthored: 150 }));
    const t = loadDisclosureThresholds();
    expect(t.humanAuthored).toBe(80);
  });
});

// ============================================================
// PART 3 — Grade determination + boundary tests
// ============================================================

describe('determineDisclosureGrade — boundary values', () => {
  it('returns human-authored for empty stats (totalEntries=0)', () => {
    const empty: OriginStats = {
      totalEntries: 0, userCount: 0, templateCount: 0, engineSuggestCount: 0, engineDraftCount: 0,
      userPct: 0, templatePct: 0, engineSuggestPct: 0, engineDraftPct: 0,
    };
    expect(determineDisclosureGrade(empty)).toBe('human-authored');
  });

  it('80% userPct → human-authored (boundary inclusive)', () => {
    expect(determineDisclosureGrade(makeStats(80))).toBe('human-authored');
  });

  it('79% userPct → co-authored-human-led', () => {
    expect(determineDisclosureGrade(makeStats(79))).toBe('co-authored-human-led');
  });

  it('60% userPct → co-authored-human-led (boundary inclusive)', () => {
    expect(determineDisclosureGrade(makeStats(60))).toBe('co-authored-human-led');
  });

  it('59% userPct → ai-assisted', () => {
    expect(determineDisclosureGrade(makeStats(59))).toBe('ai-assisted');
  });

  it('30% userPct → ai-assisted (boundary inclusive)', () => {
    expect(determineDisclosureGrade(makeStats(30))).toBe('ai-assisted');
  });

  it('29% userPct → ai-generated', () => {
    expect(determineDisclosureGrade(makeStats(29))).toBe('ai-generated');
  });

  it('0% userPct → ai-generated', () => {
    expect(determineDisclosureGrade(makeStats(0))).toBe('ai-generated');
  });

  it('uses custom thresholds when provided', () => {
    const custom: DisclosureThresholds = { humanAuthored: 90, coAuthoredHumanLed: 70, aiAssisted: 40 };
    expect(determineDisclosureGrade(makeStats(85), custom)).toBe('co-authored-human-led');
    expect(determineDisclosureGrade(makeStats(45), custom)).toBe('ai-assisted');
  });
});

// ============================================================
// PART 4 — 4-language text generation
// ============================================================

describe('generateDisclosureText — 4 languages', () => {
  const grades: DisclosureGrade[] = ['human-authored', 'co-authored-human-led', 'ai-assisted', 'ai-generated'];

  it('renders KO/EN/JP/CN labels for all 4 grades', () => {
    for (const g of grades) {
      const koLabel = getGradeLabel(g, 'KO');
      const enLabel = getGradeLabel(g, 'EN');
      const jpLabel = getGradeLabel(g, 'JP');
      const cnLabel = getGradeLabel(g, 'CN');
      expect(koLabel).not.toBe(g); // 라벨이 enum 그대로 나오면 누락
      expect(enLabel.length).toBeGreaterThan(0);
      expect(jpLabel.length).toBeGreaterThan(0);
      expect(cnLabel.length).toBeGreaterThan(0);
    }
  });

  it('includes origin breakdown percentages in text', () => {
    const stats = makeStats(70);
    const text = generateDisclosureText('co-authored-human-led', stats, 'KO');
    expect(text).toContain('70%');
    expect(text).toContain('AI 공동집필');
  });

  it('returns 4 distinct language texts for same grade', () => {
    const stats = makeStats(50);
    const ko = generateDisclosureText('ai-assisted', stats, 'KO');
    const en = generateDisclosureText('ai-assisted', stats, 'EN');
    const jp = generateDisclosureText('ai-assisted', stats, 'JP');
    const cn = generateDisclosureText('ai-assisted', stats, 'CN');
    expect(ko).not.toBe(en);
    expect(en).not.toBe(jp);
    expect(jp).not.toBe(cn);
    expect(en).toContain('AI-Assisted');
    expect(jp).toContain('AI補助');
    expect(cn).toContain('AI 辅助');
  });

  it('falls back to KO for unknown language', () => {
    // @ts-expect-error
    const text = generateDisclosureText('human-authored', makeStats(90), 'BOGUS');
    expect(text).toContain('작가 단독 집필');
  });
});

// ============================================================
// PART 5 — Episode-level convenience API
// ============================================================

describe('buildEpisodeDisclosure', () => {
  it('returns human-authored for null/empty input', () => {
    const result = buildEpisodeDisclosure(null, 'KO');
    expect(result.grade).toBe('human-authored');
    expect(result.stats.totalEntries).toBe(0);
  });

  it('produces ai-generated text for ENGINE_DRAFT-heavy data', () => {
    const v2: SceneDirectionDataV2 = {
      _originVersion: 2,
      cliffhanger: wrap({ cliffType: 'shock', desc: 'a' }, 'ENGINE_DRAFT'),
      plotStructure: wrap('three-act', 'ENGINE_DRAFT'),
      writerNotes: wrap('x', 'ENGINE_DRAFT'),
    };
    const result = buildEpisodeDisclosure(v2, 'KO');
    expect(result.grade).toBe('ai-generated');
    expect(result.label).toContain('AI 주도');
    expect(result.text).toContain('AI 주도 생성');
  });

  it('produces human-authored text for V1 (all USER) data', () => {
    const v1 = {
      writerNotes: 'all mine',
      goguma: [{ type: 'goguma' as const, intensity: 'low', desc: 'x' }],
    };
    const result = buildEpisodeDisclosure(v1, 'KO');
    expect(result.grade).toBe('human-authored');
    expect(result.stats.userPct).toBe(100);
  });
});
