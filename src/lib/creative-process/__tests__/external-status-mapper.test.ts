// ============================================================
// external-status-mapper.test.ts — 6단계 × 4언어 = 24 케이스
// ============================================================

import {
  mapInternalToExternalStatus,
  ALL_INTERNAL_STATUSES,
  type InternalStatus,
} from '../external-status-mapper';
import type { CertificateLanguage } from '../types';

describe('external-status-mapper — mapInternalToExternalStatus', () => {
  const languages: CertificateLanguage[] = ['ko', 'en', 'ja', 'zh'];

  it('6 internal × 4 language = 24 mappings, all return non-empty strings', () => {
    for (const internal of ALL_INTERNAL_STATUSES) {
      for (const lang of languages) {
        const result = mapInternalToExternalStatus(internal, lang);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });

  it('내부 status 식별자가 외부 라벨로 누설되지 않음 (4언어)', () => {
    const internalCodes: string[] = ['READY', 'REVIEW_NEEDED', 'SOURCE_MISSING', 'HUMAN_REVIEW_LOW', 'LOG_GAP', 'EXPORT_BLOCKED'];
    for (const internal of ALL_INTERNAL_STATUSES) {
      for (const lang of languages) {
        const result = mapInternalToExternalStatus(internal, lang);
        for (const code of internalCodes) {
          expect(result).not.toContain(code);
        }
      }
    }
  });

  it('READY → 4언어 모두 "확인 가능" 어감 라벨', () => {
    expect(mapInternalToExternalStatus('READY', 'ko')).toBe('확인 가능');
    expect(mapInternalToExternalStatus('READY', 'en')).toBe('Available');
    expect(mapInternalToExternalStatus('READY', 'ja')).toBe('確認可能');
    expect(mapInternalToExternalStatus('READY', 'zh')).toBe('可确认');
  });

  it('HUMAN_REVIEW_LOW 와 LOG_GAP 은 동일 외부 표현으로 합쳐짐', () => {
    for (const lang of languages) {
      const a = mapInternalToExternalStatus('HUMAN_REVIEW_LOW', lang);
      const b = mapInternalToExternalStatus('LOG_GAP', lang);
      expect(a).toBe(b);
    }
  });

  it('EXPORT_BLOCKED → 발급 불가 어감 (한국어)', () => {
    expect(mapInternalToExternalStatus('EXPORT_BLOCKED', 'ko')).toBe('확인서 생성 불가');
  });

  it('잘못된 status 값에도 안전 fallback (타입 우회 케이스)', () => {
    const fallback = mapInternalToExternalStatus('INVALID_STATUS' as InternalStatus, 'ko');
    expect(fallback).toBeTruthy();
  });
});
