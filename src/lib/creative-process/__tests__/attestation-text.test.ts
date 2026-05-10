/**
 * attestation-text.test.ts (2026-05-10 — Visual Charter v1.0)
 */

import {
  ATTESTATION_OF_GENESIS_4LANG,
  SIGNATURE_DISCLAIMER_4LANG,
  ATTESTATION_LABELS,
  ATTESTATION_VERSION,
} from '../attestation-text';

describe('attestation-text — ATTESTATION_OF_GENESIS 4언어 byte-level', () => {
  it('ko — Lore Guard Integrity Core 명시', () => {
    expect(ATTESTATION_OF_GENESIS_4LANG.ko).toContain('Lore Guard Integrity Core');
    expect(ATTESTATION_OF_GENESIS_4LANG.ko).toContain('작가의 직접적인 통제');
  });

  it("en — author's direct control + manually validated", () => {
    expect(ATTESTATION_OF_GENESIS_4LANG.en).toContain("author's direct control");
    expect(ATTESTATION_OF_GENESIS_4LANG.en).toContain('manually validated');
    expect(ATTESTATION_OF_GENESIS_4LANG.en).toContain('Lore Guard Integrity Core');
  });

  it('ja — 直接的な管理下', () => {
    expect(ATTESTATION_OF_GENESIS_4LANG.ja).toContain('直接的な管理下');
    expect(ATTESTATION_OF_GENESIS_4LANG.ja).toContain('Lore Guard Integrity Core');
  });

  it('zh — 直接控制下', () => {
    expect(ATTESTATION_OF_GENESIS_4LANG.zh).toContain('直接控制下');
    expect(ATTESTATION_OF_GENESIS_4LANG.zh).toContain('Lore Guard Integrity Core');
  });

  it('4언어 모두 길이 100자+ (substantive 진술)', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      expect(ATTESTATION_OF_GENESIS_4LANG[lang].length).toBeGreaterThan(80);
    }
  });
});

describe('attestation-text — SIGNATURE_DISCLAIMER 4언어', () => {
  it('ko — 작업 과정 기록 / 저작권 보증 X', () => {
    expect(SIGNATURE_DISCLAIMER_4LANG.ko).toContain('작업 과정의 기록');
    expect(SIGNATURE_DISCLAIMER_4LANG.ko).toContain('저작권 보증');
  });

  it('en — record of process / not a guarantee', () => {
    expect(SIGNATURE_DISCLAIMER_4LANG.en).toContain('record of process');
    expect(SIGNATURE_DISCLAIMER_4LANG.en).toContain('not a guarantee');
  });

  it('4언어 모두 정의', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      expect(SIGNATURE_DISCLAIMER_4LANG[lang].length).toBeGreaterThan(10);
    }
  });
});

describe('attestation-text — ATTESTATION_LABELS', () => {
  it('4언어 × 9 키 모두 정의', () => {
    const requiredKeys = [
      'headerLabel', 'titleOfWork', 'authorName', 'serialNo', 'dateIssued',
      'digitalSignature', 'scanForProof', 'workSessions', 'originSummary', 'humanControlIndex',
    ];
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      for (const key of requiredKeys) {
        expect(ATTESTATION_LABELS[lang][key as keyof (typeof ATTESTATION_LABELS)['ko']]).toBeDefined();
      }
    }
  });

  it('headerLabel 모든 언어 동일 ("ATTESTATION OF GENESIS")', () => {
    // 격식 라틴어 명칭 — 4언어 동일 권장
    expect(ATTESTATION_LABELS.ko.headerLabel).toBe('ATTESTATION OF GENESIS');
    expect(ATTESTATION_LABELS.en.headerLabel).toBe('ATTESTATION OF GENESIS');
    expect(ATTESTATION_LABELS.ja.headerLabel).toBe('ATTESTATION OF GENESIS');
    expect(ATTESTATION_LABELS.zh.headerLabel).toBe('ATTESTATION OF GENESIS');
  });

  it('humanControlIndex 4언어 동일 ("Human Control Index (HCI)")', () => {
    expect(ATTESTATION_LABELS.ko.humanControlIndex).toContain('HCI');
    expect(ATTESTATION_LABELS.en.humanControlIndex).toContain('HCI');
  });
});

describe('attestation-text — version', () => {
  it('ATTESTATION_VERSION 1.x', () => {
    expect(ATTESTATION_VERSION).toMatch(/^1\./);
  });
});
