# 0004. Grade 네임스페이스 격리 — Code Studio vs 창작

- Status: Accepted
- Date: 2026-06-07
- Deciders: 프로젝트 오너
- Related: [0003 4-way 키 표준](0003-keymap-and-codex-domain-selector-mount.md)

## Context

채팅 버전 Batch 1 rank 1 "SingleGradeModel — 4점수 단일화"를 시공하기 전 **grade enum·디렉토리·import 경로 충돌 위험** 사전 격리 필요.

### 현재 grade 관련 자산 (실측)

| 모듈 | 경로 | grade 타입 | 점수 |
|---|---|---|---|
| **Audit Engine** | `src/lib/code-studio/audit/audit-types.ts:11` | `AuditGrade = 'S'\|'A'\|'B'\|'C'\|'D'\|'F'` | `AuditReport.totalScore: number` (0~100) |
| **Stress Test** | `src/lib/code-studio/pipeline/stress-test.ts:43` | `'A'\|'B'\|'C'\|'D'\|'F'` (S 없음) | `StressReport.overallScore: number` |
| **Chaos Engineering** | `src/lib/code-studio/pipeline/chaos-engineering.ts:54` | `'A'\|'B'\|'C'\|'D'\|'F'` (S 없음) | `ChaosReport.overallScore: number` |
| **Verification Loop** | `src/lib/code-studio/pipeline/verification-loop.ts:456` | (combinedScore 이미 존재) | `VerificationResult.pipelineScore/stressScore/chaosScore` |
| **IP Readiness** | `src/lib/creative/ip-readiness.ts` | `'A'\|'B'\|'C'\|'D'` (S/F 없음) | (Code Studio도 import) |
| **창작 통합등급** | `src/lib/creative/integrated-grade.ts:12` | `Grade = '평작'\|'성공'\|'성공상위'\|'대성공'` (한국어 4-tier) | `IntegratedGradeResult.weighted: number` |

### 충돌 위험

1. **타입 이름 충돌**: 두 영역 모두 `Grade`를 export하려고 시도. import 시 어느 쪽인지 모호.
2. **enum 불일치**: Audit S까지 / Stress·Chaos는 A부터 / IP는 D까지 / 창작은 한국어 — 통합 점수 산출 시 매퍼 없으면 NaN 가능.
3. **이름 오염**: rank 1 시공 시 `integrated-score.ts` 같은 이름 도입 → 창작 `integrated-grade.ts`와 알파벳·의미 모두 헷갈림.
4. **import 사고**: `import { Grade } from '@/lib/...'` 단축 시 잘못된 모듈 자동완성 가능.

## Decision

### 1) 디렉토리 분리 (강제)

```
src/lib/code-studio/grade/         # ← 신규 (rank 1 산출물)
├── code-grade-types.ts            # CodeGrade · CodeGradeReport · CodeGradeBreakdown
├── code-grade-score.ts            # computeCodeGrade(4 inputs) → CodeGradeReport
├── code-grade-context.tsx         # CodeGradeProvider + useCodeGrade()
└── __tests__/

src/lib/creative/                  # ← 기존 유지 (창작 6축, 변경 0)
├── integrated-grade.ts            # 한국어 Grade 그대로 유지
└── ...
```

**금지**: Code Studio 점수 모듈을 `src/lib/creative/` 안에 넣지 않는다. 창작 모듈을 `src/lib/code-studio/` 안에 넣지 않는다.

### 2) 타입 이름 격리 (충돌 0)

| 영역 | 타입 이름 | 값 |
|---|---|---|
| **Code Studio** | `CodeGrade` | `'S' \| 'A' \| 'B' \| 'C' \| 'D' \| 'F'` |
| **Code Studio** | `CodeGradeLetter` | (CodeGrade 별칭) |
| **창작** | `Grade` (existing) | `'평작' \| '성공' \| '성공상위' \| '대성공'` |

**규칙**:
- `CodeGrade`는 영문 6단 + S 포함 통일. Stress/Chaos가 A부터인 현재 문제는 mapper로 흡수 (`'A'|'B'|'C'|'D'|'F'` → `CodeGrade`).
- 창작 `Grade`는 한국어 그대로 유지 — 변경 0.
- `Grade` 이름은 창작 전용. Code Studio는 항상 `CodeGrade` 명시.

### 3) 점수 단위 통일

| 종류 | 단위 | 출처 |
|---|---|---|
| `auditScore` | 0~100 정수 | `AuditReport.totalScore` |
| `stressScore` | 0~100 정수 | `StressReport.overallScore` |
| `chaosScore` | 0~100 정수 | `ChaosReport.overallScore` |
| `verificationScore` | 0~100 정수 | `VerificationResult.combinedScore` (이미 존재) |
| `codeIntegratedScore` (신규) | 0~100 소수 1자리 | `computeCodeGrade()` 가중 합산 |
| `weighted` (창작) | 0~100 소수 1자리 | `computeIntegratedGrade()` |

**가중치 (rank 1 초안 — 추후 ADR-0005 등에서 튜닝 가능)**:
```ts
export const CODE_GRADE_WEIGHTS = {
  audit:        0.35,  // 코드 품질·룰
  verification: 0.25,  // 파이프라인·게이트 통과
  stress:       0.20,  // 부하·경계값
  chaos:        0.20,  // 장애 복원
} as const;
// 합 = 1.00
```

### 4) Mapper 함수 명세 (신규 필수)

```ts
// code-grade-score.ts
export function letterToScore(g: 'A'|'B'|'C'|'D'|'F'): number {
  // 호환 mapper — Stress/Chaos legacy enum → 점수 잔여 보정
  // 일반적으로는 overallScore를 직접 쓰므로 거의 사용 안 함
}

export function scoreToCodeGrade(score: number): CodeGrade {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function computeCodeGrade(input: {
  auditScore?: number;
  stressScore?: number;
  chaosScore?: number;
  verificationScore?: number;
}): CodeGradeReport;
```

**산출 결과 shape**:
```ts
export interface CodeGradeReport {
  weighted: number;          // 가중 합산 (0~100, 소수 1자리)
  grade: CodeGrade;          // 최종 S~F
  breakdown: {
    audit:        { score: number; weight: number; contribution: number };
    verification: { score: number; weight: number; contribution: number };
    stress:       { score: number; weight: number; contribution: number };
    chaos:        { score: number; weight: number; contribution: number };
  };
  missing: string[];         // 입력 누락 항목 (UI에서 "측정 안 됨" 표시)
}
```

### 5) Context · Hook 시그니처

```ts
// code-grade-context.tsx
export function CodeGradeProvider({ children }: PropsWithChildren): JSX.Element;
export function useCodeGrade(): {
  scores: {
    audit?: number;
    verification?: number;
    stress?: number;
    chaos?: number;
  };
  report: CodeGradeReport | null;
  set(partial: Partial<typeof scores>): void;
  reset(): void;
};
```

**Provider 마운트 위치**: `CodeStudioShell.tsx` 최상위 — 4개 점수 source(audit-engine·stress-test·chaos·verification)가 모두 Shell 안에서 호출되므로 단일 Provider로 충분.

### 6) 마이그레이션 매퍼 (rank 1 시공 회귀 방지)

기존 코드의 점수 호출 지점을 한 번에 바꾸지 않고 shim 도입:

```ts
// code-grade-score.ts
/** 기존 `pass|warn|fail` → CodeGrade 매퍼 (VerificationResult.combinedStatus 호환) */
export function statusToCodeGrade(status: 'pass'|'warn'|'fail'): CodeGrade {
  if (status === 'pass') return 'A';
  if (status === 'warn') return 'C';
  return 'F';
}
```

기존 호출자(`StatusBar.tsx`, `ProgressDashboard.tsx`)는 1단계: shim 사용 + 동작 보존, 2단계: `useCodeGrade()` 직접 호출로 전환. 같은 PR에 묶지 않음.

## Rationale

- **디렉토리 분리**: import 자동완성 충돌 0. 두 도메인(코드 품질 vs 창작 완성도)이 의미적으로 다름 — 같은 폴더 안 혼재 시 신규 기여자가 헷갈림.
- **`CodeGrade` 명시 prefix**: 짧게 `Grade`만 쓰면 어느 쪽인지 모호. 한 글자 추가로 영구 해소.
- **`computeCodeGrade` vs `computeIntegratedGrade`**: 함수명도 분리. 둘 다 영어/한국어 한쪽으로 통일 가능하지만 그러면 다른 한쪽의 의미가 약해짐 — 차라리 명시적 분리.
- **`missing` 필드**: 4점수 중 일부 미측정 케이스(예: stress 비활성) — UI에서 "측정 안 됨"으로 명확히 표시. NaN/0 fallback 안 함.
- **shim**: 기존 호출자 70+개 한 번에 못 바꿈. 점진 마이그레이션 보장.

## Consequences

**긍정**:
- rank 1 시공 시 타입·이름 충돌 0
- 향후 새 점수 차원(예: a11y, perf) 추가 시 `CodeGradeReport.breakdown`에 키만 추가
- 창작 `integrated-grade.ts` 변경 0 — 기존 테스트 회귀 0

**부정/트레이드오프**:
- `Grade` vs `CodeGrade` 두 이름 — 신규 기여자가 둘 다 외워야 함 (mitigation: ADR 링크를 type 정의 주석에 명시)
- shim 한시적 유지 — 6주 deprecation 알림 후 제거 권장
- weighted score 산식이 두 곳 — 향후 통합 점수(코드+창작 합산) 요구 시 별도 wrapper 필요 (현재는 의도적 분리)

## Alternatives

1. **단일 `Grade` 타입에 한국어·영어 모두 union** — 기각: 12 멤버 union → 가독성 폭망, 타입 가드 비용 증가.
2. **`integrated-grade.ts`를 그대로 확장해서 4점수 합산 추가** — 기각: 창작 6축과 코드 4점수가 의미적으로 다름. 한 함수에서 처리 시 가중치 충돌·라벨 충돌.
3. **`@/lib/grading/` 같은 공용 디렉토리로 통합** — 기각: 두 도메인 진짜 공유 자산 없음. 디렉토리 통합 = 인지적 결합만 늘림.
4. **shim 없이 한 번에 마이그레이션** — 기각: 70+ 호출자 회귀 위험. 단계적 전환이 안전.

## Implementation Checklist (rank 1 시공 시)

- [ ] `src/lib/code-studio/grade/code-grade-types.ts` 신규
- [ ] `src/lib/code-studio/grade/code-grade-score.ts` 신규 (`computeCodeGrade`, `scoreToCodeGrade`, `statusToCodeGrade`, `letterToScore`)
- [ ] `src/lib/code-studio/grade/code-grade-context.tsx` 신규 (`CodeGradeProvider`, `useCodeGrade`)
- [ ] `src/lib/code-studio/grade/__tests__/code-grade-score.test.ts` (경계값·NaN·missing 분기)
- [ ] `CodeStudioShell.tsx`에 `CodeGradeProvider` 마운트
- [ ] `StatusBar.tsx` props에서 `verificationScore` 제거 → `useCodeGrade()` 사용
- [ ] `ProgressDashboard.tsx` props 슬림화
- [ ] 회귀 jest: 기존 audit/stress/chaos report enum 변경 없음 확인
- [ ] tsc 0 errors

## Forbidden After This ADR

- `src/lib/creative/`에 `CodeGrade` 정의 또는 import 추가 금지
- `src/lib/code-studio/grade/`에 한국어 `Grade` 정의 또는 import 추가 금지
- `Grade` 이름으로 import 했는데 자동완성이 `code-studio/grade/` 모듈을 가리키면 → 잘못된 자동완성, 무조건 `CodeGrade`로 명시
