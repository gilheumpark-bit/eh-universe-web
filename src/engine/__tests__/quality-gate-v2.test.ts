// ============================================================
// quality-gate-v2.test — Task 4 Phase 2 — Draft/Detail 검증기 테스트
// ============================================================

import {
  extractQualityMetrics,
  validateDraftPass,
  validateDetailPass,
} from '../quality-gate-v2';

// ============================================================
// PART 1 — Fixture builders
// ============================================================

/**
 * 한글 문단 생성기.
 * 'paragraphs' 개의 문단을 '\n\n' 으로 구분, 각 문단은 'sentencesPerPara' 문장.
 * 각 문장은 '한글' 이 섞인 고정 템플릿.
 */
function buildHangulText(paragraphs: number, sentencesPerPara: number, dialogueRatio = 0): string {
  const paras: string[] = [];
  for (let i = 0; i < paragraphs; i++) {
    const sents: string[] = [];
    for (let j = 0; j < sentencesPerPara; j++) {
      if (dialogueRatio > 0 && j % Math.max(1, Math.round(1 / dialogueRatio)) === 0) {
        sents.push(`"안녕하세요 ${i}-${j}"라고 그가 말했다.`);
      } else {
        sents.push(`그는 ${i}-${j}번째로 천천히 고개를 돌렸다.`);
      }
    }
    paras.push(sents.join(' '));
  }
  return paras.join('\n\n');
}

/** 목표 문자 길이 근처로 조정 — 반복 패딩 */
function padToLength(text: string, targetLen: number): string {
  if (text.length >= targetLen) return text.slice(0, targetLen);
  const padUnit = '그는 묵묵히 걸었다. ';
  let out = text;
  while (out.length < targetLen) {
    out += padUnit;
  }
  return out.slice(0, targetLen);
}

// ============================================================
// PART 2 — extractQualityMetrics
// ============================================================

describe('extractQualityMetrics', () => {
  test('빈 입력 → 전부 0', () => {
    const m = extractQualityMetrics('');
    expect(m.chars).toBe(0);
    expect(m.paragraphs).toBe(0);
    expect(m.dialogueRatio).toBe(0);
    expect(m.hangulRatio).toBe(0);
  });

  test('한글 100%인 경우 hangulRatio ≈ 1', () => {
    const m = extractQualityMetrics('한글만있는문장입니다');
    expect(m.hangulRatio).toBe(1);
  });

  test('문단 2개 구분', () => {
    const m = extractQualityMetrics('첫째 문단입니다.\n\n둘째 문단입니다.');
    expect(m.paragraphs).toBe(2);
  });

  test('대사 비율 — "안녕" 한 블록', () => {
    const text = '그가 말했다. "안녕하세요" 라고. 그리고 침묵.';
    const m = extractQualityMetrics(text);
    expect(m.dialogueRatio).toBeGreaterThan(0);
    expect(m.dialogueRatio).toBeLessThan(1);
  });

  test('50k 초과 입력은 앞 50k만 사용', () => {
    const huge = 'ㄱ'.repeat(60_000);
    const m = extractQualityMetrics(huge);
    expect(m.chars).toBe(50_000);
  });
});

// ============================================================
// PART 3 — validateDraftPass
// ============================================================

describe('validateDraftPass', () => {
  test('3,500~5,500자 + 4~8문단 + 한글 100% → pass', () => {
    const base = buildHangulText(5, 10);
    // padToLength 가 문단 구조를 망가뜨릴 수 있어 "문단 보존" 재검 필수:
    // base 를 그대로 쓰되 마지막 문단에 한글 패딩만 추가.
    const paras = base.split('\n\n');
    const needed = Math.max(0, 4000 - base.length);
    paras[paras.length - 1] += '그는 다시 생각에 잠겼다. '.repeat(Math.ceil(needed / 14));
    const final = paras.join('\n\n').slice(0, 4000);

    const r = validateDraftPass(final);
    expect(r.metrics.chars).toBe(4000);
    expect(r.metrics.hangulRatio).toBeGreaterThan(0.6);
    expect(r.metrics.paragraphs).toBeGreaterThanOrEqual(4);
    expect(r.metrics.paragraphs).toBeLessThanOrEqual(8);
    expect(r.ok).toBe(true);
    expect(r.reasons).toHaveLength(0);
  });

  test('3,000자 (너무 짧음) → fail', () => {
    const paras = buildHangulText(5, 10).split('\n\n');
    paras[paras.length - 1] += '그는 다시 생각에 잠겼다. '.repeat(300);
    const final = paras.join('\n\n').slice(0, 3000);

    const r = validateDraftPass(final);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('draft_too_short'))).toBe(true);
  });

  test('5,600자 (너무 김) → fail', () => {
    const paras = buildHangulText(5, 10).split('\n\n');
    paras[paras.length - 1] += '그는 다시 생각에 잠겼다. '.repeat(600);
    const final = paras.join('\n\n').slice(0, 5600);

    const r = validateDraftPass(final);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('draft_too_long'))).toBe(true);
  });

  test('빈 입력 → empty_draft 사유', () => {
    const r = validateDraftPass('');
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain('empty_draft');
  });

  test('한글 비율 < 60% → hangul_ratio_low 사유', () => {
    // 4000자 중 영어 3000 + 한글 1000 정도.
    const engChunk = 'A'.repeat(3000);
    const korChunk = '한글 본문입니다. '.repeat(100);
    const final = `${engChunk}\n\n${korChunk}\n\n${engChunk.slice(0, 500)}\n\n${korChunk}`.slice(0, 4000);

    const r = validateDraftPass(final);
    expect(r.metrics.hangulRatio).toBeLessThan(0.6);
    expect(r.reasons.some((x) => x.startsWith('hangul_ratio_low'))).toBe(true);
  });

  test('NOVELPIA 플랫폼 오버라이드 — 5,000자 max', () => {
    const paras = buildHangulText(5, 10).split('\n\n');
    paras[paras.length - 1] += '그는 또 걸었다. '.repeat(800);
    const final = paras.join('\n\n').slice(0, 5200);

    // NOVELPIA 는 max 5000 이므로 5200 은 초과
    const r = validateDraftPass(final, 'NOVELPIA');
    expect(r.reasons.some((x) => x.startsWith('draft_too_long'))).toBe(true);

    // 기본(플랫폼 미지정)은 max 5500 이므로 5200 은 통과 가능
    const r2 = validateDraftPass(final);
    expect(r2.reasons.some((x) => x.startsWith('draft_too_long'))).toBe(false);
  });
});

// ============================================================
// PART 4 — validateDetailPass
// ============================================================

describe('validateDetailPass', () => {
  test('6,000자 + 다문단 + 한글 + 적절한 대사 비율 → pass (NOVELPIA)', () => {
    // 6000자 목표. 문단 7개, 각 문단을 충분히 길게 생성 후 슬라이스.
    const paras: string[] = [];
    for (let i = 0; i < 7; i++) {
      const sents: string[] = [];
      // 문단당 많은 문장을 생성 (대사 ~15%)
      for (let j = 0; j < 25; j++) {
        if (j % 7 === 0) {
          sents.push(`"${i}-${j}번째 말입니다만, 오늘은 정말 길고 복잡한 하루였습니다"라고 그가 침착하게 말했다.`);
        } else {
          sents.push(`그는 조용히 ${i}번째 문 앞에서 ${j}초를 세며 숨을 골랐고 하늘을 올려다보며 생각에 잠겼다.`);
        }
      }
      paras.push(sents.join(' '));
    }
    let text = paras.join('\n\n');

    // 6000자 초과하면 문단 경계 보존하며 슬라이스.
    if (text.length >= 6000) {
      text = text.slice(0, 6000);
    } else {
      // 부족하면 한글 패딩 (자연스러운 문단 추가)
      const extra = '그는 한참을 서서 과거를 떠올렸다. 먼 길을 걸어온 듯한 피로가 온몸을 짓눌렀다. ';
      while (text.length < 6000) {
        text += `\n\n${extra.repeat(5)}`;
      }
      text = text.slice(0, 6000);
    }

    const r = validateDetailPass(text, 'NOVELPIA');
    // chars 는 6000 확정
    expect(r.metrics.chars).toBe(6000);
    expect(r.metrics.hangulRatio).toBeGreaterThan(0.6);
    expect(r.metrics.dialogueRatio).toBeGreaterThan(0.05);
    expect(r.metrics.dialogueRatio).toBeLessThan(0.5);

    if (!r.ok) {
      // 실패 이유 로깅 — CI 재현성
       
      console.warn('validateDetailPass fail reasons:', r.reasons, r.metrics);
    }
    expect(r.ok).toBe(true);
  });

  test('빈 입력 → empty_detail 사유', () => {
    const r = validateDetailPass('');
    expect(r.ok).toBe(false);
    expect(r.reasons).toContain('empty_detail');
  });

  test('분량 미달 (4,000자) → detail_too_short', () => {
    const text = padToLength('그는 걸었다.\n\n그는 멈췄다.\n\n그는 뒤를 봤다.', 4000);
    const r = validateDetailPass(text);
    expect(r.ok).toBe(false);
    expect(r.reasons.some((x) => x.startsWith('detail_too_short'))).toBe(true);
  });

  test('한글 비율 테스트 — 영어 과다 시 hangul_ratio_low', () => {
    const eng = 'A'.repeat(5500);
    const kor = '\n\n한국어 문단입니다. '.repeat(10);
    const text = `${eng}${kor}`.slice(0, 6000);
    const r = validateDetailPass(text);
    expect(r.metrics.hangulRatio).toBeLessThan(0.6);
    expect(r.reasons.some((x) => x.startsWith('hangul_ratio_low'))).toBe(true);
  });

  test('대사 비율 과다 (>50%) → dialogue_ratio_high', () => {
    // 6000자 대부분이 대사로 채워진 케이스
    const dialogue = '"안녕하세요. 오늘은 정말 길고 긴 하루였습니다. 이어서 말하자면 정말 특별한 일이 있었답니다."';
    const chunk = `${dialogue}\n\n`;
    const text = chunk.repeat(60).slice(0, 6000);

    const r = validateDetailPass(text);
    // 문단수·한글비율은 통과하지만 dialogue 비율이 걸려야 함
    expect(r.reasons.some((x) => x.startsWith('dialogue_ratio_high'))).toBe(true);
  });

  test('문단 4개 이하 → detail_paragraph_low', () => {
    // 6500자를 3문단으로
    const one = '그는 ' + '오늘 길을 걸었다. '.repeat(300);
    const text = [one, one, one].join('\n\n').slice(0, 6500);
    const r = validateDetailPass(text);
    expect(r.reasons.some((x) => x.startsWith('detail_paragraph_low'))).toBe(true);
  });
});
