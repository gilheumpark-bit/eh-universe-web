# AI 생성 속도 최적화 작업지시서

> 생성일: 2026-03-31 | 16개 생성 기능 전수 분석 결과
> 목표: 체감 생성 속도 50%+ 개선

---

## 병목 유형별 요약

| 유형 | 건수 | 영향 |
|------|------|------|
| 순차 호출 (병렬화 가능) | 5건 | **가장 큰 병목** |
| 블로킹 (스트리밍 불가) | 4건 | 체감 속도 |
| 이중 리트라이 (최대 6회) | 전체 구조 | 실패 시 30초 낭비 |
| 타임아웃 불일치 | 전체 구조 | 불필요한 대기 |
| 리트라이 없음 (스트리밍) | 1건 | 생성 손실 |
| 중복 요청 방지 없음 | 전체 | 낭비 |

---

## HIGH 우선순위 (5건)

### 1. QuickStart — 순차 3호출 → 병렬화
- **파일**: `src/hooks/useStudioQuickStart.ts` (45행, 64행)
- **현재**: `await generateWorldDesign()` → `await generateCharacters()` → 순차 (10~20초)
- **수정**: `Promise.all([generateWorldDesign(...), generateCharacters(...)])` (5~10초)
- **이유**: 캐릭터 생성은 장르+시놉시스에만 의존, 세계관 결과 불필요
- **효과**: 첫 경험 5~10초 단축

### 2. 스토리 생성 스트리밍 — 일시적 에러 리트라이 없음
- **파일**: `src/lib/ai-providers.ts` (streamChat 함수, 742행+)
- **현재**: 502/503/504 에러 시 즉시 실패 → 사용자가 다시 클릭
- **수정**: 502/503/504에 1회 자동 리트라이 추가 (429 쿼터 폴백은 이미 있음)
- **효과**: 간헐적 서버 에러로 생성 날아가는 문제 방지

### 3. 챕터 분석 — 단일 거대 스키마 블로킹
- **파일**: `src/app/api/analyze-chapter/route.ts`
- **현재**: 6개 복잡 객체를 한 번에 요청 (characterState, backgroundState, sceneState, soundState, imagePromptPack, musicPromptPack)
- **수정**: 2~3개 병렬 호출로 분리
  - 호출 A: character + scene
  - 호출 B: background + sound
  - 호출 C: imagePrompt + musicPrompt
- **효과**: 3~5초 단축, 부분 결과 먼저 표시 가능

### 4. 번역 채점 — 순수 순차 청크 처리
- **파일**: `src/hooks/useTranslation.ts` (scoreTranslation, 번역 루프)
- **현재**: 청크별 번역→채점→(재생성→재채점) 완전 순차
- **수정**: 3개 청크 동시 처리 (`Promise.all` 배치)
  ```typescript
  // Before: for (const chunk of chunks) { await translate(chunk); await score(chunk); }
  // After: for (let i = 0; i < chunks.length; i += 3) {
  //   await Promise.all(chunks.slice(i, i+3).map(c => translateAndScore(c)));
  // }
  ```
- **효과**: 20청크 기준 40~60% 시간 단축 (5분 → 2분)

### 5. 서버 Autopilot — 9단계 순차 파이프라인
- **파일**: `src/app/api/code/autopilot/route.ts`
- **현재**: planning → coding → reviewing → testing → security → chaos → fixing → documenting → committing (9개 순차)
- **수정**:
  - `reviewing + testing + security + chaos` 4개 병렬화
  - `testing, security, chaos`는 현재 `setTimeout(400)` — 실제 AI 안 부름, 제거 가능
  - `coding`만 `gemini-2.5-pro` (느림), 나머지는 `flash`
- **효과**: 파이프라인 50%+ 단축

---

## MEDIUM 우선순위 (4건)

### 6. 세계관 생성 — 블로킹, 진행률 없음
- **파일**: `src/services/geminiService.ts` (fetchStructuredGemini)
- **수정**: 다단계 프로그레스바 표시 (호출 시작 → 응답 대기 → 파싱 → 완료)
- **효과**: 체감 속도 개선

### 7. 씬 디렉션 — 9필드 복잡 스키마
- **파일**: `src/services/geminiStructuredTaskService.ts` (handleSceneDirection)
- **수정**: 핵심 4필드 먼저 생성 → 나머지 5필드 후속 호출 (또는 드래프트 모드)
- **효과**: 초안 2~3초 빨리 표시

### 8. 오토 리파이너 — 순차 수정 생성
- **파일**: `src/components/studio/AutoRefiner.tsx`
- **수정**: 겹치지 않는 수정 제안 3건 동시 생성
- **효과**: 수정 단계 30% 단축

### 9. 클라이언트 Autopilot — 순차 단계
- **파일**: `src/lib/code-studio/ai/autopilot.ts`
- **수정**: 계획 단계와 1단계 겹치기 (계획이 충분한 컨텍스트 제공 시)
- **효과**: 제한적 개선

---

## 전체 구조 개선 (전체 적용)

### A. 이중 리트라이 제거
- **현재**: 클라이언트 2회 × 서버 2회 = 최대 6회 시도
- **수정**: 서버 리트라이만 유지 (2회), 클라이언트 리트라이 제거
- **파일**: `src/services/geminiService.ts` (fetchStructuredGemini의 retry 루프)
- **효과**: 실패 시 불필요한 30초 대기 제거

### B. 타임아웃 정합
| 레이어 | 현재 | 수정 |
|--------|------|------|
| 클라이언트 structured | 60초 | **35초** (서버 30초 + 5초 버퍼) |
| 클라이언트 streaming | 180초 | 유지 (소설 생성은 길어도 정상) |
| 서버 structured | 30초 | 유지 |
| 서버 streaming | 120초 | 유지 |

### C. 요청 중복 방지
```typescript
// 각 생성 훅에 추가
const inFlightRef = useRef(false);
const generate = async () => {
  if (inFlightRef.current) return;
  inFlightRef.current = true;
  try { ... } finally { inFlightRef.current = false; }
};
```
- **파일**: `useStudioAI.ts`, `useStudioQuickStart.ts`, `useTranslation.ts`

### D. 구조화 생성 캐시 확대
- **현재 캐시**: worldDesign, worldSim만 (5분 TTL)
- **추가 캐시 대상**: sceneDirection (같은 씬 재요청 빈번)
- **파일**: `src/services/geminiService.ts` (fetchStructuredGemini의 cacheable 조건)

---

## 실행 순서

```
Sprint 1 (즉시 효과, 빠른 수정):
  1. QuickStart Promise.all 병렬화 (30분)
  2. 타임아웃 정합 (15분)
  3. 이중 리트라이 제거 (15분)
  4. 요청 중복 방지 (30분)

Sprint 2 (핵심 기능):
  5. 스트리밍 502/503 리트라이 (30분)
  6. 번역 청크 배치 병렬화 (1시간)
  7. 챕터 분석 분할 (1시간)

Sprint 3 (고급):
  8. 서버 Autopilot 병렬화 (1시간)
  9. 프로그레스바/부분결과 UX (2시간)
```

---

## 검증 방법

각 수정 후:
```bash
npm run build        # 빌드 통과
npx jest --passWithNoTests  # 테스트 regression 0
```

실제 속도 측정:
- 브라우저 DevTools Network 탭 → AI 호출 시간 측정
- QuickStart: 목표 10초 이내 (현재 15~25초)
- 챕터 분석: 목표 5초 이내 (현재 8~12초)
- 번역 20청크: 목표 2분 이내 (현재 4~5분)
