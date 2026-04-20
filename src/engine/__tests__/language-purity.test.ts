import { purifyLanguage, quickPurify } from '../language-purity';

describe('purifyLanguage', () => {
  it('한국어 본문 영어 부사 치환', () => {
    const result = purifyLanguage('그는 suddenly 돌아섰다', 'KO');
    expect(result.cleanedText).toBe('그는 갑자기 돌아섰다');
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]?.original).toBe('suddenly');
    expect(result.replacements[0]?.replacement).toBe('갑자기');
    expect(result.replacements[0]?.confidence).toBe('high');
  });

  it('따옴표 내부 영어 보존 (대사)', () => {
    const result = purifyLanguage('그는 "suddenly"라고 말했다', 'KO');
    expect(result.cleanedText).toContain('suddenly');
    expect(result.cleanedText).not.toContain('갑자기');
    expect(result.stats.preserved).toBeGreaterThanOrEqual(1);
  });

  it('화이트리스트 약어 유지', () => {
    const result = purifyLanguage('AI가 응답했다', 'KO');
    expect(result.cleanedText).toContain('AI');
    expect(result.replacements).toHaveLength(0);
    expect(result.stats.preserved).toBeGreaterThanOrEqual(1);
  });

  it('사전에 없는 영어 → unresolved 수집', () => {
    const result = purifyLanguage('Zephyrus가 나타났다', 'KO');
    expect(result.cleanedText).toContain('Zephyrus');
    expect(result.unresolved).toHaveLength(1);
    expect(result.unresolved[0]?.word).toBe('Zephyrus');
    expect(result.unresolved[0]?.reason).toBe('not_in_dictionary');
  });

  it('동사 과거형 치환', () => {
    const result = purifyLanguage('그녀는 realized 모든 것을', 'KO');
    expect(result.cleanedText).toContain('깨달았다');
    expect(result.cleanedText).not.toContain('realized');
  });

  it('다중 영어 단어 한 문장에 치환 (역순 position 안전)', () => {
    const result = purifyLanguage('he suddenly noticed shadow', 'KO');
    expect(result.replacements).toHaveLength(3);
    // 치환된 결과에 한국어 포함
    expect(result.cleanedText).toContain('갑자기');
    expect(result.cleanedText).toContain('알아챘다');
    expect(result.cleanedText).toContain('그림자');
    // position 은 오름차순 정렬
    const positions = result.replacements.map((r) => r.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('report 모드 — cleanedText 불변, 감지만', () => {
    const original = '그는 suddenly 돌아섰다';
    const result = purifyLanguage(original, 'KO', { mode: 'report' });
    expect(result.cleanedText).toBe(original);
    expect(result.replacements).toHaveLength(1);
  });

  it('customWhitelist 에 추가된 고유명사 보존', () => {
    const result = purifyLanguage('Noa가 응답했다', 'KO', {
      customWhitelist: ['Noa'],
    });
    expect(result.cleanedText).toContain('Noa');
    expect(result.unresolved).toHaveLength(0);
  });

  it('preserveQuotes: false — 따옴표 내부도 치환', () => {
    const result = purifyLanguage('그는 "suddenly"라고', 'KO', {
      preserveQuotes: false,
    });
    expect(result.cleanedText).toContain('갑자기');
    expect(result.cleanedText).not.toContain('suddenly');
  });

  it('빈 문자열 안전', () => {
    const result = purifyLanguage('', 'KO');
    expect(result.cleanedText).toBe('');
    expect(result.replacements).toHaveLength(0);
    expect(result.unresolved).toHaveLength(0);
    expect(result.stats.totalEnglishWords).toBe(0);
  });

  it('영어 없는 순수 한국어 — 불변', () => {
    const original = '그는 한국어만 사용했다';
    const result = purifyLanguage(original, 'KO');
    expect(result.cleanedText).toBe(original);
    expect(result.replacements).toHaveLength(0);
    expect(result.stats.totalEnglishWords).toBe(0);
  });

  it('stats 필드 정확성', () => {
    const result = purifyLanguage('suddenly notrealword shadow', 'KO');
    expect(result.stats.totalEnglishWords).toBe(3);
    expect(result.stats.replaced).toBe(2); // suddenly, shadow
    expect(result.stats.unknown).toBe(1); // notrealword
  });

  it('JP 사전 시드 — 표준 영어 치환 수행', () => {
    // 2026-04-20: JP 사전에 40개 시드 추가. suddenly → 突然 로 치환되어야 함.
    const result = purifyLanguage('彼は suddenly 振り返った', 'JP');
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]?.replacement).toBe('突然');
    expect(result.cleanedText).toContain('突然');
  });

  it('CN 사전 시드 — 표준 영어 치환 수행', () => {
    const result = purifyLanguage('他 suddenly 转过身', 'CN');
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]?.replacement).toBe('突然');
    expect(result.cleanedText).toContain('突然');
  });

  it('quickPurify 편의 함수', () => {
    const out = quickPurify('그는 suddenly 돌아섰다', 'KO');
    expect(out).toBe('그는 갑자기 돌아섰다');
  });

  it('quickPurify 빈 문자열 안전', () => {
    expect(quickPurify('', 'KO')).toBe('');
  });

  it('정규식 lastIndex 오염 방지 — 연속 호출 idempotent', () => {
    const r1 = purifyLanguage('suddenly shadow', 'KO');
    const r2 = purifyLanguage('suddenly shadow', 'KO');
    expect(r1.cleanedText).toBe(r2.cleanedText);
    expect(r1.replacements.length).toBe(r2.replacements.length);
  });

  it('대문자 시작 영어 — medium confidence', () => {
    const result = purifyLanguage('그녀는 Suddenly 돌아섰다', 'KO');
    expect(result.replacements).toHaveLength(1);
    expect(result.replacements[0]?.confidence).toBe('medium');
    // 치환은 수행됨
    expect(result.cleanedText).toContain('갑자기');
  });

  it('단일 글자 영어 (예: I, a) — 검출 제외', () => {
    // 2자 이상만 감지하므로 "I" 단독은 스킵
    const result = purifyLanguage('I 는 갑자기 떠났다', 'KO');
    expect(result.stats.totalEnglishWords).toBe(0);
  });

  it('접속어 치환 (however)', () => {
    const result = purifyLanguage('비가 왔다. however 그는 나갔다', 'KO');
    expect(result.cleanedText).toContain('하지만');
    expect(result.cleanedText).not.toContain('however');
  });

  it('따옴표 내부 + 외부 혼합 — 외부만 치환', () => {
    const result = purifyLanguage('그는 suddenly "however"라고 외쳤다', 'KO');
    // 따옴표 바깥 suddenly → 갑자기
    expect(result.cleanedText).toContain('갑자기');
    // 따옴표 안 however → 그대로
    expect(result.cleanedText).toContain('however');
  });

  it('감정 명사 치환 (fear)', () => {
    const result = purifyLanguage('그의 눈에 fear가 스쳤다', 'KO');
    expect(result.cleanedText).toContain('두려움');
  });

  it('replacements position 오름차순 정렬 확인', () => {
    const result = purifyLanguage('shadow 그리고 suddenly 그리고 silence', 'KO');
    expect(result.replacements).toHaveLength(3);
    const positions = result.replacements.map((r) => r.position);
    expect(positions[0]).toBeLessThan(positions[1] ?? Infinity);
    expect(positions[1]).toBeLessThan(positions[2] ?? Infinity);
  });
});
