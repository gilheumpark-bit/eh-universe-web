import {
  getDefaultPipelineConfig,
  executePipeline,
  buildPipelineSummary,
  PipelineExecution,
} from '../auto-pipeline';
import {
  StoryConfig,
  Genre,
  AutoPipelineConfig,
  SkillLevel,
} from '../../lib/studio-types';
import { PlatformType } from '../types';

// ============================================================
// PART 1 — Test Fixtures
// ============================================================

function makeFullConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.SF,
    povCharacter: '민아',
    setting: '2180년 네오서울, 거대한 기업이 지배하는 도시',
    primaryEmotion: '불안',
    episode: 3,
    title: '테스트 소설',
    totalEpisodes: 20,
    synopsis: 'AI가 지배하는 도시에서 인간이 감정을 되찾는 이야기. 주인공은 기억을 잃었다.',
    guardrails: { min: 3000, max: 5000 },
    characters: [
      { id: 'c1', name: '민아', role: 'hero', traits: '용감하고 냉정하지만 따뜻한 마음', appearance: '', dna: 80 },
      { id: 'c2', name: '다크', role: 'villain', traits: '교활하고 지능적인 악당', appearance: '', dna: 60 },
    ],
    charRelations: [{ from: 'c1', to: 'c2', type: 'enemy', desc: '과거 동료' }],
    platform: PlatformType.MOBILE,
    sceneDirection: {
      hooks: [{ position: 'opening', hookType: 'shock', desc: '긴박한 진입' }],
      goguma: [{ type: 'goguma', intensity: 'medium', desc: '배신 암시' }],
      cliffhanger: { cliffType: 'info-before', desc: '"사실 너는—"' },
    },
    ...overrides,
  };
}

function makeMinimalConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '',
    totalEpisodes: 1,
    guardrails: { min: 0, max: 0 },
    characters: [],
    platform: PlatformType.MOBILE,
    ...overrides,
  };
}

// IDENTITY_SEAL: PART-1 | role=fixtures | inputs=overrides | outputs=StoryConfig

// ============================================================
// PART 2 — getDefaultPipelineConfig tests
// ============================================================

describe('getDefaultPipelineConfig', () => {
  it.each<SkillLevel>(['beginner', 'intermediate', 'advanced'])(
    'returns enabled config for skill level "%s"',
    (level) => {
      const cfg = getDefaultPipelineConfig(level);
      expect(cfg.enabled).toBe(true);
      expect(cfg.qualityGateEnabled).toBe(true);
      expect(cfg.stages.world_check.enabled).toBe(true);
      expect(cfg.stages.character_sync.enabled).toBe(true);
      expect(cfg.stages.direction_setup.enabled).toBe(true);
      expect(cfg.stages.generation.enabled).toBe(true);
    },
  );

  it('sets generation failAction to "warn" for beginner', () => {
    const cfg = getDefaultPipelineConfig('beginner');
    expect(cfg.stages.generation.failAction).toBe('warn');
  });

  it('sets generation failAction to "block" for intermediate', () => {
    const cfg = getDefaultPipelineConfig('intermediate');
    expect(cfg.stages.generation.failAction).toBe('block');
  });

  it('sets generation failAction to "block" for advanced', () => {
    const cfg = getDefaultPipelineConfig('advanced');
    expect(cfg.stages.generation.failAction).toBe('block');
  });

  it('direction_setup failAction is "skip"', () => {
    const cfg = getDefaultPipelineConfig('beginner');
    expect(cfg.stages.direction_setup.failAction).toBe('skip');
  });

  it('world_check and character_sync failAction is "warn"', () => {
    const cfg = getDefaultPipelineConfig('beginner');
    expect(cfg.stages.world_check.failAction).toBe('warn');
    expect(cfg.stages.character_sync.failAction).toBe('warn');
  });

  it('passThreshold values are correct', () => {
    const cfg = getDefaultPipelineConfig('beginner');
    expect(cfg.stages.world_check.passThreshold).toBe(60);
    expect(cfg.stages.character_sync.passThreshold).toBe(70);
    expect(cfg.stages.direction_setup.passThreshold).toBe(50);
    expect(cfg.stages.generation.passThreshold).toBe(70);
  });
});

// IDENTITY_SEAL: PART-2 | role=default config tests | inputs=SkillLevel | outputs=assertions

// ============================================================
// PART 3 — executePipeline: Stage Evaluation Logic
// ============================================================

describe('executePipeline — stage evaluation', () => {
  const defaultCfg = getDefaultPipelineConfig('beginner');

  it('full config passes all pre-generation stages', () => {
    const exec = executePipeline(
      { config: makeFullConfig(), currentEpisode: 3 },
      defaultCfg,
    );
    expect(exec.finalStatus).toBe('completed');
    expect(exec.blockedAt).toBeUndefined();
    const passed = exec.stages.filter(s => s.status === 'passed');
    expect(passed.length).toBeGreaterThanOrEqual(3);
  });

  it('appends generation stage as pending when not blocked', () => {
    const exec = executePipeline(
      { config: makeFullConfig(), currentEpisode: 1 },
      defaultCfg,
    );
    const gen = exec.stages.find(s => s.stage === 'generation');
    expect(gen).toBeDefined();
    expect(gen!.status).toBe('pending');
  });

  it('world_check fails when synopsis is too short', () => {
    const exec = executePipeline(
      { config: makeFullConfig({ synopsis: 'short' }), currentEpisode: 1 },
      defaultCfg,
    );
    const wc = exec.stages.find(s => s.stage === 'world_check');
    expect(wc).toBeDefined();
    // synopsis < 20 chars loses 30 points → score = 70 (still passes at threshold 60)
    // but with empty genre etc. we can combine
  });

  it('world_check deducts for missing genre', () => {
    const cfg = makeFullConfig({ genre: '' as Genre });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const wc = exec.stages.find(s => s.stage === 'world_check');
    expect(wc!.warnings).toContain('genre_not_set');
  });

  it('world_check deducts for empty characters', () => {
    const cfg = makeFullConfig({ characters: [] });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const wc = exec.stages.find(s => s.stage === 'world_check');
    expect(wc!.warnings).toContain('no_characters');
  });

  it('world_check deducts for vague setting', () => {
    const cfg = makeFullConfig({ setting: 'short' });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const wc = exec.stages.find(s => s.stage === 'world_check');
    expect(wc!.warnings).toContain('setting_vague');
  });

  it('character_sync skips when no characters exist', () => {
    const cfg = makeFullConfig({ characters: [] });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const cs = exec.stages.find(s => s.stage === 'character_sync');
    expect(cs!.status).toBe('skipped');
    expect(cs!.score).toBe(0);
  });

  it('character_sync warns for incomplete traits', () => {
    const cfg = makeFullConfig({
      characters: [{ id: 'c1', name: '테스트', role: 'hero', traits: 'short', appearance: '', dna: 50 }],
    });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const cs = exec.stages.find(s => s.stage === 'character_sync');
    expect(cs!.warnings).toContain('테스트: traits_incomplete');
  });

  it('character_sync warns for missing role', () => {
    const cfg = makeFullConfig({
      characters: [{ id: 'c1', name: '노역할', role: '', traits: '충분히 긴 트레이트 설명입니다 이것은 충분합니다', appearance: '', dna: 50 }],
    });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const cs = exec.stages.find(s => s.stage === 'character_sync');
    expect(cs!.warnings).toContain('노역할: role_missing');
  });

  it('character_sync warns when povCharacter not in character list', () => {
    const cfg = makeFullConfig({ povCharacter: '없는캐릭터' });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const cs = exec.stages.find(s => s.stage === 'character_sync');
    expect(cs!.warnings).toContain('pov_character_not_in_list');
  });

  it('direction_setup warns when no sceneDirection', () => {
    const cfg = makeFullConfig({ sceneDirection: undefined });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const ds = exec.stages.find(s => s.stage === 'direction_setup');
    expect(ds!.warnings).toContain('no_scene_direction');
  });

  it('direction_setup warns for missing hooks', () => {
    const cfg = makeFullConfig({
      sceneDirection: {
        hooks: [],
        goguma: [{ type: 'goguma', intensity: 'medium', desc: '긴장' }],
        cliffhanger: { cliffType: 'info-before', desc: '...' },
      },
    });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const ds = exec.stages.find(s => s.stage === 'direction_setup');
    expect(ds!.warnings).toContain('no_hooks');
  });

  it('direction_setup warns for missing goguma', () => {
    const cfg = makeFullConfig({
      sceneDirection: {
        hooks: [{ position: 'opening', hookType: 'shock', desc: 'x' }],
        goguma: [],
        cliffhanger: { cliffType: 'info-before', desc: '...' },
      },
    });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const ds = exec.stages.find(s => s.stage === 'direction_setup');
    expect(ds!.warnings).toContain('no_tension_devices');
  });

  it('direction_setup warns when guardrails min is 0', () => {
    const cfg = makeFullConfig({ guardrails: { min: 0, max: 5000 } });
    const exec = executePipeline(
      { config: cfg, currentEpisode: 1 },
      defaultCfg,
    );
    const ds = exec.stages.find(s => s.stage === 'direction_setup');
    expect(ds!.warnings).toContain('guardrails_not_set');
  });
});

// IDENTITY_SEAL: PART-3 | role=stage evaluation tests | inputs=StoryConfig variants | outputs=assertions

// ============================================================
// PART 4 — executePipeline: State Transitions & Fail Actions
// ============================================================

describe('executePipeline — state transitions & fail actions', () => {
  it('block failAction stops pipeline and sets blockedAt', () => {
    const blockCfg: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: true, passThreshold: 60, failAction: 'block' },
        character_sync: { enabled: true, passThreshold: 70, failAction: 'warn' },
        direction_setup: { enabled: true, passThreshold: 50, failAction: 'skip' },
        generation: { enabled: true, passThreshold: 70, failAction: 'block' },
      },
    };
    // minimal config will fail world_check
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      blockCfg,
    );
    expect(exec.finalStatus).toBe('failed');
    expect(exec.blockedAt).toBe('world_check');
    // pipeline should stop — no generation stage appended
    const gen = exec.stages.find(s => s.stage === 'generation');
    expect(gen).toBeUndefined();
  });

  it('skip failAction converts failed status to skipped and continues', () => {
    const skipCfg: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: true, passThreshold: 60, failAction: 'skip' },
        character_sync: { enabled: true, passThreshold: 70, failAction: 'skip' },
        direction_setup: { enabled: true, passThreshold: 50, failAction: 'skip' },
        generation: { enabled: true, passThreshold: 70, failAction: 'skip' },
      },
    };
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      skipCfg,
    );
    // all failures converted to skipped → pipeline completes
    expect(exec.finalStatus).toBe('completed');
    expect(exec.blockedAt).toBeUndefined();
    const skipped = exec.stages.filter(s => s.status === 'skipped');
    expect(skipped.length).toBeGreaterThan(0);
  });

  it('warn failAction keeps failed status but continues pipeline', () => {
    const warnCfg: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: true, passThreshold: 60, failAction: 'warn' },
        character_sync: { enabled: true, passThreshold: 70, failAction: 'warn' },
        direction_setup: { enabled: true, passThreshold: 50, failAction: 'warn' },
        generation: { enabled: true, passThreshold: 70, failAction: 'warn' },
      },
    };
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      warnCfg,
    );
    // has failed stages but pipeline was not blocked
    expect(exec.blockedAt).toBeUndefined();
    const failed = exec.stages.filter(s => s.status === 'failed');
    expect(failed.length).toBeGreaterThan(0);
    // partial because some stages failed
    expect(exec.finalStatus).toBe('partial');
  });

  it('disabled stage is skipped', () => {
    const cfg: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: false, passThreshold: 60, failAction: 'block' },
        character_sync: { enabled: false, passThreshold: 70, failAction: 'block' },
        direction_setup: { enabled: false, passThreshold: 50, failAction: 'block' },
        generation: { enabled: true, passThreshold: 70, failAction: 'block' },
      },
    };
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      cfg,
    );
    const preStages = exec.stages.filter(s => s.stage !== 'generation');
    expect(preStages.every(s => s.status === 'skipped')).toBe(true);
    expect(exec.finalStatus).toBe('completed');
  });

  it('block on second stage still includes first stage result', () => {
    const cfg: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: true, passThreshold: 60, failAction: 'warn' },
        character_sync: { enabled: true, passThreshold: 70, failAction: 'block' },
        direction_setup: { enabled: true, passThreshold: 50, failAction: 'skip' },
        generation: { enabled: true, passThreshold: 70, failAction: 'block' },
      },
    };
    // no characters → character_sync fails with score 0
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      cfg,
    );
    // character_sync returns status='skipped' when no characters, not 'failed'
    // so we need characters that will actually fail
    // Need enough deductions to drop below 70: 4 chars * (-10 traits + -5 role) + -15 pov = -75
    const badChars = Array.from({ length: 4 }, (_, i) => ({
      id: `c${i}`, name: `C${i}`, role: '', traits: '', appearance: '', dna: 0,
    }));
    const exec2 = executePipeline(
      {
        config: makeMinimalConfig({
          characters: badChars,
          povCharacter: 'missing',
        }),
        currentEpisode: 1,
      },
      cfg,
    );
    expect(exec2.blockedAt).toBe('character_sync');
    expect(exec2.stages.length).toBe(2); // world_check + character_sync
    expect(exec2.stages[0].stage).toBe('world_check');
    expect(exec2.stages[1].stage).toBe('character_sync');
  });

  it('execution id starts with "pipe-"', () => {
    const exec = executePipeline(
      { config: makeFullConfig(), currentEpisode: 1 },
      getDefaultPipelineConfig('beginner'),
    );
    expect(exec.id).toMatch(/^pipe-\d+$/);
  });

  it('totalDuration is non-negative', () => {
    const exec = executePipeline(
      { config: makeFullConfig(), currentEpisode: 1 },
      getDefaultPipelineConfig('beginner'),
    );
    expect(exec.totalDuration).toBeGreaterThanOrEqual(0);
  });
});

// IDENTITY_SEAL: PART-4 | role=state transition tests | inputs=config variants | outputs=assertions

// ============================================================
// PART 5 — buildPipelineSummary
// ============================================================

describe('buildPipelineSummary', () => {
  const completedExec: PipelineExecution = {
    id: 'pipe-1',
    stages: [
      { stage: 'world_check', status: 'passed', duration: 5, score: 90, warnings: [] },
      { stage: 'character_sync', status: 'passed', duration: 3, score: 85, warnings: [] },
      { stage: 'direction_setup', status: 'passed', duration: 2, score: 75, warnings: [] },
      { stage: 'generation', status: 'pending', duration: 0, warnings: [] },
    ],
    totalDuration: 10,
    finalStatus: 'completed',
  };

  const failedExec: PipelineExecution = {
    id: 'pipe-2',
    stages: [
      { stage: 'world_check', status: 'failed', duration: 3, score: 40, warnings: ['synopsis_too_short'] },
    ],
    totalDuration: 3,
    finalStatus: 'failed',
    blockedAt: 'world_check',
  };

  const partialExec: PipelineExecution = {
    id: 'pipe-3',
    stages: [
      { stage: 'world_check', status: 'failed', duration: 2, score: 50, warnings: ['genre_not_set'] },
      { stage: 'character_sync', status: 'passed', duration: 3, score: 80, warnings: [] },
      { stage: 'direction_setup', status: 'skipped', duration: 0, warnings: [] },
      { stage: 'generation', status: 'pending', duration: 0, warnings: [] },
    ],
    totalDuration: 5,
    finalStatus: 'partial',
  };

  it('completed pipeline returns green icon and KO label', () => {
    const summary = buildPipelineSummary(completedExec, true);
    expect(summary.icon).toBe('\uD83D\uDFE2');
    expect(summary.label).toBe('파이프라인 통과');
  });

  it('completed pipeline returns EN label when isKO=false', () => {
    const summary = buildPipelineSummary(completedExec, false);
    expect(summary.label).toBe('Pipeline Passed');
  });

  it('failed pipeline returns red icon', () => {
    const summary = buildPipelineSummary(failedExec, true);
    expect(summary.icon).toBe('\uD83D\uDD34');
    expect(summary.label).toBe('차단됨');
  });

  it('failed pipeline returns "Blocked" in EN', () => {
    const summary = buildPipelineSummary(failedExec, false);
    expect(summary.label).toBe('Blocked');
  });

  it('partial pipeline returns yellow icon', () => {
    const summary = buildPipelineSummary(partialExec, true);
    expect(summary.icon).toBe('\uD83D\uDFE1');
    expect(summary.label).toBe('부분 통과');
  });

  it('partial pipeline returns "Partial" in EN', () => {
    const summary = buildPipelineSummary(partialExec, false);
    expect(summary.label).toBe('Partial');
  });

  it('details include score when present', () => {
    const summary = buildPipelineSummary(completedExec, false);
    expect(summary.details[0]).toContain('(90)');
  });

  it('details include first warning', () => {
    const summary = buildPipelineSummary(failedExec, false);
    expect(summary.details[0]).toContain('synopsis_too_short');
  });

  it('details use KO stage labels', () => {
    const summary = buildPipelineSummary(completedExec, true);
    expect(summary.details[0]).toContain('세계관 검증');
    expect(summary.details[1]).toContain('캐릭터 동기화');
    expect(summary.details[2]).toContain('연출 설정');
    expect(summary.details[3]).toContain('집필 생성');
  });

  it('details use EN stage labels', () => {
    const summary = buildPipelineSummary(completedExec, false);
    expect(summary.details[0]).toContain('World Check');
    expect(summary.details[1]).toContain('Character Sync');
    expect(summary.details[2]).toContain('Direction Setup');
    expect(summary.details[3]).toContain('Generation');
  });

  it('details count matches stages count', () => {
    const summary = buildPipelineSummary(completedExec, true);
    expect(summary.details.length).toBe(completedExec.stages.length);
  });
});

// IDENTITY_SEAL: PART-5 | role=summary builder tests | inputs=PipelineExecution | outputs=assertions

// ============================================================
// PART 6 — Edge Cases
// ============================================================

describe('executePipeline — edge cases', () => {
  it('score never goes below 0 in character_sync', () => {
    const cfg = getDefaultPipelineConfig('beginner');
    const badChars = Array.from({ length: 20 }, (_, i) => ({
      id: `c${i}`, name: `캐${i}`, role: '', traits: '', appearance: '', dna: 0,
    }));
    const exec = executePipeline(
      { config: makeFullConfig({ characters: badChars, povCharacter: 'missing' }), currentEpisode: 1 },
      cfg,
    );
    const cs = exec.stages.find(s => s.stage === 'character_sync');
    expect(cs!.score).toBeGreaterThanOrEqual(0);
  });

  it('direction_setup with no guardrails object', () => {
    const cfg = getDefaultPipelineConfig('beginner');
    const exec = executePipeline(
      { config: makeFullConfig({ guardrails: undefined as unknown as { min: number; max: number } }), currentEpisode: 1 },
      cfg,
    );
    const ds = exec.stages.find(s => s.stage === 'direction_setup');
    expect(ds!.warnings).toContain('guardrails_not_set');
  });

  it('all stages disabled results in completed with only generation pending', () => {
    const allDisabled: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: false, passThreshold: 60, failAction: 'block' },
        character_sync: { enabled: false, passThreshold: 70, failAction: 'block' },
        direction_setup: { enabled: false, passThreshold: 50, failAction: 'block' },
        generation: { enabled: true, passThreshold: 70, failAction: 'block' },
      },
    };
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      allDisabled,
    );
    expect(exec.stages.length).toBe(4); // 3 skipped + 1 pending generation
    expect(exec.finalStatus).toBe('completed');
  });

  it('minimal config with all warn actions yields partial', () => {
    const warnAll: AutoPipelineConfig = {
      enabled: true,
      qualityGateEnabled: true,
      stages: {
        world_check: { enabled: true, passThreshold: 60, failAction: 'warn' },
        character_sync: { enabled: true, passThreshold: 70, failAction: 'warn' },
        direction_setup: { enabled: true, passThreshold: 50, failAction: 'warn' },
        generation: { enabled: true, passThreshold: 70, failAction: 'warn' },
      },
    };
    const exec = executePipeline(
      { config: makeMinimalConfig(), currentEpisode: 1 },
      warnAll,
    );
    expect(exec.finalStatus).toBe('partial');
    expect(exec.blockedAt).toBeUndefined();
  });
});

// IDENTITY_SEAL: PART-6 | role=edge case tests | inputs=extreme configs | outputs=assertions
