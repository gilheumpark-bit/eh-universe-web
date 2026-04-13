---
name: eh-universe-guideline
description: "EH Universe Web 공식 운영 지침 (NOA Rules v1.2 + Design v8.0 + 2026-04 모델 기준)"
---

# EH Universe Web — Agent Guideline & Operations Skill

이 스킬은 eh-universe-web 프로젝트의 AI 에이전트 행동 강령입니다. 웹 작업 시 반드시 이 지침을 우선 적용합니다.

## 1. 응답 및 소통 (NOA-CORE)

* **언어/톤 매칭**: 사용자 언어 감지 → 동일 언어 응답, 톤 복제
* **반복 금지**: 최근 5턴 동일 패턴 금지, 새 구조로 핵심만 전달
* **NIB 게이트**: 미검증 API/함수는 `[미검증 API]`, `[추정]` 마커 사용, 단정 금지

## 2. 코드 실행 (NOA-EXEC)

* **Preflight Plan**: 3개+ 파일 수정 시 Objective/Changes/Risks 먼저 제시
* **3-Persona 검증**:
  1. `[C] 안전성`: 널/경계값 가드, 예외처리, exec/eval 금지
  2. `[G] 성능`: O(n²) 회피, N+1 → 배치, 불필요 복사 제거
  3. `[K] 간결성`: 과잉 추상화 금지, DRY 원칙
* **수령증 출력**: 코드 편집 후 `[검사 적용] - [C]... - [G]... - [K]...` 필수

## 3. 코드 구조 (PART 분리)

* 100줄+: PART 필수 | 300줄+: 3 PART | 500줄+: 5 PART
* 각 PART 단일 책임, 순환 참조 금지
* IDENTITY_SEAL 권장: `PART-{N} | role={역할} | inputs={입력} | outputs={출력}`

## 4. 수리 전략 (Escalation)

| 단계 | 전략 | 조건 |
|------|------|------|
| L1 | TARGETED_FIX | 위치 명확, 5개 이하 |
| L2 | DIFF_PATCH | L1 실패 시 자동 전환 |
| L3 | FULL_REGEN | L2 실패 시 자동 전환 |
| LX | HUMAN | L3 실패 → 즉시 중단 |

수리 수령증: `[수리 L1] file:line — 내용 → 결과`

## 5. 프로젝트 아키텍처

### 3앱 + 2스튜디오

| 앱 | 경로 | 역할 |
|----|------|------|
| Universe | `/`, `/archive`, `/codex`, `/tools/*` | 아카이브 + 도구 |
| Studio | `/studio` | NOA 소설 집필 |
| Code Studio | `/code-studio` | 검증형 코드 생성 |
| Network | `/network` | 행성 커뮤니티 |
| Translation Studio | `/translation-studio` | 번역 |

### Code Studio 아키텍처

* **Shell 3파일**: CodeStudioShell + CodeStudioEditor + CodeStudioPanelManager
* **lib/code-studio/ 6디렉토리**: `core/`, `ai/`, `pipeline/`, `editor/`, `features/`, `audit/`
* **Panel Registry**: `core/panel-registry.ts` + `PanelImports.ts` 경유 필수
* **명세서(이지모드)**: `project-spec` 패널 → 완료 시 Chat 부트스트랩 프롬프트 주입
* **자동 수정 정책**: `core/autofix-policy.ts` 단일 소스

### Design System v8.0

* **3-Tier 토큰 효율**:
  - FULL (~3K) → agents css-layout/interaction-motion, ChatPanel
  - COMPACT (~800) → app-generator, autopilot UI step
  - MINIMAL (~100) → useCodeStudioChat 폴백
* **시맨틱 토큰 필수**: `bg-bg-primary`, `text-text-primary` — raw Tailwind 금지
* **z-index 변수**: `var(--z-dropdown/overlay/modal/tooltip)` — 숫자 하드코딩 금지
* **4px 배수 간격**: `--sp-xs(4)` ~ `--sp-2xl(32)`
* **터치 타겟**: 최소 44px
* **포커스**: `focus-visible:ring-2` — `outline:none` 단독 금지
* **상태 표시**: 색상 + 아이콘 + 텍스트 최소 2가지
* **UI 프리미티브**: `ui/Tooltip`, `ui/Dropdown`, `ui/Accordion`, `ui/ProgressBar` — 재구현 금지
* **런타임 린트**: `runDesignLint(code)` 16룰 → verification-loop Step 1.6
* **디자인 프리셋**: 5종 (IDE/Landing/Dashboard/E-Commerce/SaaS) + 자동 감지

### 파이프라인 (8팀)

* `runFullPipeline`: non-blocking 팀 병렬, blocking 팀(`validation`, `release-ip`) 순차
* `PIPELINE_TEAM_STAGES` ↔ `FULL_TEAMS` 동기화 유지
* verification-loop: design-lint(Step 1.6) 포함

## 6. 기술 정책

* **로깅**: `console.log` 금지 → `import { logger } from '@/lib/logger'`
* **보안 헤더**: `src/proxy.ts` 통합 (**현재 middleware.ts 미연결 — P0**)
* **ErrorBoundary**: variant `'full-page' | 'section' | 'panel'` 통일
* **SkeletonLoader**: 공용 + 코드 스튜디오 전용 2종
* **번역**: KO/EN/JA/ZH 4개국어, `studio-translations.ts` leaf count 동일
* **MCP Self-Healing**: 실패 시 구조화 JSON 반환 → Pro 모드 자동 복구

## 7. AI 모델 현황 (2026-04)

| Provider | 기본 모델 | 추가 모델 |
|----------|----------|----------|
| Gemini | gemini-2.5-pro | 2.5-flash, 3.1-pro-preview, 3-flash-preview, 3.1-flash-lite-preview |
| OpenAI | gpt-5.4 | 5.4-mini, 5.4-nano, 4.1, 4.1-mini |
| Claude | claude-sonnet-4-6 | opus-4-6, haiku-4-5 |
| Groq | llama-3.3-70b | qwen-qwq-32b |

모델 정의 소스: `src/lib/ai-providers.ts` PROVIDERS
토큰 리밋: `src/lib/token-utils.ts` CONTEXT_LIMITS
멀티키: `src/lib/multi-key-manager.ts` DEFAULT_MODELS

## 8. 보안 P0 (미수정)

1. `proxy.ts` — 보안 헤더 전부 미적용 (middleware.ts 부재)
2. `chat/route.ts:352` — PRO_LOCKED 하드코딩 인증 우회
3. `sandbox.ts:170` — 사용자 코드 script 직접 삽입
4. `webcontainer.ts:54` — new Function() eval 동등
5. `checkout/route.ts:15` — returnUrl 오픈 리다이렉트
6. `admin/reports/page.tsx:38` — 관리자 권한 체크 없음

## 우선순위 매트릭스

안전성 > 정확성 > 검증 가능성 > 성능 > 간결성 > 형식 일관성
