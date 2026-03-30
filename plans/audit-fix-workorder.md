# 감사 점수 개선 작업 지시서

> 생성일: 2026-03-30 | 기준 커밋: `cec6505` (master)
> 현재 감사 점수: **30/100 (F)** — 하드 게이트 실패
> 목표: **80+/100 (B+ 이상)** — 하드 게이트 통과

---

## 감사 실행 방법

```bash
# 1. 임시 테스트 파일 생성
cat > src/__tests__/audit-runner.test.ts << 'EOF'
import * as fs from 'fs';
import * as path from 'path';
import { runProjectAudit, formatAuditReport } from '../lib/code-studio/audit/audit-engine';
import type { AuditFile } from '../lib/code-studio/audit/audit-types';

const SRC = path.join(__dirname, '..', '..', 'src');
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const SKIP = ['node_modules', '.next'];

function collectFiles(dir: string): AuditFile[] {
  const results: AuditFile[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.some(s => entry.name.includes(s))) results.push(...collectFiles(full));
    } else if (EXTS.has(path.extname(entry.name))) {
      try {
        const content = fs.readFileSync(full, 'utf-8');
        const ext = path.extname(entry.name).slice(1);
        const lang = ext === 'tsx' ? 'tsx' : ext === 'ts' ? 'typescript' : ext;
        results.push({ path: path.relative(path.join(__dirname, '..', '..'), full).split(path.sep).join('/'), content, language: lang });
      } catch {}
    }
  }
  return results;
}

test('Full Project Audit', () => {
  const files = collectFiles(SRC);
  const report = runProjectAudit({ files, language: 'ko', projectName: 'eh-universe-web' });
  console.log(formatAuditReport(report, 'ko'));
  expect(report.totalScore).toBeGreaterThan(0);
});
EOF

# 2. 실행
npx jest src/__tests__/audit-runner.test.ts --no-coverage --verbose

# 3. 완료 후 임시 파일 삭제
rm src/__tests__/audit-runner.test.ts
```

**주의**: audit runner에서 `__tests__`를 SKIP에서 **제거**해야 테스트 파일이 수집됨. 위 스크립트는 이미 수정 반영.

---

## 현황 분석

### 하드 게이트 실패 원인 (최우선)
감사 엔진의 보안 검사가 `eval/new Function` regex를 소스 전체에 돌리는데,
**실제 eval 사용은 0건**이고 전부 감사/린트 규칙의 **문자열 리터럴** 안에 있음:
- `audit-infra.ts:31` — regex 패턴 `/\beval\s*\(/`
- `audit-infra.ts:36` — 에러 메시지 텍스트 `eval/exec/new Function`
- `lint-ai-loop.ts:51` — 린트 규칙 패턴 `/\beval\s*\(/`
- `business-evaluator.ts:165` — 위험 목록 문자열 `eval() usage detected`
- `pipeline-teams.ts:256` — 린트 규칙 패턴 `/\beval\s*\(/`

→ 감사 엔진이 **자기 자신**을 잡는 오탐.

---

## 작업 목록 (우선순위순)

### P0 — 하드 게이트 해제 (감사 엔진 오탐 수정)

#### P0-1. eval 검출 로직 개선
- **파일**: `src/lib/code-studio/audit/audit-infra.ts:26-38`
- **현재**: `f.content.match(/\beval\s*\(|\bnew\s+Function\s*\(|\bexec\s*\(/g)` — 문자열/주석/regex 안의 매칭도 카운트
- **수정 방향**: audit/lint 관련 파일 제외 필터 추가
  ```typescript
  // 31행 근처의 for 루프에 조건 추가:
  if (f.path.includes('audit') || f.path.includes('lint') || f.path.includes('pipeline-teams')) continue;
  ```
  또는 더 정확하게: 주석/문자열 리터럴 내부 매칭을 제외하는 방식
- **예상 효과**: CRITICAL 0건 → 하드 게이트 해제 → 보안 30→83점

#### P0-2. 테스트 감지 오탐 수정
- **파일**: `src/lib/code-studio/audit/audit-quality.ts:26`
- **현재**: `ctx.files.filter(f => /\.(test|spec)\.(ts|tsx|js)$/.test(f.path))` — 이건 정상
- **진짜 문제**: 감사 실행 시 `ctx.files`에 테스트 파일이 포함되어야 함
- **수정**: audit-runner(호출측)에서 `__tests__` 폴더를 SKIP하지 않도록 변경 (위 실행 스크립트에 이미 반영)
- **추가**: AuditPanel 컴포넌트에서 감사 실행 시에도 테스트 파일을 수집하는지 확인
  - `src/components/code-studio/AuditPanel.tsx` 확인 필요
- **예상 효과**: testing 0→60점+

---

### P1 — 고영향 개선 (점수 20점+ 상승 예상)

#### P1-1. globals.css 1,511줄 분할
- **파일**: `src/app/globals.css`
- **목표**: 500줄 이하 × 3~4파일로 분할
- **전략**:
  - `globals.css` — CSS 변수, resets, base typography만 유지 (~300줄)
  - `globals-components.css` — 컴포넌트 공용 스타일
  - `globals-animations.css` — keyframes, transitions
  - `globals-utilities.css` — 유틸리티 클래스
  - `layout.tsx`에서 전부 import
- **감사 영향**: operations 0→60점+

#### P1-2. API route 복잡도 축소 (3파일)
- **대상**:
  - `src/app/api/chat/route.ts` (333줄, 순환복잡도 54)
  - `src/app/api/gemini-structured/route.ts` (563줄, 순환복잡도 55)
  - `src/app/api/structured-generate/route.ts` (294줄, 순환복잡도 43)
- **전략**: 각 route에서 핵심 로직을 `src/lib/api/` 헬퍼로 추출
  - 요청 파싱/검증 → `parseRequest()`
  - 프롬프트 조립 → `buildPrompt()`
  - AI 호출 → `callProvider()`
  - 응답 포맷팅 → `formatResponse()`
  - route.ts는 얇은 오케스트레이터만 유지
- **감사 영향**: complexity 81→90점+

#### P1-3. 아키텍처 점수 개선
- **현재**: 40/100 (D)
- **감사 엔진 확인 사항** (`audit-code-health.ts`의 `auditArchitecture`):
  - 순환 import 검출
  - 레이어 위반 (components → lib 직접 import)
  - barrel index 유무
- **이미 수행한 것**: useAIProvider 훅으로 18파일 레이어 위반 수정
- **추가 필요**: 감사 엔진이 어떤 기준으로 아키텍처를 판단하는지 `audit-code-health.ts`의 `auditArchitecture` 함수를 읽고 부족한 부분 보충

---

### P2 — 중간 영향 개선

#### P2-1. 성능 감사 0점 수정
- **현재**: 0/100 (F)
- **감사 기준** (`audit-infra.ts`의 `auditPerformance`):
  - addEventListener without removeEventListener → 메모리 누수
  - setInterval without clearInterval
  - 대규모 번들 import (lodash 전체 import 등)
  - 이미지 최적화 (next/image 사용 여부)
  - dynamic import 사용 여부
- **수정**: 각 파일에서 cleanup 함수 누락 수정, `useEffect` cleanup 추가

#### P2-2. 기능 완성도 0점 수정
- **감사 기준** (`audit-quality.ts`의 `auditFeatureCompleteness`):
  - TODO/FIXME/HACK 주석 카운트
  - 빈 함수 body
  - throw new Error('not implemented')
  - console.log 잔존
- **수정**: TODO 주석 정리, 빈 함수 구현 또는 제거

#### P2-3. 디자인 시스템 40점 개선
- **감사 기준** (`audit-ux.ts`의 `auditDesignSystem`):
  - CSS 변수 사용률
  - 하드코딩 컬러값 (hex/rgb 직접 사용)
  - 일관된 spacing 토큰
- **수정**: 하드코딩 컬러를 CSS 변수 참조로 교체

#### P2-4. 환경 설정 40점 개선
- **감사 기준** (`audit-infra.ts`의 `auditEnvConfig`):
  - .env.example 존재
  - 환경변수 validation
  - 타입 안전한 env 접근
- **수정**: `.env.example` 생성, env 접근 유틸리티 정비

---

### P3 — 낮은 영향 / 선택

#### P3-1. 문서 60→80점
- JSDoc 커버리지 확대 (export 함수 기준)

#### P3-2. StudioShell 순환 복잡도 139
- 추가 분리 또는 커스텀 훅 추출로 복잡도 낮추기
- useState 33개 → useReducer 또는 context 그룹화

---

## 예상 점수 변화

| 영역 | Before | P0 후 | P1 후 | P2 후 |
|------|--------|-------|-------|-------|
| 운영성 | 0 | 0 | 60+ | 60+ |
| 복잡도 | 81 | 81 | 90+ | 90+ |
| 아키텍처 | 40 | 40 | 60+ | 60+ |
| 의존성 | 50 | 50 | 50 | 60+ |
| 테스트 | 0 | 60+ | 60+ | 70+ |
| 에러 핸들링 | 98 | 98 | 98 | 98 |
| 기능 완성도 | 0 | 0 | 0 | 60+ |
| 문서 | 60 | 60 | 60 | 70+ |
| 디자인 시스템 | 40 | 40 | 40 | 60+ |
| 접근성 | 83 | 83 | 83 | 85+ |
| UX 품질 | 80 | 80 | 80 | 80 |
| 국제화 | 80 | 80 | 80 | 80 |
| **보안** | **30** | **83+** | **83+** | **85+** |
| 성능 | 0 | 0 | 0 | 60+ |
| API 건강 | 80 | 80 | 80 | 80 |
| 환경 설정 | 40 | 40 | 40 | 60+ |
| **종합** | **30(F)** | **55(C)** | **65(C+)** | **80+(B+)** |

---

## 작업 순서 권장

```
Phase 1 (즉시 — 하드 게이트 해제):
  P0-1: audit-infra.ts eval 검출 로직 수정 (5분)
  P0-2: 감사 실행 시 테스트 파일 수집 확인 (5분)
  → 감사 재실행으로 30→55점 확인

Phase 2 (병렬 가능):
  Agent A: P1-1 globals.css 분할
  Agent B: P1-2 API route 3파일 복잡도 축소
  Agent C: P1-3 아키텍처 감사 기준 확인 + 보충

Phase 3 (병렬 가능):
  Agent D: P2-1 성능 (메모리 누수 cleanup)
  Agent E: P2-2 기능 완성도 (TODO 정리)
  Agent F: P2-3 디자인 시스템 (하드코딩 컬러 제거)
  Agent G: P2-4 환경 설정 (.env.example 등)

Phase 4:
  감사 재실행 → 80+ 확인 → 커밋
```

---

## 주의사항

1. **감사 엔진 파일 위치**: `src/lib/code-studio/audit/` (6파일)
2. **감사 엔진은 정적 분석만 수행** — 파일 내용을 regex로 매칭, AST 아님
3. **하드 게이트**: 보안 CRITICAL > 0이면 무조건 최대 30점 캡
4. **가중치**: code-health 30%, quality 25%, user-experience 25%, infra-security 20%
5. **logger 정책**: `console.log` 직접 사용 금지 → `@/lib/logger` 사용
6. **감사 실행 시 `__tests__` 포함 필수** — SKIP 리스트에서 제외할 것
