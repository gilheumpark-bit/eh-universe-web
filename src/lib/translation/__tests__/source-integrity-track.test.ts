// ============================================================
// source-integrity trackMode 차등 검증 — 시장 분석 4차 §1원칙 차등 적용.
// ============================================================
//
// faithful: 단락 1:1 강제 (N≥10 + 차이>1 시 fail), 비율 ±20%
// market:   단락 그룹화 허용 (fail → warn), 비율 0.5~2.0x 허용
// default:  legacy
//
// [C] LLM 호출 0 — 결정론적
// ============================================================

import { runIntegrityCheck } from '../source-integrity';

describe('source-integrity trackMode', () => {
  const longSource = Array.from({ length: 12 }, (_, i) => `단락 ${i + 1} 내용`).join('\n\n');
  const halfTranslation = Array.from({ length: 6 }, (_, i) => `Para ${i + 1}`).join('\n\n');

  it('default mode: 단락 수 차이 (12 vs 6) → fail', () => {
    const r = runIntegrityCheck({
      source: longSource,
      translation: halfTranslation,
      srcLang: 'ko',
      tgtLang: 'en',
      trackMode: 'default',
    });
    expect(r.status).toBe('fail');
  });

  it('faithful mode: 단락 수 차이 N≥10 + diff>1 → fail (엄격 격상)', () => {
    const r = runIntegrityCheck({
      source: longSource,
      translation: halfTranslation,
      srcLang: 'ko',
      tgtLang: 'en',
      trackMode: 'faithful',
    });
    expect(r.status).toBe('fail');
  });

  it('market mode: 단락 그룹화 허용 → fail → warn 강등', () => {
    // market 은 paraIssue fail → warn 강등. 하지만 massive-truncation 은 별도 fail.
    // 따라서 ratio 도 0.5 이상이 되도록 translation 길이 조정.
    const groupedTranslation = Array.from(
      { length: 6 },
      (_, i) => `Para ${i + 1} contains aggregated content from two source paragraphs.`,
    ).join('\n\n');
    const r = runIntegrityCheck({
      source: longSource,
      translation: groupedTranslation,
      srcLang: 'ko',
      tgtLang: 'en',
      trackMode: 'market',
    });
    // market 은 fail 을 warn 으로 강등 + ratio 통과 → 'warn' 또는 'pass'
    expect(['warn', 'pass']).toContain(r.status);
  });

  it('faithful mode 비율 ±20%: 비율 통과 → pass', () => {
    // 12 단락 동일, 비슷한 길이
    const evenTranslation = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1} content here`).join('\n\n');
    const r = runIntegrityCheck({
      source: longSource,
      translation: evenTranslation,
      srcLang: 'ko',
      tgtLang: 'en',
      trackMode: 'faithful',
    });
    expect(['pass', 'warn']).toContain(r.status);
  });

  it('market mode 비율 0.5~2.0x: 단락 일치 + 절반 길이 허용', () => {
    // market 은 word-ratio-out-of-range 에서 ratio 0.5~2.0 통과.
    // 12 단락 동일 + 영어 단어가 source 의 의미문자 절반 정도.
    // source: "단락 N 내용" × 12 ≈ 60 의미문자
    // translation: "short text" × 12 = 24 단어 → ratio 0.4 (< 0.5, fail)
    // 따라서 단어 수 늘림: "short text here" × 12 = 36 단어 → ratio 0.6 (통과)
    const balancedTranslation = Array.from(
      { length: 12 },
      () => 'short text here',
    ).join('\n\n');
    const r = runIntegrityCheck({
      source: longSource,
      translation: balancedTranslation,
      srcLang: 'ko',
      tgtLang: 'en',
      trackMode: 'market',
    });
    // market 은 더 관대 — fail 보다는 warn / pass
    expect(r.status).not.toBe('fail');
  });
});
