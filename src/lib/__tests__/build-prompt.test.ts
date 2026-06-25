// ============================================================
// [G4 registry flag — 2026-06-11] build-prompt 번역 레지스트리 활성 검증
// - 기본(env 미설정): stage 1~5·10 프롬프트에 translator-* 레지스트리
//   role/duty 가 prepend 되고, 가드(/no_think) 는 정확히 1회 (중복 X).
// - NEXT_PUBLIC_TRANSLATOR_REGISTRY=off: legacy prompt 복귀 (회귀 롤백 경로).
// - 호출 측 명시 useAgentRegistry 가 env 보다 우선.
// ============================================================

import { buildPrompt, isTranslatorRegistryEnabled } from '../build-prompt';

const ENV_KEY = 'NEXT_PUBLIC_TRANSLATOR_REGISTRY';

// 레지스트리 role 문자열 (writing-agent-registry.ts 의 translator-* 정의와 1:1)
const STAGE_ROLES: Record<number, string> = {
  1: 'Stage 1 Draft Translator',
  2: 'Lore and Tone Editor (Stage 2)',
  3: 'Pacing & Rhythm Agent (Stage 3)',
  4: 'Target Culture & Native Resonance Expert (Stage 4)',
  5: 'Chief Editor (Stage 5)',
  10: 'Story Bible Summarizer (Stage 10)',
};

function baseParams(stage?: number) {
  return {
    text: '안녕하세요. 시험 문장입니다.',
    sourceText: '안녕하세요. 시험 문장입니다.',
    from: 'Korean',
    to: 'English',
    stage,
    mode: 'novel' as const,
  };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('isTranslatorRegistryEnabled (env 스위치)', () => {
  const original = process.env[ENV_KEY];
  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it('미설정 → 기본 on', () => {
    delete process.env[ENV_KEY];
    expect(isTranslatorRegistryEnabled()).toBe(true);
  });

  it.each(['off', 'OFF', 'false', '0', ' off '])('%s → off', (v) => {
    process.env[ENV_KEY] = v;
    expect(isTranslatorRegistryEnabled()).toBe(false);
  });

  it('on / 빈 문자열 외 임의 값 → on', () => {
    process.env[ENV_KEY] = 'on';
    expect(isTranslatorRegistryEnabled()).toBe(true);
    process.env[ENV_KEY] = '1';
    expect(isTranslatorRegistryEnabled()).toBe(true);
  });
});

describe('buildPrompt — 레지스트리 기본 활성 (env 미설정)', () => {
  const original = process.env[ENV_KEY];
  beforeEach(() => { delete process.env[ENV_KEY]; });
  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it.each([1, 2, 3, 4, 5])('stage %i — registry role prepend + 가드 1회 + MISSION 유지', (stage) => {
    const prompt = buildPrompt(baseParams(stage));
    expect(prompt).toContain(STAGE_ROLES[stage]);
    // 가드 중복 방지: registry base 의 no-think-translation 만 — legacy guard skip
    expect(countOccurrences(prompt, '/no_think')).toBe(1);
    // stage MISSION 본문 (영구 inline) 은 그대로 유지
    expect(prompt).toContain(`Stage ${stage}`);
    expect(prompt).toContain('[SYSTEM: DETERMINISTIC TRANSLATION ENGINE');
  });

  it('stage 10 (Story Bible) — registry base prepend + 가드 소실 X', () => {
    const prompt = buildPrompt(baseParams(10));
    expect(prompt).toContain(STAGE_ROLES[10]);
    expect(prompt).toContain('[SYSTEM: STORY BIBLE SUMMARIZER]');
    // 수정 전 잠복 버그: guard='' + registryBase 미주입 → /no_think 0회였음
    expect(countOccurrences(prompt, '/no_think')).toBe(1);
  });

  it('stage 미지정 — registry 미적용 (기존 동작 보존) + legacy 가드 유지', () => {
    const prompt = buildPrompt(baseParams(undefined));
    for (const role of Object.values(STAGE_ROLES)) {
      expect(prompt).not.toContain(role);
    }
    expect(countOccurrences(prompt, '/no_think')).toBe(1);
  });

  it('호출 측 명시 useAgentRegistry:false 가 env(on) 보다 우선 — legacy 복귀', () => {
    const prompt = buildPrompt({ ...baseParams(1), useAgentRegistry: false });
    expect(prompt).not.toContain(STAGE_ROLES[1]);
    expect(countOccurrences(prompt, '/no_think')).toBe(1);
    expect(prompt).toContain('★ ABSOLUTE SOURCE INTEGRITY (RULE #1) ★');
  });

  it('glossary/characterProfiles 가 registry contextBlock 으로 주입', () => {
    const prompt = buildPrompt({
      ...baseParams(1),
      glossary: '"민아" → "Mina"',
      characterProfiles: '민아: 주인공, 반말',
    });
    expect(prompt).toContain('[glossary]');
    expect(prompt).toContain('"민아" → "Mina"');
  });
});

describe('buildPrompt — NEXT_PUBLIC_TRANSLATOR_REGISTRY=off (회귀 롤백 경로)', () => {
  const original = process.env[ENV_KEY];
  beforeEach(() => { process.env[ENV_KEY] = 'off'; });
  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it.each([1, 2, 3, 4, 5, 10])('stage %i — legacy prompt 그대로 (registry 미주입·가드 1회)', (stage) => {
    const prompt = buildPrompt(baseParams(stage));
    expect(prompt).not.toContain(STAGE_ROLES[stage]);
    expect(countOccurrences(prompt, '/no_think')).toBe(1);
    expect(prompt).toContain('[ABSOLUTE RULE — TRANSLATION]');
  });

  it('호출 측 명시 useAgentRegistry:true 가 env(off) 보다 우선 (dual-pipeline 경로)', () => {
    const prompt = buildPrompt({ ...baseParams(1), useAgentRegistry: true });
    expect(prompt).toContain(STAGE_ROLES[1]);
    expect(countOccurrences(prompt, '/no_think')).toBe(1);
  });
});
