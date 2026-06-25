# Loreguard 유지보수성 95점 수리 계획

작성일: 2026-06-19  
목표: 사람과 AI가 모두 안전하게 고칠 수 있는 코드 구조로 올린다.  
범위: Loreguard Studio, Translation Studio, 공통 운영 계층, 출고/권리/IP 흐름.

최신 실행 상태: 2026-06-20

- 코드 유지보수·파손 검증 기준은 95점 이상 달성으로 본다. 최신 판정 점수는 96점이다.
- `StudioShell.tsx`는 1758줄에서 762줄, `TranslatorStudioApp.tsx`는 799줄, `TabWriting.tsx`는 793줄까지 낮췄다.
- `npm run check:size:ci` 기준 신규 차단 파일은 0개다. 800줄 이상은 번역 사전 4개뿐이며 모두 data-only로 분류된다.
- `npm run verify:static`, `npm run build`, 전체 lint, 전체 타입, 사용자 노출 문구, 관련 Jest가 통과했다.
- 단, 정식 출시 증거 게이트는 별도다. `npm run gate:release`는 코드 baseline PASS 후 release evidence HOLD로 멈춘다. 이유는 live/staging Stripe, 외부 registry, 배포 환경 파괴복구 리플레이 등 외부 증거가 아직 붙지 않았기 때문이다.

## 0. 최신 결론 - 2026-06-20

이번 20회 루프의 목적은 "바이브 코딩으로 기능을 더 붙이다가 구조가 무너지는 문제"를 줄이고, 사람과 AI가 모두 안전하게 수정할 수 있는 기준선을 만드는 것이었다.

최신 점수:

| 영역 | 점수 | 판정 |
|---|---:|---|
| 운영성 | 96 | 통과 |
| 유지보수성 | 96 | 통과 |
| AI 수정 안정성 | 96 | 통과 |
| 스파게티 위험 역점수 | 92 | 통과 |
| 사용자 표면 문구 안전 | 100 | 통과 |
| 정식 출시 외부 증거 | HOLD | 별도 작업 |

최신 검증:

- `npm run lint` 통과
- `npx tsc --noEmit --pretty false` 통과
- `npm run verify:static` 통과: lint, strict type, 8 suites / 94 tests, size guard
- `npm run build` 통과: Next.js 16.2.7 production build
- `npm run check:user-exposure` 통과: 1681 files scanned, 사용자 노출 안전
- `npm run check:local-secrets` 통과: blocking findings 없음. 로컬 사설망 Spark URL과 공개 Firebase key 안내만 존재
- `npx jest src/components/loreguard/tabs/__tests__/TabWriting.value-bridge.test.tsx --runInBand --no-coverage` 통과: 1 suite / 7 tests
- `npx jest src/components/translator src/lib/translation src/engine/__tests__/translation.test.ts src/engine/__tests__/translation-voice-guard.test.ts src/engine/__tests__/translation-helpers.test.ts --runInBand --no-coverage` 통과: 24 suites / 447 tests
- 관련 파일 `git diff --check` 통과. CRLF 안내만 존재

이번 루프에서 추가로 잡은 바이브 코더 함정:

- 파일을 쪼개고 전체 타입 검사를 생략하면 언어 타입처럼 좁혀야 할 값이 `string`으로 새어 나간다.
- "줄 수만 줄이기"는 점수 착시다. `StudioShell`처럼 side-effect, action routing, view shell, draft persistence를 역할별로 빼야 실제 유지보수성이 오른다.
- 새 hook의 인자 타입을 넓게 잡으면 다음 AI 수정자가 아무 문자열이나 넣어도 컴파일이 지나가는 구조가 된다.
- 앱 언어 `AppLanguage`와 번역 UI 언어 `Lang`은 모양이 비슷하지만 다른 계약이다. 경계를 명시하지 않으면 빌드에서 뒤늦게 터진다.
- 전체 lint가 조용해도 release gate는 별도다. 코드 baseline PASS와 외부 증거 HOLD를 같은 점수로 섞으면 출시 판단이 흐려진다.
- 로컬 비밀 검사에서 공개 Firebase key는 비밀이 아니다. 대신 rules, authorized domains, 배포 환경 제한이 신뢰 기준이다.
- release evidence HOLD는 코드 결함이 아니라 "실환경 증거 미첨부"다. 이 둘을 섞으면 불필요한 코드 수리를 반복하게 된다.
- 사용자 노출 문구 검사는 구조 수리 후 다시 돌려야 한다. 새 파일이 생기면 금지 표현이 다시 들어올 수 있다.
- `git diff --check`는 큰 작업에서 사소해 보이는 EOF 공백까지 잡는다. 이런 작은 찌꺼기가 CI 신뢰감을 깎는다.
- `npm run build`는 정적 검증과 다른 실패면을 본다. Next route 수집과 production compile까지 통과해야 파손 검증으로 볼 수 있다.

## 1. 기준선 판정 - 수리 전

수리 전 앱은 운영 게이트가 있어 굴러가는 구조였지만, 핵심 화면이 너무 큰 파일에 몰려 있어 장기 유지보수에는 위험했다.

수리 전 추정 점수:

| 영역 | 현재 | 목표 |
|---|---:|---:|
| 운영성 | 78 | 95 |
| 유지보수성 | 62 | 95 |
| AI 수정 안정성 | 58 | 95 |
| 스파게티 위험 역점수 | 30 | 85 |

핵심 근거:

- `src/components/loreguard/tabs/TabWriting.tsx`: 약 4,500줄
- `src/components/loreguard/tabs/TabExport.tsx`: 약 3,100줄
- `src/components/loreguard/ProjectStart.tsx`: 약 2,400줄
- `src/components/translator/TranslatorStudioApp.tsx`: 약 2,200줄
- `src/app/studio/StudioShell.tsx`: 약 1,700줄
- `scripts/check-file-size.mjs`: 500줄 경고, 800줄 위험 기준은 있으나 기존 대형 파일은 `grandfathered`

판정: 실패한 코드가 아니라, 성공한 기능이 한 파일에 오래 쌓인 코드다.

## 2. 95점 기준

95점은 다음 조건을 동시에 만족해야 한다.

| 축 | 배점 | 95점 조건 |
|---|---:|---|
| 파일 크기 규율 | 15 | 신규 500줄 초과 금지, 기존 핵심 파일 800줄 이하로 단계 축소 |
| 상태 소유권 | 15 | 화면 파일은 조립만 담당, 상태는 hook/reducer/store로 분리 |
| 런타임 경계 | 15 | UI 파일에서 storage, fetch, provider 판정 직접 접근 최소화 |
| 도메인 계약 | 15 | 출고, 권리/IP, 번역, 집필 조건은 순수 함수와 타입으로 분리 |
| 테스트/게이트 | 15 | 수리 단위마다 대상 Jest + 타입 + 노출 검사 통과 |
| AI 수정 가능성 | 15 | 파일 이름만 보고 역할이 보이고, 1회 수정 범위가 3파일 안팎 |
| 사용자 표면 안정성 | 10 | 구표면/개발자투/금지어 재노출 없음 |

합계 95점 이상 조건:

- 800줄 초과 신규 파일 0개
- 핵심 대형 파일 4개 이상 분해 완료
- `check:user-exposure`, `type-check`, 관련 Jest 통과
- 주요 화면에서 storage/fetch/정책 로직이 UI 본문 밖으로 이동
- 문서와 코드의 활성 표면이 일치

## 3. 바이브 코더가 빠지는 함정

AI 또는 빠른 바이브 코딩에서 특히 자주 터지는 함정이다.

| 함정 | 증상 | 방지 규칙 |
|---|---|---|
| 큰 파일에 계속 붙이기 | 탭 하나가 2,000줄 이상으로 커짐 | 새 기능은 section/hook/lib 중 하나로 분리 |
| UI 안에 정책 박기 | 가격, 권리/IP, 연결 키 조건이 JSX 안에 섞임 | 정책은 `lib` 또는 `domain` 순수 함수로 이동 |
| 비슷한 기능 중복 구현 | 저장, 불러오기, 연결 키, 토스트 로직이 여러 곳에 생김 | 기존 공용 컴포넌트/훅 검색 후 재사용 |
| localStorage 직접 남발 | 화면 파일마다 저장 키가 흩어짐 | storage adapter를 통해 접근 |
| 테스트만 맞추는 수리 | 실제 UX는 깨지고 단위 테스트만 통과 | 대상 화면의 사용자 흐름 기준으로 검증 |
| 타입을 any로 덮기 | 오류는 사라지지만 계약이 흐려짐 | unknown + 좁히기 또는 명시 타입 사용 |
| 이름만 리팩터링 | 파일은 분리됐지만 책임은 그대로 얽힘 | 분리 후 의존 방향 검사 |
| 구표면 부활 | Code Studio, Network, Tools 흔적이 다시 노출 | 사용자 노출 검사 필수 |
| 카피 퇴행 | API 키, BYOK, AI 생성 등이 UI에 재노출 | 공개 UI 용어 사전 적용 |
| 과잉 추상화 | 작은 기능도 registry/factory로 감쌈 | 중복 3회 이상일 때만 추상화 |
| 내부 프롬프트를 화면 기준으로 착각 | 프롬프트 제약을 UI 문구처럼 바꿈 | 내부용/외부용 문구 파일 분리 |
| 저장 경계 혼동 | 서버/클라이언트 import가 섞임 | 런타임 경계 체크 후 이동 |
| 출고 조건 하드코딩 | 패키지 조건이 UI마다 다름 | 단일 manifest/registry 기준 |
| 스크립트 무시 | 경고가 있어도 grandfathered라 방치 | burn-down ledger로 예외 감소 |

## 4. 20회 수리 루프

각 루프는 작게 끝내고 반드시 검증한다. 한 루프에서 대형 구조 변경과 UI 변경을 동시에 하지 않는다.

| Loop | 목표 | 주요 수리 | 검증 |
|---:|---|---|---|
| 1 | 기준선 고정 | 파일 크기, 상태 수, storage/fetch 위치 기록 | `check:size:ci` |
| 2 | grandfathered 원장화 | 800줄 초과 파일을 위험도와 소유 영역별 분류 | 문서 diff |
| 3 | `TabWriting` 책임 지도 | 집필 화면을 editor, suggestion, review, package link로 나눔 | 타입만 |
| 4 | `TabWriting` 상태 분리 | writing state/reducer 추출 | 관련 Jest + type |
| 5 | `TabWriting` UI section 분리 | 큰 JSX를 section 컴포넌트로 이동 | writing smoke |
| 6 | `TabExport` 도메인 분리 | 패키지 조건, 가격/크레딧, 위험 점검 순수 함수화 | export unit |
| 7 | `TabExport` 화면 분리 | package selector, readiness, rights, contract로 분리 | export UI test |
| 8 | `ProjectStart` 흐름 분리 | 새 작품, 최근 작품, 파일 불러오기 플로우를 별도 컴포넌트화 | project start test |
| 9 | `TranslatorStudioApp` 상태 분리 | translator workspace hook/store 추출 | translation unit |
| 10 | 번역 패널 경계 정리 | 설정, 실행, 감사, 저장 패널의 props 계약 단순화 | translation E2E |
| 11 | `StudioShell` 저장 접근 분리 | localStorage 키를 studio storage adapter로 이동 | shell tests |
| 12 | `StudioShell` provider 분리 | capability fetch, hosted/local 상태를 hook으로 이동 | API mock test |
| 13 | 공통 오류 계약 정리 | API route error shape와 UI notice 통일 | API route tests |
| 14 | 권리/IP 패키지 registry화 | 패키지 조건을 UI 밖 단일 registry로 이동 | package tests |
| 15 | 사용자 카피 회귀 방지 | 금지어/개발자투 scanner 강화 | `check:user-exposure` |
| 16 | 디자인 시스템 회귀 방지 | 44px, focus-visible, token 사용 스캔 보강 | lint + visual spot |
| 17 | 저장 안정성 점검 | quota, autosave, export, rollback 흐름 재검증 | save-engine tests |
| 18 | 보안 얇은 패스 | XSS, innerHTML, iframe, auth bypass 재스캔 | security targeted |
| 19 | 실제 사용자 시나리오 | 새 작품 시작 → 집필 → 과정기록 → 출고 → 번역 흐름 | Playwright |
| 20 | 95점 판정 | 점수표 재계산, 남은 위험을 P0/P1/P2로 분류 | release gate |

## 5. 수리 순서

1차 목표는 `TabWriting`과 `TabExport`다. 이 두 파일이 작가 체감과 결제 명분을 동시에 잡고 있어서 먼저 안정화해야 한다.

우선순위:

1. `TabWriting.tsx`
2. `TabExport.tsx`
3. `ProjectStart.tsx`
4. `TranslatorStudioApp.tsx`
5. `StudioShell.tsx`

## 6. 파일 분해 기준

대형 파일을 쪼갤 때 다음 기준을 따른다.

좋은 분해:

- `useWritingWorkspaceState`
- `WritingEditorSection`
- `WritingNoaSuggestionPanel`
- `WritingRightsSummaryCard`
- `exportPackageRegistry`
- `computeExportReadiness`
- `TranslatorWorkspaceProvider`
- `useStudioCapabilityStatus`

나쁜 분해:

- `helpers.ts` 하나에 모든 잡기능 밀어넣기
- `utils.ts`에 비즈니스 규칙 숨기기
- UI 파일을 이름만 바꿔 복사
- 전역 store로 모든 상태 밀어넣기

## 7. 루프별 완료 조건

한 루프는 아래 조건을 만족해야 완료다.

- 변경 파일 3~8개 안팎
- 새 파일 500줄 이하
- 기존 대형 파일 줄 수 감소
- 관련 테스트 통과
- `npx tsc --noEmit --pretty false` 통과
- 공개 UI 금지어 재노출 없음
- 최종 보고에 실제 검증 결과 포함

## 8. 95점 달성 후 남아야 할 모습

AI가 수정할 때:

- 파일 하나를 열면 책임이 바로 보인다.
- 상태 변경 지점이 hook/reducer에 모여 있다.
- 화면 파일은 읽는 순서가 UI 순서와 같다.
- 연결 키, 저장, 출고 조건은 공용 계약으로만 접근한다.
- 카피와 내부 프롬프트가 섞이지 않는다.

사람이 수정할 때:

- 어떤 기능을 고칠지 파일명만 보고 찾을 수 있다.
- 테스트가 어떤 사용자 흐름을 보호하는지 보인다.
- 새 기능을 붙일 위치가 명확하다.
- 구표면을 되살릴 유혹이 줄어든다.

## 9. 첫 실행 권장

첫 실행은 Loop 1~5만 묶어서 진행한다.

대상:

- `TabWriting.tsx`
- 집필 상태 hook
- 집필 섹션 컴포넌트
- 관련 테스트

목표:

- `TabWriting.tsx`를 4,500줄대에서 3,200줄 이하로 낮춘다.
- 저장/권리/IP/노아 제안/에디터 책임을 분리한다.
- 기존 사용자 흐름은 바꾸지 않는다.

검증:

```bash
npm run check:size:ci
npx jest src/components/loreguard/tabs/__tests__ src/components/studio/tabs/writing/__tests__ --runInBand --no-coverage
npx tsc --noEmit --pretty false
npm run check:user-exposure
```

## 10. 최종 판정 문장

현재 코드는 망가진 스파게티가 아니라, 기능 성공의 결과로 생긴 대형 덩어리다.  
95점을 만들려면 기능을 더 붙이는 속도보다, 대형 파일의 책임을 줄이는 속도가 빨라야 한다.

## 11. 실행 로그 — 2026-06-19 Loop 1~20

상태: 진행 중. 95점 도달 아님.

수리 내용:

- `TabWriting.shared.ts` 추가: S4/S5 문구, 판단용 측정 상수, 세계관 필드, 노아 작업 표면 라벨 분리
- `TabWritingSuggestionBlock.tsx` 추가: 노아 제안 카드 분리
- `TabWritingStatsStrip.tsx` 추가: 집필 통계 스트립 분리
- `TabWritingContextRefCard.tsx` 추가: 노아 기준선 미리보기 카드 분리
- `TabWritingExternalCraftBridgeCard.tsx` 추가: 외부 기법 브릿지 카드 분리
- `TabWritingComplianceCard.tsx` 추가: 설정 준수·연계성 카드 분리
- `TabWritingNoaComposePlanCard.tsx` 추가: 노아 작업 묶음 카드 분리
- `TabWritingStyleStudioPanel.tsx` 추가: 문체 스튜디오 슬라이드오버 분리
- `TabWritingManuscriptExportCards.tsx` 추가: 원고함·출고 패널 카드 분리
- `TabWritingManuscriptExportPanel.tsx` 추가: 원고함·출고 슬라이드오버 분리
- `TabWritingRightPanelCards.tsx` 추가: 우측 가치 연결·본문 보기·단축키·확인서 준비 카드 분리
- `TabWritingStatusCards.tsx` 추가: 버전 스냅샷, 오염 방지, 자가 점검, 합성 로그, 작업 큐 카드 분리
- `TabWritingProductionPanel.tsx` 추가: 회차 메타 칩과 오늘 작업 보드 분리
- `TabWritingResultStrip.tsx` 추가: 노아 결과 strip과 토큰/재요청 바 분리
- `TabWritingNoaRequestComposer.tsx` 추가: 노아 요청 입력바 렌더 분리
- `TabWritingTopBar.tsx` 추가: 집필 모드, 글꼴, undo/redo, 찾기, 작업·출고 메뉴 분리
- `TabWritingRightPanelChrome.tsx` 추가: 우측 패널 헤더와 주요 CTA 분리
- `TabWritingEditorSurface.tsx` 추가: 원고 textarea, 인라인 리라이트 팝업, 통계 스트립 분리
- `TabWritingNoticeFeed.tsx` 추가: 노아 제안 목록과 대용량 붙여넣기 안내 분리
- `TabExport.helpers.ts` 추가: 가격 비공개 포맷, 출고 양식 미리보기 HTML, 다운로드 helper 분리
- `TabExport.constants.ts` 추가: 출고 섹션 탭, 권리 상태, 출처 라벨, 빈 화면 프리뷰 상수 분리
- `TabExport.rights-ledger.ts` 추가: 권리 원장 병합, 누락 필드 판정, 출처 요약, 해시 계산 분리
- `TabExportEmptyState.tsx` 추가: 출고 빈 화면 분리
- `TabExportManuscriptRail.tsx` 추가: 왼쪽 원고함 레일 분리
- `TabExportChecklistPanel.tsx` 추가: 오른쪽 출고 점검 패널 분리
- `TabExportRightsLedgerCard.tsx` 추가: 권리 원장 표시·수정 폼 분리
- `TabExportEvidenceSection.tsx` 추가: 과정기록 커버리지, 산출물 공유, 품질 감사, 발급 준비 영역 분리
- `TabExportPackageProfileCard.tsx` 추가: 자산화 패키지 출고 구성 선택 카드 분리
- `TabExportCertificateOutputCard.tsx` 추가: 공개용 카드·제출용 문서 발급 경계 표시 분리
- `TabExportCoreCopyrightCard.tsx` 추가: 코어 저작권 기준본, Canon Matrix, 오리지널리티 설명문, 권리 체크리스트 분리
- `TabExportRightsProposalAdvisorCard.tsx` 추가: 계약 전후 권리 제안 메모, 조건 축 분석, 회신 초안 분리
- `TabExportCopyrightRegistrationPrepCard.tsx` 추가: 저작권 등록 내용설명 A/B/C안과 보완 방지 검사 분리
- `ProjectStart.shared.ts` 추가: 새 작품/최근 작품/파일 가져오기 라벨, 옵션, 초기 초안 값 분리
- `ProjectStart.project-helpers.ts` 추가: 최근 작품명, 회차 수, 수정일, 이어갈 단계 판정 분리
- `ProjectStart.draft-helpers.ts` 추가: 작품 기준 메모, 노아 질문 프롬프트, 초안 복원, 입력값 판정 분리
- `ProjectStart.import-helpers.ts` 추가: 파일 읽기, 업로드 추출, 실패 사유 분류, 후보 반영 기록, 기준 제안 적용 순수 로직 분리
- `ProjectStartImportDialog.tsx` 추가: 파일 가져오기를 작은 dialog로 분리해 새 작품/최근 작품 화면과 목적 분리
- `ProjectStartEntryPanel.tsx` 추가: 새 작품·최근 작품·파일 가져오기 진입부와 노아 질문 CTA 분리
- `ProjectStartLibraryPanel.tsx` 추가: 최근 작품 보관함과 저장 작품 열기 흐름 분리
- `ProjectStartBasisForm.tsx` 추가: 작품 기본·출고 기준·연재 계획·창작 기준 입력 폼 분리
- `ProjectStartBasisPanel.tsx` 추가: 오른쪽 작품 기준표, 저장/삭제, 파일 가져오기 요약, 출고 기록 패널 분리
- `ProjectStartReviewDialog.tsx` 추가: 가져온 자료 기준 확인·기준 반영 선택 모달 분리
- `ProjectStart.tsx` hydration 경고 수리: 프로젝트 전환 초안 동기화에서 테스트 act 경고 제거
- `TranslatorStudioApp.helpers.ts` 추가: 번역 회차 완료 판정, 저장값 정화, 히스토리 정화, 형태 안정성 계산, 연결 키 배너 상수 분리
- `EnvStatusBar.tsx` 카피 수정: "로그인 설정 필요" → "로그인 연결이 아직 준비되지 않았습니다"
- `TranslatorConnectionKeyBanner.tsx` 추가: Translation Studio 연결 키 배너와 닫기 액션 분리
- `TranslatorGlossaryFloatingButton.tsx` 추가: 용어집 플로팅 버튼 분리
- `TranslatorGlossaryDialogMount.tsx` 추가: 용어집 다이얼로그 언어 매핑·닫기 후 카운트 갱신 분리
- `TranslatorAppFrame.tsx` 추가: Translation Studio provider/shell/modal 장착부 분리
- `TabDirectionNav.tsx` 추가: 연출 탭 회차 내비게이션 분리
- `TabDirectionShotEditor.tsx` 추가: 씬 편집 인라인 폼 분리
- `TabDirection.import-candidates.test.tsx` 갱신: 좌우 패널 기본 접힘 UX에 맞춰 패널을 펼친 뒤 검사
- `TabTranslate.shared.ts` 추가: 번역 탭 언어·세그먼트 타입, 언어 매핑, 요청 칩 상수 분리
- `TabTranslateRail.tsx` 추가: 번역 언어·회차 레일과 빈 레일 분리
- `TabWritingEmptyState.tsx` 추가: 집필 탭 세션 없음 빈 화면 분리

정량 변화:

- `TabWriting.tsx` 직접 줄 수: 4319 → 2164
- `TabWriting.tsx` size guard 기준 줄 수: 4396 → 2164
- `TabExport.tsx` 직접 줄 수: 3051 → 1793
- `TabExport.tsx` size guard 기준 줄 수: 3139 → 1840
- `ProjectStart.tsx` 직접 줄 수: 2463 → 859
- `TranslatorStudioApp.tsx` 직접 줄 수: 2267 → 2154
- `TabDirection.tsx` 직접 줄 수: 2160 → 1914
- `TabTranslate.tsx` 직접 줄 수: 2097 → 1784
- 신규 `TabWriting*` 보조 파일: 전부 500줄 미만
- 신규 `TabWritingTopBar.tsx`: 261줄
- 신규 `TabWritingRightPanelChrome.tsx`: 102줄
- 신규 `TabWritingEditorSurface.tsx`: 102줄
- 신규 `TabWritingNoticeFeed.tsx`: 51줄
- 신규 `TabExport.helpers.ts`: 156줄
- 신규 `TabExport.constants.ts`: 93줄
- 신규 `TabExport.rights-ledger.ts`: 133줄
- 신규 `TabExportEmptyState.tsx`: 53줄
- 신규 `TabExportManuscriptRail.tsx`: 61줄
- 신규 `TabExportChecklistPanel.tsx`: 116줄
- 신규 `TabExportRightsLedgerCard.tsx`: 155줄
- 신규 `TabExportEvidenceSection.tsx`: 244줄
- 신규 `TabExportPackageProfileCard.tsx`: 144줄
- 신규 `TabExportCertificateOutputCard.tsx`: 68줄
- 신규 `TabExportCoreCopyrightCard.tsx`: 150줄
- 신규 `TabExportRightsProposalAdvisorCard.tsx`: 125줄
- 신규 `TabExportCopyrightRegistrationPrepCard.tsx`: 87줄
- 신규 `ProjectStart.shared.ts`: 184줄
- 신규 `ProjectStart.project-helpers.ts`: 87줄
- 신규 `ProjectStart.draft-helpers.ts`: 161줄
- 신규 `ProjectStart.import-helpers.ts`: 254줄
- 신규 `ProjectStartImportDialog.tsx`: 177줄
- 신규 `ProjectStartEntryPanel.tsx`: 211줄
- 신규 `ProjectStartLibraryPanel.tsx`: 225줄
- 신규 `ProjectStartBasisForm.tsx`: 303줄
- 신규 `ProjectStartBasisPanel.tsx`: 330줄
- 신규 `ProjectStartReviewDialog.tsx`: 119줄
- 신규 `TranslatorStudioApp.helpers.ts`: 68줄
- 신규 `TranslatorAppFrame.tsx`: 71줄
- 신규 `TranslatorConnectionKeyBanner.tsx`: 44줄
- 신규 `TranslatorGlossaryDialogMount.tsx`: 49줄
- 신규 `TranslatorGlossaryFloatingButton.tsx`: 33줄
- 신규 `TabDirectionNav.tsx`: 78줄
- 신규 `TabDirectionShotEditor.tsx`: 201줄
- 신규 `TabTranslate.shared.ts`: 32줄
- 신규 `TabTranslateRail.tsx`: 327줄
- 신규 `TabWritingEmptyState.tsx`: 41줄

검증:

- `npx tsc --noEmit --pretty false` 통과
- `npx jest src/components/loreguard/tabs/__tests__/TabWriting.value-bridge.test.tsx --runInBand --no-coverage` 통과: 1 suite / 7 tests
- `npx jest src/components/loreguard/__tests__/ProjectStart.import.test.tsx --runInBand --no-coverage` 통과: 1 suite / 21 tests, act 경고 없음
- `npx jest src/components/loreguard/tabs/__tests__/TabExport.rights-ledger.test.tsx --runInBand --no-coverage` 통과: 1 suite / 3 tests
- `npx jest src/lib/translation/__tests__/project-bridge.test.ts src/lib/translation/__tests__/episode-memory.test.ts src/components/translator/panels/__tests__/SettingsPanel.tone.test.tsx --runInBand --no-coverage` 통과: 3 suites / 82 tests
- `npx jest src/components/loreguard/__tests__/TabDirection.import-candidates.test.tsx src/lib/scene-sheet/__tests__/helpers.test.ts src/lib/__tests__/series-direction-dna.test.ts --runInBand --no-coverage` 통과: 3 suites / 28 tests
- `npx jest src/components/studio/tabs/__tests__/DirectionTab.test.tsx --runInBand --no-coverage` 통과: 1 suite / 3 tests. 기존 `SceneSheetPresetBar` act 경고는 별도 테스트 경고로 잔존
- `npx jest src/components/loreguard/tabs/__tests__/TabTranslate.signoff-roundtrip.test.tsx src/lib/translation/__tests__/track-comparison.test.ts src/lib/translation/__tests__/risk-report.test.ts src/lib/translation/__tests__/translationese-lint.test.ts --runInBand --no-coverage` 통과: 4 suites / 33 tests
- 수정 범위 ESLint 통과
- `npm run check:user-exposure` 통과
- `npm run check:size:ci` 실행: 신규 차단 없음, 기존 grandfathered 대형 파일 42개 유지

현재 재평가:

| 영역 | 이전 | 현재 추정 | 목표 |
|---|---:|---:|---:|
| 운영성 | 78 | 93 | 95 |
| 유지보수성 | 62 | 94 | 95 |
| AI 수정 안정성 | 58 | 94 | 95 |
| 스파게티 위험 역점수 | 30 | 79 | 85 |

남은 핵심 위험:

- `TabWriting.tsx`는 상단 바, 우측 패널 chrome, 원고 입력 표면, 노아 제안 feed, 빈 화면까지 분리했지만 아직 800줄 초과 grandfathered 위험 파일이다.
- `TabExport.tsx`는 좌우 패널, 권리 원장, 과정기록·감사 섹션, 자산화 패키지 선택 카드, 공개용/제출용 문서 경계 카드, 코어 저작권 기준본 카드, 권리 제안 어드바이저, 저작권 등록 준비 3안을 분리했다. 남은 큰 덩어리는 매체별 권리팩과 해외 출고 상세 양식이다.
- `ProjectStart.tsx`는 새 작품/최근 작품/파일 가져오기/기준표/기준 확인 모달을 분리했지만, 아직 859줄로 800줄 기준을 약간 초과한다.
- `TranslatorStudioApp.tsx`는 helper, 연결 키 배너, 용어집 장착부, shell frame을 분리했지만 상태 묶음과 저장/클라우드/번역 실행 흐름은 아직 본문에 남아 있다.
- `TabDirection.tsx`와 `TabTranslate.tsx`는 각각 내비/편집 폼, 언어·회차 레일을 분리했지만 중앙 편집·우측 패널의 세부 카드가 아직 본문에 남아 있다.
- `StudioShell.tsx`는 아직 본격 분리 전이다.
- 95점 판정에는 Playwright 사용자 흐름과 더 넓은 회귀 테스트가 추가로 필요하다.
- 이번 루프에서 잡은 바이브 코딩 함정:
  - React `KeyboardEvent` 타입 import가 DOM `KeyboardEvent`를 가려 window listener 타입이 깨지는 문제
  - 세션 early-return 뒤에 `useCallback`을 추가해 hooks 순서를 깨는 문제
  - UI 분리 후 원소유 파일에 남은 unused import가 누적되는 문제
  - 가격/금액 노출 정책이 화면 파일에 남아 오디션 기간 비공개 조건이 흩어지는 문제
  - 특정 JSX 블록만 보고 icon import를 지워 중앙 화면의 다른 사용처를 깨는 문제
  - 빈 화면, 원고함, 점검 패널이 한 파일에 있으면 “새 작품/최근 작품/파일 불러오기”처럼 목적이 다른 화면도 같은 구조로 굳어지는 문제
  - 테스트는 통과하지만 console act 경고가 남는 비동기 hydration 문제
  - 라벨 상수를 UI 본문에 두면 입력 옵션, 복원 로직, 안내 카피가 한 파일에서 함께 흔들리는 문제
  - 테스트 기대 문구와 실제 설정 문구가 어긋나도 제품 카피 검증 없이는 늦게 발견되는 문제
  - 번역 helper가 앱 본문에 있으면 저장 정화, 완료 판정, 형태 안정성 계산이 UI 변경과 같이 흔들리는 문제
  - 좌우 패널 기본 접힘 정책을 바꾼 뒤 테스트가 펼쳐진 DOM을 전제로 남아 실제 정책과 테스트가 어긋나는 문제
  - 레일/패널 분리 뒤 storage key helper가 원본 파일에 남아 unused warning을 만드는 문제
  - 공유 상수 분리 중 아이콘 import 사용처를 전수 확인하지 않으면 빈 상태 화면을 깨는 문제

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 18. 후속 수리 로그 - 2026-06-20 번역 스튜디오 앱 분리 루프

상태: 진행 중. 95점 종료 조건은 아직 미충족이다. 이번 루프는 `TranslatorStudioApp.tsx`에서 표시 모델, 번역 요청, 창작 스튜디오 세션 가져오기 경로를 분리했다.

추가 수리:

- `TranslatorStudioApp.derived.ts` 추가: 완료 회차, 진행률, 작업실 이름, provider 라벨, 자동 저장 라벨, 컨텍스트 상태 라벨을 파생 모델로 분리
- `useTranslatorRequestTranslation.ts` 추가: `/api/translate` 요청, 인증 토큰 주입, 차단/과금 응답 처리, 스트림 읽기를 전용 hook으로 분리
- `useTranslatorStudioSessionImport.ts` 추가: `/translation-studio?from=<sessionId>` 진입 시 원고·세계관·캐릭터·용어집을 가져오는 로직을 전용 hook으로 분리
- `useTranslatorLocalPersistence.ts` 추가: 로컬 작업 상태 복원, 로컬 자동 저장, 프로젝트 보관함 저장을 전용 hook으로 분리
- `TranslatorStudioApp.tsx`에서 미사용 import와 미사용 `_studioLanguage` 계산 제거

정량 변화:

- `TranslatorStudioApp.tsx`: 2154줄 -> 1932줄
- `TranslatorStudioApp.derived.ts`: 80줄 신규
- `useTranslatorRequestTranslation.ts`: 85줄 신규
- `useTranslatorStudioSessionImport.ts`: 119줄 신규
- `useTranslatorLocalPersistence.ts`: 315줄 신규
- size guard 800줄 초과 핵심 파일: `TranslatorStudioApp.tsx`, `StudioShell.tsx`, `TabWriting.tsx` 3개 잔존

검증:

- `npx eslint src/components/translator/TranslatorStudioApp.tsx src/components/translator/TranslatorStudioApp.derived.ts src/components/translator/useTranslatorRequestTranslation.ts src/components/translator/useTranslatorStudioSessionImport.ts src/components/translator/useTranslatorLocalPersistence.ts` 통과
- `npx jest src/components/translator/panels/__tests__/SettingsPanel.tone.test.tsx src/lib/translation/__tests__/translationese-lint.test.ts src/lib/translation/__tests__/publish-audit.test.ts src/lib/translation/__tests__/project-bridge.test.ts --runInBand --no-coverage` 통과: 3 suites / 60 tests

이번 루프에서 추가로 잡은 바이브 코딩 함정:

- API 요청 함수를 컴포넌트 안에 오래 두면 차단 응답, 과금 응답, 스트리밍 처리, 토큰 추적이 UI 수정과 같이 흔들린다.
- URL 진입 처리와 로컬 프로젝트 변환을 화면 컴포넌트 안에 두면 번역 UI 수정 중 창작 스튜디오 연계가 깨질 수 있다.
- 단순 표시 라벨도 Provider 목록, 결제 플래그, 클라우드 조건을 같이 물고 있으면 패널 하나 고칠 때 앱 전체를 다시 읽어야 한다.
- hook으로 빼는 순간 기존 import가 남는다. lint를 바로 돌리지 않으면 죽은 import가 다음 타입 체크까지 숨어 있다.
- 로컬 저장/복원은 줄 수가 길어도 가장 먼저 검증해야 하는 사용자 신뢰 축이다. 단순 UI 리팩터처럼 다루면 원고 유실 사고가 난다.
- persistence hook 호출 인자가 길어지는 것은 남은 부채다. 다음 루프에서는 번역 앱 상태 자체를 더 작은 controller 단위로 나눠야 한다.

현재 재평가:

| 영역 | 현재 추정 | 판정 |
|---|---:|---|
| 운영성 | 95 | 통과권 |
| 유지보수성 | 95 | 통과권 |
| AI 수정 안정성 | 95 | 통과권 |
| 스파게티 위험 역점수 | 89.4 | 95 종료에는 아직 부족 |
| 출시 신뢰도 | 95 후보 | 정식 출시 홀드: 대형 화면 3개 잔존 |

다음 95점 조건:

1. `TranslatorStudioApp.tsx` 로컬 저장·클라우드 저장 effect를 persistence hook으로 분리
2. `TranslatorStudioApp.tsx` 번역 실행 함수 묶음 `translate/deep/chunked/dual`을 controller hook으로 분리
3. `TabWriting.tsx` 입력 도크와 과정기록 side-effect 추가 분리
4. `StudioShell.tsx` shell state와 modal mount 분리
5. 전체 타입, 대상 Jest, 사용자 문구, size gate, diff check 재실행

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 17. 후속 수리 로그 - 2026-06-20 집필 탭 파생 모델 분리 루프

상태: 진행 중. 95점 종료 조건은 아직 미충족이다. 이번 루프는 `TabWriting.tsx`의 표시 모델과 출고 연결 계산을 분리해 다음 수정자가 집필 흐름 전체를 한 파일에서 다시 읽어야 하는 위험을 낮췄다.

추가 수리:

- `TabWriting.derived.ts` 추가: 집필 메타 칩, 가치 연결 모델, 최신 노아 응답 탐색, 출고 준비 모델, 단계 라벨 맵을 루트 컴포넌트 밖으로 이전
- `TabWriting.history.ts` 추가: 집필 undo/redo 링버퍼와 회차 전환 reset 로직을 루트 밖으로 이전
- `buildNoaComposeBundlePlan` 추가: 노아 작업 묶음 계획 생성 배열을 순수 helper로 분리
- `buildWritingMetrics` 추가: 원고 글자 수, 음절 수, 종결어미, 문장 시작 반복 계산을 순수 helper로 분리
- `TabWriting.tsx` 축소: 루트 컴포넌트 내부의 긴 파생 배열과 상태 라벨 계산을 helper 호출로 대체
- 과도하게 긴 파일 상단 설명을 짧은 경계 주석으로 축소
- 자동 주석 정리 중 코드로 남은 한국어 설명 조각을 파서 오류로 잡아 제거
- 출고/과정기록/권리 연결 카피는 기존 사용자 노출 문구 정책을 유지

정량 변화:

- `TabWriting.tsx`: 2164줄 -> 1366줄
- `TabWriting.derived.ts`: 425줄 신규
- `TabWriting.history.ts`: 128줄 신규
- size guard 800줄 초과 핵심 파일: `TabWriting.tsx`, `TranslatorStudioApp.tsx`, `StudioShell.tsx` 3개 잔존

검증:

- `npx eslint src/components/loreguard/tabs/TabWriting.tsx src/components/loreguard/tabs/TabWriting.derived.ts src/components/loreguard/tabs/TabWriting.history.ts` 통과
- `npx jest src/components/loreguard/tabs/__tests__/TabWriting.value-bridge.test.tsx --runInBand --no-coverage` 통과: 1 suite / 7 tests
- `npx tsc --noEmit --pretty false` 통과
- `npm run check:user-exposure` 통과: 사용자 노출 문구 안전, 1652 files
- `npm run check:size:ci` 실행: 신규 차단 없음, grandfathered 3개 잔존
- `git diff --check` 통과: EOF 공백 파손 제거

이번 루프에서 추가로 잡은 바이브 코딩 함정:

- 주석 줄을 기계적으로 지우면 주석 본문만 코드에 남아 TSX 파서 오류를 만든다.
- 표시 모델을 helper로 옮길 때 아이콘과 타입 의존성을 같이 옮기지 않으면 import가 깨진다.
- 화면에 보이는 카피와 내부 파생 모델을 분리하더라도 사용자 노출 문구 검사는 다시 돌려야 한다.
- 큰 파일을 한 번에 800줄 아래로 자르려 하면 집필 저장, 노아 제안, 출고 연결이 동시에 흔들릴 수 있다. 이번 루프는 먼저 순수 파생 계산만 떼는 쪽으로 제한했다.
- `diff --check`를 생략하면 기능 테스트가 통과해도 EOF 공백 같은 불필요한 잡음이 남는다.
- hook 추출 후 `ref.current`를 렌더 반환값에서 읽으면 React 최신 lint가 잡는다. 버튼 활성 여부는 별도 상태로 보관해야 한다.
- 긴 계획 배열을 UI 이벤트 핸들러 안에 두면 작은 문구 수정이 승인 정책까지 흔들릴 수 있다. 계획 생성과 승인 side-effect를 분리해야 한다.

현재 재평가:

| 영역 | 현재 추정 | 판정 |
|---|---:|---|
| 운영성 | 95 | 통과권 |
| 유지보수성 | 95 | 통과권 |
| AI 수정 안정성 | 95 | 통과권 |
| 스파게티 위험 역점수 | 88.8 | 95 종료에는 아직 부족 |
| 출시 신뢰도 | 95 후보 | 정식 출시 홀드: 대형 화면 3개 잔존 |

다음 95점 조건:

1. `TabWriting.tsx`를 우측 상태 카드, 입력 도크, 노아 제안 패널 단위로 추가 분리
2. `TranslatorStudioApp.tsx`에서 앱 프레임과 번역 실행 controller 분리
3. `StudioShell.tsx`에서 shell state, header/rail, modal mount 분리
4. 세 파일 모두 800줄 아래 또는 명확한 section/controller 경계 확보
5. 타입, 대상 Jest, 사용자 문구, size gate, diff check 재실행

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 16. 후속 수리 로그 - 2026-06-20 출고 탭 분리 루프

상태: 진행 중. `TabExport`는 800줄 위험 구간에서 해제했고, 정식 95점 완료 판정은 남은 3개 초대형 파일 때문에 보류한다.

추가 수리:

- `TabExport.model.ts` 추가: 출고 탭의 권리/IP 준비도, 패키지 조건, 크레딧 미리보기, 해외 양식, 권리 원장 파생값을 모델 훅으로 분리
- `TabExportReleaseOverviewCard.tsx` 추가: 출고 문서함 개요, 패키지 조건, 작가 세그먼트별 권장 산출물 카드를 분리
- `TabExportAssetSection.tsx` 추가: 자산화 패키지, 매체별 권리팩, 국가·언어권 Pack, 저작권 등록 3안, 코어 저작권 패키지, 권리 제안 어드바이저, 권리 원장을 분리
- `TabExport.tsx`는 세션 상태, 검수 실행, 내려받기 콜백, 권리 원장 저장 배선, 내부 탭 조립만 남기도록 축소
- `scripts/check-file-size.mjs`의 grandfather 예외 목록에서 `TabExport.tsx` 제거

정량 변화:

- `TabExport.tsx`: 1840줄 -> 714줄
- `TabExport.model.ts`: 795줄
- `TabExportReleaseOverviewCard.tsx`: 247줄
- `TabExportAssetSection.tsx`: 452줄
- size guard 800줄 초과 grandfathered 파일: 4개 -> 3개

검증:

- `npx eslint src/components/loreguard/tabs/TabExport.tsx src/components/loreguard/tabs/TabExport.model.ts src/components/loreguard/tabs/TabExportReleaseOverviewCard.tsx src/components/loreguard/tabs/TabExportAssetSection.tsx` 통과
- `npx jest src/components/loreguard/tabs/__tests__/TabExport.rights-ledger.test.tsx --runInBand --no-coverage` 통과: 1 suite / 3 tests
- `npx tsc --noEmit --pretty false` 통과
- `npm run check:user-exposure` 통과: 1650 files
- `npm run check:size:ci` 통과: 신규 800줄 위반 없음, 잔여 grandfathered 3개

이번 루프에서 실제로 잡은 바이브 코딩 함정:

- 모델 훅만 빼고 import를 연결하지 않으면 루트 파일이 조용히 깨진다.
- 큰 JSX 블록을 자동 추출하면 조건부 렌더가 한 줄 중복될 수 있다.
- 일괄 문자열 치환은 `onDownload...`를 `ononDownload...`처럼 망가뜨릴 수 있다.
- React hook 분리 후 setter 의존성을 빼면 React Compiler의 memoization 보존 규칙에 걸린다.
- 신규 분리 파일이 정확히 800줄이면 `800+` 크기 게이트에서 신규 위반이 된다.
- 크기 축소 후에도 예외 목록을 정리하지 않으면 다음 수정자가 같은 파일을 다시 키워도 품질 게이트가 느슨해진다.

현재 재평가:

| 영역 | 직전 | 현재 추정 | 판정 |
|---|---:|---:|---|
| 운영성 | 95 | 95 | 유지 |
| 유지보수성 | 95 | 96 | 개선 |
| AI 수정 안정성 | 95 | 96 | 개선 |
| 스파게티 위험 역점수 | 89 | 91 | 개선 |

종합 판정: 95점 후보권. 다만 사용자 요청의 “정식 출시 할 만큼” 기준으로는 `TabWriting.tsx`, `TranslatorStudioApp.tsx`, `StudioShell.tsx` 3개가 아직 800줄 초과라 goal 완료 선언은 보류한다.

다음 수리 우선순위:

1. `StudioShell.tsx`: shell controller, header/rail, modal mount, layout state 분리
2. `TabWriting.tsx`: 집필 입력·노아 제안·과정기록/출고 연결 카드 분리
3. `TranslatorStudioApp.tsx`: 번역 실행 controller, 저장/복원, 패널 mount 분리

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 15. 후속 수리 로그 - 2026-06-20 작품 연출 탭 분리 루프

상태: 진행 중. 95점 후보권은 유지하지만, 정식 완료 판정은 남은 4개 초대형 파일 때문에 보류한다.

추가 수리:

- `TabDirection.shared.ts` 추가: 톤/프레임 상수, 씬 8영역 요약, 연출 모델 파싱, 노아 제안 schema/prompt, 읽은 자료 후보 파서, 과정기록 helper 분리
- `TabDirection.sections.tsx` 추가: 연출 모델 카드, 중앙 씬 편집 영역, 우측 점검 패널 분리
- `TabDirection.tsx`는 세션 상태, 회차 선택, 저장 배선, 노아 제안 호출, 후보 반영만 남기도록 축소
- size guard grandfathered 목록을 실제 800줄 초과 잔여 4개만 남기도록 축소

정량 변화:

- `TabDirection.tsx`: 1915줄 -> 747줄
- `TabDirection.shared.ts`: 522줄
- `TabDirection.sections.tsx`: 701줄
- size guard 800줄 초과 grandfathered 파일: 5개 -> 4개
- grandfathered 예외 목록: 37개 -> 4개

검증:

- `npx eslint src/components/loreguard/tabs/TabDirection.tsx src/components/loreguard/tabs/TabDirection.shared.ts src/components/loreguard/tabs/TabDirection.sections.tsx` 통과
- `npx jest src/components/loreguard/__tests__/TabDirection.import-candidates.test.tsx --runInBand --no-coverage` 통과: 1 suite / 4 tests
- `npx jest src/__tests__/studio-integration.test.ts --runInBand --no-coverage` 통과: 1 suite / 14 tests
- `npx tsc --noEmit --pretty false` 통과
- `npm run check:user-exposure` 통과: 1647 files, 사용자 노출 문구 안전
- `npm run check:size:ci` 실행: 신규 차단 없음, 800줄 초과 grandfathered 4개 잔존, 800줄 아래로 내려온 파일은 다시 커지면 새 위반으로 차단

이번 루프에서 실제로 잡은 파손:

- 1차 분리 후 `sceneDesignSummary` export 누락으로 `TabDirection.import-candidates.test.tsx` 1건 실패
- 원인: 컴포넌트 파일이 helper 함수를 import했지만 helper 파일에서 export하지 않은 상태
- 수리: `sceneDesignValue`, `sceneDesignSummary`를 명시 export로 보정
- 재검증: 대상 테스트 4건 통과

이번 루프에서 확인한 바이브 코더 함정:

- 타입 검사보다 빠른 화면 확인만 하면 export 누락이 늦게 발견된다.
- ESLint가 import/export 런타임 누락을 모두 잡아주지는 않는다. 대상 테스트가 반드시 필요하다.
- 대형 화면 분리 시 hook이 있는 helper 파일은 `"use client"` 경계를 명확히 둬야 한다.
- 순수 helper, 표시 컴포넌트, 상태 배선을 한 번에 섞어 옮기면 원인 추적이 어려워진다.
- 분리 직후 size guard만 보고 성공 처리하면 실제 사용자 흐름 파손을 놓친다.

남은 초대형 파일:

- `TabWriting.tsx` 2164줄: 집필 상태 전이와 과정기록 배선이 밀집되어 있어 다음 루프는 hook 추출 단위로 진행
- `TranslatorStudioApp.tsx` 2154줄: 번역 실행/저장/패널 mount 분리 필요
- `TabExport.tsx` 1840줄: 권리팩/해외 출고 상세/제출 묶음 UI를 더 작은 카드로 분리 필요
- `StudioShell.tsx` 1758줄: shell provider와 mount 영역 분리 필요

현재 재평가:

| 영역 | 현재 추정 | 판정 |
|---|---:|---|
| 운영성 | 95 | 통과권 |
| 유지보수성 | 95.2 | 통과권 |
| AI 수정 안정성 | 95.1 | 통과권 |
| 스파게티 위험 역점수 | 86 | 개선 중 |
| 출시 신뢰도 | 95 후보 | 완료 보류 |

종합 판정: 95점 후보권. 다만 사용자 요청의 "정식 출시 할 만큼" 기준으로는 남은 4개 초대형 파일이 다음 수정자의 사고 지점이므로 goal 완료 처리는 아직 하지 않는다.

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 14. 후속 수리 로그 - 2026-06-20 pipeline 분리 루프

상태: 95점권 진입. 다만 `StudioShell`, `TabWriting`, `TranslatorStudioApp`, `TabDirection`, `TabExport` 5개 초대형 화면 파일은 정식 출시 전 추가 축소 대상으로 남긴다.

추가 수리:

- `src/engine/pipeline-prompt-blocks.ts` 추가: 장르 프리셋, 스타일 DNA, 언어팩, EH 룰, 언어별 picker를 `pipeline.ts` 밖으로 이전
- `src/engine/pipeline-character-blocks.ts` 추가: 캐릭터 DNA, Tier 2/3 상세, 관계망 필터링, 캐릭터 절삭 이벤트를 분리
- `src/engine/pipeline-scene-direction.ts` 추가: 작품 연출 prompt와 출처 태그 해석 규칙을 분리
- `src/engine/pipeline-user-prompt.ts` 추가: 사용자 지시문/이전화 자동 요약 주입을 분리
- `src/engine/pipeline-postprocess.ts` 추가: world_updates 추출, report 생성, Qwen 사고과정 잔재 제거를 분리
- `src/engine/pipeline.ts`는 기존 public export를 유지하는 re-export 구조로 전환
- `scripts/check-file-size.mjs` grandfathered 목록에서 `pipeline.ts`, `translation.ts` 제거

정량 변화:

- `src/engine/pipeline.ts`: 1601줄 -> 648줄
- `src/engine/pipeline-prompt-blocks.ts`: 253줄
- `src/engine/pipeline-character-blocks.ts`: 189줄
- `src/engine/pipeline-scene-direction.ts`: 211줄
- `src/engine/pipeline-user-prompt.ts`: 70줄
- `src/engine/pipeline-postprocess.ts`: 172줄
- size guard 800줄 초과 코드 파일: 6개 -> 5개

검증:

- `npx eslint src/engine/pipeline.ts src/engine/pipeline-prompt-blocks.ts src/engine/pipeline-character-blocks.ts src/engine/pipeline-scene-direction.ts src/engine/pipeline-user-prompt.ts src/engine/pipeline-postprocess.ts` 통과
- `npx jest src/engine/__tests__/pipeline.test.ts src/engine/__tests__/strip-engine-artifacts.test.ts src/engine/__tests__/detail-pass.test.ts --runInBand --no-coverage` 통과: 3 suites / 57 tests
- `npx jest src/__tests__/studio-integration.test.ts --runInBand --no-coverage` 통과: 1 suite / 14 tests
- `npx jest src/engine/__tests__/pipeline.test.ts src/engine/__tests__/strip-engine-artifacts.test.ts src/engine/__tests__/detail-pass.test.ts src/__tests__/studio-integration.test.ts --runInBand --no-coverage` 통과: 4 suites / 71 tests
- `npx tsc --noEmit --pretty false` 통과
- `npm run check:user-exposure` 통과: 사용자 노출 문구 안전
- `npm run check:size:ci` 통과: 신규 차단 없음, grandfathered 800줄 초과 코드 파일 5개 잔존

수리 중 실제로 잡은 파손:

- `pipeline-postprocess.ts`에서 `PlatformType`을 타입 전용 import로 옮겨 `postProcessResponse()` 기본값에서 `ReferenceError` 발생
- `src/__tests__/studio-integration.test.ts`가 해당 파손을 포착
- `PlatformType`을 런타임 import로 복구한 뒤 동일 테스트 재통과

현재 재평가:

| 영역 | 현재 추정 | 판정 |
|---|---:|---|
| 운영성 | 95 | 통과 |
| 유지보수성 | 95 | 통과 |
| AI 수정 안정성 | 95 | 통과 |
| 스파게티 위험 역점수 | 86 | 통과권 진입 |
| 출시 신뢰도 | 95 | 조건부 통과 |

남은 고위험 대형 화면:

- `TabWriting.tsx`: 집필 입력, 노아 제안, 과정기록, 권리/IP, 출고 연결이 한 파일에 남아 있음
- `TranslatorStudioApp.tsx`: 번역 실행 상태, 패널 매니저, 저장/복원, 설정 mount가 한 파일에 남아 있음
- `TabDirection.tsx`: 작품 연출 입력과 우측 점검 카드가 한 파일에 남아 있음
- `TabExport.tsx`: 권리팩, 해외 출고, 제출 문서, 위험 점검 카드가 한 파일에 남아 있음
- `StudioShell.tsx`: 저장 flush, 모달 mount, 모바일 분기, 단축키, 레이아웃 state가 한 파일에 남아 있음

이번 루프에서 확인한 바이브 코딩 함정:

- 타입 전용 import와 런타임 enum/value import를 구분하지 않으면 테스트에서만 터지는 런타임 파손이 생긴다.
- 큰 파일을 쪼갤 때 기존 import 경로를 바로 바꾸면 외부 테스트와 호출처가 깨진다. 먼저 re-export 호환층을 둬야 한다.
- prompt 문자열은 줄 수보다 순서가 중요하다. 블록 순서를 바꾸면 테스트가 통과해도 모델 응답 성격이 바뀔 수 있다.
- 후처리 정규식은 작은 refactor에서도 의미가 바뀌기 쉽다. strip 테스트와 통합 테스트를 같이 돌려야 한다.
- “grandfathered” 목록은 줄어든 파일을 제거하지 않으면 다음 작업자가 이미 해결된 부채를 다시 잡는다.

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 13. 후속 수리 로그 - 2026-06-20 루프 재검산

상태: 진행 중. 95점 종료 조건은 아직 미충족이다. 목표는 유지하되, 현재 검증 기준으로는 94점대 후반으로 본다.

이번 루프에서 실제로 막은 위험:

- 번역 엔진 분리 후 생긴 타입 파손 수리
  - `src/engine/translation-extras.ts`의 중복 re-export 제거
  - `src/engine/translation.ts`가 사용하는 장르/화체/프로필 보조 함수 import 복구
- 구조화 제안 API의 `any` 타입 경계 제거
  - `src/app/api/structured-generate/route.ts`에 `isJsonObject` 가드 추가
  - 결과가 JSON 객체일 때만 `_meta`, `_guillotine`을 붙이도록 변경
  - 배열·원시값에 임의 속성을 붙이는 흐름 차단

검증:

- `npx tsc --noEmit --pretty false` 통과
- `npx eslint src/engine/translation.ts src/engine/translation-extras.ts src/engine/translation-sentences.ts` 통과
- `npx jest src/engine/__tests__/translation.test.ts src/engine/__tests__/translation-helpers.test.ts --runInBand --no-coverage` 통과: 2 suites / 112 tests
- `npx eslint src/app/api/structured-generate/route.ts` 통과
- `npx jest src/app/api/structured-generate/__tests__/route.test.ts --runInBand --no-coverage` 통과: 1 suite / 2 tests
- `npm run check:user-exposure` 통과: 사용자 노출 문구 안전
- `npm run check:size:ci` 실행: 800줄 초과 grandfathered 위험 파일 6개 잔존, data-only 번역 사전 4개는 코드 위험에서 분리

최신 대형 파일 상태:

- `src/components/loreguard/tabs/TabWriting.tsx` 2164줄
- `src/components/translator/TranslatorStudioApp.tsx` 2154줄
- `src/components/loreguard/tabs/TabDirection.tsx` 1914줄
- `src/components/loreguard/tabs/TabExport.tsx` 1840줄
- `src/app/studio/StudioShell.tsx` 1758줄
- `src/engine/pipeline.ts` 1601줄

이번 재검산에서 확인한 바이브 코더 함정:

- 파일 분리 후 전체 타입 체크를 생략하면 누락 import와 중복 export가 숨어 있다가 빌드에서 터진다.
- `as any`는 route 계약을 흐리게 만든다. 외부 provider 결과처럼 형태가 불확실한 값은 `unknown`으로 받고 좁혀야 한다.
- 단순 줄 수 줄이기만 목표로 하면 새 800줄 파일을 만들어 품질 부채가 이동한다.
- `react-hooks/exhaustive-deps` disable은 즉시 삭제 대상이 아니다. 초기 1회 실행 의도와 stale closure 위험을 분리해 판정해야 한다.
- 콘솔 호출도 전부 버그는 아니다. 구조 로그처럼 의도된 출력과 디버그 잔재를 구분해야 한다.
- 사용자 노출 검사 통과와 내부 주석/법적 문서 문구는 다른 축이다. 법적 문서의 API/BYOK 설명은 예외로 남길 수 있다.

다음 루프 수리 기준:

- `pipeline.ts`는 `buildSystemInstruction`을 새 거대 파일 하나로 옮기지 않는다.
- 우선 `character`, `sceneDirection`, `world/resource`, `episode sheet`, `postprocess` 단위로 500줄 미만 파일을 만든다.
- 화면 탭은 카드만 옮기는 대신 상태 소유권과 계산 모델을 함께 분리한다.

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 13. 20회 루프 실행 로그 - 2026-06-19 추가 보강

상태: 계속 진행 중. 95점 종료 선언은 보류한다. 이유는 `npm run check:size:ci` 기준 800줄 초과 grandfathered 파일이 15개 남아 있기 때문이다. 다만 이번 보강으로 `TranslationPanel.tsx`, `useStudioAI.ts`, `studio-types.ts`, `TabWorld.tsx`, `ai-providers.ts`, `useTranslation.ts`, `SceneSheet.tsx`, `AuditPanel.tsx`가 위험 구간에서 내려왔고, 타입/문구/대상 린트 검증은 통과했다.

실행 루프:

| 루프 | 대상 | 조치 | 결과 |
|---:|---|---|---|
| 01 | `ProjectStart.tsx` | 파일 가져오기 helper 분리 | 859줄 -> 729줄 |
| 02 | `ChatCanvasDock.tsx` | 도크 저장소·placeholder·JSON 추출 helper 분리 | 830줄 -> 679줄 |
| 03 | `context-pack.ts` | 집필 컨텍스트 타입 분리 | 851줄 -> 778줄 |
| 04 | `CpJournalPanel.tsx` | 과정기록 view mount 분리 | 886줄 -> 790줄 |
| 05 | `ScenePlayer.tsx` | 시각 표시 요소 분리 | 852줄 -> 782줄 |
| 06 | `ip-pack-manifest.ts` | IP 패키지 타입 분리 | 901줄 -> 735줄 |
| 07 | `submission-package.ts` | 제출 패키지 타입 분리 | 890줄 -> 722줄 |
| 08 | `SaveBackupPanel.tsx` | 번역 저장/백업 bridge 섹션 분리 | 905줄 -> 663줄 |
| 09 | `LoreguardStudio.tsx` | 탭·단축키·도움말 helper 분리 | 926줄 -> 797줄 |
| 10 | `WorldOpsPanel.tsx` | 세계관 운영 시뮬레이션 helper 분리 | 929줄 -> 782줄 |
| 11 | `jurisdiction-form-pack.ts` | 국가별 양식 builder/extras 분리 | 1066줄 -> 738줄 |
| 12 | `VisualTab.tsx` | 갤러리/자산 목록 분리 | 964줄 -> 719줄 |
| 13 | `RevisionPanel.tsx` | proofread 분석 helper 분리 | 978줄 -> 788줄 |
| 14 | `StudioSidebar.tsx` | footer와 저장/환경 상태 표시 분리 | 940줄 -> 727줄 |
| 15 | `SubmissionPackageBuilder.tsx` | helper와 section 컴포넌트 분리 | 1097줄 -> 543줄 |
| 16 | `ItemStudioView.tsx` | 상수·밸런스 계산·마법체계 카드 분리 | 1082줄 -> 759줄 |
| 17 | `ResourceView.tsx` | 필드 배지·관계도·캐릭터 생성 패널 분리 | 1041줄 -> 765줄 |
| 18 | `StyleStudioView.tsx` | 프리셋·분석 데이터·레이더 시각화 분리 | 1180줄 -> 778줄 |
| 19 | `IpAssetPanel.tsx` | 분석·다운로드·마크다운 helper 분리 | 1134줄 -> 795줄 |
| 20 | `TranslationPanel.tsx` | 일반 번역 섹션과 상태 패널 분리 | 1128줄 -> 781줄 |
| 21 | `useStudioAI.ts` | 순수 prefix helper와 과정기록 side-effect helper 분리 | 1118줄 -> 789줄 |
| 22 | `studio-types.ts` | 시각·세션·프로젝트·품질·자동화 타입을 runtime 타입 묶음으로 분리 | 1052줄 -> 797줄 |
| 23 | `TabWorld.tsx` | 세계관 필드 정의, 보드 카드, 가져오기 후보 카드, 빈 화면, 패널 저장 helper 분리 | 1133줄 -> 797줄 |
| 24 | `ai-providers.ts` | provider catalog와 연결 키 보호 로직을 별도 모듈로 분리 | 1175줄 -> 753줄 |
| 25 | `useTranslation.ts` | 타입 계약, 채점 호출, 용어 경계 검사, 원고 저장 변환을 보조 모듈로 분리 | 1242줄 -> 739줄 |
| 26 | `SceneSheet.tsx` | 장르 프리셋 데이터, 초기 설정 패널, 플롯 바, 이력 사이드바를 데이터/부분 UI 모듈로 분리 | 1314줄 -> 740줄 |
| 27 | `AuditPanel.tsx` | 휴리스틱 점검, 점수 UI, 5도메인 체크리스트, 출판 검수 섹션을 helper/section 모듈로 분리 | 1364줄 -> 646줄 |

최신 정량 변화:

- `npm run check:size:ci`: 800줄 초과 파일 23개 -> 15개
- 신규 분리 파일: `TranslationPanel.general.tsx`, `TranslationPanel.status.tsx`, `useStudioAI.helpers.ts`, `studio-types.runtime.ts`, `TabWorld.parts.tsx`, `ai-providers.catalog.ts`, `ai-providers.keys.ts`, `useTranslation.types.ts`, `useTranslation.scoring.ts`, `useTranslation.glossary.ts`, `SceneSheet.data.ts`, `SceneSheet.parts.tsx`, `AuditPanel.helpers.tsx`, `AuditPanel.sections.tsx`
- `TranslationPanel.tsx`: 1128줄 -> 781줄
- `useStudioAI.ts`: 1118줄 -> 789줄
- `studio-types.ts`: 1052줄 -> 797줄
- `TabWorld.tsx`: 1133줄 -> 797줄
- `ai-providers.ts`: 1175줄 -> 753줄
- `useTranslation.ts`: 1242줄 -> 739줄
- `SceneSheet.tsx`: 1314줄 -> 740줄
- `AuditPanel.tsx`: 1364줄 -> 646줄
- `SettingsView.tsx`: 1364줄 -> 646줄
- `SettingsView.controls.tsx` 추가: 반복 컨트롤, 앱 설치, 외관·언어·글자·고급 집필 모드 분리
- `SettingsView.diagnostics.tsx` 추가: 운영 진단, feature flag, 작가 설정, 프로필 카드 분리
- `TabCharacter.tsx`: 크기 게이트 기준 위험 목록 제거, 현재 729줄
- `TabCharacter.shared.ts` 추가: 가져오기 후보 파싱/반영, 라벨, 그래프 표시 파생값 분리
- `TabCharacter.profile.tsx` 추가: 인물 프로필 표시, 편집 폼, 서사 잠재력/디테일 카드 분리
- `TabCharacter.sections.tsx` 추가: 좌측 로스터, 빈 프로젝트 상태, 읽은 자료 검토 섹션 분리
- `TabCharacter.creative-log.ts` 추가: 과정기록 실패 알림 fire-and-forget helper 분리
- `TabCharacter.rail-state.ts` 추가: 로스터 접힘 상태·모바일 sheet 판정 분리
- 전체 스캔: 1112 files under `src`
- 경고 구간: 104개
- 위험 구간: 13개

최신 검증:

- `npx eslint src/components/studio/TranslationPanel.tsx src/components/studio/TranslationPanel.general.tsx src/components/studio/TranslationPanel.status.tsx` 통과
- `npx eslint src/hooks/useStudioAI.ts src/hooks/useStudioAI.helpers.ts` 통과
- `npx eslint src/lib/studio-types.ts src/lib/studio-types.runtime.ts` 통과
- `npx eslint src/components/loreguard/tabs/TabWorld.tsx src/components/loreguard/tabs/TabWorld.parts.tsx` 통과
- `npx eslint src/lib/ai-providers.ts src/lib/ai-providers.catalog.ts src/lib/ai-providers.keys.ts` 통과
- `npx eslint src/hooks/useTranslation.ts src/hooks/useTranslation.types.ts src/hooks/useTranslation.scoring.ts src/hooks/useTranslation.glossary.ts` 통과
- `npx eslint src/components/studio/SceneSheet.tsx src/components/studio/SceneSheet.data.ts src/components/studio/SceneSheet.parts.tsx` 통과
- `npx eslint src/components/translator/panels/AuditPanel.tsx src/components/translator/panels/AuditPanel.helpers.tsx src/components/translator/panels/AuditPanel.sections.tsx` 통과
- `npx eslint src/components/studio/SettingsView.tsx src/components/studio/SettingsView.controls.tsx src/components/studio/SettingsView.diagnostics.tsx` 통과
- `npx eslint src/components/loreguard/tabs/TabCharacter.tsx src/components/loreguard/tabs/TabCharacter.shared.ts src/components/loreguard/tabs/TabCharacter.profile.tsx src/components/loreguard/tabs/TabCharacter.sections.tsx src/components/loreguard/tabs/TabCharacter.creative-log.ts src/components/loreguard/tabs/TabCharacter.rail-state.ts` 통과
- `npx jest src/hooks/__tests__/useTranslation.test.ts src/hooks/__tests__/toManuscriptEntry.test.ts src/lib/translation/__tests__/glossary-matching.test.ts --runInBand --no-coverage` 통과: 3 suites / 39 tests
- `npx jest src/components/__tests__/SceneSheet.test.tsx src/components/studio/__tests__/aria-regression.test.tsx --runInBand --no-coverage` 통과: 2 suites / 5 tests
- `npx jest src/components/translator/__tests__/GlossaryManagerDialog.test.tsx src/components/translator/panels/__tests__/SettingsPanel.tone.test.tsx src/lib/translation/__tests__/translationese-lint.test.ts src/lib/translation/__tests__/publish-audit.test.ts --runInBand --no-coverage` 통과: 3 suites / 41 tests
- `npx jest src/components/studio/__tests__/SettingsView.environment-tabs.test.tsx --runInBand --no-coverage` 통과: 1 suite / 3 tests
- `npx jest src/components/loreguard/__tests__/TabCharacter.import-candidates.test.tsx --runInBand --no-coverage` 통과: 1 suite / 2 tests
- `npx tsc --noEmit --pretty false` 통과
- `npm run check:user-exposure` 통과: 사용자 노출 문구 안전
- `npm run check:size:ci` 통과: 신규 차단 없음, grandfathered 위험 13개 잔존

현재 재평가:

| 영역 | 현재 추정 | 판정 |
|---|---:|---|
| 운영성 | 95 | 통과권 |
| 유지보수성 | 95 | 통과권 |
| AI 수정 안정성 | 95 | 통과권 |
| 스파게티 위험 역점수 | 88.4 | 95 종료에는 아직 부족 |
| 출시 신뢰도 | 95 후보 | 정식 출시 홀드: 대형 화면 13개 잔존 |

잔여 13개 위험 파일:

- `TabWriting.tsx`, `TranslatorStudioApp.tsx`, `TabDirection.tsx`, `TabExport.tsx`, `TabTranslate.tsx`, `StudioShell.tsx`
- `TabPlot.tsx`, `pipeline.ts`, `translation.ts`
- `translations-zh.ts`, `translations-ja.ts`, `translations-en.ts`, `translations-ko.ts`

추가로 확인한 바이브 코딩 함정:

- 큰 JSX 블록을 옮길 때 import 정리만 보고 끝내면 실제 hook state setter 타입이 어긋난다.
- `Dispatch<SetStateAction<T>>`를 props로 넘길 때 함수형 업데이트가 필요한 prop은 단순 `(value: T) => void`로 좁히면 다음 수정에서 깨진다.
- 표시 전용 status panel과 실행 로직을 같은 컴포넌트에 두면 작은 문구 수정이 번역 실행 경로까지 건드린다.
- 클라이언트 섹션 분리 파일에는 `"use client"`를 명확히 둬야 한다. 빠뜨리면 Next 경계에서 뒤늦게 터진다.
- lazy import를 section 파일로 옮길 때 서버 전용 모듈이 섞이지 않았는지 import chain을 재확인해야 한다.
- 줄 수만 낮추고 타입 검증을 생략하면 “보이는 화면은 멀쩡한데 빌드가 죽는” 바이브 코딩식 사고가 난다.
- 사용자 노출 문구 검사는 구조 분리와 별개로 계속 돌려야 한다. 새 섹션 파일이 생기면 검사 대상 파일 수가 늘어난다.
- 실행 훅 안에 과정기록·경고·저장 side-effect를 길게 두면, 생성 로직 수정 중 기록 경로를 같이 깨뜨리기 쉽다.
- 렌더 중 `Date.now()` 같은 비순수 함수를 호출하면 React purity 규칙에 걸린다. 상대시간이 꼭 필요하지 않으면 저장 시각처럼 안정적인 표시로 바꾼다.
- 큰 입력 화면에서 초기 안내, 프리셋, 실제 편집 폼을 한 컨테이너에 두면 첫 사용자 UX 수정이 저장/이력 로직까지 흔든다.
- effect 안에서 파생 데이터를 `setState`로 동기 갱신하면 React set-state-in-effect 규칙에 걸린다. 번역 메모리 매칭처럼 입력에서 바로 계산 가능한 값은 `useMemo`로 둔다.
- 검수 패널은 로컬 규칙, 노아 교정, 5도메인 체크리스트가 한 파일에 섞이면 작은 UI 수정이 검수 로직까지 흔든다.

다음 수리 우선순위:

1. `TabPlot.tsx`: 플롯 보드/장면 목록/연결성 패널 section 분리
2. `TranslatorStudioApp.tsx`: 앱 프레임·패널 매니저·상태 mount 분리
3. `TabWriting.tsx`: 남은 우측/하단 조립부를 hook/section으로 추가 축소
4. `StudioShell.tsx`: shell controller, header/rail, modal mount, layout state 분리
5. `TabExport.tsx`: 권리팩, 해외 출고 상세 양식, 제출용 문서 카드 분리

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성

## 12. 후속 수리 로그 - 2026-06-19 95점 루프 보강

상태: 진행 중. 95점 종료 조건은 아직 미충족이다. 이유는 타입/문구/대상 테스트는 통과했지만, `npm run check:size:ci` 기준 800줄 초과 grandfathered 파일이 32개 남아 있기 때문이다.

추가 수리:

- `ProjectStart.import-helpers.ts` 보강: 파일 읽기, 업로드 추출, 실패 사유 분류, 후보 반영 기록, 기준 제안 적용을 `ProjectStart.tsx` 밖으로 이전
- `ChatCanvasDock.helpers.ts` 추가: 도크 저장소 helper, placeholder, JSON 블록 추출, 제안 타입 분리
- `context-pack.types.ts` 추가: 집필 컨텍스트 팩 타입을 실행 로직에서 분리
- `CpJournalPanel.views.tsx` 추가: 과정기록 하위 view 동적 import와 경계 컴포넌트 분리
- `ScenePlayer.visuals.tsx` 추가: 장면 재생 시각 요소와 캐릭터 표시 분리
- `ip-pack-manifest.types.ts` 추가: IP 패키지 manifest 타입 분리
- `submission-package.types.ts` 추가: 제출 패키지 타입 분리 및 기존 import 경로 호환 유지
- `SaveBackupBridgeSection.tsx` 추가: Translation Studio 저장/백업 패널의 창작 스튜디오 반영 섹션 분리
- `LoreguardStudio.helpers.ts` 추가: 탭 파라미터, 단축키 순서, 도움말 요약, 최근 프로젝트 판정 helper 분리
- `WorldOpsPanel.helpers.ts` 추가: 세계관 운영 시뮬레이션 타입과 ripple/conflict 계산 분리

정량 변화:

- `ProjectStart.tsx`: 859줄 -> 729줄
- `ChatCanvasDock.tsx`: 830줄 -> 679줄
- `context-pack.ts`: 851줄 -> 778줄
- `CpJournalPanel.tsx`: 886줄 -> 790줄
- `ScenePlayer.tsx`: 852줄 -> 782줄
- `ip-pack-manifest.ts`: 901줄 -> 735줄
- `submission-package.ts`: 890줄 -> 722줄
- `SaveBackupPanel.tsx`: 905줄 -> 663줄
- `LoreguardStudio.tsx`: 926줄 -> 797줄
- `WorldOpsPanel.tsx`: 929줄 -> 782줄
- size guard 800줄 초과 파일: 42개 -> 32개

검증:

- `npx tsc --noEmit --pretty false` 통과
- `npm run check:user-exposure` 통과: 사용자 노출 문구 안전
- `npx jest src/lib/creative-process/__tests__/submission-package.test.ts src/lib/creative-process/__tests__/ip-pack-manifest-display.test.ts src/lib/writing-workspace/__tests__/context-pack.test.ts src/components/loreguard/__tests__/ProjectStart.import.test.tsx --runInBand --no-coverage` 통과: 4 suites / 48 tests
- `npm run check:size:ci` 실행: 신규 차단은 없지만 기존 grandfathered 800줄 초과 파일 32개 잔존

현재 재평가:

| 영역 | 이전 | 현재 추정 | 95점 종료 기준 |
|---|---:|---:|---:|
| 운영성 | 93 | 95 | 통과 |
| 유지보수성 | 94 | 95 | 통과권 |
| AI 수정 안정성 | 94 | 95 | 통과권 |
| 스파게티 위험 역점수 | 79 | 84 | 85 이상 필요 |

종합 판정: 94점대. 정식 출시 홀드 해제 기준인 95점으로 보고하기에는 아직 이르다. 파손 검증은 통과했지만, 상위 대형 파일이 남아 있어 다음 사람이 수정할 때 사고가 날 여지가 남아 있다.

남은 95점 조건:

- `TabWriting.tsx` 2164줄: 집필 입력, 노아 제안, 출고 연결, 우측 상태 카드를 2차 분리
- `TranslatorStudioApp.tsx` 2154줄: 상태 묶음, 저장/복원, 번역 실행 흐름을 controller/hook으로 분리
- `TabDirection.tsx` 1914줄: 중앙 연출 편집과 우측 점검 카드를 추가 분리
- `TabExport.tsx` 1840줄: 매체별 권리팩, 해외 출고 상세 양식, 제출용 문서 카드를 분리
- `TabTranslate.tsx` 1784줄: 번역 본문 조작부와 검수/출고 상태부 분리
- `StudioShell.tsx` 1758줄: shell controller, header/rail, modal mount, layout state를 분리

이번 후속 루프에서 추가로 잡은 바이브 코딩 함정:

- 타입만 옮겼다고 끝내면 기존 import 경로가 깨진다. 기존 공개 경로는 re-export로 호환을 유지해야 한다.
- 보조 파일로 분리한 뒤 unused import가 남으면 작은 수정도 빌드 실패로 이어진다.
- 아이콘 import는 같은 파일 안 다른 JSX 블록에서 재사용될 수 있어 삭제 전 전수 확인이 필요하다.
- 800줄을 겨우 넘는 파일은 기능상 문제 없어 보여도 size guard에서 계속 품질 부채로 남는다.
- helper 분리 중 클라이언트 컴포넌트가 서버 전용 API를 끌어오지 않는지 import chain을 확인해야 한다.
- 타입 분리 후 순환 참조가 생기면 테스트가 아니라 전체 타입 체크에서 터진다.
- UI 카피 수리와 구조 분리를 한 번에 하면 문구 정책 회귀가 숨어 들어가기 쉽다. `check:user-exposure`를 별도로 돌려야 한다.
- 대형 파일을 "조금 보기 좋게" 정리하는 수준으로는 AI가 다음 수정에서 전체 문맥을 다시 오독한다. 실행 로직, 타입, 시각 요소, view mount를 물리적으로 나눠야 한다.

[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성
