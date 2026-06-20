# Origin Tagging Spec — M4

**Status:** Implemented (M4 / 2026-04-19)
**Spec owner:** Loreguard core
**Patent reference:** `docs/whitepapers/tier1/01-noa-core-3axis-patent.md`

## 1. Purpose

씬시트의 14+ 필드 각각에 "누가 이 값을 썼는가"를 메타데이터로 보존한다.
세 가지 비즈니스 가치:

1. **법적 대응 자동화** — Export 시 AI 공동집필 등급 자동 첨부
2. **작가 주도 철학 강화** — USER 우선, ENGINE은 보조
3. **품질 게이트 가중치** — 작가 비율 기반 보너스/페널티

## 2. The 4 Origin Tags

| Origin           | 의미                                  | 우선순위 | UI 색상 |
|------------------|---------------------------------------|----------|---------|
| `USER`           | 작가가 직접 입력                      | 최상위   | 파랑    |
| `TEMPLATE`       | 시스템 기본값 (장르 프리셋 등)        | 자유 덮어쓰기 | 회색 |
| `ENGINE_SUGGEST` | 엔진 제안 (작가 수락 상태)            | 참고 우선 | 황색  |
| `ENGINE_DRAFT`   | 엔진 미확정 초안 (작가 검토 필요)     | 가장 낮음 | 빨강  |

## 3. Schema (V2)

```ts
export interface OriginMetadata {
  origin: EntryOrigin;          // 4종 enum
  createdAt: number;            // 최초 작성 시각 (ms)
  editedBy?: OriginEditEvent[]; // 변경 이력 (FIFO 최대 20)
  sourceReferenceId?: string;   // 프리셋/제안 ID 등 추적용
}

export interface TaggedValue<T> {
  value: T;
  meta: OriginMetadata;
}

// 14필드 모두 TaggedField<T> 옵션 (V1 raw 값과 양립)
export type TaggedField<T> = T | TaggedValue<T>;
```

V1 데이터(미래핑)는 `unwrap()` 시 자동 USER 처리된다. 데이터 손실 0.

## 4. Migration

| 방향        | 동작                                 | 데이터 보존 |
|-------------|--------------------------------------|-------------|
| V1 → V2     | 모든 필드 USER로 래핑 (default 인자) | 100%        |
| V2 → V1     | TaggedValue 언래핑 (메타 폐기)       | 100% (값만) |
| V2 → V2     | idempotent (no-op)                   | 100%        |
| V1 → V1     | idempotent (no-op)                   | 100%        |

스트레스 테스트: 1,000회 양방향 변환 → 무결성 보장 (origin-migration.test.ts).

## 5. Pipeline Injection

`buildSystemInstruction`은 sceneDirection 블록에 다음을 주입한다:

```
[SCENE DIRECTION — 연출 스튜디오]
[출처 태그 해석 규칙]
- [USER] 작가 직접 입력 — 우선 존중. 그대로 반영하라.
- [TEMPLATE] 시스템 기본값 — 덮어쓸 수 있음. 문맥에 맞으면 활용.
- [ENGINE_SUGGEST] 엔진 제안(작가 수락) — 참고 우선, 강요 금지.
- [ENGINE_DRAFT] 엔진 미확정 초안 — 그대로 따라 쓰지 말고 작가 의도 추정.

[고구마/사이다 리듬]
  - [USER] 사이다 (high): 한서가 마지막에 적을 무찌름
  - [TEMPLATE:thriller-default] 고구마 (medium): 의도된 좌절
  - [ENGINE_SUGGEST] 사이다 (high): 결말 반전
  - [ENGINE_DRAFT] 고구마 (low): 미확정 — 작가 검토 필요
[훅 배치]
  - [USER] opening: shock — 긴박한 진입
...
```

엔진(AI)은 USER 표기를 우선 존중하며, ENGINE_DRAFT는 그대로 따라 쓰지 않는다.

## 6. UI — OriginBadge

```tsx
<OriginBadge origin="USER" language="KO" />
<OriginBadge origin="ENGINE_DRAFT" language="EN" hideUnlessHover />
<OriginBadge origin="TEMPLATE" forceVisible />  // 설정 무시, 항상 표시
```

- 4언어 라벨 + tooltip (color + icon + text 3중 표시 — a11y)
- 기본 숨김 (`localStorage.noa_origin_badge_visible !== '1'`)
- 설정에서 토글 (Settings > Advanced > "출처 뱃지 항상 표시")
- `storage` 이벤트 구독 — 다른 탭에서 켜도 즉시 반영

## 7. useOriginTracker Hook

```ts
const tracker = useOriginTracker();

// AI 초안 → 작가 수락 승격
const promoted = tracker.acceptEngineContent(sceneDir, 'cliffhanger');

// 프리셋 적용
const withPreset = tracker.markAsTemplate(sceneDir, 'plotStructure', undefined, 'preset-id');

// 엔진 제안 적용
const withSuggest = tracker.markAsEngineSuggest(sceneDir, 'hooks', 0, 'transition-1-2');

// 작가 직접 편집
const edited = tracker.markAsUser(sceneDir, 'writerNotes');
```

모든 setter는 immutable — V1 입력은 자동 V2 변환 후 새 V2 객체 반환.

## 8. AI Disclosure Auto-Generation

```ts
const result = buildEpisodeDisclosure(sceneDirection, 'KO');
// → { stats, grade, label, text }
```

| Grade                    | 경계값         | 라벨 (KO)              |
|--------------------------|----------------|------------------------|
| `human-authored`         | userPct ≥ 80   | 작가 단독 집필         |
| `co-authored-human-led`  | userPct ≥ 60   | AI 공동집필 (작가 주도) |
| `ai-assisted`            | userPct ≥ 30   | AI 보조 집필           |
| `ai-generated`           | userPct < 30   | AI 주도 생성           |

경계값은 `loadDisclosureThresholds()`로 사용자 정의 가능 (localStorage).

Export 파이프라인(EPUB/DOCX)은 본문 끝에 다음 자동 첨부:

```
---
[AI 공동집필 분류]
AI 공동집필 (작가 주도)
본 작품은 작가 주도 하에 AI 도구의 도움을 받아 집필되었습니다. ...
씬시트 출처 분포: 작가 70% · 기본값 15% · 엔진 제안 10% · 엔진 초안 5%
```

## 9. Quality Gate Weighting

`evaluateQuality`는 sceneDirection origin 통계로 감독 점수를 가감:

| userPct      | adjustment | 의도                      |
|--------------|-----------|---------------------------|
| ≥ 80         | +10       | 작가 주도 보너스          |
| 30-79        | 0         | 중립                      |
| < 30         | -10       | 엔진 의존 페널티          |

`QualityGateResult.authorLeadRatio` + `authorLeadAdjustment`로 노출.

## 10. M1/M2 Untouched

다음 파일은 M4에서 0 bytes 변경:
- `src/hooks/useProjectManager.ts`
- `src/hooks/useAutoSave.ts`
- `src/hooks/useShadowProjectWriter.ts`
- `src/hooks/usePrimaryWriter.ts`
- `src/lib/save-engine/**`
- `src/components/studio/StudioShell.tsx`
- `src/components/studio/WritingTab*.tsx`
- `src/components/studio/writing/**`

## 11. Test Coverage

| 영역                          | 테스트 파일                                          | 케이스 |
|-------------------------------|------------------------------------------------------|--------|
| 마이그레이션 + 통계            | `src/lib/__tests__/origin-migration.test.ts`         | 35     |
| 파이프라인 태그 주입           | `src/engine/__tests__/pipeline.test.ts` (M4 섹션)    | 10     |
| OriginBadge UI                | `src/components/studio/__tests__/OriginBadge.test.tsx` | 17   |
| useOriginTracker 훅           | `src/hooks/__tests__/useOriginTracker.test.tsx`      | 11     |
| AI 공동집필 등급 산출          | `src/lib/__tests__/ai-disclosure-generator.test.ts`  | 20     |
| 품질 게이트 가중치             | `src/engine/__tests__/quality-gate.test.ts` (M4 섹션) | 4    |
| E2E (settings UI)             | `e2e/scenarios/22-origin-tagging.spec.ts`            | 4      |

**합계: 97 신규 단위 테스트 + 4 E2E**

## 12. Files Touched

### 신규 (10)
- `src/lib/origin-migration.ts`
- `src/lib/ai-disclosure-generator.ts`
- `src/hooks/useOriginTracker.ts`
- `src/components/studio/OriginBadge.tsx`
- `src/lib/__tests__/origin-migration.test.ts`
- `src/lib/__tests__/ai-disclosure-generator.test.ts`
- `src/hooks/__tests__/useOriginTracker.test.tsx`
- `src/components/studio/__tests__/OriginBadge.test.tsx`
- `e2e/scenarios/22-origin-tagging.spec.ts`
- `docs/origin-tagging-spec.md` (this file)

### 수정 (7)
- `src/lib/studio-types.ts` (V2 스키마 + QualityGateResult 확장)
- `src/engine/pipeline.ts` (태그 주입 + 가이드 라인)
- `src/engine/__tests__/pipeline.test.ts` (M4 섹션)
- `src/engine/quality-gate.ts` (author-lead adjustment)
- `src/engine/__tests__/quality-gate.test.ts` (M4 섹션)
- `src/lib/export-utils.ts` (등급 footer 첨부)
- `src/components/studio/settings/AdvancedSection.tsx` (뱃지 토글)
- `src/components/studio/settings/ComplianceSection.tsx` (등급 미리보기)

## 13. Patent Implementation Status

NOA Core 3-Axis 특허 자산 중 다음 부분이 본 M4에서 구현되었다:

- **Axis 1: Persona** — 작가 입력(USER) vs 시스템 기본(TEMPLATE) vs 엔진 출력(SUGGEST/DRAFT) 4축 분리
- **Axis 2: Sovereignty** — USER 권위 우선순위 + 엔진 출력 자동 다운그레이드 (DRAFT → 검토 필요 표시)
- **Axis 3: Audit** — `editedBy` 이력 + `sourceReferenceId`로 누가/언제/어디서 수정했는지 완전 추적

이는 Loreguard가 NOA 특허 도면이 아닌 **실제 동작하는 코드로** 구현했다는 첫 번째 증거다.
