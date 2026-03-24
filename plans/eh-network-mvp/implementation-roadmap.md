# EH Network MVP Implementation Roadmap

## 1. 구현 원칙

- 1차는 `행성 생성 + 첫 로그 생성`을 닫는 데 집중한다.
- 기존 스튜디오 로컬 저장 구조와 섞지 않는다.
- 서버 저장은 Firestore로 분리한다.
- 문서 템플릿은 에디터 플러그인보다 `기본 폼 + 템플릿 삽입`으로 시작한다.

## 2. 권장 구현 단계

### Phase 0. 설계 고정

- enum과 라벨 사전 확정
- 컬렉션 구조 확정
- 승인/정산 권한 규칙 확정

### Phase 1. 도메인 기반층

생성 파일:

- `src/lib/network-types.ts`
- `src/lib/network-labels.ts`
- `src/lib/network-firestore.ts`
- `src/lib/network-queries.ts`
- `src/lib/network-permissions.ts`

핵심 작업:

- 타입 정의
- Firestore create/read/update 래퍼
- boardType/reportType 매핑
- ownership 검사 함수

### Phase 2. 화면 스캐폴드

생성 파일:

- `src/app/network/page.tsx`
- `src/app/network/new/page.tsx`
- `src/app/network/planets/[planetId]/page.tsx`
- `src/app/network/logs/new/page.tsx`

핵심 작업:

- 홈
- 위저드
- 상세 페이지
- 로그 작성 진입점

### Phase 3. 컴포넌트 세트

생성 파일:

- `src/components/network/PlanetWizard.tsx`
- `src/components/network/PlanetBasicStep.tsx`
- `src/components/network/PlanetStateStep.tsx`
- `src/components/network/PlanetProfileStep.tsx`
- `src/components/network/FirstLogStep.tsx`
- `src/components/network/PlanetHeaderCard.tsx`
- `src/components/network/PlanetTabs.tsx`
- `src/components/network/PostTypeSelector.tsx`
- `src/components/network/SettlementBadge.tsx`

### Phase 4. 운영 기능 최소화

- 승인 대기 목록
- 정산보고 작성
- 상태 태그 부여

### Phase 5. 검증

- Planet wizard submit test
- Firestore write batch test
- planet detail load test
- public read / owner write / admin settlement 권한 테스트

## 3. 파일 단위 작업 우선순위

### 먼저 만들 것

1. `src/lib/network-types.ts`
2. `src/lib/network-firestore.ts`
3. `src/app/network/new/page.tsx`
4. `src/components/network/PlanetWizard.tsx`
5. `src/app/network/planets/[planetId]/page.tsx`

### 그 다음 만들 것

6. `src/lib/network-queries.ts`
7. `src/app/network/page.tsx`
8. `src/components/network/PostTypeSelector.tsx`
9. `src/components/network/SettlementBadge.tsx`

### 운영용은 마지막

10. `src/app/network/admin/settlements/page.tsx`
11. 운영자 전용 승인 패널

## 4. 타입별 MVP 지원 범위

### 1차 지원

- `observation`
- `incident`
- `manual`
- `technical`
- `settlement`

### 2차 지원

- `testimony`
- `recovered`
- `guide`

`guide`를 2차로 둔 이유:

- 실제 사용량은 행성 소개/관측/정산보다 낮을 가능성이 높다.
- 구조적으로 `manual`과 `technical` 패턴을 재활용할 수 있다.

## 5. 컴포넌트 재사용 규칙

- 헤더는 기존 `Header`를 그대로 쓴다.
- 카드 톤은 `premium-panel` 계열을 유지한다.
- 아카이브 카드 구성은 스타일만 참고하고 데이터 계층은 분리한다.
- 인증 체크는 `useAuth()`만 공통 진입점으로 쓴다.

## 6. 개발 중 결정해야 할 항목

- `planets`와 `posts`의 slug를 둘지 여부
- `visibility`를 MVP에서 2단계로 줄일지 여부
- 운영자 role 소스를 Firestore 문서로 둘지 여부
- 문서 번호 자동 생성 규칙의 접두어 체계

## 7. 테스트 체크리스트

### 단위 테스트

- boardType/reportType 매핑
- write payload validation
- owner/admin permission helper
- document number formatter

### 통합 테스트

- 위저드 4단계 이동
- planet + first post 동시 생성 성공
- 부분 실패 시 롤백
- planet detail fetch

### E2E

- 비회원 열람
- 로그인 후 위저드 완료
- 행성 상세 진입
- 로그 작성
- 운영자 정산 부여

## 8. 출시 판정 기준

### 출시 가능

- 비회원 열람 가능
- 회원 생성 가능
- 행성 상세 정상 표시
- 정산 태그 표시 가능
- 권한 누수 없음

### 출시 보류

- planet 생성 후 first log 누락
- 소유권 없이 수정 가능
- 운영자 전용 액션이 회원에게 노출
- 공개 범위가 무시됨

## 9. 추천 다음 작업

설계 다음 실제 구현 착수 순서는 아래가 가장 좋다.

1. `network-types`
2. `network-firestore`
3. `PlanetWizard`
4. `planet detail`
5. `network home`

