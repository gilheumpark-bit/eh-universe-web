# EH Universe Engine 3.8 — 전수 검토 + 발전 전략

**검토일:** 2026-03-26
**대상:** quality-gate.ts, proactive-suggestions.ts, writer-profile.ts, auto-pipeline.ts + UI 2개 + useStudioAI 배선

---

## 1. 배선 현황 (Wiring Status)

| 모듈 | 상태 | 핵심 문제 |
|------|------|----------|
| Quality Gate | ✅ 동작 | `buildRetryHint()` 미사용, 자동 재시도 없음 |
| Proactive Suggestions | ⚠️ 부분 | 메트릭 집계 버그 — 최근 5화 데이터가 전부 동일값 |
| Writer Profile | ⚠️ 부분 | 학습은 하나 `buildProfileHint()` 프롬프트에 미주입 |
| Auto Pipeline | ❌ 고아 | `executePipeline()` 어디서도 호출 안 됨 |
| SuggestionPanel | ✅ 동작 | UI 정상 |
| PipelineProgress | ❌ 데드코드 | 데이터 소스 항상 null |

---

## 2. CRITICAL 버그 3건

### 2-1. Auto Pipeline 완전 미연결

`auto-pipeline.ts` 240줄이 존재하지만 `executePipeline()`이 코드베이스 어디에서도 호출되지 않음. `pipelineResult` 상태는 null로 초기화된 채 업데이트 없음. `PipelineProgress.tsx` UI도 항상 빈 상태.

### 2-2. Suggestions 메트릭 집계 버그

```typescript
// useStudioAI.ts ~183줄
const recentMetrics = (capturedConfig.manuscripts || []).slice(-5).map(() => ({
  // 모든 항목이 현재 report의 동일한 값을 사용
}));
```

`map(() => ...)` — 화살표 함수에 인자를 안 받아서 5개 항목이 전부 **현재 생성 결과**의 동일 메트릭. 과거 에피소드별 개별 데이터가 아님.

### 2-3. Writer Profile 힌트 미주입

`buildProfileHint(profile, isKO)` → 학습된 작가 프로필 기반 프롬프트 힌트 생성하지만, 실제 생성 프롬프트에 주입하는 코드 없음. 학습만 하고 결과를 안 쓰는 상태.

---

## 3. 테스트 커버리지

3.8 모듈 4개 전부 테스트 파일 **0개**. 기존 엔진(`builders`, `hfcp`, `scoring` 등)은 테스트 있음.

---

## 4. 발전 전략: 3.9 → 4.0 로드맵

### Phase 3.9 — 3.8 완성 (버그 수정 + 배선 완료)

| 작업 | 우선순위 | 예상 규모 |
|------|---------|----------|
| Auto Pipeline → useStudioAI 배선 | P0 | 중 |
| Suggestions 메트릭 버그 수정 (개별 에피소드 데이터 사용) | P0 | 소 |
| `buildProfileHint()` → 생성 프롬프트 주입 | P0 | 소 |
| `buildRetryHint()` → Quality Gate 실패 시 자동 재생성 1회 | P1 | 중 |
| 3.8 모듈 4개 유닛 테스트 | P1 | 중 |
| 캐릭터 등장 추적 → 실제 에피소드별 히스토리 | P2 | 중 |
| Suggestion dismiss 상태 localStorage 영속화 | P2 | 소 |

### Phase 4.0 — 자율 서사 엔진

3.8이 "평가+경고" 수준이라면, 4.0은 "자동 개입+자가 수정" 단계.

**4.0-1: Quality Gate Loop (Hard Logic)**

현재: 평가만 하고 결과 저장 → 사용자가 알아서 판단
목표: Gate 실패 시 자동 재생성 (최대 2회), 힌트 자동 주입

```
생성 → Gate 평가 → 실패? → buildRetryHint() 주입 → 재생성 → 2차 평가 → 최종 출력
```

레벨별 차등: beginner는 자동 재생성 ON, advanced는 경고만

**4.0-2: Adaptive Prompt Injection**

Writer Profile 학습 데이터를 실시간으로 프롬프트에 반영:
- 대화 비율이 낮으면 "대화를 더 넣어라" 자동 주입
- 문장 길이가 길면 "간결하게" 자동 주입
- 자주 발생하는 이슈 top 3를 주의사항으로 자동 삽입

**4.0-3: Pre-Generation Pipeline**

Auto Pipeline을 생성 **전**에 실행:
- 세계관 검증 → 캐릭터 동기화 → 연출 확인 → 생성 진행
- 각 단계에서 block/warn/skip 판정
- beginner: block 많이 (실수 방지), advanced: skip 위주 (자율 존중)

**4.0-4: Cross-Episode Memory**

현재: 에피소드 단위로 독립적 평가
목표: 연속 에피소드 간 패턴 추적
- 긴장감 곡선 3화 연속 하락 → 경고
- 특정 캐릭터 5화 연속 미등장 → 경고
- 복선 회수율 추적 → 미회수 복선 알림

### Phase 4.1 — 협업 엔진 (멀티 세션)

- 작가 프로필 공유 (팀 집필)
- 에피소드 간 일관성 검증 크로스체크
- 장르 프리셋 커스텀 + 공유

---

## 5. 아키텍처 개선 제안

### 5-1. 이벤트 버스 도입

현재: `useStudioAI.ts`에 3.8 로직이 직접 인라인
문제: 모듈 추가할 때마다 useStudioAI가 비대해짐

```
제안: EventBus 패턴
생성 완료 → 'generation:complete' 이벤트 발행
→ QualityGate 리스너
→ Suggestions 리스너
→ WriterProfile 리스너
→ AutoPipeline 리스너
```

각 모듈이 독립적으로 구독/반응. useStudioAI는 이벤트만 발행.

### 5-2. 메트릭 스토어 분리

현재: 에피소드별 메트릭이 manuscripts 배열에 산재
제안: `MetricsStore` — 에피소드별 grade, EOS, tension, AI tone 등을 정규화된 구조로 저장. Suggestions와 WriterProfile이 같은 소스에서 읽음.

### 5-3. 레벨 시스템 중앙화

현재: quality-gate, suggestions, auto-pipeline, writer-profile 각각에서 `SkillLevel` 기반 분기
제안: `LevelManager` — 단일 소스에서 레벨 판정, 각 모듈은 레벨 값만 받음.

---

## 6. 즉시 실행 가능한 Quick Win 3개

1. **메트릭 버그 1줄 수정** — `map(() =>` → `map((m) =>` + 각 manuscript의 개별 report 사용
2. **프로필 힌트 주입 3줄** — `buildProfileHint()` 결과를 system prompt에 append
3. **Auto Pipeline 배선 10줄** — 세션 로드 시 `executePipeline()` 호출 + `pipelineResult` 상태 업데이트
