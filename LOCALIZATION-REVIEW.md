# EH Universe Studio — 번역 품질 및 현지화 검토 보고서

**검토일:** 2026-03-26
**대상 파일:** studio-translations.ts (4,780줄), network-translations.ts (85줄), i18n.ts, LangContext.tsx + 컴포넌트 85개
**지원 언어:** KO / EN / JP / CN

---

## 전체 요약

| 카테고리 | 상태 | 건수 | 심각도 |
|---------|------|------|--------|
| network-translations.ts JP/CN 누락 | ❌ | 40+개 라벨 | CRITICAL |
| 컴포넌트 하드코딩 영어 문자열 | ❌ | 12+개 | CRITICAL |
| KO 용어 불일치 | ⚠️ | 9건 | HIGH |
| EN 번역 품질 이슈 | ⚠️ | 35+건 | HIGH |
| JP 부자연스러운 번역 | ⚠️ | 20+건 | MEDIUM |
| CN 문법/표현 이슈 | ⚠️ | 25+건 | MEDIUM |
| i18n 코드 안정성 | ✅ | — | OK |
| 브라우저 언어 감지 | ✅ | — | OK |
| 폴백 체인 로직 | ✅ | — | OK |

---

## 1. CRITICAL — 즉시 수정 필요

### 1-1. network-translations.ts에 JP/CN 번역 전체 누락

현재 KO/EN 2개 언어만 지원. 네트워크 섹션(행성 등록, 게시판, 정착지 등) 40+개 라벨이 JP/CN 사용자에게 KO 폴백으로 표시됨.

**영향 범위:** NetworkHomeClient, PlanetDetailClient, BoardPostDetailClient 등 네트워크 전체 컴포넌트

### 1-2. 컴포넌트 하드코딩 문자열

| 파일 | 하드코딩 문자열 |
|------|---------------|
| `EngineDashboard.tsx` | "Generating...", "Idle", "Context", "Platform", "Episode", "Genre", "Characters", "Tension Arc" |
| `NetworkHomeClient.tsx` | "Just now", "m ago", "h ago", "d ago" (상대 시간) |

### 1-3. 사용자에게 노출되는 기술 용어 (KO)

```
studio-translations.ts 약 175줄:
firebaseRequired: "Firebase 설정이 필요합니다.\n.env.local에 NEXT_PUBLIC_FIREBASE_* 환경변수를 설정해주세요."
```

`.env.local`, `NEXT_PUBLIC_FIREBASE_*` 같은 개발자 용어가 일반 사용자 UI에 노출됨.

---

## 2. HIGH — KO (한국어) 이슈 9건

### 2-1. 용어 불일치: "룰북" 3가지 번역 혼용

| 위치 | 번역 |
|------|------|
| sidebar | "연출 스튜디오" |
| planning | "룰북" |
| shortcuts | "연출" |

→ 하나로 통일 필요

### 2-2. 존칭 불일치

```
confirmDelete: "이 작품을 삭제하시겠습니까? 내부 세션도 모두 삭제됩니다."
```

첫 문장 `하시겠습니까` (존칭) vs 두번째 `됩니다` (일반 격식). 톤 통일 필요.

### 2-3. 조사 표기 `을(를)`, `은(는)` 노출

```
deleteProjectMsg: "을(를) 삭제하시겠습니까?"
summaryTemplate: "${name}은(는) ${purpose}용으로..."
```

조사 선택 로직 구현 또는 하나로 확정 필요.

### 2-4. "새로운" vs "새" 혼용

```
newProject: "새로운 소설 시작"  // 한 곳
newProject: "새 작품"           // 다른 곳
```

### 2-5. 엔티티 용어 혼재

- "작품" (7회) / "세션" (9회) / "프로젝트" (5회) — 같은 개념에 3가지 명칭

### 2-6. 집필/글쓰기/작성 용어 분화

의도적 분화로 보이나 스타일 가이드 문서화 필요.

---

## 3. HIGH — EN (영어) 이슈 35+건

### 3-1. 용어 불일치

| 위치A | 위치B | 충돌 |
|-------|-------|------|
| sidebar | planning | "World Planning" vs "World Design" |
| sidebar | shortcuts | "Direction Studio" vs "Rulebook" |

### 3-2. 대문자 표기 불일치

- "GENESIS BLUEPRINT" (전체 대문자)
- "Genre Level" (타이틀 케이스)
- "GenreLv" (코드 스타일)
- 정책 통일 필요

### 3-3. HTML 태그가 번역 문자열에 포함

```
<strong>Types of Cost:</strong><br/>
```

데이터 구조로 분리해야 함.

### 3-4. 템플릿 구문 노출

```
"${name} is for ${purpose}..."
"Avg ${avg} skills per character"
```

### 3-5. 부자연스러운 표현

| 현재 | 개선안 |
|------|--------|
| "Neural Interface Connected" | "AI Engine Ready" |
| "Writing without scene direction reduces AI quality" | "Scene direction improves AI quality" (긍정형) |
| "Extra" (역할) | "Supporting Character" |
| "Genre×Level Reviewer" | "Genre and Level Reviewer" |

---

## 4. MEDIUM — JP (일본어) 이슈 20+건

### 4-1. 경어 불일치

- 일부 설명문은 です/ます체, 일부는 plain form 혼용

### 4-2. 직역체 (直訳調)

| 현재 | 개선안 |
|------|--------|
| "アクティブな設計図" | "現在の設計" |
| "アイテムスタジオ" | "アイテム工房" |

### 4-3. 미번역 콘텐츠

- `formatRulesKO` 배열에 한국어 라벨이 그대로 존재 (일본어 미번역)

### 4-4. カタカナ vs 漢字 불일치

- "ルールブック" (カタカナ) vs "規則書" (漢字) 정책 미확립

---

## 5. MEDIUM — CN (중국어) 이슈 25+건

### 5-1. 간체/번체 혼용 의심

- 전반적으로 간체자(简体)이나 일부 번체 영향 있는 표현 존재
- "觊觎" 등 격식체 한자가 간략한 표현과 혼재

### 5-2. 번역체 (翻译腔)

| 현재 | 개선안 |
|------|--------|
| "激活的蓝图" | "当前蓝图" |
| "3遍画布" | "3步骤画布" |
| "A嘶声呐喊，抓住了B的灵魂" | "A大声呐喊，抓住了B的灵魂" |

### 5-3. 오탈자

```
约 4574줄: "以保持商业吸引力，,"  // 쉼표 중복
약 4569줄: "因为" → "因此"       // 의미 오류
```

### 5-4. 미번역 영어

- "Phase 2" → "第2阶段"
- "Neka Sound Interface", "Soundtrack" 미번역

### 5-5. 구두점 불일치

- "→" 사용 위치 불일치
- 전각/반각 부호 혼용

---

## 6. OK — 정상 동작 영역

### 6-1. 브라우저 언어 감지

```typescript
// LangContext.tsx — 정상
if (browserLang.startsWith("en")) detected = "en";
else if (browserLang.startsWith("ja")) detected = "jp";
else if (browserLang.startsWith("zh")) detected = "cn";
```

en-US/en-GB, ja-JP, zh-CN/zh-TW 모두 정상 처리.

### 6-2. 폴백 체인

```typescript
// L2() — 정상
JP → KO → EN
CN → KO → EN
```

### 6-3. localStorage 언어 저장

`eh-lang` 키로 정상 저장/복원.

### 6-4. 정상 i18n 패턴 사용 컴포넌트

EpisodeScenePanel, OnboardingGuide, StudioDocsView 등 4개 언어 완전 지원.

---

## 수정 우선순위

| 우선순위 | 작업 | 예상 규모 |
|---------|------|----------|
| P0 | network-translations.ts JP/CN 추가 | 40+개 라벨 × 2언어 |
| P0 | EngineDashboard.tsx 하드코딩 제거 | 8개 문자열 |
| P0 | Firebase 에러 메시지 분리 | 1개 문자열 |
| P1 | KO "룰북" 용어 통일 | 3곳 |
| P1 | EN 용어/대문자 통일 | 15+곳 |
| P1 | HTML 태그 번역 문자열에서 분리 | 3+곳 |
| P2 | JP 경어 통일 + 직역 수정 | 20+곳 |
| P2 | CN 번역체 수정 + 오탈자 | 25+곳 |
| P2 | KO 조사 표기/존칭 통일 | 5곳 |
| P3 | 인라인 삼항 패턴 → 중앙 i18n 이관 | 15+곳 |
| P3 | 용어 스타일 가이드 문서화 | 신규 |
