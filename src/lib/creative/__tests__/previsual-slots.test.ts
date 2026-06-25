// ============================================================
// previsual-slots 단위 테스트
// 슬롯 카테고리 수 / 4종 프리비주얼 키 / 스포일러 차단 연동 / 빈 입력
// 사양: _AI_매체_변환_표준.md §1-§3·§6 + _프리비주얼_웹툰용_전환_프로토콜.md §6
//       + _spoiler_classification.md §1·§3·§8 (E3 spoiler-guard 연동)
// ============================================================

import {
  buildPrevisualSlots,
  PREVISUAL_KINDS,
  INFO_HIERARCHY,
  IMAGE_SLOT_TOTAL,
  VIDEO_SLOT_TOTAL,
  VOICE_SLOT_TOTAL,
  PREVISUAL_AUTO_CONFIDENCE,
  type MediumSlotPlan,
  type PrevisualSceneInput,
} from '../previsual-slots';

// 카테고리 내 슬롯 합계 헬퍼.
function slotCount(plan: MediumSlotPlan): number {
  return plan.categories.reduce((acc, c) => acc + c.slots.length, 0);
}

function findSlot(plan: MediumSlotPlan, name: string) {
  for (const cat of plan.categories) {
    const hit = cat.slots.find((sl) => sl.name === name);
    if (hit) return hit;
  }
  return undefined;
}

describe('buildPrevisualSlots — 프리비주얼 4종 키', () => {
  it('world / character / location / sceneToPrompt 4종이 전부 존재', () => {
    const r = buildPrevisualSlots({});
    expect(PREVISUAL_KINDS).toEqual(['world', 'character', 'location', 'sceneToPrompt']);
    expect(Object.keys(r.previsual).sort()).toEqual([...PREVISUAL_KINDS].sort());
    expect(r.previsual.world.kind).toBe('world');
    expect(r.previsual.location.kind).toBe('location');
    expect(r.previsual.sceneToPrompt.kind).toBe('sceneToPrompt');
    expect(Array.isArray(r.previsual.character)).toBe(true);
  });

  it('World Bible: palette·primarySymbols·forbidden 입력 반영', () => {
    const r = buildPrevisualSlots({
      palette: ['deep blue', 'black'],
      primarySymbols: ['상자', '균열 문양'],
      forbidden: ['파스텔'],
    });
    expect(r.previsual.world.palette).toEqual(['deep blue', 'black']);
    expect(r.previsual.world.primarySymbols).toEqual(['상자', '균열 문양']);
    expect(r.previsual.world.forbidden).toEqual(['파스텔']);
  });

  it('Location Bible: 반복 장소 3-5개 권장 범위 판정 (사양 §6)', () => {
    const within = buildPrevisualSlots({ locations: ['협회 로비', '게이트 내부', '옥상'] });
    expect(within.previsual.location.recommendedRange).toEqual({ min: 3, max: 5 });
    expect(within.previsual.location.withinRecommended).toBe(true);

    const below = buildPrevisualSlots({ locations: ['협회 로비'] });
    expect(below.previsual.location.withinRecommended).toBe(false);

    const above = buildPrevisualSlots({ locations: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(above.previsual.location.withinRecommended).toBe(false);
  });

  it('Scene-to-Prompt: 사양 필드 + 정보 위계 배경>인물>대사 (프로토콜 §2.5)', () => {
    const r = buildPrevisualSlots({
      shotId: 'shot_001',
      panelType: 'establishing',
      visualFocus: '게이트 입구의 균열',
      dialogue: '죽었던 자가 살아있다.',
      emotion: '긴장',
      subject: 'char_001',
      action: 'standing',
      setting: '게이트 입구',
      mood: '어둠',
    });
    const stp = r.previsual.sceneToPrompt;
    expect(stp.shotId).toBe('shot_001');
    expect(stp.panelType).toBe('establishing');
    expect(stp.visualFocus).toBe('게이트 입구의 균열');
    expect(stp.dialogue).toBe('죽었던 자가 살아있다.');
    expect(stp.emotion).toBe('긴장');
    expect(stp.infoHierarchy).toEqual(INFO_HIERARCHY);
    expect(stp.infoHierarchy).toEqual(['background', 'character', 'dialogue']);
    // promptCore: 채워진 슬롯 치환
    expect(stp.promptCore).toContain('char_001');
    expect(stp.promptCore).toContain('게이트 입구');
    expect(stp.promptCore).toContain('어둠 mood');
    expect(stp.negative).toContain('blurry');
  });
});

describe('buildPrevisualSlots — 슬롯 엔진 카테고리 수 (사양 §1-§3 분류 그대로)', () => {
  const r = buildPrevisualSlots({});

  it('이미지: 6 카테고리 / 총 32 슬롯', () => {
    const img = r.slotEngine.image;
    expect(img.categories.map((c) => c.category)).toEqual([
      'Core',
      'Visual',
      'Lighting',
      'Color',
      'Quality',
      'Advanced',
    ]);
    expect(img.totalSlots).toBe(IMAGE_SLOT_TOTAL);
    expect(slotCount(img)).toBe(32);
  });

  it('영상: 이미지 6 + 특화 4 = 10 카테고리 / 총 51 슬롯', () => {
    const vid = r.slotEngine.video;
    expect(vid.categories.map((c) => c.category)).toEqual([
      'Core',
      'Visual',
      'Lighting',
      'Color',
      'Quality',
      'Advanced',
      'Motion',
      'Sequence',
      'Audio',
      'Coherence',
    ]);
    expect(vid.totalSlots).toBe(VIDEO_SLOT_TOTAL);
    expect(slotCount(vid)).toBe(51);
  });

  it('음성: 6 카테고리 / 총 23 슬롯 (사양 §3 테이블 열거 — 헤더 "24개"는 사양 내부 불일치)', () => {
    const vo = r.slotEngine.voice;
    expect(vo.categories.map((c) => c.category)).toEqual([
      'Speaker',
      'Text',
      'Emotion',
      'Prosody',
      'Nonverbal',
      'Context',
    ]);
    expect(vo.totalSlots).toBe(VOICE_SLOT_TOTAL);
    // §3.1-§3.6 열거: 4+3+3+5+5+3 = 23 (날조 금지 — 24번째 슬롯 발명 X)
    expect(slotCount(vo)).toBe(23);
  });

  it('Tier 라벨: Core=1 / Visual=2 / Lighting=2-3 / Quality=3 / Motion=1-2 / Speaker=1', () => {
    const cat = (plan: MediumSlotPlan, name: string) =>
      plan.categories.find((c) => c.category === name);
    expect(cat(r.slotEngine.image, 'Core')?.tier).toBe('1');
    expect(cat(r.slotEngine.image, 'Visual')?.tier).toBe('2');
    expect(cat(r.slotEngine.image, 'Lighting')?.tier).toBe('2-3');
    expect(cat(r.slotEngine.image, 'Quality')?.tier).toBe('3');
    expect(cat(r.slotEngine.video, 'Motion')?.tier).toBe('1-2');
    expect(cat(r.slotEngine.voice, 'Speaker')?.tier).toBe('1');
  });

  it('Tier 3 default: 사양 명시값 그대로 (aspectRatio 16:9 · cfgScale 7.5 · duration 5 등)', () => {
    expect(findSlot(r.slotEngine.image, 'aspectRatio')).toMatchObject({
      value: '16:9',
      source: 'default',
    });
    expect(findSlot(r.slotEngine.image, 'resolution')?.value).toBe('1024');
    expect(findSlot(r.slotEngine.image, 'cfgScale')?.value).toBe('7.5');
    expect(findSlot(r.slotEngine.image, 'sampler')?.value).toBe('DPM++ 2M Karras');
    expect(findSlot(r.slotEngine.image, 'steps')?.value).toBe('30');
    expect(findSlot(r.slotEngine.image, 'negativePrompt')?.value).toBe(
      'blurry, lowres, deformed, text, watermark, jpeg artifacts',
    );
    expect(findSlot(r.slotEngine.video, 'duration')?.value).toBe('5');
    expect(findSlot(r.slotEngine.video, 'cameraSpeed')?.value).toBe('medium');
    expect(findSlot(r.slotEngine.video, 'soundMix')?.value).toBe('balanced');
    expect(findSlot(r.slotEngine.video, 'subjectConsistency')?.value).toBe('on');
    expect(findSlot(r.slotEngine.voice, 'speed')?.value).toBe('1.0x');
    expect(findSlot(r.slotEngine.voice, 'speakerDistance')?.value).toBe('close mic');
    expect(findSlot(r.slotEngine.voice, 'backgroundSound')?.value).toBe('silent');
  });

  it('Tier 1·2 비채움 슬롯은 unfilled(null) — 자동 추론을 날조하지 않음', () => {
    expect(findSlot(r.slotEngine.image, 'subject')).toMatchObject({
      value: null,
      source: 'unfilled',
    });
    expect(findSlot(r.slotEngine.image, 'style')?.source).toBe('unfilled');
    expect(findSlot(r.slotEngine.voice, 'voiceId')?.source).toBe('unfilled');
  });
});

describe('buildPrevisualSlots — scene 값 채움 + 프롬프트 골격', () => {
  const scene: PrevisualSceneInput = {
    subject: 'char_001',
    action: 'walking',
    setting: 'gate interior',
    mood: 'dark',
    dialogue: 'It cannot be.',
  };
  const r = buildPrevisualSlots(scene);

  it('이미지 Core 4 슬롯: scene 값으로 채움 (source=scene)', () => {
    expect(findSlot(r.slotEngine.image, 'subject')).toMatchObject({
      value: 'char_001',
      source: 'scene',
    });
    expect(findSlot(r.slotEngine.image, 'mood')?.value).toBe('dark');
  });

  it('dialogue: 영상 Audio dialogue + 음성 text 슬롯에 매핑 (표준 §2.3·§3.2)', () => {
    expect(findSlot(r.slotEngine.video, 'dialogue')?.value).toBe('It cannot be.');
    expect(findSlot(r.slotEngine.voice, 'text')).toMatchObject({
      value: 'It cannot be.',
      source: 'scene',
    });
    // 이미지 plan에는 dialogue 슬롯 자체가 없음 (32 슬롯 분류)
    expect(findSlot(r.slotEngine.image, 'dialogue')).toBeUndefined();
  });

  it('프롬프트 골격: 채워진 슬롯은 치환·미채움은 [slot] 플레이스홀더 유지 (§6 변환 룰)', () => {
    const img = r.slotEngine.image.promptSkeleton;
    expect(img).toContain('char_001 walking in gate interior, dark mood,');
    expect(img).toContain('--ar 16:9');
    expect(img).toContain('[style] style'); // Tier 2 미채움 → 플레이스홀더 유지
    expect(img).toContain('Negative: blurry, lowres, deformed, text, watermark, jpeg artifacts');

    const vid = r.slotEngine.video.promptSkeleton;
    expect(vid).toContain('{scene: char_001 walking in gate interior}');
    expect(vid).toContain('duration: 5s');
    expect(vid).toContain('saying "It cannot be."');

    const vo = r.slotEngine.voice.promptSkeleton;
    expect(vo).toContain('text: "It cannot be."');
    expect(vo).toContain('voice_id: [voiceId]'); // 미채움 유지
    expect(vo).toContain('speed 1.0x');
  });
});

describe('buildPrevisualSlots — E3 spoiler-guard 차단 연동 (§1·§3·§8)', () => {
  it('Confidential fact → 3매체 전부 blocked 플래그 + 게이트 BLOCKED (절대 차단)', () => {
    const r = buildPrevisualSlots({
      episode: 25,
      facts: [{ id: 'fact_009', label: '각성 시스템 진실', classification: 'Confidential', publicAtEpisode: 18 }],
    });
    for (const gate of [r.spoilerGate.image, r.spoilerGate.video, r.spoilerGate.audio]) {
      expect(gate.judgment).toBe('BLOCKED');
      expect(gate.flags).toHaveLength(1);
      expect(gate.flags[0]).toMatchObject({
        id: 'fact_009',
        level: 'Confidential',
        blocked: true,
        judgment: 'BLOCKED',
      });
    }
  });

  it('Restricted fact — 공개 회차 미도달 → blocked / 도달 → 노출 허용 + WARNING(작가 확인)', () => {
    const notReached = buildPrevisualSlots({
      episode: 5,
      facts: [{ id: 'fact_013', classification: 'Restricted', publicAtEpisode: 13 }],
    });
    expect(notReached.spoilerGate.image.judgment).toBe('BLOCKED');
    expect(notReached.spoilerGate.image.flags[0].blocked).toBe(true);

    const reached = buildPrevisualSlots({
      episode: 13,
      facts: [{ id: 'fact_013', classification: 'Restricted', publicAtEpisode: 13 }],
    });
    expect(reached.spoilerGate.image.flags[0].blocked).toBe(false);
    expect(reached.spoilerGate.image.judgment).toBe('WARNING');
  });

  it('Internal fact — 회차 도달 시 PASS / 미도달 시 blocked', () => {
    const reached = buildPrevisualSlots({
      episode: 7,
      facts: [{ id: 'fact_002', classification: 'Internal', publicAtEpisode: 5 }],
    });
    expect(reached.spoilerGate.image.judgment).toBe('PASS');
    expect(reached.spoilerGate.image.flags[0].blocked).toBe(false);

    const notReached = buildPrevisualSlots({
      episode: 3,
      facts: [{ id: 'fact_002', classification: 'Internal', publicAtEpisode: 5 }],
    });
    expect(notReached.spoilerGate.image.flags[0].blocked).toBe(true);
  });

  it('미상 등급 fact(분류 신호 0) → 보수 디폴트 Confidential 취급 → blocked', () => {
    const r = buildPrevisualSlots({ episode: 1, facts: [{ id: 'fact_x' }] });
    expect(r.spoilerGate.image.flags[0]).toMatchObject({
      level: 'Confidential',
      blocked: true,
    });
  });

  it('Public fact만 → 게이트 PASS / id 누락 fact는 fact_{index} 부여', () => {
    const r = buildPrevisualSlots({
      facts: [{ classification: 'Public', label: '주인공 직업' }],
    });
    expect(r.spoilerGate.image.judgment).toBe('PASS');
    expect(r.spoilerGate.image.flags[0].id).toBe('fact_0');
    expect(r.spoilerGate.image.flags[0].blocked).toBe(false);
  });

  it('캐릭 비밀 슬롯: Confidential 캐릭 → Character Bible exposure.blocked=true (cover 게이트 §3.4)', () => {
    const r = buildPrevisualSlots({
      episode: 1,
      characters: [
        { name: 'char_002', classification: 'Confidential', publicAtEpisode: 18 },
        { name: 'char_001', silhouette: '장신·직립', anchorProp: '검은 상자' },
      ],
    });
    expect(r.previsual.character).toHaveLength(2);
    const secret = r.previsual.character[0];
    expect(secret.exposure.blocked).toBe(true);
    expect(secret.exposure.judgment).toBe('BLOCKED');
    // 등급 미지정 캐릭(외형 필드만) = Public 영역 (§6) → 차단 X
    const normal = r.previsual.character[1];
    expect(normal.exposure).toMatchObject({ level: 'Public', blocked: false, judgment: 'PASS' });
    expect(normal.anchorProp).toBe('검은 상자');
  });

  it('Restricted 캐릭은 cover 게이트에서 회차 무관 차단 (§3.4 표지·캐릭 일러)', () => {
    const r = buildPrevisualSlots({
      episode: 20,
      characters: [{ name: 'char_003', classification: 'Restricted', publicAtEpisode: 13 }],
    });
    expect(r.previsual.character[0].exposure.blocked).toBe(true);
  });
});

describe('buildPrevisualSlots — 빈 입력 안전', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['빈 객체', {}],
  ] as const)('%s 입력 → throw 없이 전체 구조 산출', (_label, input) => {
    const r = buildPrevisualSlots(input as PrevisualSceneInput | null | undefined);
    expect(Object.keys(r.previsual).sort()).toEqual([...PREVISUAL_KINDS].sort());
    expect(r.slotEngine.image.totalSlots).toBe(32);
    expect(r.slotEngine.video.totalSlots).toBe(51);
    expect(r.slotEngine.voice.totalSlots).toBe(23);
    expect(r.previsual.world.palette).toEqual([]);
    expect(r.previsual.character).toEqual([]);
    expect(r.previsual.location.locations).toEqual([]);
    expect(r.previsual.location.withinRecommended).toBe(false);
    // fact 0건 → 게이트 PASS·flags 0
    expect(r.spoilerGate.image).toMatchObject({ judgment: 'PASS', flags: [] });
    expect(r.spoilerGate.video.judgment).toBe('PASS');
    expect(r.spoilerGate.audio.judgment).toBe('PASS');
  });

  it('비배열·오염 입력(characters/facts/locations) 방어', () => {
    const r = buildPrevisualSlots({
      characters: 'oops' as unknown as PrevisualCharacterInputArray,
      facts: [null, 42, { id: 'ok', classification: 'Public' }] as unknown as PrevisualSceneInput['facts'],
      locations: [1, '', '  ', '협회 로비'] as unknown as string[],
    });
    expect(r.previsual.character).toEqual([]);
    expect(r.spoilerGate.image.flags).toHaveLength(1);
    expect(r.spoilerGate.image.flags[0].id).toBe('ok');
    expect(r.previsual.location.locations).toEqual(['협회 로비']);
  });

  it('confidence: 자동 추정 한계 0.55-0.65 대역 명시', () => {
    const r = buildPrevisualSlots({});
    expect(r.confidence).toBe(PREVISUAL_AUTO_CONFIDENCE);
    expect(r.confidence).toBeGreaterThanOrEqual(0.55);
    expect(r.confidence).toBeLessThanOrEqual(0.65);
  });
});

// 테스트 전용 타입 별칭 (오염 입력 캐스팅용)
type PrevisualCharacterInputArray = PrevisualSceneInput['characters'];
