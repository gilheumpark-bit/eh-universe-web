# Symbol IDE — Loreguard 사용자 가이드

> **Phase A — Symbol IDE (Phase B 11~30) 완료 / 2026-05-07**
> 코드 IDE 의 Go to Definition / Find All References / Symbol Outline 을 소설 도메인으로 가져온 모듈.

---

## 한 줄 요약

작품 안의 **캐릭터 · 장소 · 아이템 · 개념 · 사건** 모두를 통합 색인하여 100화 넘어가도 어디에 무엇이 있는지 1초 만에 점프.

---

## 무엇이 가능한가

| 단축키 | 동작 | 코드 IDE 대응 |
|---|---|---|
| **F12** | 본문 단어 선택 → 정의로 점프 | Go to Definition |
| **Shift+F12** | 본문 단어 선택 → 모든 등장 위치 패널 | Find All References |
| **Ctrl+T** | Symbol Quick Jump 모달 (이름·alias 검색) | Go to Symbol in Workspace |
| **Ctrl+Shift+O** | Symbol Outline 사이드 토글 | Outline Panel |
| (hover) | 본문에서 Symbol 위 hover → DNA + 최근 5화 + 말투 시그니처 | Quick Info Tooltip |

---

## 어떻게 작동하나

### 1. Symbol Index 빌드

작품 데이터(`StoryConfig`) + 본문(`EpisodeManuscript[]`) 을 입력하면 5종 카테고리로 통합 색인:

| Symbol Kind | 출처 | 점프 대상 |
|---|---|---|
| `character` | `config.characters` | CharacterTab |
| `place` | 세계관 7~17 필드 (인용 부호 안 명사 추출) | WorldTab |
| `item` | `config.items` | ItemStudio |
| `concept` | `config.skills` 등 | SkillStudio |
| `event` | (Phase 2 — 사건 추적) | — |

### 2. 본문 스캔

각 episode 본문에 alternation regex 매칭 → `SymbolReference[]` 생성. 가장 긴 매치 우선 (예: "김준호" > "김준").

### 3. 캐시

`useSymbolIndex` hook 이 manuscript hash 변경 시점에만 재빌드. 단일 작품 5분 동안 100회 호출해도 1회 빌드.

---

## 사용자 시나리오

### 시나리오 A — 80화 작가가 "김준이 어디 등장했지?"
1. 본문에서 "김준" 더블클릭
2. **Shift+F12**
3. 우측 ReferencesPanel 에 EP1 ~ EP80 등장 위치 트리 표시
4. 각 항목 클릭 → 해당 화 해당 위치로 점프

### 시나리오 B — 50화 작가가 "이 캐릭터 누구지?"
1. 본문에서 "박서연" 위에 마우스 hover
2. SymbolHoverCard 자동 표시
3. 캐릭터 DNA Tier 1/2/3 + 최근 5화 등장 + 말투 시그니처 즉시 확인
4. "정의로 이동 (F12)" 클릭 → CharacterTab 으로 점프

### 시나리오 C — 작품 전체 시야
1. **Ctrl+Shift+O** (Symbol Outline 토글)
2. 좌측 패널에 5 카테고리 트리
3. 검색창에 "검" 입력 → 발할라의 검 / 마법의 검 등 필터
4. 클릭 → 정의 점프

### 시나리오 D — 빠른 이동
1. **Ctrl+T**
2. 모달 입력창에 "김"
3. ↑↓ 로 결과 내비 / Enter 점프
4. Esc 닫기

---

## 격리 정책

### 0byte 변경 (절대 금지)
- `src/lib/studio-types.ts` — Symbol Index 자체 types 모듈
- `src/lib/save-engine/*`
- `src/components/studio/ManuscriptView.tsx` — 본문 hover 는 Tiptap decoration 으로 통합
- `src/components/studio/OriginBadge.tsx`
- `src/lib/origin-migration.ts`

### 의존성 단방향
- `lib/symbol-index/*` → 외부 import 0
- `hooks/useSymbolIndex` → `lib/symbol-index/builder` 만
- `components/studio/symbol-ide/*` → `lib/symbol-index/types` + `hooks/useGoToDefinition`

---

## 다음 단계 (Phase C+)

- **Long-Arc Verifier** (Phase C) — 캐릭터/룰 위반 정적 분석에 Symbol Index 활용
- **Story Debugger** (Phase D) — Watch Window 가 Symbol 단위 실시간 추적
- **Reader Simulation** (Phase E) — Symbol 등장 빈도가 페르소나 engagement 모델 입력
- **LSP** (Phase F) — `/api/lsp/symbols` 가 Symbol Index 외부 export

---

## 자주 묻는 질문

**Q. F12 누르면 브라우저 DevTools 가 열려요.**
A. 본문 텍스트가 선택된 상태에서만 `useGoToDefinition` 이 preventDefault. 그 외엔 DevTools 우선.

**Q. Symbol 가 너무 많아서 느려요.**
A. 현재 Symbol 500개 이내 가정. Phase 2 에서 Aho-Corasick 풀빌드로 최적화 예정.

**Q. 새 캐릭터 만들면 즉시 색인되나요?**
A. `config.characters` 변경 시 `useSymbolIndex` 의 useMemo 가 재빌드 — 다음 본문 입력 시점부터 underline 적용.
