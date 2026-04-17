# Feature Flags

EH Universe (로어가드) 프로젝트의 Feature Flag 카탈로그 및 운영 규약.

현재 **11개 플래그** 운영 중. **분기마다 검토**, **6개월 이상 미사용 flag** 는 제거.

---

## 플래그 카탈로그

| Flag                 | Default | Status        | 담당 영역              | Description                                        |
| -------------------- | ------- | ------------- | ---------------------- | -------------------------------------------------- |
| IMAGE_GENERATION     | true    | stable        | Studio / Universe      | DALL-E / Stability AI 이미지 생성                  |
| GOOGLE_DRIVE_BACKUP  | true    | stable        | Studio                 | Google Drive 원고 백업                             |
| NETWORK_COMMUNITY    | true    | stable        | Network                | 행성 커뮤니티 + 보고서 + 정착지                    |
| OFFLINE_CACHE        | true    | stable        | Core                   | IndexedDB 기반 오프라인 백업/복원                  |
| CODE_STUDIO          | true    | stable        | Code Studio            | 검증형 코드 생성 스튜디오 (9-team + Quill Engine)  |
| EPISODE_COMPARE      | true    | stable        | Studio                 | 에피소드 간 Diff 비교                              |
| CLOUD_SYNC           | false   | experimental  | Studio                 | Firestore 실시간 동기화 (과금 리스크)              |
| GITHUB_SYNC          | true    | stable        | Studio                 | GitHub Octokit 원고 동기화                         |
| SECURITY_GATE        | true    | stable        | Code Studio / AI       | AI 요청 보안 스캐너 (prompt injection 방어)        |
| MULTI_FILE_AGENT     | true    | experimental  | Code Studio            | 멀티파일 + intent-parser + tier-registry           |
| GITHUB_ETAG_CACHE    | true    | stable        | Studio                 | GitHub ETag 기반 조건부 요청 캐싱                  |
| ARI_ENHANCED         | true    | experimental  | AI / Core              | ARI per-model 추적 + EMA 감점                      |

---

## 상태 정의

| Status        | 의미                                                        |
| ------------- | ----------------------------------------------------------- |
| stable        | 안정 운영 중. 1개월 이상 무중단 + 커밋 10건 이상 사용.      |
| experimental  | 검증 중. 버그/성능 이슈 리스크 존재.                        |
| deprecated    | 제거 예정. 3개월 후 삭제. 신규 사용 금지.                   |

---

## 정리 주기

| 주기             | 조치                                                         |
| ---------------- | ------------------------------------------------------------ |
| **분기 검토**    | 매 분기 1회 실사용 여부 점검 (grep 기준 호출 건수)           |
| **deprecated 전환** | 제거 예정 3개월 전 상태 변경 + 코드 주석 `// @deprecated`  |
| **삭제 기준**    | deprecated 상태 6개월 경과 **또는** 사용처 0건 확인 시       |
| **승격 기준**    | experimental → stable: 1개월 이상 안정 + 커밋 10건 이상 사용 |

---

## 플래그 추가 시 체크리스트

- [ ] `src/lib/feature-flags.ts` (또는 해당 모듈) 에 기본값 정의
- [ ] 이 문서 표에 한 줄 추가 (Flag / Default / Status / 담당 / Description)
- [ ] `.env.example` 에 `NEXT_PUBLIC_FEATURE_*` 환경변수 추가 (환경별 오버라이드 필요 시)
- [ ] 초기 상태는 `experimental` 로 시작
- [ ] 주요 호출부에 `if (!isFeatureEnabled(...)) return fallback` 가드 배치

---

## 플래그 제거 시 체크리스트

- [ ] 모든 `isFeatureEnabled('FLAG_NAME')` 호출 제거
- [ ] 대체 분기 (elseif / fallback) 정리
- [ ] `feature-flags.ts` 에서 키 삭제
- [ ] 이 문서 표에서 행 제거
- [ ] CHANGELOG.md 에 Removed 항목 추가

---

## 참고

- 구현 위치: `src/lib/feature-flags.ts`
- 관련 정책: `CLAUDE.md` 의 ARI Circuit Breaker + Scope Policy
- 최근 변경: `CHANGELOG.md` [2.1.1] — 2026-04-17 Flag 기본값 재조정
