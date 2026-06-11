/**
 * block-policy.test.ts (2026-06-11 — N4)
 *
 * 차등 차단 매트릭스 + 차단 응답 계약 검증:
 *   - 매트릭스 단조성 (위험 ↑ → 결정 완화 없음 / 등급 ↑ → 결정 강화 없음)
 *   - gradeRequired 산출 (BLOCK 셀의 완화 등급 힌트)
 *   - isBlockedPayload 양 namespace ('all-ages'… / 'ALL'…) 수용 + 쓰레기 거부
 *   - NOA 하드 차단(allowed=false)은 정책으로 완화 불가
 */

import {
  BLOCK_POLICY_MATRIX,
  decideBlockPolicy,
  decideFromNoaResult,
  isBlockedPayload,
  normalizePrismGrade,
  getBlockNoticeMessage,
  type BlockDecision,
} from '../block-policy';
import type { NoaGradeLevel, NoaResult } from '../types';

const LEVELS: NoaGradeLevel[] = [
  'Platinum', 'Gold', 'LightGold', 'Silver', 'Lime', 'Orange', 'Red', 'DeepRed', 'Black',
];
const PRISMS = ['all-ages', 'teen-15', 'mature-18'] as const;
const RANK: Record<BlockDecision, number> = { PASS: 0, AUDIT_ONLY: 1, BLOCK: 2 };

describe('BLOCK_POLICY_MATRIX — 보수적 단조성', () => {
  it('위험 등급이 올라가면 같은 작품 등급에서 결정이 완화되지 않는다', () => {
    for (const prism of PRISMS) {
      for (let i = 1; i < LEVELS.length; i++) {
        const prev = RANK[BLOCK_POLICY_MATRIX[LEVELS[i - 1]][prism]];
        const curr = RANK[BLOCK_POLICY_MATRIX[LEVELS[i]][prism]];
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    }
  });

  it('작품 등급이 올라가면 같은 위험 등급에서 결정이 강화되지 않는다', () => {
    for (const level of LEVELS) {
      for (let i = 1; i < PRISMS.length; i++) {
        const stricter = RANK[BLOCK_POLICY_MATRIX[level][PRISMS[i - 1]]];
        const lenient = RANK[BLOCK_POLICY_MATRIX[level][PRISMS[i]]];
        expect(lenient).toBeLessThanOrEqual(stricter);
      }
    }
  });

  it('DeepRed/Black 은 전 등급 BLOCK (tactical 하드 차단 구간과 정합)', () => {
    for (const prism of PRISMS) {
      expect(BLOCK_POLICY_MATRIX.DeepRed[prism]).toBe('BLOCK');
      expect(BLOCK_POLICY_MATRIX.Black[prism]).toBe('BLOCK');
    }
  });
});

describe('decideBlockPolicy — gradeRequired 힌트', () => {
  it('Lime × all-ages = BLOCK + teen-15 완화 힌트', () => {
    expect(decideBlockPolicy('Lime', 'all-ages')).toEqual({ decision: 'BLOCK', gradeRequired: 'teen-15' });
  });
  it('Orange × teen-15 = BLOCK + mature-18 완화 힌트', () => {
    expect(decideBlockPolicy('Orange', 'teen-15')).toEqual({ decision: 'BLOCK', gradeRequired: 'mature-18' });
  });
  it('Black × mature-18 = BLOCK + null (어느 등급에서도 불가)', () => {
    expect(decideBlockPolicy('Black', 'mature-18')).toEqual({ decision: 'BLOCK', gradeRequired: null });
  });
  it('비차단 결정은 gradeRequired null', () => {
    expect(decideBlockPolicy('Silver', 'all-ages')).toEqual({ decision: 'AUDIT_ONLY', gradeRequired: null });
    expect(decideBlockPolicy('Gold', 'all-ages')).toEqual({ decision: 'PASS', gradeRequired: null });
  });
});

describe('decideFromNoaResult — 보안 우선', () => {
  const baseResult = (over: Partial<NoaResult>): NoaResult => ({
    allowed: true,
    sanitizedText: '',
    fastTrack: null,
    trinity: null,
    judgment: null,
    tactical: { selectedPath: 'ALLOW', config: { path: 'ALLOW', tokenBudget: 800, responseDelay: 0, description: '' }, reason: '' },
    auditEntry: { id: 'a', timestamp: 0, layer: 'fast-track', input: '', output: '', verdict: '', prevHash: '', hash: '', hmacSignature: '' },
    availability: { allowed: true, budgetRemaining: 1, hallucinationFlag: false, action: 'proceed' },
    totalDurationMs: 0,
    layerDurations: { sanitize: 0, fastTrack: 0, trinity: 0, judgment: 0, availability: 0, tactical: 0, audit: 0 },
    ...over,
  });

  it('NOA 하드 차단(allowed=false)은 성인 등급이어도 BLOCK 유지 (완화 불가)', () => {
    const r = decideFromNoaResult(baseResult({ allowed: false }), 'mature-18');
    expect(r.decision).toBe('BLOCK');
  });

  it('fast PASS (judgment=null·allowed=true) → PASS', () => {
    expect(decideFromNoaResult(baseResult({}), 'all-ages')).toEqual({ decision: 'PASS', gradeRequired: null });
  });
});

describe('isBlockedPayload — 계약 식별 (양 namespace)', () => {
  it('PrismLevel namespace 수용', () => {
    expect(isBlockedPayload({ blocked: true, reason: 'r', gradeRequired: 'teen-15' })).toBe(true);
  });
  it("server-gate namespace ('ALL'|'T15'|'M18') 수용", () => {
    expect(isBlockedPayload({ blocked: true, reason: 'r', gradeRequired: 'T15' })).toBe(true);
    expect(isBlockedPayload({ blocked: true, reason: 'r', gradeRequired: 'M18' })).toBe(true);
  });
  it('null/undefined gradeRequired 수용 (등급 무관 차단)', () => {
    expect(isBlockedPayload({ blocked: true, reason: 'r', gradeRequired: null })).toBe(true);
    expect(isBlockedPayload({ blocked: true, reason: 'r' })).toBe(true);
  });
  it('비차단/쓰레기 JSON 거부 (정상 응답 오인 금지)', () => {
    expect(isBlockedPayload(null)).toBe(false);
    expect(isBlockedPayload('blocked')).toBe(false);
    expect(isBlockedPayload({ blocked: false, reason: 'r', gradeRequired: null })).toBe(false);
    expect(isBlockedPayload({ blocked: true })).toBe(false); // reason 없음
    expect(isBlockedPayload({ blocked: true, reason: 'r', gradeRequired: 'X99' })).toBe(false);
    expect(isBlockedPayload({ completion: 'normal text' })).toBe(false);
  });
});

describe('normalizePrismGrade', () => {
  it('양 namespace → PrismLevel', () => {
    expect(normalizePrismGrade('ALL')).toBe('all-ages');
    expect(normalizePrismGrade('T15')).toBe('teen-15');
    expect(normalizePrismGrade('M18')).toBe('mature-18');
    expect(normalizePrismGrade('mature-18')).toBe('mature-18');
  });
  it('미지값 null', () => {
    expect(normalizePrismGrade('nope')).toBeNull();
    expect(normalizePrismGrade(undefined)).toBeNull();
  });
});

describe('getBlockNoticeMessage — 고지 문구 (정직 + 해결 경로)', () => {
  it('등급 변경 경로 제시 (ko)', () => {
    const msg = getBlockNoticeMessage('all-ages', 'teen-15', 'ko');
    expect(msg).toContain('전체이용가');
    expect(msg).toContain('생성을 중단');
    expect(msg).toContain('등급');
  });
  it('전 등급 불가 시 표현 조정 경로만 제시', () => {
    const msg = getBlockNoticeMessage('mature-18', null, 'ko');
    expect(msg).toContain('표현을 조정');
  });
  it('4언어 모두 비어있지 않음', () => {
    for (const lang of ['ko', 'en', 'ja', 'zh'] as const) {
      expect(getBlockNoticeMessage('teen-15', 'mature-18', lang).length).toBeGreaterThan(10);
    }
  });
});
