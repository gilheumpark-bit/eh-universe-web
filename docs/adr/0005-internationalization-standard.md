# 0005. Internationalization Standard — ICU MessageFormat + CLDR

- Status: Proposed
- Date: 2026-06-08
- Deciders: 프로젝트 오너
- Supersedes: 없음 (신규)
- Related: `src/lib/i18n.ts`, `src/lib/ai/lang-normalize.ts`, ACTION_CATALOG i18n 필드

## Context

루프 2 P18 진단 — 현재 i18n 상태:
- `L4(lang, { ko, en, ja, zh })` 단순 polymorphic fallback (i18n.ts:L4)
- ACTION_CATALOG 일부 액션은 ko 만, 일부는 ja/zh 까지 — 일관성 부재
- claude3 _i18n 표준 (ICU MessageFormat · CLDR plural · RTL · 시간대) 대비 ~60-70%

부족한 부분:
- 복수형 — "{count} item / {count} items" 변환 안 됨 (KO 는 단복수 차이 없으나 EN/JA/ZH 필요)
- 날짜·숫자 형식 — `Intl.DateTimeFormat` / `Intl.NumberFormat` 부분 사용만
- RTL — 미고려 (ar/he/fa 추가 시 layout 깨짐)
- 시간대 — UTC 저장 + 사용자 시간대 변환 일부 누락

## Decision

### 1) Phase 1 (현재 commit + 다음 PR) — ACTION_CATALOG i18n 일관성

- 신규 `auditActionI18n()` 함수 (P10 에서 추가됨) → CI test 추가
- 각 액션 4 언어 (ko/en/ja/zh) 모두 채워야 PR merge
- 또는 명시적 skip metadata `i18n: { ko: '...', skipLangs: ['ja', 'zh'] }` 허용

### 2) Phase 2 (beta 진입 직전) — ICU MessageFormat 도입

**스택**: `@formatjs/intl-messageformat` (Format.JS / 표준)

**적용 대상**:
- 사용자 가시 문자열 중 plural/select 가 필요한 메시지
- 예: `"{n, plural, one {1 chapter} other {# chapters}}"`

**점진 도입**:
- 새 메시지부터 ICU 사용 의무
- 기존 L4 fallback 패턴은 유지 (단순 string 매핑)

### 3) Phase 3 (commercial 직전) — CLDR + Intl 일관 적용

- `Intl.PluralRules` — 모든 count 표시
- `Intl.DateTimeFormat` — 모든 날짜·시간 표시 (작가 시간대 자동)
- `Intl.NumberFormat` — 글자수·평점·금액
- `Intl.RelativeTimeFormat` — "3분 전", "어제" 등

### 4) Phase 4 (해외 진출 시) — RTL 지원

**대상 언어**: ar (아랍어), he (히브리어), fa (페르시아어)

**작업**:
- `dir="rtl"` HTML 속성 동적 설정
- CSS 논리적 속성 (`margin-inline-start` 등) 전면 사용
- 글로벌 컴포넌트 (Header, Footer) RTL 테스트
- 아이콘 방향 반전 (back arrow 등)

**현 시점**: defer — KO/EN/JA/ZH 4 언어로 충분.

### 5) 번역 키 관리

- ACTION_CATALOG / SettingsView 등 인라인 i18n 객체 유지 (단순한 경우)
- 큰 컴포넌트 (예: 페이지 50+ string) → 별도 i18n 파일 분리 권장
- 외부 번역 SaaS (Crowdin / Lokalise) — Phase 4 까지 미도입

## Consequences

### Positive
- claude3 _i18n 표준 정합화 경로 명확
- plural / 시간대 / RTL 단계적 도입
- 글로벌 작가 (ja/zh 시장) 진입 가능

### Negative
- @formatjs 추가 (~50KB gzip, 분할 chunk)
- 기존 L4 패턴과 ICU 공존 시 멘탈 모델 2개

### Mitigation
- 단순 string → L4 유지, 복잡 (plural/select) → ICU
- ESLint rule 로 신규 메시지에 ICU 사용 권장 (강제 X)

## Implementation Hooks (현재 commit 범위)

- 본 ADR 작성 (P18)
- `auditActionI18n()` 함수 (action-registry.ts) 추가 — P10 commit
- Phase 2-4 본격 작업은 별도 백로그
