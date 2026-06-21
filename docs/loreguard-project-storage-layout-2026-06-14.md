# Loreguard 프로젝트 저장 폴더 구성

작성일: 2026-06-14  
상태: 1차 코드 계약 적용  
정본 유틸: `src/lib/loreguard/project-storage-layout.ts`

## 1. 원칙

프로젝트 저장은 항상 `projects/{projectId}` 아래로 격리한다.

이 원칙은 세 가지를 막기 위한 것이다.

1. 다른 작품의 노아 대화와 작업노트가 섞이는 문제
2. 원고, 번역, 과정기록, 출고 패키지가 루트에 흩어지는 문제
3. GitHub 자동화가 승인되지 않은 자료를 엉뚱한 위치에 저장하는 문제

프로젝트 ID가 아직 없을 때도 루트에 저장하지 않는다. 임시 격리 폴더인 `projects/no-project`를 쓴다.

## 2. 표준 폴더

```text
projects/{projectId}/
  project.json
  manifest.json
  meta/
  world/
    setting.json
  characters/
    index.json
  items/
    index.json
  scenario/
    main.json
  scenes/
    index.json
  direction/
    main.json
  manuscripts/
    episode-001.md
  revisions/
    index.json
  translations/
    glossary.json
    ja/
      episode-001.md
    en/
      episode-001.md
  compose/
    {composeId}.json
  receipts/
    decisions.jsonl
    compose.jsonl
    exports.jsonl
  work-notes/
    index.md
    noa-chat-summary.md
    noa-compose.md
  exports/
    manifest.json
    {packageId}.zip
  assets/
  settings/
    project-settings.json
  trash/
```

## 3. 각 폴더 역할

| 폴더 | 역할 |
|---|---|
| `world` | 세계관 불변 규칙, 설정집 핵심 |
| `characters` | 캐릭터·아이템과 IP 자산 카드의 인덱스 |
| `scenario` | 메인 시나리오와 장기 플롯 |
| `scenes` | 씬시트와 장면 단위 결정 근거 |
| `direction` | 작품 연출, 톤, 리듬, 카메라/감정선 규칙 |
| `manuscripts` | 원고 회차 파일 |
| `revisions` | 퇴고 이력과 변경 후보 |
| `translations` | 번역본, 용어집, 현지화 자료 |
| `compose` | 노아 제안 묶음 계획 |
| `receipts` | 결정, 컴포즈, 출고 과정기록 |
| `work-notes` | 노아 대화 요약, 세션 노트, 이어가기 자료 |
| `exports` | 출고 패키지와 manifest |
| `assets` | 표지, 참고 이미지, 비주얼 자료 |
| `settings` | 프로젝트 단위 운영 설정 |
| `trash` | 삭제 전 보관, 복구 후보 |

## 4. GitHub 자동화 기준

노아와 GitHub 자동화는 이 경로만 사용한다.

| 작업 | 경로 |
|---|---|
| 원고 자동 저장 | `projects/{projectId}/manuscripts/episode-001.md` |
| 번역본 저장 | `projects/{projectId}/translations/{lang}/episode-001.md` |
| 노아 컴포즈 계획 | `projects/{projectId}/compose/{composeId}.json` |
| 컴포즈 과정기록 | `projects/{projectId}/receipts/compose.jsonl` |
| 노아 작업노트 | `projects/{projectId}/work-notes/noa-compose.md` |
| 출고 패키지 | `projects/{projectId}/exports/{packageId}.zip` |

## 5. 적용된 코드

- `buildProjectStorageLayout(projectId)`
- `buildProjectStoragePath(input)`
- `listProjectStorageFolders(projectId)`
- `isInsideProjectStorage(projectId, path)`
- `buildGitHubAutoSyncPath(projectId, episode)`가 새 레이아웃 사용
- `buildNoaComposeGitHubPaths(projectId, composeId)`가 새 레이아웃 사용

## 6. 남은 연결 과제

1. `project-serializer.ts`의 루트 경로를 이 레이아웃으로 이전
2. 불러오기 파이프라인이 `projects/{projectId}` 구조를 읽도록 보강
3. 출고 패키지 생성 시 `exports/manifest.json`과 `receipts/exports.jsonl` 연결
4. 프로젝트 삭제는 `trash/` 이동 후 `[삭제]` 입력 확인을 거치게 구현
5. UI의 프로젝트 관리 화면에서 폴더 구조를 직접 보여주지 말고 `원고`, `설정`, `과정기록`, `출고`로 요약 표시
