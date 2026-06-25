// ============================================================
// catastrophic-gate — [Z1a-3] 결정론적 차단 3종 + NCT 배선 검증.
// 1) pronoun-ratio-delta 2) paragraph-loss 3) new-proper-noun-flood
// ============================================================

import { runCatastrophicCheck, runNCT, DEFAULT_CATASTROPHIC_THRESHOLDS } from '../ncg-nct';

describe('runCatastrophicCheck — paragraph-loss', () => {
  it('문단 4 → 2 (비율 0.5 < 0.85) → 차단 + 사유', () => {
    const r = runCatastrophicCheck({
      source: '하나.\n\n둘.\n\n셋.\n\n넷.',
      translation: 'One.\n\nTwo.',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.blocked).toBe(true);
    const reason = r.reasons.find((x) => x.kind === 'paragraph-loss');
    expect(reason).toBeDefined();
    expect(reason!.metric.value).toBeCloseTo(0.5);
    expect(r.metrics.paragraphRatio).toBeCloseTo(0.5);
  });

  it('문단 4 → 4 → 통과', () => {
    const r = runCatastrophicCheck({
      source: '하나.\n\n둘.\n\n셋.\n\n넷.',
      translation: 'One.\n\nTwo.\n\nThree.\n\nFour.',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.blocked).toBe(false);
    expect(r.reasons).toHaveLength(0);
  });

  it('빈 번역 + 원문 문단 존재 → paragraph-loss 차단', () => {
    const r = runCatastrophicCheck({
      source: '하나.\n\n둘.',
      translation: '',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.blocked).toBe(true);
    expect(r.reasons.some((x) => x.kind === 'paragraph-loss')).toBe(true);
  });

  it('원문 0 문단 (빈 원문) → 검사 skip (오차단 방지)', () => {
    const r = runCatastrophicCheck({ source: '', translation: '', srcLang: 'ko', tgtLang: 'en' });
    expect(r.blocked).toBe(false);
    expect(r.metrics.paragraphRatio).toBe(1);
  });
});

describe('runCatastrophicCheck — pronoun-ratio-delta (성별 뒤집힘)', () => {
  it('KO 남성(그+조사) → EN 여성(she) 전환 → delta 1.0 > 0.6 차단', () => {
    const r = runCatastrophicCheck({
      source: '그는 달렸다.\n\n그는 멈췄다.\n\n그는 외쳤다.',
      translation: 'She ran fast.\n\nShe stopped there.\n\nShe shouted loud.',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.metrics.genderDelta).toBeCloseTo(1.0);
    expect(r.blocked).toBe(true);
    expect(r.reasons.some((x) => x.kind === 'pronoun-ratio-delta')).toBe(true);
  });

  it('성별 비율 보존 (그→he) → 통과', () => {
    const r = runCatastrophicCheck({
      source: '그는 달렸다.\n\n그는 멈췄다.\n\n그는 외쳤다.',
      translation: 'He ran fast.\n\nHe stopped there.\n\nHe shouted loud.',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.metrics.genderDelta).toBeCloseTo(0);
    expect(r.blocked).toBe(false);
  });

  it('표본 부족 (대명사 < 3) → 판정 skip (genderDelta null·차단 안 함)', () => {
    const r = runCatastrophicCheck({
      source: '바람이 분다.\n\n비가 온다.',
      translation: 'Wind blows.\n\nRain falls.',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.metrics.genderDelta).toBeNull();
    expect(r.blocked).toBe(false);
  });

  it('그녀(여성) 보존 → she 매핑 통과', () => {
    const r = runCatastrophicCheck({
      source: '그녀는 웃었다.\n\n그녀는 떠났다.\n\n그녀는 돌아왔다.',
      translation: 'She laughed.\n\nShe left.\n\nShe returned.',
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.metrics.genderDelta).toBeCloseTo(0);
    expect(r.blocked).toBe(false);
  });
});

describe('runCatastrophicCheck — new-proper-noun-flood (개체 환각)', () => {
  // 문두 제외 대문자 토큰 13개 distinct (기본 임계 12 초과)
  const flood =
    'They met Aldric and Belmora near Caldris.\n\n' +
    'Then Dorwin told Elsavet about Fenwick and Galdor.\n\n' +
    'Later Halvyn, with Isolde and Jormund, found Kaelith beside Lormane and Morvath.';

  it('원문/용어집에 없는 신규 고유명사 13개 → 차단 + 샘플 사유', () => {
    const r = runCatastrophicCheck({
      source: '그들은 만났다.\n\n그리고 말했다.\n\n나중에 찾았다.',
      translation: flood,
      srcLang: 'ko',
      tgtLang: 'en',
    });
    expect(r.metrics.newProperNouns.length).toBeGreaterThan(DEFAULT_CATASTROPHIC_THRESHOLDS.newProperNounLimit);
    expect(r.blocked).toBe(true);
    const reason = r.reasons.find((x) => x.kind === 'new-proper-noun-flood');
    expect(reason).toBeDefined();
    expect(reason!.samples!.length).toBeGreaterThan(0);
  });

  it('glossary 등록 시 known 처리 → 차단 해제', () => {
    const names = ['Aldric', 'Belmora', 'Caldris', 'Dorwin', 'Elsavet', 'Fenwick', 'Galdor', 'Halvyn', 'Isolde', 'Jormund', 'Kaelith', 'Lormane', 'Morvath'];
    const r = runCatastrophicCheck({
      source: '그들은 만났다.\n\n그리고 말했다.\n\n나중에 찾았다.',
      translation: flood,
      srcLang: 'ko',
      tgtLang: 'en',
      glossary: names.map((n, i) => ({ source: `이름${i}`, target: n, locked: true })),
    });
    expect(r.blocked).toBe(false);
  });

  it('en 외 target → 신규 고유명사 검사 skip (대문자 휴리스틱 불가 — 정직 한계)', () => {
    const r = runCatastrophicCheck({
      source: '그들은 만났다.\n\n그리고 말했다.\n\n나중에 찾았다.',
      translation: '彼らは会った。\n\nそして話した。\n\n後で見つけた。',
      srcLang: 'ko',
      tgtLang: 'ja',
    });
    expect(r.metrics.newProperNouns).toHaveLength(0);
  });

  it('thresholds override — 임계 2 로 낮추면 소수 신규 명사도 차단', () => {
    const r = runCatastrophicCheck({
      source: '그들은 만났다.\n\n그리고 말했다.',
      translation: 'They met Aldric near Belmora.\n\nThen they saw Caldris.',
      srcLang: 'ko',
      tgtLang: 'en',
      thresholds: { newProperNounLimit: 2 },
    });
    expect(r.blocked).toBe(true);
  });
});

describe('runNCT — Z1a additive 배선', () => {
  const ctx = {
    source: '원문 단락 1\n\n원문 단락 2',
    srcLang: 'ko' as const,
    tgtLang: 'en' as const,
  };

  it('정상 결과 → catastrophic 통과 + qaAudit/translationese 필드 존재 + publish 유지', () => {
    const r = runNCT({
      ...ctx,
      faithful: 'Faithful 1\n\nFaithful 2',
      market: 'Market 1\n\nMarket 2',
    });
    expect(r.recommendation).toBe('publish');
    expect(r.catastrophic?.faithful?.blocked).toBe(false);
    expect(r.catastrophic?.market?.blocked).toBe(false);
    expect(r.qaAudit?.faithful?.verdict).toBeDefined();
    expect(r.qaAudit?.faithful?.enReaderFindings).toBeDefined(); // tgtLang='en'
    expect(r.translationese?.faithful).not.toBeNull();
  });

  it('catastrophic 차단 (문단 대량 손실) → recommendation reject 강제', () => {
    const r = runNCT({
      source: '하나.\n\n둘.\n\n셋.\n\n넷.\n\n다섯.',
      srcLang: 'ko',
      tgtLang: 'en',
      faithful: 'Only one paragraph remained here.',
    });
    expect(r.catastrophic?.faithful?.blocked).toBe(true);
    expect(r.recommendation).toBe('reject');
  });

  it('en 외 target → translationese undefined (KO→EN 전용 휴리스틱 — 정직)', () => {
    const r = runNCT({
      source: '원문 단락 1\n\n원문 단락 2',
      srcLang: 'ko',
      tgtLang: 'ja',
      faithful: '翻訳 1\n\n翻訳 2',
    });
    expect(r.translationese).toBeUndefined();
    expect(r.qaAudit?.faithful?.enReaderFindings).toBeUndefined();
  });
});
