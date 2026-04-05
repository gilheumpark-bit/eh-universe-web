# CS Quill CLI — Work Order

> **CS Quill** 🦔 — 코드 퀄리티 지키는 고슴도치
> "테스트 없이도 8개 관점에서 검증하고, 다른 모델이 크로스체크하고, 영수증까지 남기는 CLI"

---

## 1. 포지셔닝

| 항목 | 내용 |
|------|------|
| 이름 | CS Quill (Code Studio + Customer Service + Quill/Quality) |
| 마스코트 | 🦔 Quill (고슴도치 — 가시 = 8팀 검증) |
| 핵심 가치 | 생성 + 검증 + 영수증 올인원 CLI |
| 라이선스 | CC BY-NC 4.0 (무료), 상업 라이선스 별도 |
| 타겟 | 바이브코더 ~ 시니어, 솔로 ~ 팀 |

### 경쟁 대비

- **vs Aider/OpenCode/Claude Code** — 생성만 하고 검증 없음. CS는 검증 내장.
- **vs SonarQube/DeepSource** — 검증만 하고 생성 없음. CS는 생성 내장.
- **vs CrewAI/LangGraph** — 에이전트 대화로 합의(비쌈). CS는 SEAL 계약(공짜).
- 아무도 "생성 + 검증 + 자동수정 + 영수증"을 한 CLI에 안 넣었음.

---

## 2. 아키텍처

### 2.1 디렉토리 구조

```
src/cli/
├── bin/
│   └── cs.ts                    # 엔트리포인트 (#!/usr/bin/env node)
├── commands/
│   ├── init.ts                  # cs init (온보딩)
│   ├── generate.ts              # cs generate / cs 생성
│   ├── verify.ts                # cs verify / cs 검증
│   ├── audit.ts                 # cs audit / cs 감사
│   ├── stress.ts                # cs stress / cs 스트레스 (실측)
│   ├── bench.ts                 # cs bench (함수 벤치마크)
│   ├── playground.ts            # cs playground (44엔진 풀벤치)
│   ├── ip-scan.ts               # cs ip-scan (특허/라이선스)
│   ├── compliance.ts            # cs compliance (배포 전 원스톱)
│   ├── explain.ts               # cs explain (코드 해설)
│   ├── sprint.ts                # cs sprint (목록 순차 자동)
│   ├── vibe.ts                  # cs vibe (바이브코더 모드)
│   ├── serve.ts                 # cs serve (로컬 API 서버)
│   ├── report.ts                # cs report (일일/팀 리포트)
│   ├── apply.ts                 # cs apply (수정본 → 원본 적용)
│   ├── undo.ts                  # cs undo (롤백)
│   └── config.ts                # cs config (설정 관리)
├── ai/
│   ├── planner.ts               # Planner — SEAL 계약 생성
│   ├── team-lead.ts             # TeamLead — 판정 프로토콜
│   ├── cross-judge.ts           # Cross-Model Judge — 독립 심판
│   └── agent-runner.ts          # 에이전트 실행 래퍼
├── adapters/
│   ├── fs-adapter.ts            # IndexedDB → 로컬 파일시스템
│   ├── runtime-adapter.ts       # WebContainer → 로컬 Node.js
│   └── lsp-adapter.ts           # LSP 연동 (Level 3-4 정밀도)
├── formatters/
│   ├── receipt.ts               # 검증 영수증 포맷터
│   ├── pipeline-report.ts       # 8팀 파이프라인 리포트
│   ├── harness-report.ts        # 3-Gate 하네스 리포트
│   ├── table.ts                 # 터미널 테이블
│   └── sarif.ts                 # SARIF 출력 (CI용)
├── core/
│   ├── config.ts                # ~/.cs/config.toml 관리
│   ├── alias.ts                 # 다국어 커맨드 alias
│   ├── hash-chain.ts            # SHA256 영수증 해시체인
│   ├── fix-memory.ts            # Fix Memory (SQLite)
│   ├── style-learning.ts        # 프로젝트 컨벤션 학습
│   └── loop-guard.ts            # 6중 루프 방지
├── tui/
│   ├── progress.ts              # 진행률 + 예상 시간
│   ├── diff-preview.ts          # diff 미리보기
│   └── playground-ui.ts         # 44엔진 벤치 TUI
└── index.ts                     # barrel export
```

### 2.2 웹 연동

```
웹 (Code Studio)  ←→  CLI (CS Quill)
  └─ 같은 lib/code-studio/ 엔진 공유
  └─ cs serve :8080 → 웹에서 HTTP 호출
  └─ .cs/ 폴더로 프로젝트/영수증/점수 공유
```

### 2.3 파일 관리 모드

| 모드 | 원본 | 동작 |
|------|------|------|
| 🔒 safe (기본) | 절대 안 건드림 | .cs/generated/에 저장, cs apply로 적용 |
| 🔓 auto | 승인 후 적용 | diff 보여주고 → [Y/n] |
| ⚡ yolo | 바로 덮어씀 | git stash 자동 + halt 안전장치 |

---

## 3. 핵심 파이프라인

### 3.1 생성 파이프라인 (SEAL 계약 방식)

```
1. Planner (1회 API)
   → 태스크를 N개 PART로 분해 + SEAL 계약 정의

2. Parallel Generator (N회 API 동시)
   → 각 PART 독립 생성, SEAL 계약 준수

3. Merger (로컬)
   → import 통합 + 네이밍 검증 + PART 순서 조립

4. Verify (로컬 + 크로스모델)
   → 8팀 → 크로스체크 → 영수증
```

### 3.2 크로스모델 구조 (팀장 + 에이전트)

```
에이전트 (검증): 모델A → 의견 제출 (보고만, 대화 금지)
에이전트 (검증): 모델B → 의견 제출
팀장 (판정): 모델C → 취합 → 1회 판정 → 끝. 항소 없음.
```

### 3.3 PART/SEAL 코드 구조

| 설정 | 동작 |
|------|------|
| auto (기본) | 50줄↓ flat, 100줄↑ part |
| on | 항상 PART + SEAL |
| off | 항상 flat |

### 3.4 루프 방지 6중 안전장치

1. 라운드 하드캡 (3회) — verification-loop
2. 진전 없으면 포기 (점수 < 2점 변화) — verification-loop
3. 수정 대상 없으면 포기 — verification-loop
4. 연속 실행 차단 (5회) — approval-mode
5. 연속 에러 차단 (3회) — approval-mode
6. 팀장 1회 판정 — cross-model (대화 금지)

### 3.5 빈깡통 방지 5겹

1. Gate 1: AST Hollow Scanner (빈함수, 더미리턴, 빈catch, 스텁, 미사용파라미터)
2. Gate 2: Frontend 5-State (Loading/Empty/Error 누락) + Dead DOM (onClick 없는 button 등)
3. Adversarial Spy (하드코딩 리턴 탐지)
4. Adversarial Fuzz (null/NaN/빈배열 주입 → 크래시 탐지)
5. Audit 프로젝트 전체 (stub/placeholder/noop 패턴)

---

## 4. 멀티키 시스템

```toml
# ~/.cs/keys.toml — 무제한 키, 역할 매핑
[[keys]]
id = "claude-main"
provider = "anthropic"
key = "sk-ant-xxx"
model = "claude-opus-4-6"
roles = ["generate"]
budget = "$5/day"

[[keys]]
id = "claude-verify"
provider = "anthropic"
key = "sk-ant-yyy"
model = "claude-haiku-4-5"
roles = ["verify", "cross-check"]
budget = "$2/day"

[[keys]]
id = "gpt-judge"
provider = "openai"
key = "sk-oai-zzz"
model = "gpt-5.4-mini"
roles = ["judge", "fuzz"]
budget = "$3/day"
```

- 같은 회사 여러 키 OK (레이트리밋 분산)
- 역할:키 = N:M 자유 매핑
- 키별 예산 상한 설정
- 레이트리밋 시 자동 폴백

---

## 5. 사용자 모드

### 5.1 경험 수준

| 모드 | 대상 | 승인 | 결과 표시 | 자동수정 |
|------|------|------|----------|---------|
| 🟢 Easy | 초보/바이브코더 | 매번 물어봄 | 🦔 쉬운 설명 | 안전만 |
| 🟡 Normal | 중수 | 위험한 것만 | 점수 + 요약 | 안전 + 중간 |
| 🔴 Pro | 고수 | 전부 자동 (halt 있음) | 풀 리포트 + SARIF | 전부 |

### 5.2 사용자별 킬러 명령어

| 사용자 | 명령어 | 설명 |
|--------|--------|------|
| 🐣 주니어 | `cs learn` | 수정 이유 설명 |
| 💼 시니어 | `cs report --team` | 팀 품질 대시보드 |
| 🏃 솔로 | `cs sprint` | 목록 순차 자동 |
| 🔒 보안 | `cs compliance` | 배포 전 원스톱 |
| 🎓 학생 | `cs explain` | 코드 해설 |
| 🎵 바이브코더 | `cs vibe` | 자연어 100%, 기술 0 |

---

## 6. 온보딩 (cs init)

```
[1/5] 언어 선택 → 한국어/English/日本語/中文
[2/5] 프로젝트 스캔 → package.json 프레임워크 자동 감지
[3/5] API 키 설정 → 키 등록 + 역할 할당 + 연결 테스트
[4/5] 코드 구조 → PART auto/on/off
[5/5] 설정 저장 → ~/.cs/config.toml
```

- 커맨드도 선택 언어에 따라: `cs 생성` / `cs generate`
- 둘 다 항상 작동, 표시만 선택 언어

---

## 7. 검증 정밀도 로드맵

| Level | 기법 | 오탐률 | 기간 |
|-------|------|--------|------|
| 현재 | 정규식 매칭 | ~30% | - |
| Level 1 | AST 파싱 (ts-morph) | ~15% | +2-3주 |
| Level 2 | 타입 추론 (TypeScript Compiler API) | ~8% | +3-4주 |
| Level 3-4 | LSP 연동 (데이터플로우 + 크로스파일) | ~2% | +2-4주 |
| Level 5 | AI + Formal (Z3 SMT Solver) | <1% | +6달 |

---

## 8. 44엔진 Playground

### 7카테고리 점수

```
AST Score     — 6엔진 (typescript, ts-morph, acorn, babel, estraverse, esquery)
Quality Score — 6엔진 (eslint, biome, prettier, jscpd, madge, ts-eslint)
Shield Score  — 6엔진 (njsscan, lockfile-lint, socket, retire.js, npm-audit, snyk)
Turbo Score   — 5엔진 (autocannon, clinic.js, 0x, tinybench, c8)
Test Score    — 4엔진 (vitest, fast-check, stryker, c8)
IP Score      — 3엔진 (license-checker, spdx-list, detective)
Arch Score    — 내장 (8팀 + 3-Gate + SEAL)
```

### 벤치마크 DB

- GitHub 공개 오픈소스 프로젝트 스캔 → 점수만 저장 (코드 X)
- CI로 주기적 자동 스캔 → DB 축적
- 유저 프로젝트 vs 오픈소스 비교

### 게이미피케이션

- 뱃지 시스템 (First Blood, Guardian, Clean Code, Sub-10ms...)
- 챌린지 (Zero Hollow, Speed Demon, Fort Knox, Clean Streak)
- 리더보드 (글로벌 + 필터)
- 공유 카드 + README 뱃지

---

## 9. IP/특허 방어

### 생성 전 방어
- 특허 패턴 DB 대조 → 위험 알고리즘 대체
- GPL 감염 체크 → 대안 패키지 추천

### 생성 후 검증
- 코드 유사도 검사 → GPL 유사 코드 블로킹
- npm 의존성 라이선스 전수 스캔
- 호환성 체크 (MIT + GPL 혼용 경고)

---

## 10. 편의 기능

| 기능 | 설명 |
|------|------|
| 탭 완성 + 별칭 | `cs g` = `cs generate`, `cs v` = `cs verify` |
| 진행률 + 예상 시간 | 이전 실행 기반 예측 |
| dry-run | `--dry-run` 비용/시간/계획 미리보기 |
| 원클릭 복구 | [F]자동수정 [R]재생성 [E]에디터 [S]무시 |
| 워치 모드 | `cs verify --watch` 파일 변경 시 자동 검증 |
| diff 미리보기 | 자동수정 전 변경 내용 표시 |
| 즐겨찾기 | `cs bookmark` 자주 쓰는 프롬프트 저장 |
| 프로젝트별 설정 | `.cs.toml` 로컬 설정 |
| 오프라인 | 검증/감사 = 로컬 $0, 생성 = Ollama 폴백 |
| 일일 리포트 | 생성 횟수, 통과율, 비용, 자주 걸리는 이슈 |
| 테스트+커밋+PR | `cs g "..." --with-tests --commit --pr` |

---

## 11. 최신 코드 보완

- Idiom Presets 버전별 업데이트
- package.json 버전 감지 → deprecated 경고
- 8팀 검증에 deprecation 체크 추가
- 커뮤니티 프리셋 공유 (`cs preset install @cs-community/next16`)

---

## 12. 성능 예측

### 생성 (200줄 기준)

| 구성 | 시간 | 비용 |
|------|------|------|
| 생성=Opus, 검증=Haiku | ~15초 | ~$0.15 |
| 생성=Sonnet, 검증=Haiku | ~12초 | ~$0.08 |
| 전부 Mini/Haiku | ~8초 | ~$0.03 |

### 검증 (150파일 전수검사)

```
cs verify ./src → ~3초, $0 (전부 로컬)
```

### 44엔진 풀벤치

```
cs playground --full → ~22초, $0 (전부 로컬)
```

---

## 13. Phase 로드맵

| Phase | 기간 | 내용 | 가치 |
|-------|------|------|------|
| **Phase 1 MVP** | 2주 | cs verify + cs audit + 영수증 | 이것만으로 쓸 만함 |
| **Phase 2 핵심** | 1달 | cs generate (SEAL 병렬) + 크로스모델 + 멀티키 | 킬러 |
| **Phase 3 편의** | 2달 | 바이브모드 + 놀이터 + 벤치마크 + 모드별 | 대중화 |
| **Phase 4 생태계** | 3달 | 리더보드 + 커뮤니티 프리셋 + MCP + VS Code (Gemini) | 락인 |
| **Phase 5 SaaS** | 6달 | cs serve + 팀 대시보드 + 상업 라이선스 + 웹 연동 | 수익 |

---

## 14. 제품 점수 예측

| 항목 | 점수 |
|------|------|
| 차별화 | 9/10 |
| 기술 깊이 | 8/10 |
| 사용자 경험 | 8/10 |
| 시장 타이밍 | 9/10 |
| 경쟁 방어 | 7/10 |
| 수익 가능성 | 8/10 |
| 온보딩 | 9/10 |
| 확장성 | 8/10 |
| **종합** | **81/100 (A-)** |

---

## 15. 의존성 (44개 오픈소스, 전부 $0)

### 분석/AST (6)
typescript, ts-morph, acorn, estraverse, esquery, @babel/parser

### 린트/품질 (6)
eslint, @typescript-eslint, biome, prettier, jscpd, madge

### 보안 (6)
njsscan, lockfile-lint, socket, retire.js, npm-audit(내장), snyk

### 성능 (5)
autocannon, clinic.js, 0x, tinybench, c8

### 테스트 (4)
vitest, fast-check, stryker, c8(재사용)

### TUI/CLI (10)
ink, commander, chalk, ora, boxen, cli-table3, figures, inquirer, update-notifier, conf

### 라이선스/IP (3)
license-checker, spdx-license-list, detective

### Formal (1)
z3-solver

### 데이터 (3)
better-sqlite3, conf, envinfo

---

## 16. 신규 프롬프트 (3개)

### Planner

```
SEAL 계약 기반 태스크 분해. 각 PART의 role, inputs, outputs, dependencies 정의.
순환 의존 금지. JSON 배열 출력.
```

### TeamLead 판정 프로토콜

```
에이전트 보고 취합 → 1회 판정. 대화 금지.
일치 → 채택. 불일치 → 다수결 (동수면 보수적).
critical → 무조건 수정. warning → 2명 이상 시 수정.
```

### Cross-Model Judge

```
독립 심판. 생성 모델 코드 + 검증 모델 지적 받아서 독립 판단.
오탐이면 dismiss, 정탐이면 agree. 확신도 0-1 필수.
```
