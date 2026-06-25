# Loreguard 구현 플랜 - 수리 루프 3회

작성일: 2026-06-12  
대상: Loreguard Web 신버전  
근거 문서:

- `Loreguard_통합_검증소탕계획서_T0-T15_P0-P11_2026-06-11.md`
- `미진행_대기_작업_계획서_2026-06-12.md`
- `검증계획서_시니어_기겁포인트_2026-06-11.md`
- `계획서_바이브코딩_갭_1-100_2026-06-11.md`
- `사업 프레임/60-외부평가피드백/통합설계본_Loreguard_창작전문IDE_2026-06-12.md`

## 0. 실행 원칙

Loreguard는 AI 소설 생성앱이 아니라 창작 전문 IDE다. 구현은 "더 많이 생성"이 아니라 다음 네 가지를 증명하는 방향으로 진행한다.

1. 작가가 무엇을 결정했는가.
2. 노아가 어디까지 제안했고 어디서 멈췄는가.
3. 어떤 수정이 승인/거절/보류되었는가.
4. 어떤 정본과 증빙이 출고 패키지에 들어갔는가.

릴리스 판정은 정적 통과가 아니라 동작 증거 기준이다.

- Day0/P0 정적 기준선: `npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md`
- 타입 기준선: `npx tsc --noEmit`
- 핵심 변경마다 targeted Jest 또는 런타임 확인을 추가한다.

## 1. 현재 코드 기준 재사용 자산

| 축 | 현재 자산 | 판단 |
|---|---|---|
| 새 셸/탭 | `src/components/loreguard/LoreguardShell.tsx`, `LoreguardStudio.tsx` | 10단계 탭 골격이 이미 있음. 9단계 파이프라인 표현으로 재정렬 가능 |
| 노아 도크 | `src/components/loreguard/ChatCanvasDock.tsx` | 접힘/영속/제안 채택 구조가 있어 레이아웃 A/B의 기반으로 재사용 |
| 집필 툴바 | `src/components/studio/WritingToolbar.tsx` | textarea 기반. Tiptap command bridge가 필요 |
| 원고 에디터 | `src/components/studio/NovelEditor.tsx` | Tiptap 기반. 툴바와 선택 영역 명령 연결 필요 |
| 제출 패키지 | `src/lib/creative-process/submission-package.ts`, `SubmissionPackageBuilder.tsx` | 기반 있음. `final`/`final_clean`/권리 게이트 분리 강화 필요 |
| 증거/확인서 | `src/lib/creative-process/*` | event, registry, report, manifest 기반 있음. Work Receipt 2.0과 연결 필요 |
| 검증 게이트 | `scripts/loreguard-gate-scan.mjs`, `docs/compliance.yml`, `docs/ai-supply-chain.yml` | Day0 기준선 있음. 런타임/음성 테스트는 계속 HOLD |

## 2. 루프 1 - 표면 정리와 기준선 고정

목표: 제품 표면에서 잔재와 가짜 신뢰를 제거하고, 이후 구현이 기대는 기준선을 고정한다.

### 작업

1. `LoreguardShell`의 탭 체계를 설계 문서 기준 9단계로 정렬한다.
   - 프로젝트 생성
   - 세계관 생성
   - 캐릭터·아이템
   - 메인 시나리오
   - 씬시트
   - 연출
   - 집필
   - 퇴고
   - 출고
2. Translation은 Studio 내부 단계가 아니라 별도 표면으로 유지한다.
3. Header/Home 카피에서 `AI 생성앱`, `검증 보증`, `verified`류 과장 표현을 제거한다.
4. `gate:baseline` 결과가 다음을 계속 증명하게 유지한다.
   - Removed Surface Guard: 없음
   - Dangerous Pattern Scan: 없음
   - Static blocker findings: 0
5. `Code Studio`, `Archive`, `Network`, `/codex`, `/rulebook`, `/tools` 재유입을 차단한다.

### 주요 파일

- `src/components/loreguard/LoreguardShell.tsx`
- `src/components/loreguard/LoreguardStudio.tsx`
- `src/components/Header.tsx`
- `src/app/layout.tsx`
- `scripts/loreguard-gate-scan.mjs`
- `docs/gates/day0-baseline-2026-06-12.md`

### 완료 기준

- 제품 표면은 `Home | Studio | Translation | Verify | Settings` 축으로만 설명된다.
- Studio 내부는 9단계 창작 파이프라인으로 보인다.
- Translation은 해외 출고/sign-off 워크벤치로 남는다.
- 삭제된 제품명이 route/nav/action/카피로 돌아오지 않는다.

### 검증

```powershell
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npx tsc --noEmit
```

## 3. 루프 2 - 집필 IDE 조작감과 승인 구조

목표: 수동 모드가 약한 상태를 벗어나고, 노아 제안이 작가 승인 전 본문에 반영되지 않게 한다.

### 작업

1. `WritingToolbar`를 Tiptap command bridge로 확장한다.
   - 기존 textarea fallback은 임시 유지한다.
   - Tiptap editor instance가 있으면 Tiptap 명령을 우선한다.
   - 선택 영역 감싸기, 장면 전환, 들여쓰기, 찾기/바꾸기, undo/redo 상태를 Tiptap 기준으로 연결한다.
2. `NovelEditor`와 `WritingToolbar` 연결 지점을 찾고, textarea-only 경로를 줄인다.
3. 기계결함 감사 순수 함수를 추가한다.
   - 마크다운 잔재
   - 이모지
   - 대사 뭉침
   - 치환 잔해
   - 음절 깨짐/붙음 후보
   - 빈 줄 과다
   - 제목/본문 구분 오류
4. Revision Report 모델을 추가한다.
   - `pending`
   - `accepted`
   - `rejected`
   - `skipped`
5. 승인된 후보만 patch한다.
6. 거절/보류도 Work Receipt에 남긴다.

### 주요 파일

- `src/components/studio/WritingToolbar.tsx`
- `src/components/studio/NovelEditor.tsx`
- `src/components/loreguard/RevisionPanel.tsx`
- `src/lib/creative/*`
- 신규 후보: `src/lib/creative/mechanical-defect-audit.ts`
- 신규 후보: `src/lib/writing-workspace/revision-report.ts`

### 완료 기준

- 수동 집필 모드에서 Tiptap selection 기준 명령이 동작한다.
- 노아 수정 후보는 자동 덮어쓰기를 하지 않는다.
- 기계결함은 자동 수정 후보로 표시 가능하되, 문체/voice/의도는 후보 제안에 머문다.
- 승인/거절/보류 기록이 남는다.

### 검증

```powershell
npx tsc --noEmit
npx jest src/lib/creative --runInBand
```

해당 Jest 경로가 없거나 과도하면 변경 파일에 맞는 targeted test를 추가/조정한다.

## 4. 루프 3 - 출고/IP Pack, 증거 사슬, 준법 게이트

목표: 원고를 파일에서 끝내지 않고 제출 가능한 IP Pack으로 묶는다.

### 작업

1. `final`과 `final_clean` 계약을 분리한다.
   - `final`: 검증 블록, 주석, 과정기록 참조를 포함할 수 있는 작업본
   - `final_clean`: 플랫폼/출판사 제출용 본문
2. IP Pack manifest에 다음을 연결한다.
   - 창작 과정 확인서
   - Work Receipt 요약
   - 인간 창작 기여 장부
   - 노아 사용 요약
   - 원자료 권리 체크
   - 위험 레지스터
   - Verify 링크
3. 준법 게이트 L0-L7 상태 모델을 적용한다.
   - L0 원자료 권리 접수
   - L1 인간 창작 기여 확인
   - L2 공개/고지 분류
   - L3 개인정보/비공개 처리
   - L4 저작권 주장 문구 가드
   - L5 관할 출고 프로필
   - L6 매니페스트/Verify 확인
   - L7 보관/삭제 정책 확인
4. Verify 공개/비공개 정책을 고정한다.
   - 공개 기본: 작품명, 표시명, 확인서 ID, 발급 시각, hash, 단계별 승인 요약, 노아 개입 범위
   - 비공개 기본: 원문 전문, 프롬프트 전문, 미공개 설정, 개인정보, 계약 단가, 외부 원자료 원문
5. `compliance.yml`과 `ai-supply-chain.yml`의 HOLD 항목을 코드/테스트 기준으로 하나씩 줄인다.

### 주요 파일

- `src/lib/creative-process/submission-package.ts`
- `src/lib/creative-process/report-builder.ts`
- `src/lib/creative-process/c2pa-ready-manifest.ts`
- `src/lib/creative-process/c2pa-ready-manifest-verify.ts`
- `src/lib/creative-process/types.ts`
- `src/components/studio/SubmissionPackageBuilder.tsx`
- `src/app/verify/page.tsx`
- `docs/compliance.yml`
- `docs/ai-supply-chain.yml`

### 완료 기준

- 출고 전 HOLD/BLOCKED 항목이 UI와 패키지 요약에 표시된다.
- 원자료 권리가 누락된 자료는 기본 출고물에 들어가지 않는다.
- 확인서와 IP Pack은 법적 보증이 아니라 기록/확인/위험 정리로 표현된다.
- public Verify는 민감정보를 기본 비공개로 둔다.

### 검증

```powershell
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npx tsc --noEmit
```

추가로 register -> verify, tamper negative, export manifest round-trip 테스트를 붙인다.

## 5. 루프별 차단 게이트

| 루프 | 차단 조건 | 우선 수리 |
|---|---|---|
| 루프 1 | 삭제된 제품 표면 재등장, 위험 패턴, static blocker | 라우트/nav/카피/게이트 수정 |
| 루프 2 | Tiptap 명령 미동작, 노아 자동 덮어쓰기, 승인 로그 부재 | command bridge, revision queue, receipt 연결 |
| 루프 3 | final/final_clean 미분리, 권리/고지/Verify 누락, 보증성 카피 | package contract, compliance gate, public/private verify |

## 6. 이번 목표의 현실적 완료 정의

3회 수리 루프 완료는 다음 증거가 있어야 한다.

1. 루프 1 산출물: 제품 표면 정리와 `gate:baseline` PASS.
2. 루프 2 산출물: Tiptap 수동 편집 강화, 기계결함 감사, Revision Report/승인 기록.
3. 루프 3 산출물: `final`/`final_clean`, IP Pack/준법 게이트, Verify 공개/비공개 분리.
4. 각 루프 후 `npx tsc --noEmit` 통과.
5. touched behavior에 targeted test 또는 명시적 runtime 증거가 존재.

이 중 하나라도 빠지면 전체 목표는 PASS가 아니라 HOLD다.

## 7. 진행 기록 - 2026-06-12 로컬 수리

### 루프 2 수동 집필 Tiptap bridge 보강

- `src/components/studio/WritingToolbar.tsx`에 선택적 `getTiptapEditor` bridge를 추가.
- Tiptap editor가 준비된 경우 강조 괄호, 장면 전환 삽입, 들여쓰기/내어쓰기, 찾기 이동, 단건/전체 바꾸기를 ProseMirror selection 기준으로 처리.
- Tiptap editor가 없으면 기존 textarea fallback을 그대로 유지.
- `src/components/studio/tabs/writing/EditModeSection.tsx`에서 `NovelEditorHandle.getEditor()`를 toolbar bridge에 연결.
- 텍스트 변환 핵심 계약은 순수 함수로 분리해 regression test를 추가.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src/components/studio/__tests__/WritingToolbar.text-ops.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
```

결과:

- 타입 통과.
- 1 suite / 4 tests 통과.
- Next build 통과.

주의:

- 이 보강은 `WritingToolbar`가 연결된 Studio edit surface의 Tiptap command bridge다.
- 현재 Loreguard `TabWriting`의 새 `plain/blocks` 표면은 별도 자체 UI를 사용하므로, block-mode 전용 toolbar 고도화는 후속 독립 작업으로 남긴다.

### 루프 2 보강

- `src/lib/creative/mechanical-defect-audit.ts` 추가.
- `RevisionPanel`에 기계결함 감사 결과를 수동 정리 승인/보류 큐로 연결.
- 본문 자동수정은 만들지 않고, 결정만 Work Receipt 경로에 남기도록 유지.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src/lib/creative/__tests__/mechanical-defect-audit.test.ts src/lib/creative/__tests__/qa-auditor.test.ts src/lib/creative/__tests__/work-receipt-journal.test.ts src/lib/writing-workspace/__tests__/revision-decision-record.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
```

결과: 타입 통과, 4 suites / 38 tests 통과.

### 루프 3 보강

- `submission-package.ts`에 `manuscript-final-md`와 `manuscript-final-clean-md`를 추가.
- 기존 `manuscript-md`는 호환용으로 유지.
- `final`은 과정기록 참조와 회차 헤더를 포함할 수 있는 작업 정본으로 분리.
- `final_clean`은 플랫폼/출판사 제출용 clean 정본으로 분리하고, 과정기록 참조 라인을 제거.
- digital-signature artifact hash manifest에 새 아티팩트까지 포함.
- `src/lib/creative-process/ip-pack-manifest.ts` 추가.
- IP Pack manifest에 아티팩트 목록, 공개 Verify 정책, 비공개 필드, 과정기록 요약, Work Receipt counts-only 요약, 원자료 권리 체크, 위험 레지스터를 연결.
- IP Pack manifest는 원고 전문, 프롬프트 전문, Work Receipt 사유/본문을 포함하지 않는 계약으로 고정.
- digital-signature artifact hash manifest에 IP Pack manifest까지 포함.
- `gate:baseline` T11 문구가 `final/final_clean contract`와 `IP Pack public/private manifest evidence attached`를 반영하도록 갱신.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src/lib/creative-process/__tests__/submission-package.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

결과: 타입 통과, 1 suite / 28 tests 통과, build 통과, Day 0 static baseline PASS.

추가 검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src/lib/creative-process/__tests__/submission-package.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

결과: 타입 통과, 1 suite / 29 tests 통과, build 통과, Day 0 static baseline PASS.

주의:

- `e2e/loreguard-submission-package-export-verify.spec.ts`는 새 아티팩트 2종을 기대하도록 갱신됨.
- 로컬 Playwright 재실행은 Windows Temp 권한 이슈 해결 후 테스트 단계까지 진입했으나, 다운로드 수집 단계가 명령 타임아웃까지 종료되지 않아 이번 기록에서는 통과 증거로 사용하지 않는다.
- Release verdict는 여전히 HOLD다. 남은 항목은 signed C2PA Manifest Store, 외부 chain, live Stripe, 배포/staging replay, 법무 검토, live provider attestation이다.

### T11 C2PA-ready round-trip 보강

- `src/lib/creative-process/c2pa-ready-manifest-verify.ts` 추가.
- `c2pa-ready-manifest` artifact의 kind, C2PA 2.4 JSON assertion payload 호환성, `officialC2paManifestStore=false`, asset hash, certificateId, process-record hash, repository receipt를 패키지 내부 값과 대조.
- 변조 케이스 `asset-hash-mismatch`, `official-manifest-store-claim`을 targeted Jest로 고정.
- `gate:baseline` T11 문구가 `C2PA-ready round-trip evidence attached`를 반영하도록 갱신.

주의:

- 이 보강은 로컬 JSON round-trip 증거다. signed C2PA Manifest Store, X.509/claim 서명 체인, 외부 저장소 검증은 별도 인프라가 필요하므로 Release verdict는 HOLD다.

### T15 인간 책임 경계 보강

- `src/lib/creative-process/human-accountability-audit.ts` 추가.
- `work-receipt-journal` artifact 또는 직접 주입된 Work Receipt entries를 재생해 승인/보류 결정의 누락, 중복, 상충, receipt 불일치를 검증.
- 음성 테스트로 `conflicting-decision`, `missing-human-decision`, `receipt-decision-mismatch`, `missing-work-receipt-journal`을 고정.
- `gate:baseline`에 `T15 human accountability` 행을 추가해 decision-only UI, Work Receipt package artifact, IP Pack counts-only summary, human accountability audit replay 증거를 추적.

주의:

- 이 보강은 로컬 audit replay 증거다. 실제 사용자 집필 세션에서 나온 staged/live Work Receipt export replay는 별도 실행 증거로 남겨야 한다.

### T15 브라우저 author-session 패키지 리플레이 보강

- `e2e/loreguard-submission-package-export-verify.spec.ts`에 작가 승인/보류 Work Receipt 저널 fixture를 추가.
- `/studio` 브라우저 세션에서 투고 패키지를 생성하고, `work-receipt-journal` artifact가 `loreguard.work-receipt-journal.v1` / `internal-process-evidence` / 승인 1건 / 보류 1건을 포함하는지 검증.
- 같은 패키지의 `ip-pack-manifest`는 `workReceiptSummary` count만 남기고 승인/보류 사유와 receipt id를 포함하지 않는지 검증.
- `gate:baseline` T15 문구가 browser author-session Work Receipt package replay 증거를 반영하도록 갱신.

주의:

- 이 보강은 로컬 브라우저 리플레이 증거다. 배포/staging 환경의 실제 사용자 집필 세션 run artifact는 여전히 Release HOLD 항목이다.

### T13 메모리·벡터 오염 보강

- `src/lib/translation/episode-memory.ts`의 `buildMemoryPromptHint`에 memory field sanitizer 추가.
- 저장된 용어/번역값이 `[SYSTEM]`, `USER:`, `ignore previous instructions`, system prompt 노출 요구 같은 prompt-control token을 포함해도 프롬프트 힌트로 그대로 승격되지 않게 중화.
- 긴 오염 문자열은 제한 길이로 절삭해 prompt stuffing 위험을 낮춤.
- 기존 `chat-memory-policy`의 hash-chained summary와 함께 `gate:baseline` T13 행에 로컬 증거로 연결.

주의:

- 이 보강은 로컬 메모리 힌트 오염 방지다. 외부 vector DB tenant isolation, stale vector invalidation, 운영 RAG 재색인 replay는 별도 증거가 필요하다.

### T12 공급망 보강

- `scripts/loreguard-supply-chain-scan.mjs`가 `package-lock.json` 기반 SBOM-lite를 생성하도록 확장.
- 같은 기준 JSON에 local build provenance를 함께 기록하도록 확장.
- `docs/ai-supply-chain.yml`의 SBOM/provenance 항목을 `planned`에서 local evidence attached 상태로 갱신.
- `gate:baseline` T12 문구가 `lockfile SBOM`과 `local build provenance` 부착을 반영하도록 갱신.

검증:

```powershell
npm run gate:supply-chain -- --write docs/gates/ai-supply-chain-baseline-2026-06-12.json
node --check scripts/loreguard-supply-chain-scan.mjs
node --check scripts/loreguard-gate-scan.mjs
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npx tsc --noEmit
npm run build
```

결과: 공급망 기준 JSON 생성 통과, SBOM 1549 packages / provenance materials 13 확인, Day 0 static baseline PASS, build 통과.

주의:

- T12는 여전히 HOLD다. 남은 항목은 live provider model attestation, eval diff, CI-signed provenance다.

### T12 eval diff 보강

- `docs/evals/loreguard-offline-eval-cases-2026-06-12.json` 추가.
- 20개 오프라인 회귀 케이스로 writing agent guard, JSON-only 출력 계약, 4개 창작 도메인 prompt 출력 계약, 금지 신뢰/저작권 보증 카피 유입을 점검.
- `scripts/loreguard-supply-chain-scan.mjs`가 eval suite를 실행하고, 실패 시 `HOLD_EVAL_DIFF_FAILED`로 판정하도록 확장.
- `docs/ai-supply-chain.yml`의 eval 상태를 `OFFLINE_EVAL_DIFF_ATTACHED`로 갱신.
- `gate:baseline` T12 문구가 offline eval diff 부착을 반영하도록 갱신.

검증:

```powershell
node --check scripts/loreguard-supply-chain-scan.mjs
node --check scripts/loreguard-gate-scan.mjs
node scripts/loreguard-supply-chain-scan.mjs --write docs/gates/ai-supply-chain-baseline-2026-06-12.json
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npx tsc --noEmit
npm run build
```

결과: offline eval diff 20 cases / 0 failed, Day 0 static baseline PASS, build 통과.

주의:

- T12는 여전히 HOLD다. 이제 남은 항목은 live provider model attestation, live model-output eval, CI-signed provenance다.

### T12 CI supply-chain workflow 보강

- `.github/workflows/loreguard-supply-chain.yml` 추가.
- PR/push/workflow_dispatch에서 `npm ci` → scanner syntax check → `npm run build` → `gate:supply-chain -- --write ...` 순서로 공급망 기준 JSON을 생성하도록 정의.
- `loreguard-ai-supply-chain-baseline` artifact에 `docs/ai-supply-chain.yml`, offline eval suite, generated baseline JSON, package lockfiles를 업로드하도록 연결.
- `docs/ai-supply-chain.yml`에 `CI_WORKFLOW_ATTACHED` 항목을 추가.
- `gate:baseline` T12 행이 CI supply-chain workflow 정의 증거를 반영하도록 갱신.

주의:

- 이 보강은 workflow 정의 증거다. 실제 GitHub Actions run artifact와 signed SLSA provenance는 로컬에서 만들 수 없으므로 T12 HOLD 항목으로 남긴다.

### T4~T9 게이트 매핑 정규화

- `scripts/loreguard-gate-scan.mjs`가 T4~T9 행을 직접 생성하도록 보강.
- T4는 `setConfig` lost-update, manuscript merge, hash-chain rapid append no-fork, seal serial race 회귀 테스트를 게이트 증거로 연결.
- T5는 destructive action confirmation/license denial, real Project[] destructive hash-diff restore, manual backup guard, backup-tier orchestration 테스트를 게이트 증거로 연결.
- T6는 Day 0 static baseline PASS와 Release verdict HOLD를 분리하고, full T0-T15 release PASS를 주장하지 않는 `gate:baseline` 구조를 증거로 연결.
- T7은 boot recovery crash/stale-beacon, hook failure, RecoveryDialog decision, multi-tab heartbeat fault 테스트를 게이트 증거로 연결.
- T8은 API structured log coverage, toast/alert a11y delivery, readiness probe, Prometheus-format metrics stub을 게이트 증거로 연결.
- T9는 `compliance.yml` policy-as-test, regulatory profile evaluator, risky public-claim guard, legal page render coverage를 게이트 증거로 연결.
- `docs/gates/day0-baseline-2026-06-12.md`를 재생성해 T0~T15 전 행이 Gate Mapping에 표시되도록 갱신.

검증:

```powershell
node --check scripts/loreguard-gate-scan.mjs
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

결과: Day 0 static baseline PASS, Release verdict HOLD 유지. T4~T9 로컬 증거 행 추가 확인.

주의:

- T4~T9의 로컬 증거는 회귀 테스트와 정적 게이트 기준이다. 배포 멀티워커 replay, live destructive rehearsal, CI fail-on-hold, browser kill/reload, live alert/trace/SLO, qualified legal review는 계속 HOLD다.

### T6 release gate fail-on-hold 보강

- `scripts/loreguard-gate-scan.mjs`에 `RELEASE_VERDICT` 상수를 분리해 Day 0 static baseline과 Release verdict를 명확히 나눔.
- `--fail-on-hold`가 이제 static blocker뿐 아니라 Release verdict `HOLD`에서도 non-zero 종료하도록 `shouldFailForHold()`를 추가.
- `package.json`에 `gate:release` 명령 추가: `node scripts/loreguard-gate-scan.mjs --fail-on-hold`.
- `gate:baseline`은 보고서 생성/현황 확인용으로 0 종료를 유지하고, `gate:release`는 배포 차단용으로 1 종료한다.
- `.github/workflows/loreguard-release-gate.yml` 추가. 수동 실행과 `v*` 태그 push에서 Day 0 gate report를 생성하고 `gate:release`를 실행한다.
- `.github/workflows/a11y.yml`의 axe/Lighthouse 대상에서 삭제된 `/code-studio`, `/codex`를 제거하고 `/docs`, `/verify`로 대체.
- `docs/gates/day0-baseline-2026-06-12.md`의 T6/T8 행을 release workflow와 active-surface a11y/lighthouse workflow 증거로 갱신.

검증:

```powershell
node --check scripts/loreguard-gate-scan.mjs
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npm run gate:release
npm run build
```

결과:

- `gate:baseline`: exit 0, Day 0 static baseline PASS / Release verdict HOLD.
- `gate:release`: exit 1, Release verdict HOLD에서 의도적으로 실패.
- `build`: 통과.

주의:

- 일반 PR CI 전체를 즉시 빨간색으로 만들지는 않았다. `gate:release`는 수동 실행과 릴리스 태그에서 작동한다.
- 실제 GitHub Actions 실행 artifact는 로컬에서 만들 수 없으므로 T6는 live CI run evidence 항목을 계속 HOLD로 남긴다.

### T6 release evidence intake 보강

- `scripts/loreguard-release-evidence-scan.mjs` 추가.
- `docs/release-evidence/*.json` 아래의 외부/staging/live 증거 파일을 `loreguard.release-evidence.v1` 스키마로 검증.
- T0~T15 중 외부 증거가 필요한 16개 requirement를 명시하고, artifact type·environment·checks·hash 형식을 검사.
- `package.json`에 `gate:evidence` 명령 추가.
- `.github/workflows/loreguard-release-gate.yml`이 `docs/gates/release-evidence-status-2026-06-12.json`을 생성하고 Day0 report와 함께 업로드하도록 연결.
- `gate:baseline` T6 문구를 release evidence intake/status gate 증거로 갱신.
- Gate Mapping에는 있었지만 Next Execution Set에 빠졌던 T11 signed C2PA Manifest Store / external provenance-chain next action을 추가.

검증:

```powershell
node --check scripts/loreguard-release-evidence-scan.mjs
node --check scripts/loreguard-gate-scan.mjs
npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json
npm run gate:evidence -- --fail-on-hold
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

결과:

- `gate:evidence`: exit 0, Release evidence verdict HOLD, evidence files 0, HOLD requirements 16.
- `gate:evidence --fail-on-hold`: exit 1이 의도값이며 wrapper 확인에서 expected failure로 검증.
- `gate:baseline`: exit 0, Day 0 static baseline PASS / Release verdict HOLD.

주의:

- 이 보강은 외부 증거를 생성하지 않는다. 외부 증거가 들어왔을 때 누락/형식/해시/환경을 기계적으로 판정하는 intake gate다.

### T6 release evidence intake 조합 조건 보정

- `scripts/loreguard-release-evidence-scan.mjs`의 alternative evidence 판정을 단일 artifact OR에서 evidence group OR로 변경.
- T10은 `agent-runner-disabled-attestation` 또는 `active-agent-runner-denial-trace` 중 하나로 통과 가능.
- T13은 `external-memory-disabled-attestation` 또는 `vector-db-tenant-isolation-replay` + `stale-vector-invalidation-replay` 조합으로만 통과 가능.
- `--self-test`를 추가해 다음 불변식을 스캐너 내부에서 검증:
  - direct required evidence가 전부 있으면 PASS
  - T13 vector replay 하나만 있으면 HOLD
  - T13 vector replay + stale invalidation replay 조합이면 PASS
  - FAIL check가 포함된 evidence는 malformed로 처리
- `docs/release-evidence/README.md`에 alternative evidence group 규칙과 self-test 명령을 추가.

검증:

```powershell
node --check scripts/loreguard-release-evidence-scan.mjs
node --check scripts/loreguard-gate-scan.mjs
npm run gate:evidence -- --self-test
npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

결과:

- `gate:evidence --self-test`: `loreguard.release-evidence-self-test.v1`, status PASS.
- `gate:evidence`: 현재 외부 evidence files 0이므로 HOLD 16 유지.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.

### T6 release verdict 동적 판정 보정

- `scripts/loreguard-gate-scan.mjs`의 고정 `RELEASE_VERDICT = HOLD` 구조를 `computeReleaseVerdict()`로 교체.
- `docs/gates/release-evidence-status-2026-06-12.json`이 `loreguard.release-evidence-status.v1`이고 verdict `PASS`일 때만 Release verdict가 PASS 가능.
- 정적 blocker가 있으면 release evidence PASS보다 blocker가 우선해 Release verdict는 HOLD.
- release evidence status 파일이 없거나, kind가 다르거나, verdict가 HOLD이면 Release verdict는 HOLD.
- `--self-test`를 추가해 computed release verdict의 PASS/HOLD 조건을 내부 검증.

검증:

```powershell
node --check scripts/loreguard-gate-scan.mjs
npm run gate:baseline -- --self-test
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npm run gate:release
```

결과:

- `gate:baseline --self-test`: `loreguard.day0-gate-self-test.v1`, status PASS.
- 현재 release evidence status가 HOLD이므로 `gate:baseline`은 Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:release`: exit 1이 의도값. 외부 evidence PASS 전까지 release 차단.

### T7 브라우저 복구 리플레이 보강

- `e2e/loreguard-recovery-browser-replay.spec.ts` 추가. (historical; current repo baseline 에서는 2026-06-24 정리됨)
- `/studio` 실제 브라우저 표면에서 stale heartbeat + reload 진입 시 `RecoveryDialog`가 열리고 seeded journal/tip이 유지되는지 확인.
- IndexedDB journal chain의 `contentHash`를 고의로 손상시켜 `runBootRecovery`가 손상 엔트리를 `journal_quarantine`으로 격리하고, RecoveryDialog가 부분 손실 경고를 표시하는지 확인.
- 동일 IndexedDB/복구 표면을 쓰는 증거 테스트라 파일 내부 실행은 `serial`로 고정.
- `gate:baseline` T7 행이 local browser reload/storage-corruption replay 증거를 반영하도록 갱신.

검증:

```powershell
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='msedge'
$env:PLAYWRIGHT_TEST_PORT='3019'
npx playwright test e2e/loreguard-recovery-browser-replay.spec.ts --project=chromium --workers=1 --reporter=line

> 2026-06-24 note: 위 명령은 구현 시점 재현 기록이다. 현재 저장소의 활성 Playwright 기준선에는 이 전용 spec 가 포함되지 않는다.
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
npx tsc --noEmit
npm run build
```

결과:

- Playwright T7 browser replay: 2 tests 통과.
- `serial` 지정 후 기본 워커 설정에서도 해당 파일은 1 worker / 2 tests 통과.
- `gate:baseline`: exit 0, Day 0 static baseline PASS / Release verdict HOLD.
- `tsc --noEmit`: 통과.
- `build`: 통과.

주의:

- Playwright 기본 병렬 2워커 실행은 `/studio` 동시 기동과 Windows Temp 권한 제약 때문에 타임아웃이 났다. 저장소 내부 `.tmp`로 TEMP/TMP를 지정하고 단일 워커로 실행해 브라우저 증거를 확보했다.
- 이 보강은 로컬 브라우저 리플레이 증거다. 실제 배포/staging 브라우저 kill/reload 증거는 T7 HOLD 항목으로 남긴다.

### T8 trace/correlation 관측성 보강

- `src/lib/api-logger.ts`가 `request-context`의 `traceId`와 `correlationId`를 자동 첨부하도록 보강.
- 기존 `requestId` 명시 호출은 보존하고, context trace는 `trace_id`로 함께 남기도록 처리.
- error 로그도 동일한 trace 필드를 stderr JSON line에 남기는지 고정.
- `gate:baseline` T8 행이 request-context trace/correlation propagation test를 로컬 증거로 반영하도록 갱신.

검증:

```powershell
npx jest --runTestsByPath src/lib/__tests__/api-logger.test.ts src/lib/observability/__tests__/correlation.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
```

결과: 2 suites / 6 tests 통과.

주의:

- 이 보강은 로컬 로그 상관관계 증거다. 실제 alert routing과 SLO 대시보드/알림 증거는 staging/production 관측 시스템이 필요하므로 T8 HOLD 항목으로 남긴다.

### T0~T15 release evidence template kit 보강

- `scripts/loreguard-release-evidence-scan.mjs`에 외부 증거 템플릿 생성 모드를 추가.
- `--write-templates docs/release-evidence/templates`는 T0~T15의 필수/대체 artifact type별 `.template.jsonc`를 생성한다.
- 템플릿은 `kind: loreguard.release-evidence.v1.template`과 `checks[].status: HOLD`를 사용하므로, 실수로 `.json`으로 저장해도 PASS 증거가 되지 않는다.
- `gate:evidence`는 `.json`만 스캔하므로 `.template.jsonc`는 release evidence count에 포함되지 않는다.
- 단일 요구 템플릿은 `--template <requirementId>`와 `--artifact-type <artifactType>`로 출력 가능하다.
- `package.json`에 `gate:evidence:templates` 명령을 추가.
- `docs/release-evidence/README.md`에 템플릿을 실제 evidence `.json`으로 승격하는 절차를 추가.

검증:

```powershell
node --check scripts/loreguard-release-evidence-scan.mjs
npm run gate:evidence -- --self-test
npm run gate:evidence:templates
npm run gate:evidence -- --write docs/gates/release-evidence-status-2026-06-12.json
npm run gate:baseline -- --write docs/gates/day0-baseline-2026-06-12.md
```

결과:

- `gate:evidence --self-test`: status PASS.
- `gate:evidence:templates`: 27개 `.template.jsonc` 생성.
- `gate:evidence`: 템플릿을 스캔하지 않고 evidence files 0 / HOLD 16 유지.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.

주의:

- 이 보강은 외부 증거 수집 준비물이다. 실제 staging/live/legal/provider/CI 증거를 대체하지 않는다.

### 수동 집필 Tiptap bridge 활성 TabWriting 연결 보강

- `WritingToolbar`에 controlled `findOpen`/`onFindOpenChange`를 추가해 상단 찾기 버튼과 툴바 찾기 상태를 공유할 수 있게 했다.
- `src/components/loreguard/tabs/TabWriting.tsx`의 활성 Loreguard 집필 화면에 `WritingToolbar`를 직접 연결했다.
- plain 표면은 기존 `textareaRef` fallback을 유지하고, blocks 표면은 `NovelEditorHandle.getEditor()`를 통해 Tiptap editor를 우선 사용한다.
- 블록 모드에서 찾기·바꾸기를 비활성화하던 분기를 제거했다. 이제 찾기·바꾸기, 선택 영역 감싸기, 장면 전환, 구분선, 들여쓰기/내어쓰기는 Tiptap 표면에서도 같은 툴바 경로를 탄다.
- 기존 `FindReplaceBar` 기반 plain-only 경로는 활성 화면에서 제거하고, `WritingToolbar`를 단일 수동 편집 툴바로 사용한다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\components\studio\__tests__\WritingToolbar.text-ops.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
```

결과:

- `tsc --noEmit`: 통과.
- `WritingToolbar.text-ops`: 1 suite / 4 tests 통과.
- `build`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.

주의:

- 이 보강은 `미진행_대기_작업_계획서_2026-06-12.md`의 P0 “수동 집필 Tiptap bridge”를 활성 Loreguard 집필 화면까지 연결한 로컬 수리다.
- T0~T15 release HOLD는 외부/staging/live/legal/provider/CI 증거 부족 상태라 계속 유지한다.

### 집필 Style Target/Observed/Delta 표시 보강

- 기존 순수 계측 모듈 `src/lib/creative/style-profile.ts`의 `observeStyle` / `styleDelta` / `styleMatchScore`를 활성 Loreguard 집필 탭에 연결했다.
- `src/lib/creative/style-target-profile.ts`를 추가해 `StyleTab`의 문체 슬라이더(`s1~s4`)를 `StyleTarget` 4지표로 결정적 환산한다.
- 환산 대상:
  - `s1` 문장 길이 -> 평균 문장 길이 목표
  - `s4` 서술 시점 -> 대사 비율 목표
  - `s2` 감정 밀도 -> 설명 허용도 목표
  - `s3` 묘사 방식 -> 리듬 다양성 목표
- `src/components/loreguard/tabs/TabWriting.tsx` 우측 패널에 “문체 목표·실측 (판단용)” 카드를 추가했다.
- 표시는 목표/실측/차이/근접 상태와 match score만 제공하며, 저장·생성·내보내기·회차 이동을 차단하지 않는다.
- 문체 프로필이 없으면 “미설정” 상태로 남기고, 숫자 목표를 임의 생성하지 않는다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\creative\__tests__\style-profile.test.ts src\lib\creative\__tests__\style-target-profile.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `style-profile` + `style-target-profile`: 2 suites / 22 tests 통과.
- `build`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- `dialogueRatio`, `tellTolerance`, `rhythmVariety`는 현 StyleTab에 직접 숫자 입력 필드가 없으므로 슬라이더 기반 환산 목표다.
- 이 보강은 `미진행_대기_작업_계획서_2026-06-12.md` Phase 1의 “style target / observed / delta 표시” 로컬 수리다.
- T0~T15 release HOLD는 외부/staging/live/legal/provider/CI 증거 부족 상태라 계속 유지한다.

### 퇴고 보고서/작가 승인 큐 모델 보강

- `src/lib/writing-workspace/revision-report.ts`를 추가해 로컬 퇴고 신호, 기계적 결함 스캔, AI 퇴고 보고서 후보를 하나의 결정 큐로 정규화했다.
- 보고서 계약은 `loreguard.revision-report.v1`이며 `advisoryOnly: true`, `autoApplyAllowed: false`를 고정한다.
- 로컬 퇴고 신호는 참고 지표로만 표시하고, 기계적 결함과 AI 보고서 후보는 `requiresAuthorDecision: true`로 분리한다.
- 모든 적용 가능 후보는 `revision-decision-record`의 stable key를 사용해 승인/보류/거절 기록 경로와 연결된다.
- `src/components/loreguard/RevisionPanel.tsx`에 “퇴고 보고서 큐” 요약을 추가해 전체 후보, 작가 결정 필요 후보, 기록 완료 수를 표시한다.
- 기존 기계적 결함 후보 변환은 새 순수 모델의 `revisionDecisionFindingFromMechanicalDefect`로 이동해 UI 내부 중복 변환을 제거했다.
- 원고 본문은 자동 수정하지 않는다. 후보 정규화와 승인/보류 기록만 수행한다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\writing-workspace\__tests__\revision-report.test.ts src\lib\writing-workspace\__tests__\revision-decision-record.test.ts src\lib\writing-workspace\__tests__\revision-analysis.test.ts src\lib\creative\__tests__\mechanical-defect-audit.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `revision-report` + 관련 회귀 테스트: 4 suites / 21 tests 통과.
- `build`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- 이 보강은 `미진행_대기_작업_계획서_2026-06-12.md` Phase 2의 “revision-report.ts 모델 초안”과 “퇴고 보고서 -> 작가 승인 -> 적용” 중 보고서/승인 큐 계약을 로컬로 고정한 것이다.
- 실제 자동 적용, diff preview, Work Receipt 영구 저장 UI는 다음 구현 단위로 남긴다.
- T0~T15 release HOLD는 외부/staging/live/legal/provider/CI 증거 부족 상태라 계속 유지한다.

### 퇴고 승인 적용 계획/키 정합성 보강

- `src/lib/creative/mechanical-defect-audit.ts`의 발견 항목에 `length`를 추가해 실제 패치 범위를 추적할 수 있게 했다.
- `src/lib/writing-workspace/revision-apply-plan.ts`를 추가해 승인된 안전 기계결함 후보만 적용 계획으로 변환한다.
- 적용 계획 계약은 `loreguard.revision-apply-plan.v1`이며 `authorApprovedOnly: true`, `beforeHash`, `afterHash`, `patches`, `skipped`, `appliedText`를 포함한다.
- 적용 대상은 명시 승인된 `autoFixSafe` 기계결함 후보로 제한한다. 보이스/문체/AI 보고서 후보는 원고를 직접 바꾸지 않는다.
- `src/lib/writing-workspace/revision-decision-record.ts`에 `buildRevisionDecisionRecordFromKey`를 추가해 보고서 큐가 만든 `decisionKey`를 Work Receipt `fixId`로 그대로 사용할 수 있게 했다.
- `src/components/loreguard/RevisionPanel.tsx`의 기계결함/AI 보고서 승인 버튼이 자체 인덱스 키를 다시 만들지 않고 `revisionReport.findings[].decisionKey`를 사용하도록 고쳤다.
- 상단 “퇴고 보고서 큐”에 적용 가능 후보 수, before/after hash, “승인된 안전 정리 적용” 버튼을 추가했다.
- 적용 시 현재 저장 원고 내용이 적용 계획의 기준 텍스트와 같은 경우에만 `setConfig(prev => ...)` 경로로 해당 회차 원고를 갱신하고, 적용 Work Receipt에 patch 수와 before/after hash를 남긴다.
- 한국어 음절 공백(`broken-hangul-spacing`)은 단어 경계를 확정할 수 없어 적용 후보에서 제외하고 수동 확인 후보로 유지한다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\writing-workspace\__tests__\revision-apply-plan.test.ts src\lib\writing-workspace\__tests__\revision-report.test.ts src\lib\writing-workspace\__tests__\revision-decision-record.test.ts src\lib\creative\__tests__\mechanical-defect-audit.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `revision-apply-plan` + 퇴고/기계결함 회귀 테스트: 4 suites / 20 tests 통과.
- `build`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- `revisionTextHash`는 로컬 적용 전후 비교용 deterministic hash다. 외부 provenance/C2PA 서명 체인을 대체하지 않는다.
- 기계결함 중 안전 적용이 불가능한 항목은 승인되어도 `skipped`로 남기고, 수동 편집 대상으로 유지한다.
- T0~T15 release HOLD는 외부/staging/live/legal/provider/CI 증거 부족 상태라 계속 유지한다.

### final_clean 제출 본문 계약 보강

- `src/lib/creative-process/submission-package.ts`의 `manuscript-final-clean-md` 직렬화를 제출용 본문 계약에 맞게 보정했다.
- `final`은 기존처럼 `계약: final`, 과정기록 참조, 회차 헤더, 작업 정본 안내를 포함할 수 있는 내부/작업본으로 유지한다.
- `final_clean`은 패키지 생성기가 붙이는 `# 작품명`, `> 작가`, `## Episode`, 과정기록 참조, 작업 정본 안내를 넣지 않고 에피소드 본문만 이어 붙인다.
- 본문 자체를 임의 교정하지는 않는다. 작가 원고 안에 남아 있는 표현/마크다운/문체 문제는 퇴고 큐와 기계결함 감사에서 별도 판단 대상으로 남긴다.
- 테스트가 `final`과 `final_clean`의 계약 차이를 직접 검증하도록 보강했다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\creative-process\__tests__\submission-package.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `submission-package`: 1 suite / 32 tests 통과.
- `build`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- `final_clean`은 “제출 본문”만 다룬다. 창작 과정 확인서, Work Receipt, IP Pack manifest, C2PA-ready manifest, regulatory readiness는 별도 아티팩트로 분리된다.
- Release HOLD의 원인은 코드 실패가 아니라 외부/staging/live/legal/provider/CI 증거 부재다.

### final_clean 출고 전 기계결함 감사 연결

- `manuscript-final-clean-md` 생성 직후 `auditMechanicalDefects`를 실행해 `loreguard.final-clean-audit.v1` 리포트를 만든다.
- 새 아티팩트 `final-clean-audit`를 제출 패키지에 포함했다.
- audit 리포트는 `targetArtifactId`, `verdict(PASS/HOLD)`, `checkedTextHash`, severity count, byType, finding summary를 기록한다.
- 원고 본문을 임의로 수정하지 않는다. 감사는 제출 전 작가 검토/퇴고 큐로 넘길 HOLD 증거만 만든다.
- `SubmissionPackageBuilder`는 패키지 생성 후 final_clean 감사 결과를 PASS/HOLD 상태 박스로 보여준다.
- IP Pack manifest는 상세 excerpt를 public verify에 노출하지 않고, `final-clean-audit-hold` 위험 항목만 요약한다.
- `gate:baseline` T11 문구가 final_clean mechanical audit 증거를 반영하도록 갱신했다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\creative-process\__tests__\submission-package.test.ts src\lib\creative\__tests__\mechanical-defect-audit.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
npm run build
node --check scripts\loreguard-gate-scan.mjs
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `submission-package` + `mechanical-defect-audit`: 2 suites / 38 tests 통과.
- `build`: 통과.
- `node --check scripts/loreguard-gate-scan.mjs`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

브라우저 E2E 시도:

```powershell
npx playwright test loreguard-submission-package-export-verify.spec.ts --project=chromium --workers=1 --reporter=line
```

- `C:\tmp` transform cache 권한 문제로 1차 실패.
- 저장소 내부 `.tmp`로 TEMP/TMP/cache를 돌린 뒤 테스트 실행은 시작됐고 3개 케이스까지 진입했다.
- 명령 제한 시간 안에 최종 summary가 나오지 않아 이번 기록에서는 통과 증거로 사용하지 않는다.

주의:

- `final-clean-audit`에는 finding excerpt가 포함될 수 있으므로 public Verify에는 원문/프롬프트와 마찬가지로 노출하지 않는다.
- 이 감사는 기계결함 확인이다. 창작성, 저작권, 법적 준수를 보증하지 않는다.

### 출고 패키지 생성 영수증 연결

- 제출 패키지 생성 행위 자체를 `loreguard.package-issuance-receipt.v1` 아티팩트로 남기도록 했다.
- 새 아티팩트 `package-issuance-receipt`를 패키지 manifest, digital signature hash 대상, IP Pack inventory에 포함했다.
- 영수증에는 `certificateId`, `packageProfile`, `recipientLabel`, 포함 아티팩트 목록, final_clean 감사 verdict, regulatory status count, HOLD 이유를 기록한다.
- `digital-signature`는 영수증 생성 이후 만들어지므로 영수증의 `artifactIds`에는 넣지 않고, 대신 서명 manifest가 영수증 파일 hash를 포함한다.
- IP Pack manifest에는 상세 본문이나 감사 excerpt를 넣지 않고 `export-package-generation-receipt` 역할의 아티팩트 존재만 공개 패키지 단위로 기록한다.
- `gate:baseline` T15 문구가 Work Receipt package artifact와 별도로 package issuance receipt를 확인하도록 갱신했다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\creative-process\__tests__\submission-package.test.ts src\lib\creative\__tests__\work-receipt-journal.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
node --check scripts\loreguard-gate-scan.mjs
npm run build
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `submission-package` + `work-receipt-journal`: 2 suites / 51 tests 통과.
- `node --check scripts/loreguard-gate-scan.mjs`: 통과.
- `build`: 통과.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- 이 영수증은 “패키지를 생성했다”는 과정기록이다. 외부 등록, 법률 검토, C2PA 서명 체인, live provider attestation을 대체하지 않는다.
- Release HOLD의 원인은 로컬 코드 실패가 아니라 외부/staging/live/legal/provider/CI 증거 부재다.

### Work Receipt 2.0 책임 경계/변경량 metadata 보강

- `src/lib/creative/work-receipt.ts`에 `ReceiptContext`, `ReceiptSourceRef`, `ReceiptChangedRange`를 추가했다.
- 표준 영수증 출력에 `[책임 경계]` 블록을 추가해 `taskId`, `role`, `actor`, `approvedBy`, `decision`, source ref, 적용 범위, before/after hash, 변경량을 남긴다.
- `ReceiptMetrics`에 `patchCount`, `changedChars`, `heldCount`를 추가해 원문 대비 변경량과 보류 항목 수를 정량으로 남긴다.
- `src/lib/creative/work-receipt-journal.ts`의 load/save 정규화가 새 metadata를 보존하도록 확장했다.
- `RevisionPanel`의 퇴고 발견 항목 승인/보류는 `author-session`, `revision-report-finding`, 보류 사유를 구조화 metadata로 저장한다.
- “승인된 안전 정리 적용”은 `revision-apply-plan` source ref, 에피소드 artifact, before/after hash, patch 수, 변경 글자수를 구조화 metadata로 저장한다.
- 제출 패키지의 내부 `work-receipt-journal` JSON이 `receiptContext`와 `receiptMetrics` 요약을 보존한다.
- `package-issuance-receipt`도 같은 `[책임 경계]` 계약으로 `export-package-generator`, certificate id, final_clean audit hash, local pass/release hold 결정을 남긴다.
- `gate:baseline` T15 문구가 `Work Receipt 2.0 structured role/range metadata`를 반영하도록 갱신했다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\creative\__tests__\work-receipt.test.ts src\lib\creative\__tests__\work-receipt-journal.test.ts src\lib\creative-process\__tests__\submission-package.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
node --check scripts\loreguard-gate-scan.mjs
npm run build
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `work-receipt` + `work-receipt-journal` + `submission-package`: 3 suites / 65 tests 통과.
- `node --check scripts/loreguard-gate-scan.mjs`: 통과.
- `build`: 통과.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지. T15에 Work Receipt 2.0 metadata 반영.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- `approvedBy: author-session`은 로컬 작가 세션의 결정 경계를 표시하는 값이다. 외부 신원 확인이나 법적 대리 서명을 뜻하지 않는다.
- `changedRange`는 원문 전문을 담지 않고 범위, hash, 변경량만 남긴다.
- 외부/staging/live/legal/provider/CI 증거 16개가 없으므로 Release HOLD는 계속 유지한다.

### Translation sign-off 위임/보류/출고 이력 governance 보강

- `src/lib/translation/author-signoff.ts`에 `SignoffDelegation`, `TranslationReleaseHistoryEntry`, `summarizeSignoffGovernance`를 추가했다.
- Faithful / Market track별로 위임 범위, 위임 만료, 범위 밖 위임, 보류 회차, track별 출고 이력, 마지막 출고 시각을 계산한다.
- `summarizeSignoff`에 `heldChapters`를 추가해 양쪽 track 중 하나라도 출고 승인 미완료인 회차를 1-base로 남긴다.
- `src/lib/translation/signoff-receipt.ts`의 sign-off 영수증에 Work Receipt 2.0 `context`를 연결했다.
- Translation sign-off receipt는 `translation-signoff:{chapter}:{track}`, `role=author`, `actor=translation-studio`, `approvedBy=author-session`, track별 recorded/held 결정을 남긴다.
- sign-off receipt localStorage load/save가 `context`를 보존하도록 보강했다.
- `gate:baseline` T15 문구가 translation sign-off delegation/held/release-history governance를 반영하도록 갱신했다.

검증:

```powershell
npx tsc --noEmit
npx jest --runTestsByPath src\lib\translation\__tests__\author-signoff.test.ts src\lib\translation\__tests__\signoff-readiness.test.ts src\lib\translation\__tests__\signoff-receipt.test.ts --no-coverage --cacheDirectory .\.jest-cache-loreguard
node --check scripts\loreguard-gate-scan.mjs
npm run build
npm run gate:evidence -- --write docs\gates\release-evidence-status-2026-06-12.json
npm run gate:baseline -- --write docs\gates\day0-baseline-2026-06-12.md
npm run gate:release
```

결과:

- `tsc --noEmit`: 통과.
- `author-signoff` + `signoff-readiness` + `signoff-receipt`: 3 suites / 45 tests 통과.
- `node --check scripts/loreguard-gate-scan.mjs`: 통과.
- `build`: 통과.
- `gate:evidence`: evidence files 0 / HOLD 16 유지.
- `gate:baseline`: Day 0 static baseline PASS / Release verdict HOLD 유지. T15에 translation sign-off governance 반영.
- `gate:release`: exit 1. Release HOLD를 배포 차단으로 처리하는 의도 동작.

주의:

- 이 governance는 번역 출고 과정기록이다. 원어민 검수급 품질, 법률 준수, 현지 시장 적합성을 보증하지 않는다.
- 위임이 active여도 보류 회차가 있으면 출고 진행 가능 상태가 아니다.
