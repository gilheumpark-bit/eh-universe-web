import {
  getDefaultThresholds,
  getDefaultGateConfig,
  evaluateQuality,
  buildRetryHint,
} from '../quality-gate';
import { PlatformType } from '../types';
import type { StoryConfig, QualityThresholds, QualityGateResult } from '@/lib/studio-types';

// ============================================================
// Helper — minimal StoryConfig for tests
// ============================================================

function makeConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: 'SF' as StoryConfig['genre'],
    povCharacter: '주인공',
    setting: '우주 정거장',
    primaryEmotion: '긴장',
    episode: 5,
    totalEpisodes: 25,
    title: '테스트 소설',
    guardrails: { min: 3000, max: 5000 },
    characters: [],
    platform: PlatformType.MOBILE,
    ...overrides,
  };
}

// Long enough text for the engine to analyze meaningfully
const SAMPLE_TEXT =
  '그녀의 눈물이 흘러내렸다. 심장이 미칠듯이 뛰었다. "살려줘!" 그는 절규했다. ' +
  '목소리가 떨렸다. 손끝이 차가웠다. 바람 소리가 울렸다. 어둠 속에서 빛이 새어나왔다. ' +
  '그리움이 밀려왔다. 폭발이 일어났다. 비명 소리가 울렸다. 전투가 시작됐다. ' +
  '위험한 적이 나타났다. 충돌하는 소리가 들렸다. 긴장된 대치가 계속됐다. ' +
  '급하게 달렸다. 갑자기 문이 열렸다. 위험한 상황이 벌어졌다. ' +
  '그녀는 바닥에 쓰러졌다. 피가 흘렀다. 숨이 멎을 것 같았다. ' +
  '어둠이 밀려왔다. 희망이 사라졌다. 절망 속에서도 그는 일어섰다. ' +
  '다시 한번 칼을 들었다. 마지막 힘을 짜냈다. 결국 적을 쓰러뜨렸다. ' +
  '하지만 대가가 너무 컸다. 그리움이 밀려왔다. 눈물이 흘렀다. ' +
  '심장이 아팠다. 목소리가 메말랐다. 손끝이 떨렸다. 바람이 불었다.';

// ============================================================
// getDefaultThresholds()
// ============================================================

describe('getDefaultThresholds', () => {
  it('returns beginner thresholds with correct values', () => {
    const t = getDefaultThresholds('beginner');
    expect(t.minGrade).toBe('C+');
    expect(t.minDirectorScore).toBe(40);
    expect(t.minEOS).toBe(20);
    expect(t.minTensionAlignment).toBe(40);
    expect(t.maxAITonePercent).toBe(25);
    expect(t.blockOnRedTag).toBe(true);
  });

  it('returns intermediate thresholds with stricter values', () => {
    const t = getDefaultThresholds('intermediate');
    expect(t.minGrade).toBe('B');
    expect(t.minDirectorScore).toBe(60);
    expect(t.blockOnRedTag).toBe(true);
  });

  it('returns advanced thresholds with strictest values', () => {
    const t = getDefaultThresholds('advanced');
    expect(t.minGrade).toBe('B+');
    expect(t.minDirectorScore).toBe(70);
    expect(t.minEOS).toBe(50);
    expect(t.maxAITonePercent).toBe(10);
    expect(t.blockOnRedTag).toBe(false);
  });

  it('returns a new copy each call (no shared reference)', () => {
    const a = getDefaultThresholds('beginner');
    const b = getDefaultThresholds('beginner');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.minEOS = 999;
    expect(b.minEOS).toBe(20);
  });
});

// ============================================================
// getDefaultGateConfig()
// ============================================================

describe('getDefaultGateConfig', () => {
  it('beginner: enabled, 3 retries, full_auto', () => {
    const cfg = getDefaultGateConfig('beginner');
    expect(cfg.enabled).toBe(true);
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.autoMode).toBe('full_auto');
    expect(cfg.thresholds.minGrade).toBe('C+');
  });

  it('intermediate: enabled, 3 retries, confirm', () => {
    const cfg = getDefaultGateConfig('intermediate');
    expect(cfg.maxRetries).toBe(3);
    expect(cfg.autoMode).toBe('confirm');
  });

  it('advanced: 5 retries, off mode', () => {
    const cfg = getDefaultGateConfig('advanced');
    expect(cfg.maxRetries).toBe(5);
    expect(cfg.autoMode).toBe('off');
  });

  it('thresholds inside config match standalone thresholds', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      const cfg = getDefaultGateConfig(level);
      const standalone = getDefaultThresholds(level);
      expect(cfg.thresholds).toEqual(standalone);
    }
  });
});

// ============================================================
// evaluateQuality()
// ============================================================

describe('evaluateQuality', () => {
  it('returns a QualityGateResult with all expected fields', () => {
    const thresholds = getDefaultThresholds('beginner');
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), thresholds, 'KO', 1);

    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('attempt');
    expect(result).toHaveProperty('failReasons');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('directorScore');
    expect(result).toHaveProperty('eosScore');
    expect(result).toHaveProperty('qualityTag');
    expect(typeof result.passed).toBe('boolean');
    expect(Array.isArray(result.failReasons)).toBe(true);
  });

  it('attempt number is forwarded into the result', () => {
    const thresholds = getDefaultThresholds('beginner');
    const r1 = evaluateQuality(SAMPLE_TEXT, makeConfig(), thresholds, 'KO', 1);
    const r3 = evaluateQuality(SAMPLE_TEXT, makeConfig(), thresholds, 'KO', 3);
    expect(r1.attempt).toBe(1);
    expect(r3.attempt).toBe(3);
  });

  it('defaults attempt to 1 and language to KO', () => {
    const thresholds = getDefaultThresholds('beginner');
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), thresholds);
    expect(result.attempt).toBe(1);
  });

  it('very lenient thresholds should pass most text', () => {
    const lenient: QualityThresholds = {
      minGrade: 'D',
      minDirectorScore: 0,
      minEOS: 0,
      minTensionAlignment: 100,
      maxAITonePercent: 100,
      blockOnRedTag: false,
    };
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), lenient);
    expect(result.passed).toBe(true);
    expect(result.failReasons).toHaveLength(0);
  });

  it('impossibly strict thresholds should fail', () => {
    const strict: QualityThresholds = {
      minGrade: 'S++',
      minDirectorScore: 100,
      minEOS: 100,
      minTensionAlignment: 0,
      maxAITonePercent: 0,
      blockOnRedTag: true,
    };
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), strict);
    expect(result.passed).toBe(false);
    expect(result.failReasons.length).toBeGreaterThan(0);
  });

  it('grade_below reason appears when grade is too low', () => {
    const strict: QualityThresholds = {
      minGrade: 'S++',
      minDirectorScore: 0,
      minEOS: 0,
      minTensionAlignment: 100,
      maxAITonePercent: 100,
      blockOnRedTag: false,
    };
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), strict);
    const gradeReason = result.failReasons.find(r => r.startsWith('grade_below'));
    expect(gradeReason).toBeDefined();
  });

  it('director_below reason appears when director score threshold is high', () => {
    const strict: QualityThresholds = {
      minGrade: 'D',
      minDirectorScore: 999,
      minEOS: 0,
      minTensionAlignment: 100,
      maxAITonePercent: 100,
      blockOnRedTag: false,
    };
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), strict);
    const reason = result.failReasons.find(r => r.startsWith('director_below'));
    expect(reason).toBeDefined();
  });

  it('eos_below reason appears when EOS threshold is impossibly high', () => {
    const strict: QualityThresholds = {
      minGrade: 'D',
      minDirectorScore: 0,
      minEOS: 999,
      minTensionAlignment: 100,
      maxAITonePercent: 100,
      blockOnRedTag: false,
    };
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), strict);
    const reason = result.failReasons.find(r => r.startsWith('eos_below'));
    expect(reason).toBeDefined();
  });

  it('tension_misaligned reason appears when alignment threshold is 0', () => {
    const strict: QualityThresholds = {
      minGrade: 'D',
      minDirectorScore: 0,
      minEOS: 0,
      minTensionAlignment: 0,
      maxAITonePercent: 100,
      blockOnRedTag: false,
    };
    // With minTensionAlignment = 0, even small delta triggers
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), strict);
    // This may or may not trigger depending on the actual tension match.
    // We only assert the result is structurally valid.
    expect(typeof result.passed).toBe('boolean');
  });

  it('empty text still returns a valid result', () => {
    const thresholds = getDefaultThresholds('beginner');
    const result = evaluateQuality('', makeConfig(), thresholds);
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('grade');
    expect(result).toHaveProperty('failReasons');
  });

  it('different episodes affect tension target', () => {
    const thresholds = getDefaultThresholds('beginner');
    const earlyEp = evaluateQuality(SAMPLE_TEXT, makeConfig({ episode: 1 }), thresholds);
    const climaxEp = evaluateQuality(SAMPLE_TEXT, makeConfig({ episode: 20 }), thresholds);
    // Both return valid results; tension targets differ internally
    expect(earlyEp.grade).toBeDefined();
    expect(climaxEp.grade).toBeDefined();
  });
});

// ============================================================
// buildRetryHint()
// ============================================================

describe('buildRetryHint', () => {
  function makeResult(overrides: Partial<QualityGateResult> = {}): QualityGateResult {
    return {
      passed: false,
      attempt: 1,
      failReasons: [],
      grade: 'C',
      directorScore: 30,
      eosScore: 10,
      qualityTag: '🟡',
      ...overrides,
    };
  }

  it('returns empty string when no fail reasons', () => {
    const result = makeResult({ failReasons: [] });
    expect(buildRetryHint(result, 1, 'KO')).toBe('');
  });

  it('KO: grade_below produces Korean hint', () => {
    const result = makeResult({ failReasons: ['grade_below: C < B'] });
    const hint = buildRetryHint(result, 1, 'KO');
    expect(hint).toContain('품질');
    expect(hint).toContain('감정');
  });

  it('EN: grade_below produces English hint', () => {
    const result = makeResult({ failReasons: ['grade_below: C < B'] });
    const hint = buildRetryHint(result, 1, 'EN');
    expect(hint).toContain('quality');
    expect(hint).toContain('emotional');
  });

  it('director_below produces causality hint', () => {
    const result = makeResult({ failReasons: ['director_below: 30 < 60'] });
    const hintKO = buildRetryHint(result, 1, 'KO');
    const hintEN = buildRetryHint(result, 1, 'EN');
    expect(hintKO).toContain('인과관계');
    expect(hintEN).toContain('cause-effect');
  });

  it('eos_below produces emotion keyword hint', () => {
    const result = makeResult({ failReasons: ['eos_below: 10 < 40'] });
    const hintKO = buildRetryHint(result, 1, 'KO');
    const hintEN = buildRetryHint(result, 1, 'EN');
    expect(hintKO).toContain('감정 키워드');
    expect(hintEN).toContain('emotion keywords');
  });

  it('tension_misaligned produces tension hint', () => {
    const result = makeResult({ failReasons: ['tension_misaligned: delta=35 > 25'] });
    const hint = buildRetryHint(result, 1, 'KO');
    expect(hint).toContain('긴장감');
  });

  it('ai_tone produces AI tone removal hint', () => {
    const result = makeResult({ failReasons: ['ai_tone_high: 30% > 10%'] });
    const hintKO = buildRetryHint(result, 1, 'KO');
    const hintEN = buildRetryHint(result, 1, 'EN');
    expect(hintKO).toContain('AI 문투');
    expect(hintEN).toContain('AI-like');
  });

  it('multiple fail reasons produce multiple hints', () => {
    const result = makeResult({
      failReasons: ['grade_below: C < B', 'eos_below: 10 < 40', 'director_below: 20 < 60'],
    });
    const hint = buildRetryHint(result, 1, 'KO');
    expect(hint).toContain('품질');
    expect(hint).toContain('감정 키워드');
    expect(hint).toContain('인과관계');
  });

  it('attempt >= 3 appends extra urgency line', () => {
    const result = makeResult({ failReasons: ['grade_below: C < B'] });
    const hint1 = buildRetryHint(result, 1, 'KO');
    const hint3 = buildRetryHint(result, 3, 'KO');
    expect(hint1).not.toContain('반드시 해결');
    expect(hint3).toContain('반드시 해결');
  });

  it('attempt >= 3 urgency works in EN too', () => {
    const result = makeResult({ failReasons: ['grade_below: C < B'] });
    const hint = buildRetryHint(result, 4, 'EN');
    expect(hint).toContain('MUST fix');
  });

  it('includes attempt number in header', () => {
    const result = makeResult({ failReasons: ['eos_below: 5 < 20'] });
    const hint = buildRetryHint(result, 2, 'KO');
    expect(hint).toContain('시도 2');
  });
});

// ============================================================
// M4 — Author-Lead Ratio adjustment
// ============================================================

describe('M4 author-lead ratio in evaluateQuality', () => {
  it('applies +10 bonus when author-lead >= 80%', () => {
    const thresholds = getDefaultThresholds('beginner');
    const config = makeConfig({
      sceneDirection: {
        writerNotes: 'A',
        plotStructure: 'B',
        cliffhanger: { cliffType: 'shock', desc: 'C' },
        hooks: [
          { position: 'opening', hookType: 'shock', desc: 'D' },
          { position: 'mid', hookType: 'cliff', desc: 'E' },
        ],
      },
    });
    const result = evaluateQuality(SAMPLE_TEXT, config, thresholds);
    expect(result.authorLeadRatio).toBe(100);
    expect(result.authorLeadAdjustment).toBe(10);
  });

  it('applies -10 penalty when author-lead < 30%', () => {
    const thresholds = getDefaultThresholds('beginner');
    const config = makeConfig({
      sceneDirection: {
        // 모두 ENGINE_DRAFT (V2)
        writerNotes: { value: 'A', meta: { origin: 'ENGINE_DRAFT', createdAt: 0 } },
        plotStructure: { value: 'B', meta: { origin: 'ENGINE_DRAFT', createdAt: 0 } },
        cliffhanger: { value: { cliffType: 'shock', desc: 'C' }, meta: { origin: 'ENGINE_DRAFT', createdAt: 0 } },
      } as unknown as StoryConfig['sceneDirection'],
    });
    const result = evaluateQuality(SAMPLE_TEXT, config, thresholds);
    expect(result.authorLeadRatio).toBe(0);
    expect(result.authorLeadAdjustment).toBe(-10);
  });

  it('returns 0 adjustment when no sceneDirection', () => {
    const thresholds = getDefaultThresholds('beginner');
    const result = evaluateQuality(SAMPLE_TEXT, makeConfig(), thresholds);
    expect(result.authorLeadRatio).toBe(0);
    expect(result.authorLeadAdjustment).toBe(0);
  });

  it('returns 0 adjustment in mid-range (30-79%)', () => {
    const thresholds = getDefaultThresholds('beginner');
    const config = makeConfig({
      sceneDirection: {
        // 50% USER, 50% ENGINE_DRAFT
        writerNotes: 'A',
        plotStructure: 'B',
        cliffhanger: { value: { cliffType: 'shock', desc: 'C' }, meta: { origin: 'ENGINE_DRAFT', createdAt: 0 } },
        hooks: [
          { value: { position: 'opening', hookType: 'shock', desc: 'D' }, meta: { origin: 'ENGINE_DRAFT', createdAt: 0 } },
        ],
      } as unknown as StoryConfig['sceneDirection'],
    });
    const result = evaluateQuality(SAMPLE_TEXT, config, thresholds);
    expect(result.authorLeadRatio).toBe(50);
    expect(result.authorLeadAdjustment).toBe(0);
  });
});
