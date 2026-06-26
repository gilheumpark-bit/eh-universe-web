# Loreguard AI 채팅 라우팅 버그 전수 감사 리포트

> 일자: 2026-06-26 · 방식: 멀티-에이전트 정적 추적 + 적대 검증 (15 에이전트) · 상태: 기록(수정 보류)
> 트리거: world 탭 세계관 채팅에서 인터뷰 대신 소설 본문이 출력되는 버그 제보

## ① 한 줄 결론

**Loreguard의 14개 채팅 표면 중 `world`·`project` 2개만 버그다.** 두 탭은 인터뷰/상담이어야 할 입력을 공유 핸들러 `useStudioAI.handleSend`로 흘려보내, 디렉티브 태그(`[세계관 설계]`·`[작품 기준선 만들기]`)가 무시된 채 **소설 집필(manuscript) 파이프라인 + 원고 품질게이트 + 재시도 루프**를 탄다. 나머지 8개 채팅 탭은 정상(true negative)이며, 별개로 **로그인→API키 선행 게이팅이 현재 코드에 부재**한 갭이 확인됐다.

## ② 공통 근본원인 (아키텍처)

```
정상 탭 (character/plot/scene/direction):
  ChatCanvasDock.sendChat → streamChat
  + buildTabExpertSystemDirective 주입 (인터뷰 모드) + 품질게이트 없음   ✅

버그 탭 (world/project):
  handleSend → StudioShell.handleSend → useStudioAI.handleSend
  → assembleNoaPrompt(finalAuthorCommand: text) → generateStoryStream (집필)
  → analyzeManuscript + evaluateQuality (원고 품질게이트)
  → while(attempt<=maxAttempts) 재시도 + 지수 백오프              ❌
```

근본원인은 **두 갈래**:

1. **디렉티브 미배선** — `buildTabExpertSystemDirective`(인터뷰 디렉티브)는 `useWritingChat.ts:122` / `context-block.ts:187` / `ChatCanvasDock.tsx:156` / `TabAssistant.tsx:165` **4곳에만** import·주입된다. `useStudioAI.ts`에는 import 자체가 없다.

2. **태그 소비자 부재** — `[세계관 설계]`·`[작품 기준선 만들기]` 태그는 **생산자만 있고 소비자(분기 검사)가 0곳**. `useStudioAI.ts:116-117`은 `text = customPrompt || inputValue || ''`로만 받고, 태그는 `:219`에서 `finalAuthorCommand: text`로 그대로 작가 명령에 삽입되며, `noa-prompt-assembly.ts:45-49`가 이를 "작가 지시 최우선 반영하여 결과물 생성"으로 하드 래핑한다 → 소설 본문 생성 확정.

> 라우팅 결함의 본질은 "분기가 잘못됐다"가 아니라 **"분기 자체가 없다"** — `useStudioAI`는 들어오는 모든 텍스트를 집필 의도로 단정한다.

## ③ 확정 버그 표

| 탭 | 클래스 | 심각도 | 핵심 file:line | 기대 | 실제 |
|---|---|---|---|---|---|
| **world** (TabWorld) | wrong-pipeline | high (0.97) | `TabWorld.tsx:216-221` → `StudioShell.tsx:305-307` → `useStudioAI.ts:116-118/219/256/287/290/253-340` | 노아가 17개 세계관 항목을 확인 질문 1개씩 던지는 인터뷰 (`tab-expert-registry.ts:219-238`) | `[세계관 설계]` 무시 → 집필 + 원고게이트 + 재시도. 소설 출력 |
| **project** (ProjectStart "NOA로 계속") | wrong-pipeline | high (0.95) | `ProjectStart.tsx:283-295`/`230-237` → `useStudioAI.ts:116-118/219/256/287/290/253` | 5문항·각 선택지 3개+기준문 1개 인터뷰 (`ProjectStart.draft-helpers.ts:25-56`) | `[작품 기준선 만들기]` 무시 → 동일 집필 파이프라인. 소설 출력 |

### 검증 신뢰성 (정직 고지)
- 두 버그 모두 **적대검증 4종 반증 시도 전부 실패** → confirmed.
- **project 재시도 증폭은 조건부** (반증 아닌 nuance): `maxAttempts`는 `useStudioAI.ts:225-228`에서 `gateConfig.enabled && autoMode∈{full_auto,confirm}`일 때만 `maxRetries`, 그 외 `1`. 단 `maxAttempts=1`이어도 인터뷰 대신 집필이 도는 핵심 결함은 성립.

## ④ root cause 공유 / 정상 8탭

`project`는 `world`와 root cause 공유(`sharesRootCauseWithWorld: true`): 동일 `useStudio().handleSend` → `useStudioAI.ts:116` → 집필 강제. **한 곳 수정으로 동시 복구.**

정상(true negative): character/plot/scene/direction(ChatCanvasDock+인터뷰 디렉티브), writing(manuscript 설계상 정상), revision(AI 진입 부재·로컬 분석), translate(전용 번역 파이프라인), export(AI 진입 부재).

> 레거시 미마운트 표면(TabAssistant·RightChatPanel·useWritingChat)은 현재 UI 도달 불가(StudioShell.view.tsx:168 early-return)이며 역설적으로 인터뷰 디렉티브가 배선된 쪽. 활성 경로(useStudioAI)에서만 빠졌다.

## ⑤ 로그인 → API키 플로우 갭 + 보강안

### 현재 상태 (갭)
| 결함 | file:line | 내용 |
|---|---|---|
| 진입 가드 부재 | `UnifiedSettingsBar.tsx:78-90` | Key 버튼 `onClick={() => setShowApiKeys(true)}` 인증 가드 0 (`line 21`에서 `useAuth` user 받지만 키 버튼 미적용) |
| 저장 uid 미검사 | `UnifiedSettingsContext.tsx:246-248` | `addSlot → localStorage`, uid 검사 0 |
| 모달 본체 무관 | `APIKeySlotManager.tsx:101-107` | `handleAdd` 인증 무관 |

### 불확실 1건 (정직)
git이 **단일 squash 커밋**(`d3395d8e`)이라 구버전 라인 diff 실측 불가 → "구버전에 가드가 있었다" 직접 증거 없음, "현재 없다"까지만 단언. 참고: `useStudioShellAiAccess.ts:73 hasHostedAiAccess`는 `Boolean(user)` 요구하나 이는 '호스팅 AI' 게이트일 뿐 'BYOK 키 입력' 게이트 아님.

### 보강안 (재작성 아님·최소 가드)
- **(A) 홈** — `UnifiedSettingsBar.tsx:78-90` Key onClick → `if (!user) { signInWithGoogle(); return; } setShowApiKeys(true);` (user·signInWithGoogle 모두 line 21에서 이미 구조분해). 체감 플로우 ~80%.
- **(B) studio** — `setShowApiKeyModal(true)` 직전 user 체크 (`useStudioQuickStart.ts:50,102`/`useStudioImport.ts:206`/`useStudioAI.ts:426`) 또는 `StudioModalBridge.tsx:81-89`에서 `apiKeyOpen && !user` 시 로그인 유도.
- **(C) 선택** — `UnifiedSettingsContext.tsx:246 addSlot` early-return (결합도↑라 보강용).

## ⑥ 권장 수정 순서

| 순위 | 작업 | 대상 | 효과 |
|---|---|---|---|
| 1 | `useStudioAI.handleSend`에 디렉티브 태그 분기 추가 — 태그 감지 시 인터뷰 경로(streamChat+tab-expert)로 우회, manuscript 게이트 skip | `useStudioAI.ts:116-118` + `256/287/290` 조건화 | world+project 동시 복구 |
| 2 | API 키 가드 — 홈 (A) | `UnifiedSettingsBar.tsx:78-90` | 홈 키 등록 복원 |
| 3 | API 키 가드 — studio (B) | `StudioModalBridge.tsx` 또는 호출부 | 우회 차단 |
| 4 | (선택) 저장 방어선 (C) | `UnifiedSettingsContext.tsx:246` | 심층 방어 |

### 1번 수정 시 회귀 주의
- 8개 정상 탭 회귀 확인 필수 — 특히 `writing`은 manuscript가 정상이므로 태그 분기가 writing 입력을 가로채지 않아야 함.
- 적대 케이스: 작가가 본문에 `[세계관 설계]` 문자열을 의도 입력하는 경우 → 입력 **prefix 정확 매칭**으로 오분기 방지.

---

**감사 범위 한계(정직):** 정적 코드 경로 추적 + 적대검증까지가 근거 범위. 동적 런타임 재현(클릭→소설 출력)은 world 탭에서 1회 실측 확인됨(`/api/chat` 73초×N, [Part 1] 소설 출력). 구버전 diff 부재 1건이 유일한 미해소 불확실 비트.
