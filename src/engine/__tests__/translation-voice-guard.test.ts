// ============================================================
// PART 1 — Imports
// ============================================================

import {
  detectVoiceViolations,
  buildVoiceRule,
  buildVoiceRulesFromProject,
  extractDialogueLines,
  summarizeViolations,
  buildRetryHintFromViolations,
  type VoiceRule,
  type VoiceViolation,
  type VoiceDialogueLine,
} from '../translation-voice-guard';

// ============================================================
// PART 2 — buildVoiceRule
// ============================================================

describe('buildVoiceRule', () => {
  it('이름 없으면 null', () => {
    expect(buildVoiceRule({ name: '', register: { tone: 'formal' } }, 'KO')).toBeNull();
  });

  it('register.tone 없으면 null', () => {
    expect(buildVoiceRule({ name: 'A', register: {} }, 'KO')).toBeNull();
  });

  it('register 자체가 없으면 null', () => {
    expect(buildVoiceRule({ name: 'A' }, 'KO')).toBeNull();
  });

  it('KO formal — DEFAULT_TONE_PATTERNS 매핑', () => {
    const rule = buildVoiceRule({ name: 'A', register: { tone: 'formal' } }, 'KO');
    expect(rule).not.toBeNull();
    expect(rule?.tone).toBe('formal');
    expect(rule?.mustUse.length).toBeGreaterThan(0);
    expect(rule?.mustNotUse.length).toBeGreaterThan(0);
  });

  it('각 언어별(KO/EN/JP/CN) 패턴 존재', () => {
    const langs: Array<'KO' | 'EN' | 'JP' | 'CN'> = ['KO', 'EN', 'JP', 'CN'];
    for (const lang of langs) {
      const rule = buildVoiceRule({ name: 'A', register: { tone: 'casual' } }, lang);
      expect(rule).not.toBeNull();
    }
  });

  it('aliases 배열 보존', () => {
    const rule = buildVoiceRule(
      { name: 'A', aliases: ['nick1', 'nick2'], register: { tone: 'formal' } },
      'KO',
    );
    expect(rule?.aliases).toEqual(['nick1', 'nick2']);
  });
});

// ============================================================
// PART 3 — buildVoiceRulesFromProject
// ============================================================

describe('buildVoiceRulesFromProject', () => {
  it('빈 배열 → 빈 결과', () => {
    expect(buildVoiceRulesFromProject([], 'KO')).toEqual([]);
  });

  it('비배열 입력 → 빈 결과', () => {
    expect(buildVoiceRulesFromProject(null as unknown as never[], 'KO')).toEqual([]);
  });

  it('tone 없는 캐릭터 제외 (null 필터)', () => {
    const rules = buildVoiceRulesFromProject(
      [
        { name: 'A', register: { tone: 'formal' } },
        { name: 'B', register: {} }, // tone 없음 — 제외
        { name: 'C', register: { tone: 'casual' } },
      ],
      'KO',
    );
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.character)).toEqual(['A', 'C']);
  });
});

// ============================================================
// PART 4 — detectVoiceViolations
// ============================================================

describe('detectVoiceViolations', () => {
  it('빈 lines → 빈 배열', () => {
    expect(detectVoiceViolations([], [])).toEqual([]);
  });

  it('빈 rules → 빈 배열', () => {
    const lines: VoiceDialogueLine[] = [{ speaker: 'A', text: '안녕' }];
    expect(detectVoiceViolations(lines, [])).toEqual([]);
  });

  it('formal 캐릭터가 반말 사용 → forbidden 위반', () => {
    const rule = buildVoiceRule({ name: 'A', register: { tone: 'formal' } }, 'KO')!;
    const lines: VoiceDialogueLine[] = [{ speaker: 'A', text: '나는 했어' }];
    const violations = detectVoiceViolations(lines, [rule]);
    expect(violations.some((v) => v.violation === 'forbidden')).toBe(true);
  });

  it('rough 캐릭터가 정중 사용 → forbidden 위반', () => {
    const rule = buildVoiceRule({ name: 'B', register: { tone: 'rough' } }, 'KO')!;
    const lines: VoiceDialogueLine[] = [{ speaker: 'B', text: '감사합니다 정말로 고마워서' }];
    const violations = detectVoiceViolations(lines, [rule]);
    expect(violations.some((v) => v.violation === 'forbidden')).toBe(true);
  });

  it('matching speaker 없으면 무시', () => {
    const rule = buildVoiceRule({ name: 'A', register: { tone: 'formal' } }, 'KO')!;
    const lines: VoiceDialogueLine[] = [{ speaker: 'NotInRules', text: '나는 갔어' }];
    expect(detectVoiceViolations(lines, [rule])).toEqual([]);
  });

  it('짧은 대사(10자 미만) → missing 규칙 제외', () => {
    const rule: VoiceRule = {
      character: 'A',
      tone: 'formal',
      mustUse: [/존재하지않는패턴XYZ/],
      mustNotUse: [],
    };
    const lines: VoiceDialogueLine[] = [{ speaker: 'A', text: '짧음' }];
    const violations = detectVoiceViolations(lines, [rule]);
    expect(violations.filter((v) => v.violation === 'missing')).toHaveLength(0);
  });

  it('alias 매핑 작동 — 별칭으로 speaker 지정해도 규칙 적용', () => {
    const rule: VoiceRule = {
      character: 'RealName',
      aliases: ['Nick'],
      tone: 'formal',
      mustUse: [/습니다/],
      mustNotUse: [/했어$/],
    };
    const lines: VoiceDialogueLine[] = [{ speaker: 'Nick', text: '저는 했어' }];
    const violations = detectVoiceViolations(lines, [rule]);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('severity: forbidden → "error"', () => {
    const rule = buildVoiceRule({ name: 'A', register: { tone: 'formal' } }, 'KO')!;
    const lines: VoiceDialogueLine[] = [{ speaker: 'A', text: '나는 했어' }];
    const violations = detectVoiceViolations(lines, [rule]);
    const forbidden = violations.find((v) => v.violation === 'forbidden');
    expect(forbidden?.severity).toBe('error');
  });

  it('severity: missing → "warn"', () => {
    const rule: VoiceRule = {
      character: 'A',
      tone: 'formal',
      mustUse: [/존재하지않는패턴XYZ/],
      mustNotUse: [],
    };
    const lines: VoiceDialogueLine[] = [
      { speaker: 'A', text: '이것은 충분히 긴 대사입니다 그런데 패턴 없음' },
    ];
    const violations = detectVoiceViolations(lines, [rule]);
    const missing = violations.find((v) => v.violation === 'missing');
    expect(missing?.severity).toBe('warn');
  });

  it('빈 text/speaker는 skip', () => {
    const rule = buildVoiceRule({ name: 'A', register: { tone: 'formal' } }, 'KO')!;
    const lines: VoiceDialogueLine[] = [
      { speaker: '', text: '나는 갔어' },
      { speaker: 'A', text: '' },
    ];
    expect(detectVoiceViolations(lines, [rule])).toEqual([]);
  });
});

// ============================================================
// PART 5 — extractDialogueLines
// ============================================================

describe('extractDialogueLines', () => {
  it('빈 입력 → 빈 배열', () => {
    expect(extractDialogueLines('', 'KO')).toEqual([]);
  });

  it('null/undefined 입력 → 빈 배열', () => {
    expect(extractDialogueLines(null as unknown as string, 'KO')).toEqual([]);
  });

  it('KO 큰따옴표 추출', () => {
    const text = '그가 말했다. "안녕하세요." 그리고 떠났다.';
    const lines = extractDialogueLines(text, 'KO');
    expect(lines.some((l) => l.text === '안녕하세요.')).toBe(true);
  });

  it('JP 「」 추출', () => {
    const text = '彼は言った。「こんにちは」そして去った。';
    const lines = extractDialogueLines(text, 'JP');
    expect(lines.some((l) => l.text === 'こんにちは')).toBe(true);
  });

  it('대사 없는 텍스트 → 빈 배열', () => {
    const text = '그저 평범한 서술 문장.';
    expect(extractDialogueLines(text, 'KO')).toEqual([]);
  });
});

// ============================================================
// PART 6 — summarizeViolations & buildRetryHintFromViolations
// ============================================================

describe('summarizeViolations', () => {
  it('빈 violations → 모든 카운트 0, passRate 1', () => {
    const report = summarizeViolations([], 10, 5);
    expect(report.errorCount).toBe(0);
    expect(report.warnCount).toBe(0);
    expect(report.passRate).toBe(1);
  });

  it('errorCount/warnCount 정확히 분리', () => {
    const violations: VoiceViolation[] = [
      { speaker: 'A', line: 'x', violation: 'forbidden', detail: '', severity: 'error' },
      { speaker: 'A', line: 'y', violation: 'missing', detail: '', severity: 'warn' },
      { speaker: 'B', line: 'z', violation: 'forbidden', detail: '', severity: 'error' },
    ];
    const report = summarizeViolations(violations, 10, 3);
    expect(report.errorCount).toBe(2);
    expect(report.warnCount).toBe(1);
  });

  it('passRate 0~1 범위 클램핑', () => {
    const violations: VoiceViolation[] = Array(20).fill({
      speaker: 'A',
      line: 'x',
      violation: 'forbidden',
      detail: '',
      severity: 'error',
    });
    const report = summarizeViolations(violations, 10, 1);
    expect(report.passRate).toBeGreaterThanOrEqual(0);
    expect(report.passRate).toBeLessThanOrEqual(1);
  });

  it('totalLines=0 → passRate=1', () => {
    const report = summarizeViolations([], 0, 0);
    expect(report.passRate).toBe(1);
  });

  it('비배열 violations → 안전 처리', () => {
    const report = summarizeViolations(null as unknown as VoiceViolation[], 5, 1);
    expect(report.errorCount).toBe(0);
  });
});

describe('buildRetryHintFromViolations', () => {
  it('빈 violations → 빈 문자열', () => {
    expect(buildRetryHintFromViolations([])).toBe('');
  });

  it('error 0건, warn만 → 빈 문자열', () => {
    const violations: VoiceViolation[] = [
      { speaker: 'A', line: 'x', violation: 'missing', detail: 'd', severity: 'warn' },
    ];
    expect(buildRetryHintFromViolations(violations)).toBe('');
  });

  it('error 있으면 [VOICE GUARD — 재번역 필요] 접두어', () => {
    const violations: VoiceViolation[] = [
      { speaker: 'A', line: 'short line', violation: 'forbidden', detail: 'd', severity: 'error' },
    ];
    const hint = buildRetryHintFromViolations(violations);
    expect(hint).toContain('[VOICE GUARD — 재번역 필요]');
    expect(hint).toContain('A:');
  });

  it('error 5개 초과 시 5개로 절단', () => {
    const violations: VoiceViolation[] = Array.from({ length: 10 }, (_, i) => ({
      speaker: `S${i}`,
      line: 'x',
      violation: 'forbidden',
      detail: 'd',
      severity: 'error',
    }));
    const hint = buildRetryHintFromViolations(violations);
    // 5개만 포함됨 — S0~S4
    expect(hint).toContain('S4');
    expect(hint).not.toContain('S5');
  });
});
