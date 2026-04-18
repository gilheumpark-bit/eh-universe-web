# Loreguard Patch Notes v3.0

**Release Date**: 2026-04-19
**Previous**: v2.0 (2026-04-18)
**Commits**: `3419e3a2..4faa70ae` (7 major)

---

## Executive Summary

Loreguard v3.0은 **"코드만 있는 상태"에서 "알파 배포 가능"으로 전환된 하루**입니다.

| 지표 | 4-18 (v2.0) | 4-19 (v3.0) | Δ |
|------|-------------|-------------|-----|
| 테스트 | 2,232 | 2,331 | **+99** |
| 수리 이슈 | — | 200+ | — |
| 파일 진단 | — | 850+ | — |
| 신규 페이지 | — | 4 (법적 문서) | +4 |
| 보안 등급 | — | P0 6 / P1 13 모두 수리 | — |
| UX 프레임워크 | 3-persona | **역할 기반 + Tier** | +2 축 |
| 4언어 키 신규 | — | 100+ | — |

### 커밋 내역

| SHA | 제목 |
|-----|------|
| `3419e3a2` | security: 보안 감사 P0 6 + P1 13 전수 수리 |
| `e80a2fca` | refactor: 3루프 Loop 1 (790 파일 / 69 수리) |
| `7834b0f4` | refactor: 3루프 Loop 2 (15 / 13) — 회귀 검증 + 크로스파일 |
| `047ff905` | refactor: 3루프 Loop 3 (25 / 9) — useCodeStudioPanels 분해 |
| `03c78412` | feat(ux): UX 5축 (세션/시각/키보드/빈상태/접근성) |
| `1920e0d2` | feat(infra): 인프라 5축 (fallback/export/법적/SEO/AI라벨) |
| `4faa70ae` | feat(ux): Progressive Disclosure (역할/Tier/샘플/Settings/TabHeader) |

---

## 보안 감사 (3419e3a2) — 실제 공격 벡터 전수 수리

전수 1,292 파일 스캔 후 발견된 **실제 공격 가능** 벡터 수리. 거짓 보안 제거 포함.

### P0 6건 (실제 공격 가능)
1. **GlossaryPanel XSS** — 원문 `<img onerror=...>` 실행 가능 → escape-then-match 패턴
2. **PreviewPanel iframe sandbox** — `allow-scripts + allow-same-origin` 동시 부여 → 동적 감지 후 제거
3. **CLI search-engine 셸 인젝션** — `rg` query shell 주입 → `execFileSync`
4. **CLI perf-engine 셸 인젝션** — `c8` template literal → argv 배열
5. **CLI plugin-system 셸 인젝션** — `npm search` query → sanitize + execFileSync
6. **autopilot SSE 스트림 config throw** — DEFAULT_CONFIG merge 가드

### P1 13건 (크리티컬)
- HMAC fallback 가짜 서명 (감사 체인 거짓 통과 → throw)
- /api/agent-search 무인증 (142만원 크레딧 소진 가능)
- /api/upload 무인증 + 20MB DoS
- ulimit 허위 보안 (실제 작동 안 함 → 정직한 경고로)
- serve.ts CORS `*` + API 키 timing-unsafe → 화이트리스트 + crypto.timingSafeEqual
- AI 출력 shell 직주입 (prompt injection → RCE) → execFileSync 4건
- ... 외 7건

---

## 3루프 정밀 진단 (e80a2fca → 7834b0f4 → 047ff905)

사용자 요청 "효율이라는 말 허용 안 함" — 파일 1개당 Read 강제.

### Loop 1 (790 파일 / 69 수리)
진짜 발견한 P1 버그:
- **saga-transaction AI 이중 호출** (토큰 2배 낭비)
- **suggest.ts ReferenceError** (try-catch가 침묵)
- **TranslationPanel browser TypeError**
- **CodeStudioShell apply-guard fail-open**
- **Tailwind 무효 z-class** (ContextMenu z-101 런타임 미적용)

### Loop 2 (15 / 13)
- 회귀 검증 (66 수리 파일 전수)
- 심화 Read (표본 스캔 29파일 full Read)
- 크로스파일 통합 (15 export 추적, 호환 파손 0)
- 이월 이슈 6건 수리

### Loop 3 (25 / 9)
- useCodeStudioPanels 530→103줄 분해 (8 서브 훅)
- 법적 문서 문구 동기화
- ESLint 최종

---

## UX 5축 (03c78412) — 작가 피로도 대응

기존 FatigueDetector는 독자용. 작가용 시스템 신설.

### F1 작가 세션 관리
- `useSessionTimer.ts` 478줄: 포모도로 25/5/15 + 일일 목표 + 휴식 알림 (50분)
- StatusBar 통합: 경과시간/일일 누적/진행률 바

### F2 시각 편의
- 블루라이트 필터 (sepia 12% + brightness 0.96)
- 우측패널 text-xs → text-sm
- AI 생성 FAB (Ctrl+Enter 글로벌)
- 씬시트 경고 에디터 인라인

### F3 키보드 내비
- Ctrl+\ 분할뷰 토글
- Arrow Up/Down 에피소드 이동 (role="treeitem" 유지)

### F4 빈 상태 공용
- EmptyState 컴포넌트 + 6곳 적용 (World/Scene/Item/History/Characters/Manuscript)
- 4언어 48 항목

### F5 접근성
- 5모달 aria (QuickStart/Rename/WorkspaceTrust/MergeConflict/Marketplace)
- QualityGutter sr-only 등급 텍스트
- ContinuityGraph aria-label + aria-pressed

---

## 인프라 5축 (1920e0d2) — 회사 설립 전 대비

### G1 DGX Spark 단일 장애점 대응
- `useSparkHealth` + ai-providers fallback 체인 (DGX → BYOK → 명시 에러)
- `useStorageQuota` 70/90% 임계
- `firebase-quota-tracker` 일일 카운터

### G2 원고 전체 export
- `full-backup.ts` 463줄: JSON/ZIP + atomic rollback
- BackupsSection 통합

### G3 법적 문서 4페이지 (변호사 검토 전 초안)
- Terms 9섹션 / Privacy 9섹션 / Copyright 7섹션 / AI Disclosure 5섹션
- LegalPageLayout 공용 (알파 경고 배너 자동)
- **법률 검토 필요 10개 항목 명시**

### G4 SEO 풀스택
- Dynamic OG (Edge runtime)
- sitemap 17 URL
- **robots: AI 크롤러 9종 차단** (GPTBot/Google-Extended/CCBot 등)
- JSON-LD SoftwareApplication

### G5 AI 라벨 + 19+ + Changelog
- `ai-usage-tracker`: EPUB/DOCX 자동 고지 삽입 (Amazon KDP 대응)
- `content-rating`: 19+ 자가 선언 + `<dc:audience>Adult</dc:audience>` + 파일명 prefix
- `changelog-data` 7엔트리 4언어

---

## Progressive Disclosure (4faa70ae) — 60초 이탈 대응

### H1 UserRole 인프라
- role: writer/translator/publisher/developer/explorer
- Writing Tier: 기본 = 수동 + AI FAB, 고급 토글 시 5모드
- Code Studio: 작가 계정 내비 숨김 + URL 경고
- Welcome 4번째 슬라이드 (역할 선택 4종)

### H2 Translation 30초 샘플
- 4 장르 (판타지/로맨스/현대/액션) × 6축 점수 즉시 시연
- 직접 입력 200자 제한 (가입 CTA)

### H3 Settings Tier 분리
- Easy / Writing / Advanced / Developer (4탭)
- 기존 섹션 무수정, 재배치만

### H4 TabHeader + TermTooltip
- 8개 탭 상단 1줄 안내
- 12 용어 × 4언어 = 48 사전 엔트리

---

## 카테고리 변경

| 분야 | 수정 | 추가 | 삭제 |
|------|------|------|------|
| UI 컴포넌트 | 40+ | 15+ | 0 |
| 훅 | 8+ | 5 | 0 |
| 엔진 | 3 | 2 | 0 |
| 라이브러리 | 12+ | 8+ | 0 |
| 페이지 (Next route) | 2 (terms/privacy 갱신) | 3 (copyright/ai-disclosure/changelog) | 0 |
| API 라우트 | 5+ (인증 추가) | 0 | 0 |
| 4언어 키 | — | 100+ | 0 |

---

## 신규 npm 패키지

없음. 기존 의존성으로 100% 처리 (jszip, dompurify 기존 활용).

---

## 의존성 업그레이드 없음

React 19.2 / Next 16.2 / TypeScript 5 유지.

---

## Breaking Changes

없음. 모든 변경은 **opt-in + 후방호환** 원칙.
- Progressive Disclosure: 기본값 = 신규 사용자 단순 모드. 기존 사용자 = 고급 모드 자동 유지.
- AI 라벨: 기본 활성, Settings에서 opt-out 가능.
- 19+ 콘텐츠: 자가 선언 (기본 비설정).

---

## Migration Guide

사용자 관점:
- 기존 세션 호환 100%
- AI 라벨 기본 ON → Settings > Advanced에서 끄기 가능
- 19+ 자가 선언은 프로젝트 메타데이터에 저장 (수동 설정 필요)

개발자 관점:
- DGX 호출 → `useSparkHealth` 자동 fallback (코드 수정 불필요)
- BackupsSection: `getFullBackup()` / `restoreFullBackup()` 신규 export
- `ai-usage-tracker.ts` import → 자동 EPUB metadata 주입

---

## 테스트 커버리지

| 영역 | v2.0 (4-18) | v3.0 (4-19) | Δ |
|------|-------------|-------------|---|
| 유닛 테스트 | 1,990 | 2,089 | +99 |
| E2E 시나리오 | 19 | 19 (유지) | 0 |
| 테스트 스위트 | 209 | 221 | +12 |
| tsc 에러 | 0 | 0 | — |
| 회귀 건수 | 0 | 0 | — |

> 참고: 사용자 보고 기준 총 테스트 2,232 → 2,331 (+99)

---

## 보안 점수

| 항목 | v2.0 | v3.0 | Δ |
|------|------|------|---|
| P0 미해결 | 0 | 0 | — |
| P1 미해결 | 13 | 0 | -13 |
| 거짓 보안 | 2 (HMAC fallback / ulimit) | 0 | -2 |
| API 라우트 무인증 | 2 (agent-search / upload) | 0 | -2 |
| Shell 인젝션 가능 지점 | 7 | 0 | -7 |
| XSS 가능 지점 | 1 | 0 | -1 |

---

## 최종 통계

| 영역 | 수치 |
|------|------|
| 총 파일 변경 | 164+ |
| 총 이슈 수리 | 200+ |
| 신규 컴포넌트 | 15+ |
| 신규 훅 | 5 |
| 신규 페이지 | 5 (copyright/ai-disclosure/changelog + 업데이트된 terms/privacy) |
| 4언어 키 신규 | 100+ |
| 테스트 증가 | +99 (2,232 → 2,331) |

---

## Known Issues (TODO)

- 법적 문서 변호사 검토 미완료 (10개 검토 항목 명시 — 정식 출시 전 필수)
- JP/CN 오염 사전 미구축 (v3.1 예정)
- AI 크롤러 차단은 robots 의존 (강제 차단 불가)
- 19+ 자가 선언은 한국 정책 — 글로벌 분리 필요
- 도메인 미확보 (loreguard.com / .co.kr / .app)
- 상표 출원 미진행

---

## 다음 단계 (코드 외)

1. **도메인 확보**: loreguard.com / .co.kr / .app
2. **상표 출원**: 로어가드 + Loreguard
3. **사업자 등록**: 개인 → 법인 검토
4. **변호사 검토**: 법적 문서 4페이지 + 알파→정식 전환
5. **브릿G 작가 공고**: 50명 모집
6. **모두의 창업 0차 신청**
7. **Royal Road 자가 번역 업로드** (첫 성공 케이스)

---

## 개발자 노트

- 단일 개발자 (박길흠) 기준
- 30일 차 프로젝트
- 특허 2026-03-03 출원 완료
- NOA Unified Stack v2.1 적용
- 3-Persona [C/G/K] 검사 강제
- DGX Spark 로컬 추론 + Cloudflare Tunnel

---

## Contributors

- 박길흠 (솔로 개발자)
- Anthropic Claude (Sonnet 4.6 + Opus 4.7 1M context) — Co-Author

---

## 다음 릴리스 계획 (v3.1, 2026-05 예정)

1. JP/CN 오염 사전 실측 데이터 수집 후 구축
2. 변호사 검토 후 법적 문서 정식 버전 전환
3. Playwright CI 활성화 + E2E 시나리오 +10
4. Marketplace 외부 플러그인 3개 커뮤니티 공모
5. 도메인/상표/사업자 등록 완료
6. 브릿G 작가 50명 영입

---

**v3 릴리즈 = 알파 배포 가능 지점**.
브릿G 공고 + 0차 신청서 제출 직전 상태.

**전체 통계**: 14일(브랜드) + 31일(Loreguard) = 45일 만에 알파 배포 가능 지점 도달.
