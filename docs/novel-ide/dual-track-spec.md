# Dual Track Translation Spec

> 상태: 과거 내부 설계 메모입니다. 현재 공개 제품 카피와 사용자-facing 문서는 `번역·현지화 작업실`, `보존안`, `현지화안`, `작가 승인`, `과정기록` 용어를 기준으로 합니다. 이 문서는 구현 배경 추적용으로 보관하며, 최신 사용자 기준은 `docs/ARCHITECTURE.md`, `docs/CLEANUP-STATUS.md`, `/translation-studio` 화면을 우선합니다.

> "원문 보존 + 현지화 버전 2개" — 시장 분석 4차 본질 구현 사양 (2026-05-08).

## 0. 한 줄

Loreguard Translation Studio 는 매 번역마다 **두 결과**를 생성한다:
- **Source-faithful Translation** (작가 의도·고유명사·복선·문체 보존)
- **Market-ready Localization** (대사 리듬·호칭·장르 문법·시장 감각 적응)

> "원문은 지키고, 시장에는 맞춘다." — Faithful where it matters. Localized where it counts.

---

## 1. 데이터 모델 — `ChapterEntry`

```ts
type ChapterEntry = {
  name: string;
  content: string;          // 원문
  result: string;           // legacy single-track
  resultFaithful?: string;  // 신규 — Source-faithful
  resultMarket?: string;    // 신규 — Market-ready
  stageProgressFaithful?: number;
  stageProgressMarket?: number;
  faithfulApproved?: boolean;
  marketApproved?: boolean;
  approvedAt?: number;
  // ...
};
```

호환성: 모든 신규 필드 optional. 기존 코드 0byte 변경.

---

## 2. 파이프라인 — `runDualTranslation()`

```
원고 → Stage 1 → Stage 2 → Stage 3 ← 공유 base (3 호출)
                            ↓
                ┌───────────┴───────────┐ Promise.all 병렬
                ↓                       ↓
        Stage 4-faithful           Stage 4-market
        Stage 5-faithful           Stage 5-market
                ↓                       ↓
        result.faithful            result.market
```

비용: 단일 5 호출 → dual 7 호출 = **1.4x**.

---

## 3. 1원칙 차등 적용

| Track | 단락 검증 | 단어 비율 | 누락 의심 |
|---|---|---|---|
| Faithful | 1:1 강제 (N≥10에서 차이 1 초과 fail) | ±20% (truncationThreshold 엄격) | full scan |
| Market | 그룹화 허용 (fail → warn) | 0.5~2.0x 완화 | skip (회차 재구성 허용) |

---

## 4. Glossary 분기

```ts
interface GlossaryEntry {
  source: string;
  target: string;            // legacy
  targetFaithful?: string;   // 음차 (예: "Gate (게이트)")
  targetMarket?: string;     // 시장 친화 (예: "Gate")
  category?: 'name' | 'place' | 'skill' | 'item' | 'concept' | 'term';
}
```

`pickGlossaryTarget(entry, outputMode)` 헬퍼로 mode별 적절한 매핑 추출.

---

## 5. 한국 웹소설 매트릭스

### 5-1. 호칭 자동 (`honorifics.ts`)
캐릭터 관계 → 한국식 호칭 후보:
- `family + older + male` → `형` (남자 화자) / `오빠` (여자 화자)
- `peer + close` → 이름만 (반말)
- `stranger / distant` → `이름 씨` / `이름 님`

### 5-2. 8 장르 매트릭스 (`korean-genre-matrix.ts`)
- **헌터물**: 게이트·각성자·S급·던전 / 액션 빠른 페이싱 / 보스 등장 hook
- **회귀물**: 미래 지식 / "이번엔 실패하지 않는다" / 회귀 payoff hook
- **로판**: 빙의·악녀·공작 / 내면 독백 / 무도회 hook
- **로맨스**: 재벌·키차이·서브남 / 대화 중심 / 고백 hook
- **판타지**: 마탑·검성·용병 / 세계관 빌드업
- **SF**: 디스토피아·AI·우주 / 컨셉 hook
- **무협**: 정파·사파·무공·의형제 / 액션 안무
- **일반**: 매트릭스 미적용

### 5-3. 회차 분할 (`chapter-splitter.ts`, Market 전용)
EN long-form → 5,500자 ± 500 단위 자동 분할. 자연 break 우선.

---

## 6. 번역가·작가 워크플로

### 6-1. 세그먼트 채택 (`segment-adoption.ts`)
단락별 4 액션:
- `faithful` — Source-faithful 채택
- `market` — Market-ready 채택
- `manual` — 직접 편집
- `pending` — 미결

`finalizeSegments()` 로 최종 번역본 생성.

### 6-2. 작가 sign-off (`author-signoff.ts`)
- Faithful track 승인 → 저작권 archive
- Market track 승인 → 출판본
- 두 track 분리 승인

---

## 7. NCG / NCT 파이프라인

### NCG (Pre-flight Gate)
번역 전 사전 게이트:
- 원문 길이 (50~500,000자)
- IP flagged 단어
- Glossary 정의 권장
- 언어 매칭

→ `block` / `warn` / `pass`. Block 시 LLM 호출 회피.

### NCT (Post-completion Test)
번역 후 사후 검증:
- 두 track source-integrity
- Glossary 일관성 (locked 항목 모두 등장)

→ `publish` / `review` / `reject`.

---

## 8. LSP 3 Endpoint

| Endpoint | 입력 | 출력 |
|---|---|---|
| `POST /api/lsp/translate-quality` | source + faithful? + market? + langs | 두 IntegrityReport |
| `POST /api/lsp/glossary-validate` | translation + glossary[] + track | violations + score |
| `POST /api/lsp/honorific-check` | translation + relations[] | 호칭 일관성 + score |

모두 Bearer token 인증. LLM 호출 0 (결정론적).

---

## 9. XLIFF Dual

```xml
<trans-unit id="1">
  <source xml:lang="ko">원문</source>
  <target xml:lang="en">Market translation</target>
  <alt-trans alttranstype="other" extype="source-faithful">
    <target xml:lang="en">Faithful translation</target>
  </alt-trans>
</trans-unit>
```

Trados / memoQ / Memsource 등 CAT 도구가 두 결과 동시 표시.

---

## 10. EPUB Dual

```ts
selectEpubContent(chapter, track: 'faithful' | 'market' | 'both')
```

옵션:
- `faithful` — 모든 chapter 의 faithful 본문만 → archive 별책
- `market` — market 본문만 → 출판본 (기본)
- `both` — market 메인 + faithful 부록

---

## 11. 창작 과정 확인서 (Process Record) hooks

`process-record-hooks.ts` 4 함수:
- `recordDualTranslation` — 두 결과 모두 SHA-256 + 출처 기록
- `recordSegmentAdoption` — 번역가 채택 stats
- `recordAuthorSignoff` — 작가 승인 (track별)
- `recordNCTReport` — NCT 결정 trail

작가가 출판 시 첨부 가능한 artifact — 시장 분석 4차 §"AI 사용 과정 기록".

---

## 12. 내부 명령 스키마 (현재는 spec only)

```
translate <file> --to en --mode dual --platform kdp --genre hunter
validate <file> --track faithful
validate <file> --track market
package <project> --track faithful --output epub
package <project> --track market --output epub
```

실행 도구가 아니라 Translation Studio 내부 워크플로우를 설명하는 명령 스키마다.

---

## 13. UI 진입점

| 기능 | UI 위치 |
|---|---|
| outputMode 토글 (faithful/market/dual/default) | AuditPanel 헤더 |
| Triple Editor (원문/Faithful/Market) | TranslatorShell — outputMode === 'dual' 시 자동 |
| 1원칙 검증 배지 | TripleEditor 각 pane 우상단 |
| Faithful + Market 카피 | translation-studio/page.tsx 헤더 |

---

## 14. 시장 분석 4차 매핑 표

| 시장 분석 결정 | 코드 위치 | 상태 |
|---|---|---|
| 두 결과 동시 출력 | `dual-pipeline.ts` | ✅ |
| 작가 의도 보존본 (Faithful) | `build-prompt.ts` Stage 4/5 faithful | ✅ |
| 시장 친화 본문 (Market) | `build-prompt.ts` Stage 4/5 market | ✅ |
| 호칭 매트릭스 | `honorifics.ts` | ✅ |
| 한국 웹소설 회차 리듬 | `chapter-splitter.ts` + `genre-matrix.ts` | ✅ |
| 장르별 클리셰 | `korean-genre-matrix.ts` 8 장르 | ✅ |
| 번역가 세그먼트 채택 | `segment-adoption.ts` | ✅ (logic) |
| 작가 sign-off | `author-signoff.ts` | ✅ (logic) |
| EPUB / DOCX dual | `epub-export.ts` | ✅ EPUB / ⏳ DOCX |
| XLIFF dual | `xliff.ts` exportDualXLIFF | ✅ |
| TM 분기 | `translation-memory.ts` | ✅ (스키마) |
| Glossary 분기 | `glossary-manager.ts` | ✅ |
| 1원칙 차등 검증 | `source-integrity.ts` trackMode | ✅ |
| NCG / NCT | `ncg-nct.ts` | ✅ |
| 창작 과정 확인서 dual | `process-record-hooks.ts` | ✅ |
| LSP 3 endpoint | `/api/lsp/*` | ✅ |
| 양방향 카피 | `translation-studio/page.tsx` | ✅ |
| Fiction-native 카피 | `translation-studio/layout.tsx` | ✅ |
| AI prepares · Translators elevate · Authors go global | 헤더 | ✅ |

---

## 15. 다음 사이클

- 번역가 dashboard UI (Phase 4 후속)
- Star Translator profile UI
- 작가↔번역가 코멘트 시스템
- Publisher API (KDP / WEBTOON / 카카오페이지 connector)
- DOCX export Translator 측
- IndexedDB v2 migration runner
- TM 검색 시 trackMode 분기
- segment-adoption UI 컴포넌트
- author-signoff UI 컴포넌트
- NCG/NCT 결과 패널
- Translation Studio 내부 명령 스키마 UI 연결
