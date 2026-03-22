import { classifyInput, buildTurnSignal, updateScore, resolveVerdict, resolveNRG, processHFCPTurn, createHFCPState, verdictToPromptModifier } from '../hfcp';

describe('classifyInput', () => {
  it('detects generate commands (KO)', () => {
    expect(classifyInput('1화를 써줘')).toBe('generate');
    expect(classifyInput('다음 화 생성')).toBe('generate');
    expect(classifyInput('계속 써')).toBe('generate');
    expect(classifyInput('1단계 뼈대')).toBe('generate');
  });

  it('detects generate commands (EN)', () => {
    expect(classifyInput('write the next chapter')).toBe('generate');
    expect(classifyInput('generate episode 2')).toBe('generate');
    expect(classifyInput('pass 1 skeleton')).toBe('generate');
  });

  it('detects chat messages', () => {
    expect(classifyInput('이 캐릭터 성격을 어떻게 생각해?')).toBe('chat');
    expect(classifyInput('톤을 바꿔줘')).toBe('chat');
    expect(classifyInput('why did you use this structure?')).toBe('chat');
  });
});

describe('buildTurnSignal', () => {
  it('detects questions', () => {
    expect(buildTurnSignal('왜 이렇게 됐어?').hasQuestion).toBe(true);
    expect(buildTurnSignal('좋아').hasQuestion).toBe(false);
  });

  it('detects humor', () => {
    expect(buildTurnSignal('ㅋㅋㅋ 재밌다').humorLevel).toBeGreaterThan(0);
    expect(buildTurnSignal('진지한 질문').humorLevel).toBe(0);
  });

  it('detects objections', () => {
    expect(buildTurnSignal('아니 그건 아닌데').objectionMarker).toBe(true);
  });
});

describe('scoring', () => {
  it('score stays in range 50-150', () => {
    const state = createHFCPState();
    for (let i = 0; i < 50; i++) {
      updateScore(state, buildTurnSignal('질문? 왜? 어떻게? ㅋㅋ 하지만 근데'));
    }
    expect(state.score).toBeGreaterThanOrEqual(50);
    expect(state.score).toBeLessThanOrEqual(150);
  });

  it('rich input affects score', () => {
    const state = createHFCPState();
    const initial = state.score;
    // Multiple engagement signals should change score
    updateScore(state, buildTurnSignal('왜 이런 구조야? 하지만 이건 좀 다르지 않아? 어떻게 생각해? 그래서 뭐가 좋아?'));
    expect(state.score).not.toBe(initial);
  });
});

describe('resolveVerdict', () => {
  it('low score = engagement', () => {
    expect(resolveVerdict(55)).toBe('engagement');
  });
  it('mid score = normal_free', () => {
    expect(resolveVerdict(85)).toBe('normal_free');
  });
  it('high score = limited', () => {
    expect(resolveVerdict(135)).toBe('limited');
  });
});

describe('NRG', () => {
  it('first question = normal', () => {
    const state = createHFCPState();
    expect(resolveNRG(state, '이건 뭐야?')).toBe('normal');
  });

  it('same question repeated = variation', () => {
    const state = createHFCPState();
    resolveNRG(state, '이건 뭐야?');
    expect(resolveNRG(state, '이건 뭐야?')).not.toBe('normal');
  });

  it('디테일하게 회수 마다 다른 각도 검증 (detailed verification of different angles per iteration)', () => {
    // 1) score < 70 -> light_variation
    const state1 = createHFCPState();
    state1.score = 60;
    resolveNRG(state1, '반복 질문');
    expect(resolveNRG(state1, '반복 질문')).toBe('light_variation');
    expect(verdictToPromptModifier('normal_free', 'light_variation', true)).toContain('이전과 다른 구조로');

    // 2) 70 <= score < 100 -> frame_shift
    const state2 = createHFCPState();
    state2.score = 80;
    resolveNRG(state2, '반복 질문');
    expect(resolveNRG(state2, '반복 질문')).toBe('frame_shift');
    expect(verdictToPromptModifier('normal_free', 'frame_shift', true)).toContain('다른 관점에서');

    // 3) 100 <= score < 130 -> perspective_shift
    const state3 = createHFCPState();
    state3.score = 110;
    resolveNRG(state3, '반복 질문');
    expect(resolveNRG(state3, '반복 질문')).toBe('perspective_shift');
    expect(verdictToPromptModifier('normal_free', 'perspective_shift', true)).toContain('비평적 시점');

    // 4) 130 <= score -> meta_ack
    const state4 = createHFCPState();
    state4.score = 140;
    resolveNRG(state4, '반복 질문');
    expect(resolveNRG(state4, '반복 질문')).toBe('meta_ack');
    expect(verdictToPromptModifier('normal_free', 'meta_ack', true)).toContain('다른 각도에서');
  });
});

describe('processHFCPTurn', () => {
  it('generate mode skips HFCP', () => {
    const state = createHFCPState();
    const result = processHFCPTurn(state, '다음 화를 써줘');
    expect(result.mode).toBe('generate');
    expect(result.promptModifier).toBe('');
  });

  it('chat mode applies HFCP', () => {
    const state = createHFCPState();
    const result = processHFCPTurn(state, '이 캐릭터 어떻게 생각해?');
    expect(result.mode).toBe('chat');
    expect(result.promptModifier.length).toBeGreaterThan(0);
  });
});

describe('verdictToPromptModifier', () => {
  it('engagement = warm tone (KO)', () => {
    const mod = verdictToPromptModifier('engagement', 'normal', true);
    expect(mod).toContain('적극');
  });

  it('silent = questions only (EN)', () => {
    const mod = verdictToPromptModifier('silent', 'normal', false);
    expect(mod).toContain('questions only');
  });

  it('NRG variation adds modifier', () => {
    const mod = verdictToPromptModifier('normal_free', 'frame_shift', true);
    expect(mod).toContain('프레임 전환');
  });
});
