# EH Universe Web — QA 수정 대상 보고서

날짜: 2026-03-24
범위: 전체 QA (랜딩 → 가이드 8탭 → 비가이드 → EP.1~25 생성 → 내보내기)

---

## B1 — JSON 메트릭 본문 노출 (P1)

**파일**: `src/engine/pipeline.ts` → `stripEngineArtifacts()` (line 637–654)

**현상**
AI 응답 끝에 엔진 리포트 JSON 블록이 사용자 화면에 그대로 출력됨.
예: `{"grade":"A","metrics":{"tension":87,"pacing":79,...}}`

**원인**
`stripEngineArtifacts()`의 regex 3개(line 639–641)가 중첩 깊이 3이상인 nested JSON을 처리 못함.
`stripTrailingReportJson()`(line 615~634)은 `"grade"` 키를 역방향 탐색하지만, AI가 JSON을 prose 중간에 삽입하거나 메트릭 키 순서가 다를 경우 미처리.

**수정 방향**
- line 640–641의 두 regex를 `s` 플래그 + 그리디 방지 패턴으로 통합 교체.
- `stripTrailingReportJson` fallback으로 `JSON.parse` 시도 후 엔진 키(`grade`, `metrics`, `eosScore`, `active_eh_layer`) 존재하면 통째 제거.
- 스트리밍 중 청크 concat 후 `stripEngineArtifacts` 호출 타이밍(`useStudioAI.ts` line 112)은 유지, 완료 후(line 132) 재적용도 유지.

**검증**
- A등급 응답 5건 DOM 확인 — JSON 블록 없어야 함.
- `stripEngineArtifacts` 단위 테스트: nested 3단계 JSON 입력 → 빈 문자열 반환.

---

## B2 — localStorage 이중 키 + invalid 모델 잔존 (P2)

**파일**: `src/lib/ai-providers.ts` (line 114–198)

**현상**
- `eh-active-model: "gemini-2.5-flash"` (legacy) 와 `noa_active_model: "gemini-2.0-flash"` (신규) 동시 존재 가능.
- `gemini-2.0-flash`는 deprecated → API 호출 실패 유발.
- `getStoredModelForProvider()` line 193: `provider.models.includes(stored)`로 invalid 모델 폴백 처리는 되어 있으나, legacy key(`eh-active-model`)에서 읽은 `gemini-2.5-flash`가 유효 모델이면 `noa_active_model`에 그대로 기록됨.

**실제 동작 확인**
`getStoredModelForProvider()` → `localStorage.getItem("noa_active_model") || localStorage.getItem(LEGACY_MODEL_KEY)` 순서로 읽고, invalid이면 `defaultModel`로 교체 후 `noa_active_model`에 저장, `LEGACY_MODEL_KEY` 삭제 (line 196–198). 폴백 로직은 있음.

**문제 지점**
`getPreferredModel()`(line 206–211)이 `activeProvider !== providerId`일 때 `provider.defaultModel`을 반환하므로, 비Gemini 프로바이더 사용 중엔 Gemini structured API가 항상 `defaultModel`(`gemini-2.5-pro`) 사용 — 의도된 동작이나 문서화 없음.

**수정 방향**
- 앱 초기화(hydration) 시 `eh-active-model` / `eh-active-provider` legacy key 일괄 삭제 + 유효 모델로 마이그레이션하는 `migrateLocalStorage()` 함수 추가.
- 호출 위치: `studio/page.tsx` hydration 완료 이후 1회 실행.
- `migrateLocalStorage` 내에서 `gemini-2.0-flash`, `gemini-2.0-pro` 등 deprecated 모델명 감지 시 `gemini-2.5-pro`로 교체 후 저장.

```ts
// 추가 위치: src/lib/ai-providers.ts
const DEPRECATED_MODELS: Record<string, string> = {
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash-exp': 'gemini-2.5-flash',
  'gemini-2.0-pro': 'gemini-2.5-pro',
  'gemini-pro': 'gemini-2.5-pro',
};

export function migrateLocalStorage(): void {
  if (typeof window === 'undefined') return;
  const legacyModel = localStorage.getItem(LEGACY_MODEL_KEY);
  if (legacyModel) {
    const migrated = DEPRECATED_MODELS[legacyModel] ?? legacyModel;
    const provider = getActiveProvider();
    const safe = PROVIDERS[provider].models.includes(migrated) ? migrated : PROVIDERS[provider].defaultModel;
    localStorage.setItem('noa_active_model', safe);
    localStorage.removeItem(LEGACY_MODEL_KEY);
  }
  localStorage.removeItem(LEGACY_PROVIDER_KEY);
}
```

**검증**
- localStorage에 `eh-active-model: gemini-2.0-flash` 수동 삽입 후 앱 재로드 → `noa_active_model: gemini-2.5-flash`로 교체, legacy key 삭제 확인.

---

## B3 — 에피소드 수 입력 JS 검증 없음 (P3)

**파일**: `src/components/studio/PlanningView.tsx` (line 206–213)

**현상**
`<input type="number" min="5" max="300">` — HTML 속성만 존재, JS 클램핑 없음.
브라우저 직접 입력 또는 스크롤로 범위 초과값 입력 가능 (예: `0`, `-5`, `999`, `NaN`).

**수정 방향**
`onChange` 핸들러에서 파싱 후 클램핑 적용.

```ts
onChange={e => {
  const raw = parseInt(e.target.value, 10);
  const clamped = isNaN(raw) ? 25 : Math.min(300, Math.max(5, raw));
  setConfig({ ...config, totalEpisodes: clamped });
}}
```

**검증**
- 입력값 `-1` → `5`, `999` → `300`, `abc` → `25` 확인.

---

## B4 — 텍스트 입력 maxLength 없음 (P3)

**파일**: `src/components/studio/PlanningView.tsx`, `src/app/studio/page.tsx` (editDraft textarea)

**현상**
synopsis, title, setting, povCharacter, directivePrompt 등 주요 textarea/input에 `maxLength` 미설정.
극단적으로 긴 입력 시 API 토큰 초과 또는 UI 레이아웃 깨짐 가능성.

**수정 방향**

| 필드 | 권장 maxLength |
|------|---------------|
| title | 100 |
| povCharacter | 100 |
| synopsis | 2000 |
| setting | 1000 |
| directivePrompt (작가 지침) | 500 |
| editDraft (편집 모드) | 20000 |

`PlanningView.tsx` 각 input/textarea에 `maxLength={N}` 추가.

---

## C1 — 대화문 비율 프롬프트 기본값 고정 (편의성)

**파일**: `src/engine/pipeline.ts` → `buildSystemInstruction()` 또는 `buildUserPrompt()`

**현상**
EP.1~10 분석 시 대화문 비율이 40~55% 수준으로 웹소설 플랫폼 권장치(60~70%)보다 낮음.
초반 에피소드에서 C~B등급, 긴장감 24~37 수준.

**수정 방향**
시스템 프롬프트에 플랫폼별 대화 비율 가이드라인 명시 추가.

```
[플랫폼 가이드: 모바일] 대화문 비율 60% 이상 유지. 대화 없는 서술 단락 연속 3단락 금지.
```

Mobile 플랫폼일 때 `buildSystemInstruction()`에 조건부 삽입.

---

## C2 — EP 탭 점프 기능 없음 (편의성)

**현상**
25화 이상 쌓이면 사이드바 세션 목록에서 특정 EP로 바로 이동 불가. 스크롤만 가능.

**수정 방향**
세션 목록 상단에 EP 번호 입력 필드 또는 드롭다운 추가.
또는 `manuscripts` 탭에서 EP 번호 클릭 → 해당 세션으로 jump.

---

## C3 — 자동 저장 상태 표시 없음 (편의성)

**현상**
`useProjectManager` 훅이 자동 저장을 처리하지만 UI에 "저장됨" 인디케이터 없음.
사용자 입장에서 저장 시점 불명확.

**수정 방향**
상단 헤더 또는 사이드바에 마지막 저장 시각 표시 (`몇 초 전 저장됨`).
`lastSaved` state → `useProjectManager`에서 노출.

---

## 참고: 정상 확인 항목 (수정 불필요)

- `createNewSession()` — 작업 존재 시 confirm 다이얼로그 정상 표시 (`page.tsx` line 352–364). 오판 정정.
- `getStructuredGeminiModel()` — `getPreferredModel('gemini')` 경유, 하드코딩 없음 (`geminiService.ts` line 30–32). 탐색 에이전트 오판 정정.
- manuscripts 자동 수집 — `useStudioAI.ts` line 144–153에 구현 완료.
- 7종 내보내기 (TXT/JSON/DOCX/PDF/EPUB/MD/카카오) — 전체 정상.
- 가이드/비가이드 모드 전환 — 정상.
- 테마/언어 전환 localStorage 저장 — 정상.

---

## 수정 우선순위 요약

| 순위 | ID | 파일 | 핵심 작업 |
|------|----|------|-----------|
| P1 | B1 | `engine/pipeline.ts` | `stripEngineArtifacts` regex 강화 |
| P2 | B2 | `lib/ai-providers.ts`, `studio/page.tsx` | `migrateLocalStorage()` 추가 + hydration 시 호출 |
| P3 | B3 | `components/studio/PlanningView.tsx` | episode onChange 클램핑 |
| P3 | B4 | `PlanningView.tsx`, `page.tsx` | maxLength 추가 |
| 편의 | C1 | `engine/pipeline.ts` | 모바일 대화비율 가이드 주입 |
| 편의 | C2 | `studio/page.tsx` | EP 탭 점프 |
| 편의 | C3 | `useProjectManager` → UI | 자동 저장 인디케이터 |
