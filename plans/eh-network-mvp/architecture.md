# EH Network MVP Architecture

## 1. 서비스 구조

게시판 MVP는 기존 `archive`를 덮어쓰지 않고, 독립된 `network` 세그먼트로 구성한다.

권장 라우트:

- `/network`
- `/network/planets`
- `/network/planets/[planetId]`
- `/network/new`
- `/network/logs/new`
- `/network/admin/settlements`

이 구조를 쓰는 이유는 아래와 같다.

- `archive`는 정적 설정 문서 허브 성격이 강하다.
- 게시판 MVP는 사용자 생성 데이터, 권한, 승인 흐름이 필요하다.
- 향후 `IF`, `협업`, `알림` 확장 시 독립 세그먼트가 관리가 쉽다.

## 2. 정보 구조

### 최상위 게시판 축

- 중앙 공문
- 행성 등록소
- 관측 로그
- 정산 결과
- IF 구역
- 피드백/협업

### 데이터 축

- `boardType`
  - 게시판 카테고리
- `reportType`
  - 문서 형식

권장 매핑:

- `notice` -> 운영공지, 규칙 공지, 교범형 문서
- `registry` -> 행성 소개, 공식해설, 기술보고
- `log` -> 관측보고, 사건기록, 증언기록, 회수문서
- `settlement` -> 정산보고
- `if` -> 평행 루트/외전
- `feedback` -> 피드백 요청, 협업 모집

## 3. 핵심 화면

### A. 네트워크 홈

상단 버튼은 두 개만 강하게 둔다.

- 행성 등록하기
- 최신 로그 보기

핵심 섹션:

- 추천 행성
- 최신 관측 로그
- 최신 정산
- 위험도 상승 행성

### B. 행성 등록 + 첫 로그 위저드

4단계로 고정한다.

1. 기본 정보
2. 현재 상태
3. 대표 설정
4. 첫 관측 로그

마지막 제출은 `planet + first post`를 한 트랜잭션 흐름으로 저장한다.

### C. 행성 상세 페이지

상단:

- 행성명
- 운영자
- 장르
- 문명 단계
- 운영 목표
- 현재 상태
- EH 위험도
- 한 줄 소개

중앙 탭:

- 최근 관측 로그
- IF/외전
- 정산 기록
- 피드백

우측 위젯:

- 대표 로그
- 가장 많이 읽힌 로그
- 최근 정산 결과
- 최근 활동

## 4. 기존 코드베이스 재사용 맵

### 그대로 재사용

- 전역 레이아웃
  - `src/app/layout.tsx`
- 로그인 컨텍스트
  - `src/lib/AuthContext.tsx`
- Firebase 앱 초기화
  - `src/lib/firebase.ts`
- 전역 헤더
  - `src/components/Header.tsx`
- 공용 비주얼 토큰
  - `src/app/globals.css`
- 카드/문서 페이지 감성
  - `src/app/archive/ArchiveClient.tsx`

### 패턴만 재사용

- `archive`의 카테고리 사이드바 패턴
- `studio`의 단계형 온보딩과 로컬 임시 저장 패턴
- 태그/배지 스타일

### 신규 설계 필요

- Firestore 게시판 컬렉션 계층
- 권한/소유권 규칙
- 행성 위저드 상태 머신
- 정산 생성 및 승인 플로우
- 게시글 타입 템플릿 렌더링 구조

## 5. 모듈 경계

권장 모듈:

- `src/lib/network-types.ts`
- `src/lib/network-labels.ts`
- `src/lib/network-firestore.ts`
- `src/lib/network-queries.ts`
- `src/lib/network-permissions.ts`
- `src/components/network/*`
- `src/app/network/*`

모듈 역할:

- `types`: 도메인 타입
- `labels`: KO/EN 라벨과 enum 표시명
- `firestore`: 쓰기/읽기 래퍼
- `queries`: 화면별 조회 함수
- `permissions`: 소유자/운영자 권한 판단

## 6. 상태 흐름

### 비회원

- 읽기 전용
- 좋아요/댓글/생성 버튼은 로그인 유도

### 회원

- 행성 생성 가능
- 자신이 소유한 행성만 수정 가능
- 로그 작성, 댓글 가능

### 운영자

- 승인
- 공식 태그 부여
- 정산보고 생성
- 상태 변경

## 7. 기술 방향

### 저장소

권장: Firestore

이유:

- 로그인 스택이 Firebase 기반이다.
- 문서형 데이터와 태그형 데이터가 많다.
- `행성`, `로그`, `정산`, `댓글` 관계를 빠르게 묶기 좋다.

### 쓰기 전략

행성 생성 완료 시 아래를 한 번에 처리한다.

- `planets/{planetId}` 생성
- `posts/{postId}` 생성
- `planets/{planetId}.stats.logCount` 증가
- `users/{uid}.planetCount` 증가

권장 방식:

- `writeBatch` 또는 `runTransaction`

## 8. 비기능 원칙

- 첫 행동은 3분 안에 끝나야 한다.
- 위저드는 입력보다 선택을 우선한다.
- 운영 규칙은 UI 깊숙이 숨기지 않고 카드/배지로 드러낸다.
- 공식성, 상태, 위험도는 모두 시각적으로 식별 가능해야 한다.

