# EH Universe Web — 고도화/고급화 코덱스 작업지시서

> 생성일: 2026-03-30 | 기준 커밋: `3760561` (master)
> 프로덕션: ehsu.app / ehuniverse.com
> 현재 감사 점수: 95/100 (S) — 실질 코드 품질 기준 ~70/100 (B)
> 목표: 실질 코드 품질 95/100 (S) 달성

---

## 프로젝트 현황

| 항목 | 수치 |
|------|------|
| 총 소스 파일 | 841개 |
| 테스트 파일 | 215개 (212 suites, 1,400+ tests) |
| 500줄+ 거대 파일 | **62개** |
| shim 파일 (export * 재수출) | **119개** |
| 하드코딩 한국어 TSX | **161파일** |
| any/@ts-ignore | 17건 |
| unused exports (추정) | ~771건 |

---

## 프로젝트 규칙 (반드시 준수)

### 파일 수정 시
- `console.log` / `console.warn` / `console.error` 직접 사용 금지 → `import { logger } from '@/lib/logger'` 사용
- 새 컴포넌트/lib 생성 시 반드시 소비자와 연결 (미연결 금지)
- 코드 스튜디오 패널 = 레지스트리 경유 (`src/lib/code-studio/core/panel-registry.ts`)
- ErrorBoundary = `src/components/ErrorBoundary.tsx` (variant prop: `full-page` | `section` | `panel`)
- CSP = `src/middleware.ts`가 모든 보안 헤더 통합 관리
- i18n = L4() 헬퍼 사용, `lang === "ko" ?` 바이너리 패턴 금지

### 빌드/검증
```bash
npm run build          # next build — 반드시 통과해야 함
npx jest --passWithNoTests  # 테스트 — 기존 테스트 regression 0건
```

### 감사 실행 방법
```bash
# 임시 테스트로 실행
cat > src/__tests__/_audit.test.ts << 'EOF'
import * as fs from 'fs';
import * as path from 'path';
import { runProjectAudit, formatAuditReport } from '../lib/code-studio/audit/audit-engine';
import type { AuditFile } from '../lib/code-studio/audit/audit-types';
const SRC = path.join(__dirname, '..', '..', 'src');
const SKIP = ['node_modules', '.next'];
function collect(dir: string): AuditFile[] {
  const r: AuditFile[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.some(s => e.name.includes(s))) r.push(...collect(f)); }
    else if (/\.(ts|tsx|js|jsx|css|json)$/.test(e.name)) {
      try { const c = fs.readFileSync(f, 'utf-8'); const x = path.extname(e.name).slice(1);
        r.push({ path: path.relative(path.join(__dirname,'..','..'), f).split(path.sep).join('/'), content: c, language: x==='tsx'?'tsx':x==='ts'?'typescript':x });
      } catch {}
    }
  }
  return r;
}
test('Audit', () => {
  const files = collect(SRC);
  const r = runProjectAudit({ files, language: 'ko', projectName: 'eh-universe-web' });
  console.log(formatAuditReport(r, 'ko'));
  for (const a of r.areas) console.log(`${a.score>=95?'✅':a.score>=80?'🔶':'❌'} ${a.area}: ${a.score} (${a.passed}/${a.checks})`);
});
EOF
npx jest src/__tests__/_audit.test.ts --no-coverage --verbose
rm src/__tests__/_audit.test.ts
```

---

## Phase 1 — Shim 대청소 (119파일 제거)

### 배경
`src/lib/code-studio-*.ts` 119개 파일이 전부 한 줄짜리 `export * from './code-studio/...'` 재수출.
이전 디렉토리 구조 마이그레이션의 하위호환 shim인데, 이제 직접 경로로 전환 가능.

### 작업
1. 전체 codebase에서 `@/lib/code-studio-xxx` import를 `@/lib/code-studio/xxx`로 일괄 치환
   ```bash
   # 매핑 확인
   for f in src/lib/code-studio-*.ts; do
     name=$(basename "$f" .ts | sed 's/code-studio-//')
     target=$(grep "from" "$f" | sed "s/.*from '//;s/'.*//")
     echo "$name → $target"
   done
   ```
2. 각 shim의 import를 사용하는 파일 찾아서 경로 교체
3. shim 119개 삭제
4. 빌드 확인

### 효과
- 파일 수 841 → 722 (14% 감소)
- `export *` 120 → 1
- 아키텍처 감사 즉시 개선

### 주의
- `src/lib/code-studio/audit/index.ts` 같은 barrel은 유지
- shim이 아닌 실제 코드 파일은 건드리지 않음

---

## Phase 2 — God Component 해체 (62파일 → 0)

### 데이터 파일 (3개, 합계 20,800줄)

| 파일 | 줄 | 전략 |
|------|-----|------|
| `src/lib/articles-reports.ts` | 11,422 | JSON 데이터 파일로 분리 → `src/data/reports/*.json` |
| `src/lib/studio-translations.ts` | 4,934 | 언어별 분리 → `translations-ko.ts`, `translations-en.ts` 등 |
| `src/lib/articles.ts` | 4,446 | 카테고리별 분리 → `articles-core.ts`, `articles-timeline.ts` 등 |

### 페이지 컴포넌트 (7개)

| 파일 | 줄 | 전략 |
|------|-----|------|
| `src/components/code-studio/IDEPanels.tsx` | 1,133 | 패널별 개별 파일로 분리 (패널 레지스트리 연결) |

### lib 파일 (5개)

| 파일 | 줄 | 전략 |
|------|-----|------|
| `src/lib/code-studio/pipeline/pipeline.ts` | 1,076 | Stage별 분리 (lint, test, build, scan, stress) |
| `src/lib/code-studio/pipeline/pipeline-teams.ts` | 942 | Team 역할별 분리 |
| `src/lib/code-studio/editor/editor-features.ts` | 735 | Feature별 분리 (autocomplete, format, fold, hover) |
| `src/lib/code-studio/pipeline/bugfinder.ts` | 818 | 패턴 카테고리별 분리 |
| `src/engine/translation.ts` | 1,374 | 엔진별 분리 |

### 이미 분리된 Shell 파일 (유지)

| 파일 | 줄 | 상태 |
|------|-----|------|
| `src/components/code-studio/CodeStudioShell.tsx` | 964 | 이전 세션에서 분리 완료 — 추가 분리 가능 |
| `src/lib/ai-providers.ts` | 859 | Provider별 분리 가능 |

### 작업 순서
1. 데이터 파일 3개 먼저 (순수 데이터 이동, 로직 변경 없음)
2. 페이지 컴포넌트 7개 (CodeStudioShell 패턴 따라 Shell + Sub 분리)
3. lib 파일 5개

### 각 파일 분리 시 규칙
- 원본 파일은 thin wrapper (re-export)로 유지하여 기존 import 호환
- 100줄+ 파일에 PART 주석 + IDENTITY_SEAL 부착
- `import { logger } from '@/lib/logger'` 사용
- 분리 후 `npm run build` 통과 확인

---

## Phase 3 — 디자인 토큰 시스템 (하드코딩 컬러 546건)

### 현재 상태
- CSS 변수 64개 정의 (`globals.css`의 `:root`)
- TSX 파일에 하드코딩 hex (#6b46c1 등) 546건
- 인라인 스타일 321건
- border-radius 변형 25종

### 작업

#### 3-1. 색상 토큰 확장
```css
/* globals.css — :root에 추가 */
--color-fantasy: #6b46c1;
--color-sf: #2563eb;
--color-romance: #db2777;
--color-thriller: #dc2626;
--color-horror: #7c3aed;
/* ... 가장 많이 쓰이는 hex 20개 */
```

#### 3-2. Tailwind theme 연결
```typescript
// tailwind.config.ts
extend: {
  colors: {
    fantasy: 'var(--color-fantasy)',
    sf: 'var(--color-sf)',
    // ...
  }
}
```

#### 3-3. 하드코딩 hex 치환
가장 빈도 높은 hex부터:
```bash
# 빈도 분석
grep -roh '#[0-9a-fA-F]\{6\}' src/components/ src/app/ --include="*.tsx" | sort | uniq -c | sort -rn | head -20
```
각 hex를 CSS 변수 참조 또는 Tailwind 클래스로 교체.

#### 3-4. 인라인 스타일 정리
- 정적 스타일 (`style={{ color: '#xxx' }}`) → Tailwind 클래스
- 동적 스타일 (계산된 width/height 등) → 유지 (정당한 사용)

### 목표
- hardcodedColors 546 → 100 이하
- inlineStyles 321 → 150 이하

---

## Phase 4 — Dead Code 정리 (unused exports 771건)

### 작업
1. 타입 export 제외 (type/interface는 런타임에 없으므로 "unused" 아님)
2. 실제 dead export 식별:
   ```bash
   # 각 export를 grep으로 사용처 확인
   grep -rn "export function\|export const\|export class" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__
   ```
3. 사용처 0건인 실제 dead code 삭제
4. stub/placeholder 주석 13건 정리 (구현 완료된 건 주석 제거)
5. 빈 함수 16건 구현 또는 제거

### 목표
- unusedExports 771 → 100 이하
- stubCount 13 → 3 이하
- noopCount 16 → 5 이하

---

## Phase 5 — 성능 실질 개선

### 5-1. 중첩 루프 (73건)
```bash
# 파일 목록
grep -rl "forEach\|\.map\|\.filter" src/ --include="*.tsx" --include="*.ts" | head -20
```
- `.forEach` 내 `.find()` / `.filter()` → Map/Set 전환
- O(n²) → O(n) 변환

### 5-2. 직렬 await (15건)
```bash
grep -rn "for.*of\|for\s*(" src/ --include="*.ts" --include="*.tsx" -A5 | grep "await" | head -20
```
- 독립적 await → `Promise.all()` / `Promise.allSettled()`
- 의존적 await → 유지 (정당한 사용)

### 5-3. useState 과다 (3파일)
| 파일 | useState 수 | 전략 |
|------|-------------|------|
| CodeStudioShell.tsx | 25+ | useReducer + CodeStudioContext |

각 파일에서:
1. 관련 state를 그룹화 (예: UI state, data state, AI state)
2. useReducer로 통합
3. Context로 하위 컴포넌트에 제공

---

## Phase 6 — 접근성 강화

### 6-1. 색상 전용 표시 88건
`text-red-*` / `text-green-*` 사용 지점에:
- 아이콘 병행 (✅ / ❌ / ⚠️)
- 또는 `aria-label` 추가
- 또는 텍스트 라벨 병행

### 6-2. prefers-reduced-motion
```css
/* globals-animations.css에 추가 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Phase 7 — i18n 완결 (하드코딩 KO 161파일 → 20 이하)

### 현재 상태
- L4() 전환 완료: ~95건
- 남은 하드코딩 KO: 161파일
- 정당 스킵 (boolean flag, locale, type mapping): ~28건

### 작업
1. 남은 161파일 중 텍스트 표시용 패턴 식별
2. `studio-translations.ts` 사전에 키 추가
3. L4() 또는 createT() 전환
4. 데이터 파일 (articles, reports) 내 한국어는 i18n 대상 아님 → 스킵

### 목표
- 하드코딩 KO 파일 161 → 20 이하 (데이터 파일 제외)

---

## Phase 8 — 문서 커버리지 (JSDoc 41% → 70%)

### 현재: 1,014개 export 함수 중 413개만 JSDoc
### 목표: 700개+ (70%)

### 작업
- `src/lib/` 하위 모든 export function에 JSDoc 추가
- `src/hooks/` 커스텀 훅에 @param, @returns 문서화
- `src/engine/` 엔진 함수에 동작 설명 추가

### 우선순위
1. `src/lib/code-studio/` (가장 많은 미문서 export)
2. `src/hooks/`
3. `src/engine/`

---

## 실행 순서 및 에이전트 배치 권장

```
Sprint 1 (즉시 효과, 1세션):
  Agent A: Phase 1 — shim 119개 제거 (import 경로 치환)
  Agent B: Phase 2 — 데이터 파일 3개 분리 (20,800줄)
  → 빌드 확인 후 커밋

Sprint 2 (핵심 리팩터링, 2~3세션):
  Agent C: Phase 2 — 페이지 컴포넌트 7개 분리
  Agent D: Phase 2 — lib 파일 5개 분리
  Agent E: Phase 5-3 — useState → useReducer 3파일
  → 빌드 확인 후 커밋

Sprint 3 (품질 강화, 1~2세션):
  Agent F: Phase 3 — 디자인 토큰 (색상 20개 + hex 치환)
  Agent G: Phase 4 — Dead code 정리
  Agent H: Phase 7 — i18n 나머지 전환
  → 빌드 확인 후 커밋

Sprint 4 (마무리, 1세션):
  Agent I: Phase 6 — 접근성 (색상 표시 + reduced-motion)
  Agent J: Phase 8 — JSDoc 300개 추가
  Agent K: Phase 5-1,2 — 중첩루프 + 직렬await
  → 감사 재실행 → 95+ 확인 → 커밋
```

---

## 검증 체크리스트

매 Sprint 완료 시:
- [ ] `npm run build` 통과
- [ ] `npx jest --passWithNoTests` — 기존 테스트 regression 0건
- [ ] 감사 재실행 — 점수 하락 없음
- [ ] git diff 확인 — 의도하지 않은 변경 없음

---

## 완료 기준

| 지표 | 현재 | 목표 |
|------|------|------|
| 500줄+ 파일 | 62 | **0** |
| shim 파일 | 119 | **0** |
| 하드코딩 hex | 546 | **< 100** |
| unused exports | 771 | **< 100** |
| 하드코딩 KO | 161 | **< 20** |
| JSDoc 비율 | 41% | **70%+** |
| 인라인 스타일 | 321 | **< 150** |
| 중첩 루프 | 73 | **< 20** |
| 직렬 await | 15 | **< 5** |
| 감사 실질 점수 | ~70 | **95+** |
