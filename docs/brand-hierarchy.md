# 브랜드 계층 (Brand Hierarchy)

**버전**: v2.2.0-alpha
**일자**: 2026-04-19
**모델**: Marvel Studios / Pixar 방식 (상위 브랜드 우산 + 플래그십 제품)

---

## 1. 4-Tier 구조

```
Tier 0  EH Universe       회사·세계관 우산 (상위 브랜드)
        ↓
Tier 1  Loreguard         플래그십 제품 (작가 주도형 집필 IDE)
        ↓
Tier 2  집필 IDE · 번역 스튜디오 · 네트워크   앱 (Loreguard 내부)
        ↓
Tier 3  NOA Writing Engine · Quill Engine      엔진 (앱 내부)
```

| Tier | 이름 | 역할 | 공개 노출 |
|------|------|------|----------|
| 0 | EH Universe | 회사·세계관·우산 | 법적 주체 / 상위 브랜드 |
| 1 | Loreguard | 플래그십 제품명 | UI 히어로 / 푸터 / 마케팅 |
| 2 | 집필 IDE / 번역 / 네트워크 | 앱 / 라우트 | 네비게이션 / 홈 카드 |
| 3 | NOA Writing Engine | 내부 엔진 | "NOA 기반" 보조 설명 |

---

## 2. 상황별 표기 규칙

### 2-1. 작가 UI (홈·히어로·스튜디오 내부)
- 주 노출: **Loreguard**
- 보조 설명: "작가 주도형 집필 IDE"
- 엔진 언급: "NOA 엔진 탑재" (부가 설명, 선택)
- "AI 집필" 표현 **금지** — 작가 주도 포지셔닝 훼손

**예시**:
- 홈 히어로 키커: "Loreguard — 작가 주도형 집필 IDE"
- 푸터: "© EH Universe · 작가 주도형 집필 IDE"
- 설정 헤더: "엔진" (not "AI 엔진")

### 2-2. 법적 문서 (약관·프라이버시·저작권·AI 고지)
- **AI 표기 필수 유지** — 규제·투명성·EU AI Act 대응
- 예: "AI 생성 콘텐츠 고지", "AI 학습 데이터 사용 금지"
- 회사명: **EH Universe** (법인 주체)
- 제품명 언급 시: "Loreguard (이하 '서비스')"

### 2-3. 투자자·언론·IR
- 회사 소개: **EH Universe** (우산 법인)
- 제품 소개: **Loreguard** (플래그십)
- 비유: "EH Universe presents Loreguard" (Marvel Studios 인트로 방식)
- 비전: "AI 시대 작가의 주권을 지키는 집필 IDE"
- 분류: Loreguard는 "하라 시장" 카테고리 창시자 (제작 도구, vs. "해줘 시장"의 Sudowrite / Novelcrafter)

### 2-4. 개발자·기술 문서·CLI
- 내부 식별자: `loreguard`, `eh-universe`, `noa-engine`
- 패키지명: `@eh-universe/loreguard-*`
- 엔진 내부: "NOA Writing Engine", "Quill Engine" (2개 엔진 공존)
- AI 용어 **허용** (내부 기술 식별자이므로 제약 없음)

### 2-5. SEO 메타 태그
- title: "EH Universe · Loreguard" 또는 "Loreguard — 작가 주도형 집필 IDE"
- description: Loreguard 선행, EH Universe는 퍼블리셔로
- keywords: "AI 소설", "AI IDE" 검색어 **유지** (유입 전략)

---

## 3. 캐피탈라이제이션 규칙

| 표기 | 용도 | 예시 |
|------|------|------|
| **Loreguard** | 제품명 | L 대문자 + 소문자 고정 ("loreguard" 금지) |
| **EH Universe** | 회사·우산 | EH 약어 대문자 + Universe 대문자 |
| **로어가드** | 한글 병기 | UI에서 "Loreguard (로어가드)" 병기 허용 |
| **NOA** | 엔진명 | 전부 대문자 ("Noa" 금지) |
| **Quill** | 코드 스튜디오 엔진 | Q 대문자 |
| **EH** | 단독 사용 | EH Open Reference 등 브랜드 라인업 허용 |

---

## 4. 로고 사용 규칙

### 4-1. Marvel Studios 인트로 방식
프레젠테이션·영상·랜딩 페이지 오프닝에서:
```
[ EH Universe ]  →  presents  →  [ LOREGUARD ]
```
- EH Universe 로고가 먼저 페이드인 (0.8초)
- 교차 페이드 후 Loreguard 로고 등장
- 제품 앱 내부(스튜디오)에서는 Loreguard만 노출

### 4-2. 우선순위
- **앱 내부**: Loreguard 로고만 (EH Universe는 푸터 © 표기)
- **홈 랜딩**: Loreguard 히어로 + 푸터에 "© EH Universe"
- **법적 페이지**: EH Universe 법인명 병기
- **IR·컨퍼런스**: EH Universe 로고 먼저, Loreguard 플래그십으로 표기

### 4-3. 색상·여백
- Loreguard: 앰버(#accent-amber) 시그니처
- EH Universe: 뉴트럴(고정 로고 없음, 텍스트 중심)
- 최소 여백: 로고 높이의 50%
- 동반 표기 시: "presents" 혹은 "·" 구분자 사용 (", " 사용 금지)

---

## 5. 금지 패턴

| 금지 | 이유 | 대안 |
|------|------|------|
| "AI 집필 OS" (작가 UI) | 작가 주도성 훼손 | "작가 주도형 집필 IDE" |
| "AI 소설 스튜디오" (히어로) | 제품 포지셔닝 훼손 | "Loreguard — 작가 주도형 집필 IDE" |
| "AI가 쓰는 소설" | 오해 유발 | "NOA가 돕는, 작가가 쓰는 소설" |
| "EH · Loreguard" 혼용 | 계층 불명확 | "EH Universe presents Loreguard" |
| "loreguard" 소문자 | 브랜드 가이드 위반 | "Loreguard" (L 대문자) |
| Tier 3 엔진 노출 우선 | 계층 역전 | Tier 1 제품명 우선 |

---

## 6. 전환 로드맵

- v2.2.0-alpha (2026-04-19): 최우선 5곳 치환 + 본 문서 제정
- v2.2.0-beta: 홈 전수 / 설정 / 온보딩 1차 스윕
- v2.2.0-rc: 번역 UI 전수 / Marketplace 플러그인 라벨
- v2.3.0: 영상·키비주얼 Marvel 인트로 적용 / 컨퍼런스 데크

---

## 부록 — 전략적 유지 대상

다음 문구는 **의도적 유지** (치환 금지):
- `/welcome`: "AI가 쓰나요? 작가가 쓰나요?" (반어법, 작가 주도 선언)
- `director.ts:ESCAPE_WORDS`: "AI로서 / 나는 AI" (로컬 AI 오염 제거 장치)
- `ComplianceSection.tsx`: "AI 사용 고지" (법적 규제 대응)
- `layout.tsx:keywords`: "AI 소설", "AI IDE" (SEO 검색어)
- `robots.ts`: AI 크롤러 차단 룰 (GPTBot / CCBot 등)

상세: `reports/ai-branding-audit.md`
