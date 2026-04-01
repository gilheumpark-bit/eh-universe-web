# EH Universe Web — 전체 속도/성능 최적화 작업지시서

> 생성일: 2026-03-31 | 전수 스캔 기반
> 목표: FCP 0.5초 단축, 번들 2MB 절감, AI 생성 50% 가속

---

## HIGH 영향 (6건)

### 1. Google Fonts → next/font 전환
- **파일**: `src/app/layout.tsx:77`
- **현재**: 외부 CSS로 5개 폰트 패밀리 로드 (블로킹 300~500ms)
- **수정**: `next/font/google` 로컬 호스팅 + 페이지별 필요 폰트만
- **효과**: FCP 0.5초 단축

### 2. useState 폭탄 → useReducer 전환
- **파일**: `src/app/studio/StudioShell.tsx` (26개), `src/components/code-studio/CodeStudioShell.tsx` (40개)
- **현재**: 모든 state 변경마다 전체 컴포넌트 트리 리렌더
- **수정**: useReducer 3그룹 (UI/data/AI) + React.memo 경계
- **효과**: 리렌더 범위 70% 축소

### 3. Firebase SDK lazy import
- **파일**: `src/lib/firebase.ts`, `src/lib/AuthContext.tsx`
- **현재**: 모든 페이지에서 ~200KB Firebase 즉시 로드 (비로그인도)
- **수정**: `const { getAuth } = await import('firebase/auth')` — 로그인 시점에만
- **효과**: 비로그인 페이지 200KB 절감

### 4. 클라이언트 데이터 캐시 도입
- **현재**: Firestore 직접 호출, 페이지 이동마다 재요청
- **수정**: SWR 또는 React Query 래퍼 → stale-while-revalidate
- **효과**: 페이지 이동 시 즉시 표시 + 백그라운드 갱신

### 5. SSG 전환 (정적 페이지 4개)
- **대상**: `/about`, `/rulebook`, `/docs`, `/reference`
- **현재**: 전부 SSR (매 요청 서버 렌더링)
- **수정**: 서버 컴포넌트 + SSG (빌드 시 정적 생성)
- **효과**: TTFB 즉시 (CDN 캐시 히트)

### 6. Monaco 번들 tree-shaking
- **현재**: ~3.4MB JS 청크 (모든 언어 포함)
- **수정**: TS/JS/JSON만 유지, 나머지 언어 제거
- **효과**: 1~2MB 절감

---

## MEDIUM 영향

### 7. 미들웨어 CSP nonce 최적화
- **파일**: `src/middleware.ts`
- **수정**: 정적 자산 요청은 nonce 생성 스킵

### 8. localStorage 동기 읽기 제거
- **수정**: useEffect 내에서 비동기 읽기, hydration 후 적용

### 9. 중첩 루프 O(n²) 패턴 73건
- **수정**: Map/Set 전환으로 O(n) 변환

### 10. next/image 미사용 곳 전환
- **수정**: raw `<img>` → `<Image>` (자동 최적화 + WebP)

### 11. Sentry lazy 초기화
- **수정**: 에러 발생 시점에 동적 로드

---

## AI 생성 속도 (speed-optimization-workorder.md 참조)

| 기능 | 병목 | 개선 | 효과 |
|------|------|------|------|
| QuickStart | 순차 3호출 | Promise.all | 10초 단축 |
| 챕터 분석 | 거대 스키마 블로킹 | 3분할 병렬 | 5초 단축 |
| 번역 청크 | 순차 처리 | 3배치 병렬 | 60% 단축 |
| Autopilot | 9단계 순차 | 5단계 병렬화 | 50% 단축 |
| 이중 리트라이 | 최대 6회 | 서버만 2회 | 30초 절약 |
| 타임아웃 | 60s/30s 불일치 | 35s/30s 통일 | 대기 제거 |

---

## NTE (번역 엔진) 속도

| 병목 | 개선 | 효과 |
|------|------|------|
| 5단계 순차 (25~50초) | Stage 0+1 병렬, Stage 2+3 병합 | 10~15초 |
| 블로킹 응답 | SSE 스트리밍 | 체감 즉시 |
| 청크 순차 | 3청크 동시 | 60% 단축 |
| 모델 동일 | 초안=Flash, 퇴고=Pro | 초안 2배 |
| 캐시 없음 | 동일 텍스트 캐시 | 재시도 0초 |

---

## 실행 순서

```
Sprint 1 — 즉시 효과 (1시간):
  next/font 전환
  Firebase lazy import
  SSG 4페이지
  타임아웃 정합

Sprint 2 — 핵심 (1세션):
  useState → useReducer
  QuickStart 병렬화
  Monaco tree-shaking

Sprint 3 — 중기 (2~3세션):
  SWR/React Query 도입
  번역/챕터분석 병렬화
  Sentry lazy init
  중첩 루프 O(n²) 수정
```

---

## 검증

```bash
npm run build
# Lighthouse 점수 측정 (Performance 목표: 90+)
# Network 탭 → 총 전송량 목표: < 1MB (초기 로드)
# DevTools Performance → 리렌더 횟수 측정
```
