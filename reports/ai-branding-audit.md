# AI 브랜딩 전수 감사 (T-007)

**일자**: 2026-04-19
**스코프**: `rg "\bAI\b" src/` (222 파일 / 632 건)
**기준**: v2.2.0-alpha "작가 주도형 집필 IDE" 포지셔닝 전환

---

## 분류 요약

| 카테고리 | 파일 수 | 처리 방침 |
|----------|---------|-----------|
| 사용자 UI 노출 (치환 대상) | 5 | T-008에서 정밀 치환 |
| 법적/SEO/세계관 (유지) | ~20 | 건드리지 않음 |
| 개발자/CLI/엔진 내부 (유지) | ~197 | 건드리지 않음 |

---

## A. 사용자 UI 노출 — 치환 대상 (5건)

| # | 파일 | 라인 | 현재 문구 |
|---|------|------|-----------|
| 1 | `src/app/page.tsx` | 532 | "NOA 엔진 기반 AI 소설 집필 스튜디오" (히어로 키커) |
| 2 | `src/components/Footer.tsx` | 55–58 | "창작·번역·출판을 잇는 AI 집필 OS" (푸터 카피) |
| 3 | `src/components/studio/QuickStartModal.tsx` | 87 | "당신의 집필을 도와줄 AI를 선택하세요" |
| 4 | `src/components/studio/settings/ProvidersSection.tsx` | 52 | "AI 엔진" (섹션 헤더) |
| 5 | `src/components/studio/MarketplacePanel.tsx` | 39 | "AI 보조" (카테고리 라벨) |

---

## B. 법적/SEO/세계관 — **유지 대상**

### B-1. 법적/규제 페이지 (전략적 AI 표기 필수)
- `src/app/ai-disclosure/page.tsx` — AI 사용 고지 페이지 자체
- `src/app/terms/page.tsx` — 약관 내 "AI 생성 콘텐츠" 조항
- `src/app/privacy/page.tsx` — 프라이버시 내 AI 모델 학습 고지
- `src/app/copyright/page.tsx` — 저작권 + AI 생성물 표기
- `src/app/robots.ts` — AI 크롤러 차단 룰 (User-agent: GPTBot 등)
- `src/components/studio/settings/ComplianceSection.tsx` — "AI 사용 고지" 설정 (11건)
- `src/lib/content-rating.ts` / `src/lib/ai-usage-tracker.ts` — AI 메타데이터 자동 삽입

### B-2. SEO/메타 (검색 유입 유지)
- `src/app/layout.tsx` — `keywords` 배열의 "AI 소설", "AI IDE" (검색어 유지)
- `src/lib/web-features/structured-data.ts` — JSON-LD 스키마
- `src/app/opengraph-image.tsx` — OG 이미지 내 "AI" 표기

### B-3. 스토리/세계관 (허구 내 AI 캐릭터)
- `src/components/world-simulator/types.ts` / `SimulationEngine.tsx` — "AI 문명" (세계관 종족)
- `src/lib/articles-technology.ts`, `articles-reports.ts`, `articles-core.ts` — 세계관 기술 문서 내 AI
- `src/data/reports/rpt-*.json` — 기밀 보고서 내 AI 프로토콜

### B-4. 작가 주도형 반어 카피 (전략적 유지)
- `src/app/welcome/page.tsx` — "AI가 쓰나요? 작가가 쓰나요?" 5건 (반어법, 전략적)
- `src/engine/director.ts` ESCAPE_WORDS — "AI로서/나는 AI" 오염 제거 (작가 혐오 해결)

---

## C. 개발자/CLI/엔진 내부 — **유지 대상**

- `src/cli/**` (ai-bridge, ai-config, 모든 aip-0* 검출기) — CLI 내부 변수명
- `src/engine/**` — NOA Writing Engine 내부 타입/클래스/함수 (AI-related naming)
- `src/lib/ai-*.ts` — ai-providers / ai-usage-tracker / ai-cache (내부 API)
- `src/lib/code-studio/ai/**` — 내부 AI 오케스트레이터 (ari-engine, nod, ghost)
- `src/hooks/code-studio/useAI*.ts` — 내부 훅 명
- 모든 `__tests__/*.test.ts` — 테스트 파일 (구현 상세)
- `src/lib/changelog-data.ts` — 변경 이력 (과거 기록)

---

## 결론

- **치환 대상 5건**: T-008에서 정밀 치환 (파일·라인 확정)
- **유지 대상 627건**: 법적 고지, SEO 검색어, 세계관 설정, 엔진 내부 — 건드리지 않음
- **회귀 위험 낮음**: 치환 대상은 모두 i18n 라벨 문자열이라 타입 영향 없음
