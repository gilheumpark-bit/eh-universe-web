# v2.2.0-alpha.1 — A11y 100/100 × 5 Pages

**Release Date**: 2026-04-21
**Type**: Alpha Checkpoint
**Tag**: `v2.2.0-alpha.1`

---

## Executive Summary

Lighthouse 5페이지 전수 감사 + 전건 수리로 **Accessibility 100/100** 확정. WCAG 2.1 AA 준수 + Label-in-Name (2.5.3) + Heading Order (1.3.1) 전수 검증.

| Page | Performance | **Accessibility** | Best Practices | SEO |
|------|:-----------:|:-----------------:|:--------------:|:---:|
| `/` | 71 | **100** | 96 | 92 |
| `/studio` | — | **100** | — | — |
| `/translation-studio` | — | **100** | — | — |
| `/network` | — | **100** | — | — |
| `/archive` | — | **100** | — | — |

---

## Changes

### 🎯 접근성 전수 수리 (3종 7건)

#### `heading-order` (WCAG 1.3.1) × 5
`MobileStudioView`의 섹션 헤딩 `h3 → h2` 승격.
- 세계관 메모 / 캐릭터 스케치 / 플롯 브레인스토밍 / 내 원고
- 상단 `h1 "로어가드 — 모바일 스케치"` 다음 h2가 맞는 구조

#### `label-content-name-mismatch` (WCAG 2.5.3) × 5
- **Header 로고**: EH 배지 / TEST 배지 / 서브타이틀 `aria-hidden="true"`
- **Header 언어 토글** (데스크톱+모바일): `aria-label` 동적 생성
  - `"Toggle language"` → `"KO — Toggle language"` (현재 언어 코드 포함)
- **Archive 기사 링크**: 번호(01) · 화살표(->) 장식 요소 `aria-hidden`

#### `color-contrast` (WCAG 1.4.3) × 2
- **Archive "EH" 배지**: `bg-accent-amber/20 text-accent-amber` → `bg-accent-amber/40 text-text-primary`
  - 1.85:1 → **>7:1** (WCAG AAA 통과)
- **MobileDesktopOnlyGate 공유 버튼**: `text-white` 제거 + inline `color:#fff`
  - light 모드 `.text-white` 오버라이드로 인한 1.85:1 → **5.5:1** (AA 통과)

---

## 포함된 커밋 (4)

| SHA | 제목 |
|-----|------|
| `186c057b` | feat(a11y): 라이브 프리뷰 검수 — main 랜드마크·대비·뱃지 P1 |
| `bd2c6689` | feat(a11y): A~D 심화 검수 — 토큰·랜드마크·터치타겟·tabular |
| `63a04a68` | feat(a11y): 이월 4건 정리 — 토큰·시맨틱·다국어·모바일 터치타겟 |
| `b9c457c3` | fix(a11y): Lighthouse 5페이지 전수 수리 — A11y 100/100 × 5 |

---

## Verification

- ✅ `npx tsc --noEmit` → 0 errors
- ✅ `npx next build` → exit 0
- ✅ `npm test` → 3,304 passing / 298 suites
- ✅ Lighthouse `/ /studio /translation-studio /network /archive` → **A11y 100 × 5, fails 0**

---

## 변경 파일 (5)

```
M src/components/studio/MobileStudioView.tsx       # h3×5 → h2 + aria-label PC 포함
M src/components/Header.tsx                         # 로고 장식 aria-hidden + 언어 토글 동적
M src/app/archive/ArchiveClient.tsx                 # EH 배지 대비 + 링크 장식 aria-hidden
M src/components/studio/MobileDesktopOnlyGate.tsx   # 공유 버튼 색상 명시
M src/lib/changelog-data.ts                         # 0.2.0-alpha.7 엔트리 확장
```

---

## 🔧 서비스 영향

- **UI 시각 변화**: 최소 (Archive EH 배지 톤이 살짝 진해짐)
- **a11y 도구 사용자**: 스크린리더 명확도 향상, 음성 인식 명령 정확도 향상
- **색맹/저시력**: 대비 개선으로 가독성 상승

---

## ⏭️ 다음 작업 (P3)

- **Perf 71/62** — `/` LCP 9.6s, unused JS 1.13s, unused CSS 460ms
  - 구조적 이슈 (홈페이지 복잡도 + Tailwind purge 여지)
  - 회귀 없는 "opportunity" 범주 — 별도 리팩터 작업 필요

---

## 🚀 Deployment

- **Production**: https://ehuniverse.com
- **Aliases**: https://ehsu.app · https://eh-universe-web.vercel.app
- **Inspector**: https://vercel.com/gilheumpark-bits-projects/eh-universe-web/BVp4qHPUdmf6yQYT5NbmtnhF5LKx
- **Region**: `icn1` (Seoul)
- **Bundler**: Turbopack

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
