# EH Network MVP Data Model

## 1. 핵심 enum

```ts
type UserRole = "member" | "admin";

type BoardType =
  | "notice"
  | "registry"
  | "log"
  | "settlement"
  | "if"
  | "feedback";

type ReportType =
  | "manual"
  | "guide"
  | "technical"
  | "settlement"
  | "observation"
  | "incident"
  | "testimony"
  | "recovered";

type PlanetGoal = "maintain" | "develop" | "collapse" | "experiment";

type PlanetStatus =
  | "maintain"
  | "develop"
  | "collapse"
  | "experiment"
  | "freeze"
  | "discard";

type Visibility = "public" | "members" | "private";

type Officiality = "official" | "unofficial" | "fan" | "experimental" | "pending";
```

## 2. 컬렉션 구조

### users

문서 경로:

- `users/{userId}`

필드:

- `nickname`
- `role`
- `badges`
- `planetCount`
- `createdAt`
- `updatedAt`

### planets

문서 경로:

- `planets/{planetId}`

필드:

- `ownerId`
- `name`
- `code`
- `genre`
- `civilizationLevel`
- `goal`
- `status`
- `ehRisk`
- `systemExposure`
- `summary`
- `visibility`
- `representativeTags`
- `coreRules`
- `featuredFaction`
- `featuredCharacter`
- `transcendenceCost`
- `stats`
  - `logCount`
  - `settlementCount`
  - `lastLogAt`
  - `lastSettlementAt`
- `createdAt`
- `updatedAt`

### posts

문서 경로:

- `posts/{postId}`

필드:

- `authorId`
- `planetId`
- `boardType`
- `reportType`
- `title`
- `content`
- `summary`
- `eventCategory`
- `region`
- `intervention`
- `ehImpact`
- `followupStatus`
- `tags`
- `officiality`
- `visibility`
- `isPinned`
- `isOfficial`
- `approvedAt`
- `approvedBy`
- `createdAt`
- `updatedAt`

### settlements

문서 경로:

- `settlements/{settlementId}`

필드:

- `planetId`
- `postId`
- `verdict`
- `ehValue`
- `risk`
- `action`
- `archiveLevel`
- `operatorId`
- `createdAt`

### comments

권장 경로:

- `posts/{postId}/comments/{commentId}`

필드:

- `authorId`
- `content`
- `createdAt`
- `updatedAt`

이유:

- 댓글은 게시글 종속성이 강하다.
- 게시글 상세에서 하위 로딩이 자연스럽다.

## 3. 문서 타입별 필수 입력

### 행성 생성 필수

- `name`
- `genre`
- `civilizationLevel`
- `goal`
- `status`
- `summary`

### 첫 로그 생성 필수

- `title`
- `reportType`
- `content`

MVP 기본 추천 `reportType`:

- `observation`
- `incident`
- `settlement`
- `manual`
- `technical`

## 4. 타입별 게시판 기본 매핑

```ts
const DEFAULT_BOARD_BY_REPORT: Record<ReportType, BoardType> = {
  manual: "notice",
  guide: "registry",
  technical: "registry",
  settlement: "settlement",
  observation: "log",
  incident: "log",
  testimony: "log",
  recovered: "log",
};
```

## 5. 파생 데이터

행성 카드와 홈 대시보드는 아래 파생값을 빠르게 써야 한다.

- `planet.stats.logCount`
- `planet.stats.lastLogAt`
- `planet.latestSettlement`
- `planet.riskDelta`
- `planet.featuredPostId`

권장 방식:

- 문서 원본 + 최소 집계 필드 동시 유지

## 6. Firestore 인덱스

필수 후보:

- `posts`
  - `planetId ASC, createdAt DESC`
  - `boardType ASC, createdAt DESC`
  - `officiality ASC, createdAt DESC`
- `settlements`
  - `planetId ASC, createdAt DESC`
- `planets`
  - `status ASC, updatedAt DESC`
  - `ehRisk DESC, updatedAt DESC`

## 7. 권한 규칙 초안

### 읽기

- 비회원:
  - `visibility == "public"`만 허용
- 회원:
  - `public`, `members`
- 소유자:
  - 자신의 private 포함
- 운영자:
  - 전체

### 쓰기

- 회원:
  - `planets.create`
  - `posts.create`
  - 자신의 planet/posts update
- 운영자:
  - 승인
  - 공식 태그 변경
  - 정산 생성
  - 상태 변경

### 금지 규칙

- `isOfficial`은 운영자만 변경
- `settlements`는 운영자만 생성
- `ownerId`는 생성 후 일반 회원 수정 금지
- `planetId` 없는 log 글 생성 금지

## 8. 배치 생성 전략

행성 생성 위저드 완료 시 권장 순서:

1. `planetId`, `postId` 생성
2. `planets/{planetId}` 작성
3. `posts/{postId}` 작성
4. `planets/{planetId}.stats.logCount = 1`
5. `users/{uid}.planetCount += 1`

이 작업은 하나의 batch로 묶는다.

## 9. [확인 필요] 항목

- Firebase 프로젝트에 Firestore가 이미 활성화되어 있는지
- 운영자 role 저장 위치를 Firestore 문서로 할지, custom claims로 할지
- 공개 범위를 `public/members/private` 3단계로 갈지 MVP는 `public/private`로 줄일지

