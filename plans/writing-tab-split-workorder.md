# 집필 탭 — 소설 입력창 / AI 채팅 패널 분리 작업지시서

> 생성일: 2026-03-31 | 기준 커밋: master (PR #17 머지 후)
> 담당: Gemini

---

## 현재 문제

1. **소설 입력창이 본문 위에 겹침** — 하단 입력 dock이 소설 내용을 가림
2. **AI 생성 중 채팅 불가** — 소설 생성과 AI 대화가 같은 입력 채널을 공유
3. 사용자가 AI에게 질문하면서 동시에 생성 결과를 보고 싶은데 불가능

## 목표 구조

```
┌──────────────────────────┬─────────────────┐
│  소설 본문 영역            │  AI 채팅 패널     │
│  (읽기 + 편집)            │                 │
│                          │  채팅 히스토리     │
│                          │                 │
│  ┌────────────────────┐  │  ┌───────────┐  │
│  │ 소설 입력창 (하단)    │  │  │ AI 입력창  │  │
│  │ "다음 내용 작성..."   │  │  │ "질문..."  │  │
│  └────────────────────┘  │  └───────────┘  │
└──────────────────────────┴─────────────────┘
```

### 핵심 요구사항
- **소설 입력창**: 본문 영역 내부 하단 고정, 소설 생성 전용
- **AI 채팅 입력창**: 오른쪽 패널 하단, 독립 입력 — 생성 중에도 대화 가능
- **두 입력창은 완전 독립** — 각자 별도 state, 별도 API 호출
- AI 생성 중 소설 입력창은 disabled, AI 채팅 입력창은 활성 상태 유지

---

## 관련 파일

### 현재 구조 파악 필요
```
src/app/studio/StudioShell.tsx        — 메인 셸, 상태 관리
src/app/studio/StudioMainContent.tsx  — 메인 콘텐츠, 탭 라우팅, 하단 입력 dock
src/components/studio/tabs/WritingTab.tsx — 집필 탭 UI
src/hooks/useStudioAI.ts             — AI 호출 훅
```

### 작업 시 참고
- `import { logger } from '@/lib/logger'` 사용 (console.log 금지)
- `import { L4 } from '@/lib/i18n'` 사용 (lang==="ko" 삼항 금지)
- ErrorBoundary: `@/components/ErrorBoundary` (variant prop)
- i18n: 한/영/일/중 4개국어 고려

---

## 작업 단계

### Step 1: 현재 구조 분석
1. `StudioMainContent.tsx`에서 하단 입력 dock 코드 위치 파악
2. `WritingTab.tsx`에서 소설 생성 로직 파악
3. `useStudioAI.ts`에서 AI 호출 상태 관리 파악
4. 현재 입력창이 어디에 렌더되는지, 어떤 state를 쓰는지 확인

### Step 2: AI 채팅 패널 분리
1. `src/components/studio/WritingChatPanel.tsx` 생성
   - 독립 채팅 히스토리 state
   - 독립 입력창
   - AI 호출은 별도 AbortController (생성과 독립)
   - 생성 중에도 질문/답변 가능
2. 레이아웃: WritingTab 오른쪽에 리사이즈 가능 패널로 배치

### Step 3: 소설 입력창 위치 조정
1. 하단 dock에서 소설 본문 영역 내부로 이동
2. 소설 본문 아래 고정 (sticky bottom)
3. AI 생성 중 disabled 상태 + 로딩 표시
4. 본문 내용을 가리지 않도록 scroll 여백 확보

### Step 4: 상태 분리
```typescript
// 소설 생성 상태 (기존)
const { generating, streamText, abortGeneration } = useStudioAI();

// AI 채팅 상태 (신규 — 독립)
const { chatMessages, sendChat, chatLoading } = useWritingChat();
```

### Step 5: 검증
- [ ] `npm run build` 통과
- [ ] `npx eslint .` — 0 errors
- [ ] 소설 생성 중 AI 채팅 가능 확인
- [ ] 소설 입력창이 본문을 가리지 않음 확인
- [ ] 모바일 반응형 확인 (채팅 패널 접기/펼치기)
- [ ] 4개국어 텍스트 확인

---

## 주의사항

1. **기존 집필 기능 깨지면 안 됨** — 소설 생성, 인라인 리라이터, 캔버스 모드 등
2. **채팅 히스토리는 세션별 유지** — 프로젝트 전환 시 초기화
3. **AbortController 분리** — 소설 생성 abort가 채팅을 끊으면 안 됨
4. **토큰 관리** — 채팅과 생성이 동시에 API 호출 시 rate limit 고려
5. **반드시 lint + build 통과 후 PR** — v0처럼 에러 투성이 PR 금지
