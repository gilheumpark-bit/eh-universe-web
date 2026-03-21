import { validateAITone, validateQuality, validateCausality, validateFormattingIssues, applyFormattingRules, validateGeneratedContent, detectTrademarks, filterTrademarks } from '../validator';

// ============================================================
// AI Tone Validator
// ============================================================

describe('validateAITone', () => {
  it('detects AI tone words', () => {
    const result = validateAITone('그러나 이것은 따라서 결론이다.');
    expect(result.fixes.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('clean text has zero detections', () => {
    const result = validateAITone('하늘이 맑았다. 바람이 불었다.');
    expect(result.fixes.length).toBe(0);
    expect(result.score).toBe(0);
  });

  it('detects replaceable patterns', () => {
    const result = validateAITone('그것은 사실인 것이다. 일이 되었다.');
    expect(result.fixes.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Quality Validator (Show-Don't-Tell + Repetition)
// ============================================================

describe('validateQuality', () => {
  it('detects tell-not-show patterns', () => {
    const result = validateQuality('그는 슬픔을 느꼈다. 분노를 느꼈다. 기쁨을 느꼈다.');
    expect(result.showTellIssues.length).toBeGreaterThan(0);
  });

  it('detects repetitive expressions', () => {
    const text = '고개를 끄덕였다. 다시 고개를 끄덕였다. 또 고개를 끄덕였다.';
    const result = validateQuality(text);
    expect(result.repetitionIssues.length).toBeGreaterThan(0);
  });

  it('clean text passes quality', () => {
    const result = validateQuality('하늘이 맑았다. 바람이 불었다.');
    expect(result.score).toBe(100);
  });
});

// ============================================================
// Causality Enforcer (EH v1.4)
// ============================================================

describe('validateCausality', () => {
  it('Lv1 does nothing', () => {
    const result = validateCausality('기적이 일어났다.', 1);
    expect(result.fixes.length).toBe(0);
  });

  it('Lv2+ detects banned words', () => {
    const result = validateCausality('기적이 일어났다. 운명이다.', 2);
    expect(result.fixes.length).toBeGreaterThanOrEqual(2);
  });

  it('Lv4+ treats as ERROR severity', () => {
    const result = validateCausality('갑자기 문이 열렸다.', 4);
    expect(result.fixes[0].severity).toBe(2); // Severity.ERROR = 2
  });

  it('Lv3+ generates issues', () => {
    const result = validateCausality('그냥 그런 거야. 원래 그랬어.', 3);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });

  it('English banned words also detected', () => {
    const result = validateCausality('It was a miracle. Suddenly the door opened.', 2);
    expect(result.fixes.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// Formatting Rules (서식 규칙 7조)
// ============================================================

describe('applyFormattingRules', () => {
  it('removes parentheses but keeps content', () => {
    const { formatted } = applyFormattingRules('그는 (조용히) 문을 열었다.');
    expect(formatted).toBe('그는 조용히 문을 열었다.');
    expect(formatted).not.toContain('(');
  });

  it('removes em dash', () => {
    const { formatted } = applyFormattingRules('그는—아무 말도 하지 않았다.');
    expect(formatted).not.toContain('—');
  });

  it('unifies ellipsis', () => {
    const { formatted } = applyFormattingRules('그래서... 결국...');
    expect(formatted).toContain('…');
    expect(formatted).not.toMatch(/\.{3}/);
  });

  it('tracks changes made', () => {
    const { changes } = applyFormattingRules('(괄호) 그리고— 그래서...');
    expect(changes.length).toBe(3);
  });

  it('no changes on clean text', () => {
    const { formatted, changes } = applyFormattingRules('깨끗한 문장입니다.');
    expect(formatted).toBe('깨끗한 문장입니다.');
    expect(changes.length).toBe(0);
  });
});

describe('validateFormattingIssues', () => {
  it('detects remaining parentheses', () => {
    const issues = validateFormattingIssues('아직 (괄호가) 있다.');
    expect(issues.some(i => i.category === 'formatting' && i.message.includes('괄호'))).toBe(true);
  });

  it('detects em dash', () => {
    const issues = validateFormattingIssues('그는—갔다.');
    expect(issues.some(i => i.message.includes('Em dash'))).toBe(true);
  });

  it('clean text has no formatting issues', () => {
    const issues = validateFormattingIssues('깨끗한 문장입니다.');
    expect(issues.length).toBe(0);
  });
});

// ============================================================
// Orchestrator
// ============================================================

describe('validateGeneratedContent', () => {
  it('runs all validators for Korean', () => {
    const { fixes, issues } = validateGeneratedContent(
      '그러나 기적이 일어났다. (괄호) 그리고— ...',
      'KO', 3
    );
    expect(fixes.length).toBeGreaterThan(0);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('skips Korean validators for English', () => {
    const { fixes } = validateGeneratedContent('However this is fine.', 'EN', 1);
    // No Korean AI tone fixes
    expect(fixes.filter(f => f.reason.includes('AI톤')).length).toBe(0);
  });
});

// ============================================================
// Trademark / IP Filter
// ============================================================

describe('detectTrademarks', () => {
  it('detects Korean trademarks', () => {
    const matches = detectTrademarks('주인공은 포켓몬을 잡기 위해 스타벅스에 갔다.');
    expect(matches.length).toBe(2);
    expect(matches.map(m => m.original)).toContain('포켓몬');
    expect(matches.map(m => m.original)).toContain('스타벅스');
  });

  it('detects English trademarks', () => {
    const matches = detectTrademarks('He played Pokemon and drank Coca-Cola.');
    expect(matches.length).toBe(2);
  });

  it('returns empty for clean text', () => {
    const matches = detectTrademarks('용사는 마법검을 들고 던전에 들어갔다.');
    expect(matches.length).toBe(0);
  });
});

describe('filterTrademarks', () => {
  it('replaces trademarks with safe alternatives', () => {
    const { filtered, matches } = filterTrademarks('그녀는 아이폰으로 유튜브를 봤다.');
    expect(matches.length).toBe(2);
    expect(filtered).toContain('스마트폰');
    expect(filtered).toContain('동영상플랫폼');
    expect(filtered).not.toContain('아이폰');
    expect(filtered).not.toContain('유튜브');
  });

  it('handles mixed Korean/English', () => {
    const { filtered } = filterTrademarks('Harry Potter와 나루토가 만났다.');
    expect(filtered).not.toContain('Harry Potter');
    expect(filtered).not.toContain('나루토');
  });
});
