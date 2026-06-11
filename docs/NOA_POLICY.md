# NOA 차등 차단 + 고지 정책 (NOA Block Policy)

> 2026-06-11 (waveN — N2 server-gate · N4 block-policy/notice · X2 8라우트 동기화) 기준.
> 이 문서는 코드와 일치하는 내용만 기술한다. 정본 코드:
> `src/lib/noa/block-policy.ts` · `src/lib/noa/block-notice.ts` · `src/lib/noa/server-gate.ts` ·
> `src/lib/noa/index.ts` (runNoa) · `src/components/studio/NoaBlockNoticeCard.tsx`

## 1. 원칙 (인터뷰 확정 ④)

1. **차등 차단** — 차단 여부는 작품의 PRISM 등급(전체이용가/15+/18+)과 연동된다.
   작품 등급 내 콘텐츠는 통과(기록만), 등급 초과만 BLOCK.
2. **고지 의무** — BLOCK 발생 시 사용자에게 반드시 사유 + 해결 경로를 고지한다.
   **사일런트 차단 절대 금지.**
3. **audit-only 무방해** — 경계 콘텐츠는 통과시키되 audit 체인에 기록만 한다 (사용자 방해 0).
4. **fail-open** — 게이트 *자체의 장애*는 통과시킨다 (가용성 우선). §6 참조.

## 2. 무엇이 차단되고, 무엇이 기록만 되는가

| 구분 | 조건 | 사용자 영향 | 기록 |
|---|---|---|---|
| **BLOCK (차단 + 고지)** | ① Fast-Track 즉결 BLOCK (등급 무관 — 키워드 즉결, `fast-track/`) ② Tactical BLOCK (DeepRed/Black 등급·일일 리스크 예산 소진, `tactical/index.ts`) ③ 정책 매트릭스 BLOCK 셀 (§3) | 생성 중단 + toast/카드/인라인 고지 | 서버 audit 해시 체인 + `apiLog(noa_gate)` + 클라 `csl_noa_audit_log` |
| **AUDIT_ONLY (통과 + 주의 기록)** | 정책 매트릭스 경계 셀 (§3) | 없음 (방해 0) | `recordPolicyAudit('AUDIT_ONLY')` → `csl_noa_audit_log` (severity: medium) |
| **PASS (통과)** | 작품 등급 내 콘텐츠 | 없음 | runNoa 표준 평가 기록 (모든 평가는 항상 기록됨 — `index.ts` recordAuditEntry + auditManager) |
| **출력 IP 검출 (기록만)** | 스트림 완료 후 상표/IP 매치 (`wrapStreamWithIpAudit`) | 스트림 안 깨짐 — SSE 스트림(`/api/chat`·`/api/code/autopilot`)은 말미 `noa.ipNotice` 이벤트 1개. **`format: 'text'` plain-text 스트림(`/api/translate`)은 인밴드 고지 X — 주입 시 번역 본문이 오염되므로 audit 로깅만** (설계 제약 — 정직 보고) | `apiLog(noa_ip_detected_post_stream)` |

## 3. 등급 연동 표 (판정 × 작품 등급)

정본: `src/lib/noa/block-policy.ts` `BLOCK_POLICY_MATRIX` (보수적 기본값 — 근거는 코드 주석).
NOA 9 리스크 등급 (Platinum=최저 위험 → Black=최고 위험) × PRISM 3 작품 등급:

| NOA 등급 (risk) | 전체이용가 (all-ages) | 청소년 15+ (teen-15) | 성인 18+ (mature-18) |
|---|---|---|---|
| Platinum / Gold / LightGold (≤15) | PASS | PASS | PASS |
| Silver (15~25) | AUDIT_ONLY | PASS | PASS |
| Lime (25~35) | **BLOCK** | AUDIT_ONLY | PASS |
| Orange (35~45) | **BLOCK** | **BLOCK** | AUDIT_ONLY |
| Red (45~60) | **BLOCK** | **BLOCK** | AUDIT_ONLY |
| DeepRed / Black (60+) | **BLOCK** | **BLOCK** | **BLOCK** |

- DeepRed/Black 은 tactical layer 가 등급 무관 BLOCK 하는 구간과 정합 (실제 위해·불법 수준 —
  mature-18 가드도 "core API illegal content" 는 허용하지 않음, `safety-registry.ts`).
- `decideBlockPolicy(noa등급, 작품등급)` / `decideFromNoaResult(runNoa결과, 작품등급)` 로 노출.
  NOA 하드 차단(allowed=false)은 정책으로 완화 불가 (보안 우선).
- **서버 게이트 실행 지점** (`server-gate.ts` `applyNoaGate` — 적용 라우트 **8개 전부**):
  ① `/api/complete` ② `/api/structured-generate` ③ `/api/gemini-structured`
  ④ `/api/analyze-chapter` ⑤ `/api/translate` ⑥ `/api/image-gen`
  ⑦ `/api/code/autopilot` ⑧ `/api/cron/universe-daily` (서버 내부 cron — 사용자 표면 없음,
  차단 시 `ok:false` + blocked 계약 로깅).
  runNoa 평가 후 `decideFromNoaResult(noaResult, workGrade)` 로 이 매트릭스를 **실제 차단 결정에
  적용**한다. `workGrade` 는 요청 `prismMode` 우선, 미전달 시 도메인 의미 정합 열
  (`education → all-ages` / `creative → mature-18` / 그 외 `teen-15`).
  ※ `/api/chat` 은 게이트 적용 라우트지만 레거시 403 계약 (§4.2) — applyNoaGate 가 아닌
  route 자체 runNoa + `wrapStreamWithIpAudit` 경로.
  - BLOCK 셀: 하드 차단(allowed=false)이면 안전 정책 문구, 매트릭스 차단(등급 초과)이면
    `buildBlockedPayload` 고지 문구(해결 경로 포함) + `gradeRequired`(매트릭스 완화 힌트) 반환.
  - AUDIT_ONLY 셀: 통과 + `apiLog(noa_policy_audit)` 기록 (사용자 방해 0).
- **등급 차등 1차 구현** (`server-gate.ts` `gradeToDomain`): PRISM 등급을 runNoa 도메인
  가중으로 매핑해 같은 입력도 등급별로 다른 리스크 점수가 나오게 한다 —
  `ALL → education(×1.3, 최엄격)` / `T15 → general(×1.0)` / `M18 → creative(×0.1, 최완화)`.
  (`/api/chat` 의 기존 매핑 `route.ts` 와 의미 동일.) 매트릭스는 그 위의 2차(최종) 결정층.

## 4. 차단 응답 계약 (서버 → 클라이언트)

### 4.1 표준 계약 — applyNoaGate 적용 8 라우트 전부

`/api/complete` · `/api/structured-generate` · `/api/gemini-structured` · `/api/analyze-chapter` ·
`/api/translate` · `/api/image-gen` · `/api/code/autopilot` · `/api/cron/universe-daily`

HTTP **200** + JSON (403 아님 — 클라가 고지 UI 를 띄울 수 있게):

```json
{ "blocked": true, "reason": "<사용자 언어 문장>", "gradeRequired": "T15" | "M18" | null }
```

- `reason`: 사용자 언어 문장만. 내부 판정 상세(grade label·tactical path·risk score)·시크릿 비노출.
- `gradeRequired`: 통과 가능성이 있는 다음 완화 등급 힌트. `null` = 어느 등급에서도 불가
  (fast-track 즉결 차단 등 — 표현 자체 수정 필요).
- namespace 는 `'ALL'|'T15'|'M18'`(server-gate) 와 `'all-ages'|'teen-15'|'mature-18'`(PrismLevel)
  둘 다 유효 — 클라 type guard `isBlockedPayload` 가 양쪽 모두 수용, `normalizePrismGrade` 로 정규화.

### 4.2 레거시 계약 — `/api/chat` (기존 유지)

HTTP **403** + `{ error, noa: { grade, path, reason, auditId } }` (`chat/route.ts`).
클라이언트(`ai-providers.ts` streamViaProxy)가 이를 친화 문구로 변환 + **동일 고지 채널 발화**.
스트리밍이 아닌 200+JSON 본문이 오는 경우도 차단 계약 검사를 수행한다 (이행기 호환).

`/api/chat` 을 streamViaProxy 없이 직접 호출하는 표면(`StyleStudioView.tsx` 문체 변환 ·
`translator/panels/ChatPanel.tsx` 번역 채팅)은 `checkBlockedLegacy403`(`block-notice.ts`)으로
같은 403 계약을 식별한다 — 내부 코드(FAST_TRACK_BLOCK/TRINITY_BLOCK/BUDGET_EXCEEDED)를
사용자 언어 문구로 변환 + `notifyNoaBlock` 동일 고지 채널 발화 (내부 코드 비노출).

## 5. 고지 의무 — 적용 표면 (사일런트 차단 금지)

차단 수신 시 `notifyNoaBlock`(`block-notice.ts`)이 **항상** 발화:

1. `noa:toast` (error variant) → loreguard `ToastHost` (LoreguardStudio 마운트)
2. `noa:block-notice` → `NoaBlockNoticeCard` 안내 카드 (StudioShell 마운트 — 사유 + "등급 변경/표현 조정" 해결 경로)
3. 차단 사실을 `csl_noa_audit_log` 에 기록 (`recordPolicyAudit('BLOCK')`)

추가로 표면별 **인라인** 표시:

| 표면 | 경로 | 인라인 처리 |
|---|---|---|
| 채팅 (전 provider) | `ai-providers.ts` streamViaProxy | `NoaBlockedError` throw → 집필 채팅(`useWritingChat`)은 어시스턴트 말풍선에 사유 표시 |
| 인라인 자동완성 | `useInlineCompletion.ts` | 고지 후 제안 없음 처리 |
| 플롯 비트 제안 | `TabPlot.tsx` | 기존 `aiError` 인라인 에러로 사유 표시 |
| 연출 제안 | `TabDirection.tsx` | 기존 `aiError` 인라인 에러로 사유 표시 |
| 퇴고 진단 | `RevisionPanel.tsx` | 기존 에러 영역에 사유 표시 |
| 번역 채점 | `useTranslation.ts` scoreTranslation | 에러 표면화 (기존 폴백 경로) |
| 출판 교정 | `publish-audit.ts` runAIAudit | 고지 후 빈 결과 |
| 번역 채팅 | `translator/panels/ChatPanel.tsx` | `errorLine` 인라인 표시 |
| 문체 변환 | `StyleStudioView.tsx` | 결과 영역에 사유 표시 |
| 번역 스튜디오 본 번역 | `TranslatorStudioApp.tsx` requestTranslation | `checkBlockedJson` → throw — 호출측 alert 에 사유 표시 (빈 결과 금지) |
| 다국어 배치 번역 | `translator/panels/MultiLangBatchPanel.tsx` | `checkBlockedJson` → throw — 언어별 error 상태에 사유 표시 (JSON 리터럴 덤프 금지) |
| 회차 자동 분석 | `studio/ChapterAnalysisView.tsx` | `checkBlockedJson` → `showAlert` 에 사유 표시 (필드 침묵 금지) |

고지 문구 원칙 (`getBlockNoticeMessage`): 정직 — 무엇이/왜 중단됐는지 사실 서술. 비난조 금지.
해결 경로 제시 — "표현을 조정하거나, 작품 설정에서 등급을 {X}(으)로 변경". 4언어 (ko/en/ja/zh).

## 6. fail-open 원칙 (`server-gate.ts` 주석과 동일)

- **콘텐츠 게이트(runNoa) 자체 장애** → fail-open (통과) + `apiLog(noa_gate_error)`.
  게이트 버그가 전 AI 기능을 죽이는 것보다 통과가 낫다.
- **IP 필터(filterTrademarks) 장애** → fail-open (원문 반환) + `apiLog(noa_ip_filter_error)`.
  필터 실패가 생성 차단보다 낫다.
- fail-open 은 "게이트 코드가 throw 한 경우"에만 적용 — 게이트가 정상 작동해 BLOCK 판정을
  내린 경우는 당연히 차단된다.
- 클라이언트 고지 모듈은 window 부재 환경에서 이벤트 발화만 skip (차단 자체는 서버 결정 — 약화 없음).

## 7. audit 기록 위치

| 위치 | 내용 | 저장 |
|---|---|---|
| 서버 — runNoa 해시 체인 | 모든 평가 (allowed/blocked·HMAC 체인) | 세션 메모리 (`audit/`) |
| 서버 — apiLog | `noa_gate`(지연 ms 포함)·`noa_gate_error`·`noa_ip_*` | 서버 로그 |
| 클라 — `csl_noa_audit_log` | 평가 기록 + 정책 기록(`block-policy` layer: BLOCK/AUDIT_ONLY) | localStorage (최대 5,000건, `audit-report.ts` — 보안 대시보드/보고서 소스) |
