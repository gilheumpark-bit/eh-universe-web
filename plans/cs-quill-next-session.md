# CS Quill CLI — 다음 세션 지시서

> **이전 세션 결과**: 26커밋, 73파일, 14,610줄
> **브랜치**: `claude/build-studio-cli-Zm9vb`
> **상태**: push 완료, working tree clean

---

## 현재 상태 요약

### 완성된 것
- CLI 엔트리 (bin/cs.ts) — 27개 명령어 등록
- 21개 커맨드 (generate, verify, audit, vibe, playground, stress, bench 등)
- 19개 코어 모듈 (config, loop-guard, fix-memory, style-learning, badges, patent-db, deprecation, reference-db, ai-config, session, cost-tracker, i18n, constants, file-cache, terminal-compat, security-sandbox, task-runner, plugin-system, ast-bridge, data-flow, deep-verify, cfg-engine, auto-heal, arena, precision-checklist)
- 15개 어댑터 (fs, local-model, ast-engine, lint-engine, security-engine, perf-engine, test-engine, sandbox, lsp-adapter, git-deep, git-enhanced, worker-pool, terminal-integration, search-engine, multi-lang, web-quality, dep-analyzer, debug-adapter)
- 영수증 (HMAC 해시체인 + SARIF)
- TUI (progress + diff-preview)
- 계획서 (plans/cs-quill-cli-workorder.md)

### 진단 이력
- 5차 진단, 91건 버그 발견/수정
- 자체 검증: 8팀 파이프라인 96/100 PASS
- Deep Verify: 27건 (오탐 포함)

### 솔직한 완성도
```
🟢 제대로 된 것:     15/52 (29%)
🟡 작동하지만 얇은:  25/52 (48%)
🔴 껍데기:          12/52 (23%)
```

---

## 다음 세션 우선순위

### 1순위: 껍데기 12개 → 실체화

| # | 모듈 | 현재 | 목표 |
|---|------|------|------|
| 1 | worker-pool.ts | import 경로 문제로 실행 불가 | `@/` 경로 해결 + 실제 병렬 검증 |
| 2 | lint-engine.ts | `npx eslint` 실행만 | eslint API 직접 호출 + 결과 파싱 |
| 3 | security-engine.ts | `npx snyk` 실행만 | npm audit JSON 파싱 실체화 |
| 4 | perf-engine.ts | `npx c8` 실행만 | autocannon 직접 호출 + 메트릭 수집 |
| 5 | test-engine.ts | `npx vitest` 실행만 | vitest API + fast-check 직접 연동 |
| 6 | dep-analyzer.ts | `npx depcheck` 실행만 | depcheck API 직접 호출 |
| 7 | web-quality.ts | 번들 크기 DB만 | axe-core JSDOM 실제 연동 |
| 8 | sandbox.ts | child_process 래핑만 | vm 모듈 격리 + 리소스 제한 |
| 9 | debug-adapter.ts | node --inspect 실행만 | Inspector Protocol 직접 연결 |
| 10 | git-enhanced.ts | merge conflict 파서 불완전 | AST 기반 충돌 해소 |
| 11 | plugin-system.ts | 등록만 되고 실행 못함 | 실제 플러그인 로드 + 훅 실행 |
| 12 | file-cache.ts | 10초 캐시 | LRU + 파일 변경 감지 (fs.watch) |

### 2순위: 얇은 25개 → 밀도 강화

| 그룹 | 대상 | 핵심 보강 |
|------|------|----------|
| AI 연동 | vibe, explain, learn, suggest | AI 응답 스트리밍 + 에러 복구 + 캐시 |
| 검증 | stress, bench, compliance | 실측 데이터 수집 + 비교 리포트 |
| Git | apply, sprint | hunk 단위 적용 + 롤백 + 충돌 감지 |
| UX | report, bookmark, preset, fun | 데이터 시각화 + 인터랙티브 |
| 코어 | badges, patent-db, deprecation | 패턴 DB 확장 + 자동 업데이트 |

### 3순위: 제품 인프라 (Level 2 Beta)

| # | 항목 | 없는 것 |
|---|------|---------|
| 1 | README.md | CLI 설치/사용 가이드 |
| 2 | CHANGELOG.md | 버전별 변경 이력 |
| 3 | 테스트 코드 | jest/vitest CLI 자체 테스트 |
| 4 | npm publish | package.json 정리 + publish 스크립트 |
| 5 | CI/CD | GitHub Actions 워크플로 |
| 6 | 에러 메시지 통일 | i18n.ts 전 명령어 적용 |

---

## 핵심 파일 위치

```
src/cli/
├── bin/cs.ts              ← 모든 명령어 진입점
├── commands/              ← 21개 명령어
├── ai/                    ← planner, team-lead, cross-judge, precision-checklist
├── core/                  ← 19개 (config, loop-guard, ast-bridge, cfg-engine, arena, auto-heal...)
├── adapters/              ← 15개 (외부 도구 연동)
├── formatters/receipt.ts  ← HMAC 영수증
├── tui/                   ← progress, diff-preview
└── index.ts               ← barrel export

plans/
├── cs-quill-cli-workorder.md    ← 전체 설계서
└── cs-quill-next-session.md     ← 이 파일
```

---

## 검증 파이프라인 현재 구조

```
Phase 1: Regex (8팀)        → 표면
Phase 2: AST (6패키지)       → 구조
Phase 3: LSP (tsc)           → 타입
Phase 4: Hollow (빈깡통 5겹)  → 완성도
Phase 5: Data Flow (null+taint) → 흐름
Phase 6: Cross-File (콜그래프)  → 크로스
Phase 7: Deep Verify (7검사)   → 논리 P0~P2
Phase 8: CFG Brain (위험경로)   → 제어흐름

+ Auto-Heal: 15종 퍼징 → AI 수정 → 6라운드
+ Arena: Evidence 4종 → Attacker → Defender → Judge
+ Precision: 48항목 체크리스트 (키 1개 정밀 타격)
```

---

## 비용 구조

```
2만원 ($15) / 월 / 4개 AI:
  Claude Sonnet: 생성 $5
  GPT-5.4-mini:  검증 $0.48
  Gemini Flash:  크로스 $0.12
  Groq:          커밋 $0
  → 월 $5.84 사용, $9.16 이월
```

---

## GPT 15-Layer 커버리지

```
안 하는 것: 에디터(0%), UI(30%), 원격(0%)
나머지 평균: 72%

AI: 95%, 보안: 92%, Git: 90%
탐색: 75%, 검색: 75%, 빌드: 75%, 플러그인: 75%
인텔리전스: 75%, 터미널: 70%, 세션: 70%, 성능: 70%
디버깅: 40%
```

---

## 마스코트

🦔 **CS Quill** (고슴도치)
- 가시 = 8팀 검증
- 점수별 기분: ≥95 축하 / ≥70 기본 / <70 슬픔
- ASCII art: fun.ts에 정의

---

## 지시 요약

```
"CS Quill CLI 다음 세션이다.
브랜치: claude/build-studio-cli-Zm9vb
plans/cs-quill-next-session.md 읽고 1순위(껍데기 12개 실체화)부터 진행."
```
