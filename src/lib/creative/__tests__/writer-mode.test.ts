import {
  detectMode,
  getModeConfig,
  modeLabel,
  MODE_CONFIG,
  type WriterMode,
} from '@/lib/creative/writer-mode';

describe('detectMode — 작가 부담 모드 감지', () => {
  // --- AUTO 분기 ---
  it('"알아서" 포함 입력은 AUTO', () => {
    expect(detectMode('알아서 다 써줘')).toBe<WriterMode>('AUTO');
  });

  it('"자동" 포함 입력은 AUTO', () => {
    expect(detectMode('자동으로 진행해')).toBe<WriterMode>('AUTO');
  });

  it('영어 "auto" / "just do it" 도 AUTO (대소문자 무시)', () => {
    expect(detectMode('Just do it please')).toBe<WriterMode>('AUTO');
    expect(detectMode('AUTO mode')).toBe<WriterMode>('AUTO');
  });

  // --- GUIDED 분기 ---
  it('"같이" 포함 입력은 GUIDED', () => {
    expect(detectMode('같이 만들어 보자')).toBe<WriterMode>('GUIDED');
  });

  it('"단계" 포함 입력은 GUIDED', () => {
    expect(detectMode('단계별로 진행하고 싶어')).toBe<WriterMode>('GUIDED');
  });

  it('영어 "step" / "together" 도 GUIDED', () => {
    expect(detectMode('lets go step by step')).toBe<WriterMode>('GUIDED');
    expect(detectMode('work together')).toBe<WriterMode>('GUIDED');
  });

  // --- FULL 폴백 ---
  it('AUTO/GUIDED 신호 없는 일반 입력은 FULL', () => {
    expect(detectMode('판타지 소설 쓸 거야')).toBe<WriterMode>('FULL');
  });

  // --- 우선순위: AUTO > GUIDED ---
  it('AUTO·GUIDED 키워드 동시 포함 시 AUTO 우선', () => {
    // "같이"(GUIDED) + "알아서"(AUTO) → AUTO
    expect(detectMode('같이 하되 나머진 알아서 해줘')).toBe<WriterMode>('AUTO');
  });

  // --- 빈/방어 입력 ---
  it('빈 문자열은 FULL 폴백', () => {
    expect(detectMode('')).toBe<WriterMode>('FULL');
  });

  it('공백만 있는 입력도 FULL 폴백', () => {
    expect(detectMode('   \n\t  ')).toBe<WriterMode>('FULL');
  });

  it('null / undefined 입력도 크래시 없이 FULL', () => {
    expect(detectMode(null as unknown as string)).toBe<WriterMode>('FULL');
    expect(detectMode(undefined as unknown as string)).toBe<WriterMode>('FULL');
  });

  it('비문자열(숫자/객체) 입력도 FULL 폴백', () => {
    expect(detectMode(123 as unknown as string)).toBe<WriterMode>('FULL');
    expect(detectMode({} as unknown as string)).toBe<WriterMode>('FULL');
  });

  // --- 일/중 키워드 ---
  it('일본어 "お任せ" 는 AUTO, "一緒" 는 GUIDED', () => {
    expect(detectMode('お任せします')).toBe<WriterMode>('AUTO');
    expect(detectMode('一緒に作ろう')).toBe<WriterMode>('GUIDED');
  });

  it('중국어 "交给你" 는 AUTO, "一起" 는 GUIDED', () => {
    expect(detectMode('交给你处理')).toBe<WriterMode>('AUTO');
    expect(detectMode('一起写吧')).toBe<WriterMode>('GUIDED');
  });
});

describe('getModeConfig — 모드별 정책', () => {
  it('AUTO 정책: 인터뷰 0 · 자동적용 · 상한 85', () => {
    const c = getModeConfig('AUTO');
    expect(c.interviewDepth).toBe(0);
    expect(c.autoApply).toBe(true);
    expect(c.scoreCeiling).toBe(85);
  });

  it('GUIDED 정책: 인터뷰 깊고(5) · 수동적용', () => {
    const c = getModeConfig('GUIDED');
    expect(c.interviewDepth).toBe(5);
    expect(c.autoApply).toBe(false);
  });

  it('FULL 정책: 인터뷰 중간(3) · 수동적용 · 상한 100', () => {
    const c = getModeConfig('FULL');
    expect(c.interviewDepth).toBe(3);
    expect(c.autoApply).toBe(false);
    expect(c.scoreCeiling).toBe(100);
  });

  it('AUTO만 autoApply=true, 나머지는 false', () => {
    expect(getModeConfig('AUTO').autoApply).toBe(true);
    expect(getModeConfig('GUIDED').autoApply).toBe(false);
    expect(getModeConfig('FULL').autoApply).toBe(false);
  });

  it('미지원/이상 모드는 FULL 정책으로 폴백', () => {
    const c = getModeConfig('XXX' as unknown as WriterMode);
    expect(c).toEqual(MODE_CONFIG.FULL);
  });

  it('MODE_CONFIG 는 불변(freeze)이라 변경이 무시된다', () => {
    expect(Object.isFrozen(MODE_CONFIG)).toBe(true);
    expect(Object.isFrozen(MODE_CONFIG.AUTO)).toBe(true);
  });
});

describe('modeLabel — 4언어 라벨', () => {
  it('AUTO 라벨 4언어', () => {
    expect(modeLabel('AUTO', 'ko')).toBe('자동');
    expect(modeLabel('AUTO', 'en')).toBe('Auto');
    expect(modeLabel('AUTO', 'ja')).toBe('自動');
    expect(modeLabel('AUTO', 'zh')).toBe('自动');
  });

  it('GUIDED·FULL 라벨 한/영', () => {
    expect(modeLabel('GUIDED', 'ko')).toBe('단계별');
    expect(modeLabel('GUIDED', 'en')).toBe('Guided');
    expect(modeLabel('FULL', 'ko')).toBe('직접');
    expect(modeLabel('FULL', 'en')).toBe('Full Control');
  });

  it('미지원 언어는 ko 폴백', () => {
    expect(modeLabel('AUTO', 'fr' as never)).toBe('자동');
  });

  it('미지원 모드는 FULL 라벨로 폴백', () => {
    expect(modeLabel('NOPE' as unknown as WriterMode, 'ko')).toBe('직접');
  });
});
