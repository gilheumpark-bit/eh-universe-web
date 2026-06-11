import {
  webtoonFitScore,
  gameFitScore,
  dramaFitScore,
  globalAppealScore,
  computeMediaAvg,
  estimateWebtoonFitFromConfig,
  estimateGameFitFromConfig,
  estimateDramaFitFromConfig,
  estimateGlobalAppealFromConfig,
  WEBTOON_WEIGHTS,
  GAME_WEIGHTS,
  DRAMA_WEIGHTS,
  GLOBAL_WEIGHTS,
  ESTIMATE_CONFIDENCE_MIN,
  ESTIMATE_CONFIDENCE_MAX,
  type WebtoonFitParts,
  type GameFitParts,
  type DramaFitParts,
  type GlobalAppealParts,
  type MediaFitScores,
} from '@/lib/creative/media-fit-score';
import { Genre, type StoryConfig } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';

// ---------- 헬퍼: 균등 점수 객체 ----------
function uniformWebtoon(v: number): WebtoonFitParts {
  return {
    visualIdentity: v,
    verticalScrollRhythm: v,
    episodeCliff: v,
    productionRepeatability: v,
    dialoguePanelBalance: v,
    globalReadability: v,
    rightsAndAssetClarity: v,
  };
}
function uniformGame(v: number): GameFitParts {
  return {
    coreLoop: v,
    progression: v,
    systemClarity: v,
    playableConflict: v,
    worldModularity: v,
    characterRoster: v,
    productionFeasibility: v,
    rightsAndSafety: v,
  };
}
function uniformDrama(v: number): DramaFitParts {
  return {
    sceneStrength: v,
    castableCharacters: v,
    seasonArc: v,
    visualSetPieces: v,
    productionFeasibility: v,
    audienceHook: v,
  };
}
function uniformGlobal(v: number): GlobalAppealParts {
  return {
    universalPremise: v,
    translationEase: v,
    culturalRiskControl: v,
    genreGlobalDemand: v,
    visualPitchReadiness: v,
    rightsTerritoryClarity: v,
  };
}

// ---------- 헬퍼: 최소 StoryConfig ----------
function baseConfig(overrides: Partial<StoryConfig> = {}): StoryConfig {
  return {
    genre: Genre.SYSTEM_HUNTER,
    povCharacter: '주인공',
    setting: '',
    primaryEmotion: '',
    episode: 1,
    title: '테스트 작품',
    totalEpisodes: 1,
    guardrails: { min: 0, max: 0 },
    characters: [],
    platform: PlatformType.WEB,
    ...overrides,
  };
}

// ============================================================
// 가중치 합 = 100 (사양 문서 수치 그대로인지 전수 검증)
// ============================================================
describe('가중치 — 사양 문서 합 100 강제', () => {
  it('WEBTOON_WEIGHTS 합 100 · 사양 §1 수치', () => {
    const sum = Object.values(WEBTOON_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    expect(WEBTOON_WEIGHTS.visualIdentity).toBe(20);
    expect(WEBTOON_WEIGHTS.verticalScrollRhythm).toBe(15);
    expect(WEBTOON_WEIGHTS.episodeCliff).toBe(15);
    expect(WEBTOON_WEIGHTS.productionRepeatability).toBe(15);
    expect(WEBTOON_WEIGHTS.dialoguePanelBalance).toBe(10);
    expect(WEBTOON_WEIGHTS.globalReadability).toBe(10);
    expect(WEBTOON_WEIGHTS.rightsAndAssetClarity).toBe(15);
  });

  it('GAME_WEIGHTS 합 100 · 사양 §1 수치', () => {
    const sum = Object.values(GAME_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    expect(GAME_WEIGHTS.coreLoop).toBe(20);
    expect(GAME_WEIGHTS.progression).toBe(15);
    expect(GAME_WEIGHTS.systemClarity).toBe(15);
    expect(GAME_WEIGHTS.playableConflict).toBe(15);
    expect(GAME_WEIGHTS.worldModularity).toBe(10);
    expect(GAME_WEIGHTS.characterRoster).toBe(10);
    expect(GAME_WEIGHTS.productionFeasibility).toBe(10);
    expect(GAME_WEIGHTS.rightsAndSafety).toBe(5);
  });

  it('DRAMA_WEIGHTS 합 100 · 산업별 §2.3 screenFit 수치', () => {
    const sum = Object.values(DRAMA_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    expect(DRAMA_WEIGHTS.sceneStrength).toBe(20);
    expect(DRAMA_WEIGHTS.castableCharacters).toBe(15);
    expect(DRAMA_WEIGHTS.seasonArc).toBe(15);
    expect(DRAMA_WEIGHTS.visualSetPieces).toBe(20);
    expect(DRAMA_WEIGHTS.productionFeasibility).toBe(15);
    expect(DRAMA_WEIGHTS.audienceHook).toBe(15);
  });

  it('GLOBAL_WEIGHTS 합 100 · 산업별 §2.7 globalFit 수치', () => {
    const sum = Object.values(GLOBAL_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    expect(GLOBAL_WEIGHTS.universalPremise).toBe(20);
    expect(GLOBAL_WEIGHTS.translationEase).toBe(15);
    expect(GLOBAL_WEIGHTS.culturalRiskControl).toBe(15);
    expect(GLOBAL_WEIGHTS.genreGlobalDemand).toBe(15);
    expect(GLOBAL_WEIGHTS.visualPitchReadiness).toBe(20);
    expect(GLOBAL_WEIGHTS.rightsTerritoryClarity).toBe(15);
  });
});

// ============================================================
// webtoonFitScore — 만점/0점/부분/판정 경계
// ============================================================
describe('webtoonFitScore', () => {
  it('만점: 전 축 100 → score 100 · 즉시 제안', () => {
    const r = webtoonFitScore(uniformWebtoon(100));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('웹툰화 제안 즉시 가능');
  });

  it('0점: 전 축 0 → score 0 · 재설계 우선', () => {
    const r = webtoonFitScore(uniformWebtoon(0));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('웹툰화보다 원고/비주얼 재설계 우선');
  });

  it('부분: visualIdentity 만 100 → score = 가중치 20', () => {
    const r = webtoonFitScore({ ...uniformWebtoon(0), visualIdentity: 100 });
    expect(r.score).toBe(20);
    expect(r.breakdown.weighted.visualIdentity).toBe(20);
    expect(r.breakdown.weighted.episodeCliff).toBe(0);
  });

  it('판정 경계: 85→즉시 · 84.9측(80)→콘티 보강 · 74→리듬 보강 · 59→재설계', () => {
    expect(webtoonFitScore(uniformWebtoon(85)).verdict).toBe('웹툰화 제안 즉시 가능');
    expect(webtoonFitScore(uniformWebtoon(80)).verdict).toBe(
      '5화 웹툰형 콘티 보강 후 가능',
    );
    expect(webtoonFitScore(uniformWebtoon(75)).verdict).toBe(
      '5화 웹툰형 콘티 보강 후 가능',
    );
    expect(webtoonFitScore(uniformWebtoon(74)).verdict).toBe(
      '캐릭/장소/컷 리듬 보강 필요',
    );
    expect(webtoonFitScore(uniformWebtoon(60)).verdict).toBe(
      '캐릭/장소/컷 리듬 보강 필요',
    );
    expect(webtoonFitScore(uniformWebtoon(59)).verdict).toBe(
      '웹툰화보다 원고/비주얼 재설계 우선',
    );
  });

  it('빈 입력 안전: 빈 객체/null → score 0 크래시 없음', () => {
    expect(webtoonFitScore({} as WebtoonFitParts).score).toBe(0);
    expect(
      webtoonFitScore(null as unknown as WebtoonFitParts).score,
    ).toBe(0);
  });

  it('이상값 clamp: NaN/음수/100 초과 흡수', () => {
    const r = webtoonFitScore({
      ...uniformWebtoon(0),
      visualIdentity: 999, // → 100
      episodeCliff: -50, // → 0
      globalReadability: NaN, // → 0
    });
    expect(r.score).toBe(20);
    expect(r.breakdown.raw.visualIdentity).toBe(100);
    expect(r.breakdown.raw.episodeCliff).toBe(0);
    expect(r.breakdown.raw.globalReadability).toBe(0);
  });
});

// ============================================================
// gameFitScore — 만점/0점/부분/판정 경계
// ============================================================
describe('gameFitScore', () => {
  it('만점: 전 축 100 → score 100 · 브리프 즉시', () => {
    const r = gameFitScore(uniformGame(100));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('게임 IP 브리프 즉시 생성');
  });

  it('0점: 전 축 0 → score 0 · 타 매체 우선', () => {
    const r = gameFitScore(uniformGame(0));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('게임보다 웹툰/영상 우선');
  });

  it('부분: coreLoop 만 100 → score = 가중치 20 · rightsAndSafety 만 100 → 5', () => {
    expect(gameFitScore({ ...uniformGame(0), coreLoop: 100 }).score).toBe(20);
    expect(gameFitScore({ ...uniformGame(0), rightsAndSafety: 100 }).score).toBe(5);
  });

  it('판정 경계: 85/75/60 — 사양 §1 그대로', () => {
    expect(gameFitScore(uniformGame(85)).verdict).toBe('게임 IP 브리프 즉시 생성');
    expect(gameFitScore(uniformGame(75)).verdict).toBe(
      'core loop/roster 보강 후 제안',
    );
    expect(gameFitScore(uniformGame(60)).verdict).toBe(
      '세계관 규칙과 성장 체계 보강',
    );
    expect(gameFitScore(uniformGame(59.9)).verdict).toBe('게임보다 웹툰/영상 우선');
  });

  it('빈 입력 안전: 빈 객체/undefined → score 0', () => {
    expect(gameFitScore({} as GameFitParts).score).toBe(0);
    expect(gameFitScore(undefined as unknown as GameFitParts).score).toBe(0);
  });
});

// ============================================================
// dramaFitScore — 만점/0점/부분/임계 80 (사양 §3 단일 임계)
// ============================================================
describe('dramaFitScore', () => {
  it('만점: 전 축 100 → score 100 · 병행 가능', () => {
    const r = dramaFitScore(uniformDrama(100));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('영상화 제안 병행 가능 (screenFit ≥ 80)');
  });

  it('0점: 전 축 0 → score 0 · 기준 미달', () => {
    const r = dramaFitScore(uniformDrama(0));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('영상화 제안 기준 미달 (screenFit < 80)');
  });

  it('부분: sceneStrength+visualSetPieces(각 20) 만 100 → score 40', () => {
    const r = dramaFitScore({
      ...uniformDrama(0),
      sceneStrength: 100,
      visualSetPieces: 100,
    });
    expect(r.score).toBe(40);
  });

  it('임계 80 경계: 80 → 병행 가능 · 79.9 → 미달', () => {
    expect(dramaFitScore(uniformDrama(80)).verdict).toBe(
      '영상화 제안 병행 가능 (screenFit ≥ 80)',
    );
    expect(dramaFitScore(uniformDrama(79.9)).verdict).toBe(
      '영상화 제안 기준 미달 (screenFit < 80)',
    );
  });

  it('빈 입력 안전', () => {
    expect(dramaFitScore({} as DramaFitParts).score).toBe(0);
    expect(dramaFitScore(null as unknown as DramaFitParts).score).toBe(0);
  });
});

// ============================================================
// globalAppealScore — 만점/0점/부분/임계 75 (사양 §3 단일 임계)
// ============================================================
describe('globalAppealScore', () => {
  it('만점: 전 축 100 → score 100 · 패키지 생성 가능', () => {
    const r = globalAppealScore(uniformGlobal(100));
    expect(r.score).toBe(100);
    expect(r.verdict).toBe('해외 진출 패키지 생성 가능 (globalFit ≥ 75)');
  });

  it('0점: 전 축 0 → score 0 · 기준 미달', () => {
    const r = globalAppealScore(uniformGlobal(0));
    expect(r.score).toBe(0);
    expect(r.verdict).toBe('해외 진출 기준 미달 (globalFit < 75)');
  });

  it('부분: translationEase(15)+culturalRiskControl(15) 만 100 → score 30', () => {
    const r = globalAppealScore({
      ...uniformGlobal(0),
      translationEase: 100,
      culturalRiskControl: 100,
    });
    expect(r.score).toBe(30);
  });

  it('임계 75 경계: 75 → 생성 가능 · 74.9 → 미달', () => {
    expect(globalAppealScore(uniformGlobal(75)).verdict).toBe(
      '해외 진출 패키지 생성 가능 (globalFit ≥ 75)',
    );
    expect(globalAppealScore(uniformGlobal(74.9)).verdict).toBe(
      '해외 진출 기준 미달 (globalFit < 75)',
    );
  });

  it('빈 입력 안전', () => {
    expect(globalAppealScore({} as GlobalAppealParts).score).toBe(0);
  });
});

// ============================================================
// computeMediaAvg — integrated-grade 축 점수 규약(0~100·소수 1자리) 정합
// ============================================================
describe('computeMediaAvg', () => {
  it('전 매체 100 → 100 · 전 매체 0 → 0', () => {
    expect(computeMediaAvg({ webtoon: 100, game: 100, drama: 100, global: 100 })).toBe(100);
    expect(computeMediaAvg({ webtoon: 0, game: 0, drama: 0, global: 0 })).toBe(0);
  });

  it('혼합: {80,60,40,20} → 단순 평균 50 (동가중 — 결합 가중치 사양 미정의)', () => {
    expect(computeMediaAvg({ webtoon: 80, game: 60, drama: 40, global: 20 })).toBe(50);
  });

  it('소수 1자리 반올림: {33,33,33,33} → 33 · {1,0,0,0} → 0.3', () => {
    expect(computeMediaAvg({ webtoon: 33, game: 33, drama: 33, global: 33 })).toBe(33);
    expect(computeMediaAvg({ webtoon: 1, game: 0, drama: 0, global: 0 })).toBe(0.3);
  });

  it('빈/이상 입력 안전: 빈 객체·null·NaN·범위 밖 → 0~100 내 산출', () => {
    expect(computeMediaAvg({} as MediaFitScores)).toBe(0);
    expect(computeMediaAvg(null as unknown as MediaFitScores)).toBe(0);
    const r = computeMediaAvg({
      webtoon: NaN,
      game: 999,
      drama: -10,
      global: Infinity,
    });
    // NaN→0, 999→100, -10→0, Infinity→0 → 평균 25
    expect(r).toBe(25);
  });

  it('출력 범위는 integrated-grade 축 점수 규약(0~100)과 정합', () => {
    const samples: MediaFitScores[] = [
      { webtoon: 0, game: 0, drama: 0, global: 0 },
      { webtoon: 100, game: 100, drama: 100, global: 100 },
      { webtoon: 12.34, game: 56.78, drama: 90.12, global: 3.45 },
    ];
    for (const s of samples) {
      const v = computeMediaAvg(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      // 소수 1자리 규약
      expect(Math.round(v * 10) / 10).toBe(v);
    }
  });
});

// ============================================================
// estimate*FromConfig — confidence 0.55~0.65 · 축 범위 · 빈 입력 안전
// ============================================================
describe('estimate*FromConfig — 휴리스틱 추정 (실측 아님)', () => {
  const estimators = [
    estimateWebtoonFitFromConfig,
    estimateGameFitFromConfig,
    estimateDramaFitFromConfig,
    estimateGlobalAppealFromConfig,
  ] as const;

  it('confidence 는 전 함수 0.55~0.65 범위 고정 표명', () => {
    for (const est of estimators) {
      const r = est(baseConfig());
      expect(r.confidence).toBeGreaterThanOrEqual(ESTIMATE_CONFIDENCE_MIN);
      expect(r.confidence).toBeLessThanOrEqual(ESTIMATE_CONFIDENCE_MAX);
    }
  });

  it('전 축 0~100 범위 · basis 비어 있지 않음', () => {
    for (const est of estimators) {
      const r = est(baseConfig());
      for (const v of Object.values(r.parts)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(r.basis.length).toBeGreaterThan(0);
    }
  });

  it('빈 입력 안전: null/undefined config 크래시 없음 · 범위 유지', () => {
    for (const est of estimators) {
      const rn = est(null);
      const ru = est(undefined);
      for (const v of [...Object.values(rn.parts), ...Object.values(ru.parts)]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('웹툰: 비주얼 자산 풍부 config 가 빈 config 보다 visualIdentity 추정 높음', () => {
    const rich = estimateWebtoonFitFromConfig(
      baseConfig({
        characters: [
          { id: '1', name: 'A', role: '주역', traits: '', appearance: '은발 적안', dna: 1, symbol: '검은 검' },
          { id: '2', name: 'B', role: '주역', traits: '', appearance: '흑발 단신', dna: 2 },
        ],
        visualPromptCards: [{} as never],
      }),
    );
    const empty = estimateWebtoonFitFromConfig(baseConfig());
    expect(rich.parts.visualIdentity).toBeGreaterThan(empty.parts.visualIdentity);
  });

  it('웹툰: 권리 축은 config 검증 불가 → 보수 고정 30 + basis 표명', () => {
    const r = estimateWebtoonFitFromConfig(baseConfig());
    expect(r.parts.rightsAndAssetClarity).toBe(30);
    expect(r.basis.some((b) => b.includes('검증 불가'))).toBe(true);
  });

  it('게임: 헌터물(SYSTEM_HUNTER)이 라이트노벨보다 coreLoop 추정 높음 (§2 매핑 proxy)', () => {
    const hunter = estimateGameFitFromConfig(baseConfig({ genre: Genre.SYSTEM_HUNTER }));
    const ln = estimateGameFitFromConfig(baseConfig({ genre: Genre.LIGHT_NOVEL }));
    expect(hunter.parts.coreLoop).toBeGreaterThan(ln.parts.coreLoop);
  });

  it('게임: 스킬·아이템 존재 시 progression 상승', () => {
    const withSystems = estimateGameFitFromConfig(
      baseConfig({
        skills: [{ id: 's1', name: '검술', type: 'active', owner: 'A', description: '', cost: '', cooldown: '', rank: 'B' }],
        items: [{ id: 'i1', name: '검', category: 'weapon', rarity: 'rare', description: '', effect: '', obtainedFrom: '' }],
      }),
    );
    const without = estimateGameFitFromConfig(baseConfig());
    expect(withSystems.parts.progression).toBeGreaterThan(without.parts.progression);
  });

  it('영상: 시즌 분량(24화+)·시놉시스 존재 시 seasonArc 상승', () => {
    const seasoned = estimateDramaFitFromConfig(
      baseConfig({ totalEpisodes: 24, synopsis: '한 줄 시놉시스' }),
    );
    const single = estimateDramaFitFromConfig(baseConfig({ totalEpisodes: 1 }));
    expect(seasoned.parts.seasonArc).toBeGreaterThan(single.parts.seasonArc);
  });

  // episodeState 반쪽 배선 수리: write 경로 부재 → manuscript 본문 존재로 보너스 유도
  it('웹툰: 실제 본문 manuscript 존재 시 episodeState 없이도 episodeCliff 상승 (유도 보너스)', () => {
    const developed = estimateWebtoonFitFromConfig(
      baseConfig({
        manuscripts: [
          { episode: 1, title: '1화', content: '본문 내용', charCount: 4, lastUpdate: 0 },
        ],
      }),
    );
    const empty = estimateWebtoonFitFromConfig(baseConfig());
    expect(developed.parts.episodeCliff).toBeGreaterThan(empty.parts.episodeCliff);
  });

  it('웹툰: 빈 content manuscript 는 회차 개발로 보지 않음 (유도 신호 엄격)', () => {
    const blank = estimateWebtoonFitFromConfig(
      baseConfig({
        manuscripts: [{ episode: 1, title: '1화', content: '   ', charCount: 0, lastUpdate: 0 }],
      }),
    );
    expect(blank.basis.some((b) => b.includes('회차 개발 진행'))).toBe(false);
  });

  it('영상: 실제 본문 manuscript 존재 시 episodeState 없이도 seasonArc 유도 보너스 발화', () => {
    const developed = estimateDramaFitFromConfig(
      baseConfig({
        manuscripts: [
          { episode: 1, title: '1화', content: '본문 내용', charCount: 4, lastUpdate: 0 },
        ],
      }),
    );
    expect(developed.basis.some((b) => b.includes('회차 개발 진행'))).toBe(true);
  });

  it('해외: 번역 설정 존재 시 translationEase 상승', () => {
    const withTr = estimateGlobalAppealFromConfig(
      baseConfig({
        translationConfig: {
          mode: 'fidelity',
          targetLang: 'EN',
          band: 0.5,
          scoreThreshold: 0.7,
          maxRecreate: 2,
          contractionLevel: 'normal',
          glossary: [{ source: '헌터', target: 'Hunter', locked: true }],
        },
      }),
    );
    const without = estimateGlobalAppealFromConfig(baseConfig());
    expect(withTr.parts.translationEase).toBeGreaterThan(without.parts.translationEase);
  });

  it('추정 parts 는 4 산식에 그대로 주입 가능 (end-to-end smoke)', () => {
    const cfg = baseConfig({ setting: '서울 게이트', synopsis: 'S', totalEpisodes: 50 });
    const w = webtoonFitScore(estimateWebtoonFitFromConfig(cfg).parts);
    const g = gameFitScore(estimateGameFitFromConfig(cfg).parts);
    const d = dramaFitScore(estimateDramaFitFromConfig(cfg).parts);
    const gl = globalAppealScore(estimateGlobalAppealFromConfig(cfg).parts);
    const avg = computeMediaAvg({
      webtoon: w.score,
      game: g.score,
      drama: d.score,
      global: gl.score,
    });
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(avg).toBeLessThanOrEqual(100);
  });
});
