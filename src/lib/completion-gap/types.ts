// ============================================================
// completion-gap/types.ts
//
// AI 가 "완료" / "통과" / "구현됨" 보고 → 실제 wiring 자동 검증.
//
// 사용자 사례: Track-D Phase 1 — Claude Code "모든 검증 통과" 보고했지만
// useCreativeEventLogger 호출처 0 / autoRegenEnabled UI 0 / placeholder cert.
//
// 검증 5축:
//   1. callers      — 호출처 0 = miss
//   2. placeholder  — incomplete-marker/null-return 패턴
//   3. wired        — UI mount / hook 호출 여부
//   4. default      — 토글 default 값이 비활성이면 사실상 미적용
//   5. path         — claim 파일 경로 ↔ 실제 파일 일치
// ============================================================

export type GapAxis = 'callers' | 'placeholder' | 'wired' | 'default' | 'path';
export type GapSeverity = 'pass' | 'warn' | 'fail';

/** AI 응답에서 추출된 완료 주장 1건 */
export interface CompletionClaim {
  /** 추출 turn 인덱스 (가장 최근 = 0) */
  turnIdx: number;
  timestamp: number;
  /** 주장 표면형 (예: "Phase B 완료") */
  surface: string;
  /** 추출된 파일 경로 (있으면) */
  filePath?: string;
  /** 추출된 함수/컴포넌트명 (있으면) */
  symbolName?: string;
  /** "완료" / "통과" / "구현됨" 종류 */
  kind: 'completed' | 'passed' | 'implemented' | 'wired' | 'tested';
}

/** 1축 검증 결과 */
export interface AxisVerdict {
  axis: GapAxis;
  severity: GapSeverity;
  /** 4언어 메시지 */
  message: { ko: string; en: string };
  /** 보조 데이터 */
  meta?: Record<string, string | number | boolean>;
}

/** 1 claim 의 5축 종합 결과 */
export interface ClaimVerification {
  claim: CompletionClaim;
  verdicts: AxisVerdict[];
  /** 종합 등급: 0~100 (5축 평균) */
  gapScore: number;
  /** 종합 severity (worst) */
  overallSeverity: GapSeverity;
}

/** 패널 표시용 종합 보고서 */
export interface CompletionGapReport {
  generatedAt: string;
  totalClaims: number;
  passedClaims: number;
  failedClaims: number;
  warnedClaims: number;
  verifications: ClaimVerification[];
  /** 본 보고서 산출 ms */
  durationMs: number;
}
