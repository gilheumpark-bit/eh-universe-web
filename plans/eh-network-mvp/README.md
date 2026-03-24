# EH Network MVP Design Pack

## 목적

EH Universe 게시판 MVP를 `행성 등록 + 첫 관측 로그 동시 생성` 중심으로 바로 개발 가능한 수준까지 설계 문서로 정리한다.

이 설계 팩의 기본 원칙은 아래와 같다.

- 게시판은 단순 글 업로드 공간이 아니라 `행성 생성 -> 로그 누적 -> 정산 기록`의 루프를 제공한다.
- 1차 MVP의 승부처는 `행성 등록 + 첫 로그 생성 위저드`와 `행성 상세 페이지` 두 화면이다.
- 로그인과 전역 UI 톤은 기존 코드베이스를 재사용하고, 게시판용 데이터 계층은 신규 설계한다.
- MVP 다국어 범위는 `KO/EN 우선`으로 본다.
- `JP/CN`은 확장 포인트를 문서에 남기되, 1차 구현 완료 조건에는 포함하지 않는다.

## 문서 목록

- [`architecture.md`](</C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/plans/eh-network-mvp/architecture.md>)
  - 정보 구조, 화면 구조, 재사용 가능한 기존 자산, 모듈 경계
- [`data-model.md`](</C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/plans/eh-network-mvp/data-model.md>)
  - Firestore 컬렉션, 타입, 인덱스, 권한 규칙, 배치 생성 전략
- [`ux-flows.md`](</C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/plans/eh-network-mvp/ux-flows.md>)
  - 첫 진입, 행성 생성 위저드, 상세 페이지, 운영 플로우, 게시글 템플릿
- [`implementation-roadmap.md`](</C:/Users/sung4/OneDrive/바탕 화면/AI 소설/설정집/최종 정리본/EH프로젝트/eh-universe-web/plans/eh-network-mvp/implementation-roadmap.md>)
  - 구현 순서, 파일 단위 작업 계획, 검증 체크리스트

## MVP 한 줄

`세계관 기반 관측·정산 네트워크`

## MVP 핵심 결과물

1. 비회원이 행성과 로그를 열람할 수 있다.
2. 회원이 행성을 만들면서 첫 관측 로그를 동시에 남길 수 있다.
3. 행성 상세에서 로그, 정산, 피드백 흐름을 한 화면에서 볼 수 있다.
4. 운영자가 상태 태그와 정산보고를 부여할 수 있다.

## 비포함 범위

- 반응, 북마크, 알림
- 신고 시스템
- 추천 시스템
- 배지/등급 체계
- 고급 리치 에디터 효과
- JP/CN 완전 현지화

