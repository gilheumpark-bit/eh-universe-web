<div align="center">

<img src="public/images/logo-badge.svg" alt="EH Universe" width="320" />

### 어디로 향할까요?

20만 행성계 세계관 포털 — AI 집필 OS와 검증형 코드 IDE를 갖춘 창작 플랫폼.

[![English](https://img.shields.io/badge/lang-English-blue?style=flat-square)](README.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-1600+-22c55e?style=flat-square)
![License](https://img.shields.io/badge/CC--BY--NC--4.0-blue?style=flat-square)

[라이브](https://ehsu.app) · [문서](#문서) · [기여 가이드](CONTRIBUTING.md)

</div>

---

## 개요

EH Universe는 단일 Next.js 16.2 앱 위에 5개 앱이 통합된 창작 플랫폼입니다.

- **BYOK (Bring Your Own Key)** — Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio 지원. 무료.
- **API 키 없이도 80%+ 기능 사용 가능** — 아카이브, 수동 집필, 내보내기는 AI 없이 작동.

---

## 5개 앱

| 앱 | 경로 | 설명 |
|----|------|------|
| **유니버스 포털** | `/archive` | 140+ 문서, 8개 카테고리, 등급별 색상 배지 (PUBLIC/RESTRICTED/CLASSIFIED) |
| **NOA 스튜디오** | `/studio` | 집필 OS — macOS 독, 5가지 집필 모드, 실시간 품질 분석, 연속성 검사, 인라인 리라이트, EPUB/DOCX 내보내기 |
| **코드 스튜디오** | `/code-studio` | 검증형 IDE — 51패널, 8팀 파이프라인, diff-guard, 4-Tier 오케스트레이션, 436룰 카탈로그 |
| **번역 스튜디오** | `/translation-studio` | 소설 전용 AI 번역 — 6축 채점, 41밴드, 자동 재창조 루프, 용어집, XLIFF/TMX |
| **EH 네트워크** | `/network` | 작가 커뮤니티 — 행성, 포스트, 보고서, 정착지 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2, React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Design System v8.0 (3-Tier), Lucide Icons |
| AI | Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio (BYOK) |
| 집필 엔진 | ANS 10.0 — 품질 게이트, 텐션 곡선, 장르 프리셋, HFCP |
| 코드 엔진 | 8팀 파이프라인, diff-guard, apply-guard, intent-parser, 4-Tier |
| 번역 엔진 | 6축 채점, 41밴드, 자동 재창조, CAT 표준 (XLIFF/TMX/TBX) |
| 에디터 | Monaco Editor, xterm.js, WebContainer API |
| 저장소 | localStorage + IndexedDB + Firestore (CLOUD_SYNC) + Google Drive |
| 인증 | Firebase Auth + Stripe 구독 |
| 내보내기 | EPUB 3.0 / DOCX / TXT / XLIFF / TMX — 순수 JS |
| 테스트 | Jest (~1,600 tests), Playwright E2E |
| 배포 | Vercel (ehsu.app) |

---

## 시작하기

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install
npm run dev
```

[localhost:3000](http://localhost:3000) 접속. 아카이브, 수동 편집, 내보내기는 API 키 없이 사용 가능.

---

## NOA 스튜디오 — 집필 OS

| 기능 | 설명 |
|------|------|
| **5가지 집필 모드** | AI 생성 / 수동 편집 / 3단계 캔버스 / 자동 30% 리파인 / 고급 |
| **실시간 품질 분석** | 문단별 점수: show/tell, 반복어, 문장 다양성, 밀도, 대사 비율 (NOD 게이지) |
| **연속성 검사** | 캐릭터 이름 오타(편집거리 1), 특성 모순, 시간대/장르 모순 |
| **인라인 리라이트** | 텍스트 선택 → Ctrl+Shift+R → 문맥 인식 AI 리라이트 + Undo 스택 |
| **품질 게이트** | 6차원 평가(등급/감독/EOS/텐션/AI톤/레드태그) + 시도별 이력 |
| **버전 히스토리** | 300자+ 변경 시 자동 스냅샷, LCS 기반 diff 뷰 |
| **내보내기** | EPUB 3.0, DOCX, TXT, MD, JSON, HTML, CSV |
| **집필 OS UI** | macOS 독, 윈도우 타이틀바, 상태표시줄, 젠 모드 |

### AI 워크플로우

| 기능 | 상세 |
|------|------|
| 재시도 | 3회 + 지터 백오프 + Retry-After 헤더 연동 |
| 토큰 버짓 | 시스템 프롬프트 30% 초과 시 경고 |
| 캐릭터 절삭 | 20명 초과 시 이벤트 알림 |
| ARI 회로 차단기 | EMA 감점, 건강한 프로바이더로 자동 전환 |
| Firestore 동기화 | 3초 디바운스 + onSnapshot 실시간 (CLOUD_SYNC 플래그) |

---

## 코드 스튜디오

| 기능 | 설명 |
|------|------|
| 51 패널 레지스트리 | 동적 import, 하드코딩 금지 |
| 8팀 파이프라인 | PM→Architect→Frontend→Backend→QA→Security→DevOps→Tech Lead |
| diff-guard | SCOPE/CONTRACT/@block 편집 경계 보호 |
| intent-parser | 결정론적 의도→AST 제약 변환 (LLM 불필요) |
| 4-Tier 오케스트레이션 | Ultra / ProPlus / Standard / Lite |
| 436룰 카탈로그 | 224 bad + 212 good 패턴 |
| 디자인 린터 | 16룰 런타임 검사 |

---

## 번역 스튜디오

| 기능 | 설명 |
|------|------|
| 2-모드 x 41-밴드 | Fidelity(4축) / Experience(6축) 직교 설계 |
| 6축 채점 | translationese, fidelity, naturalness, consistency, groundedness, voiceInvisibility |
| 자동 재창조 | 점수 < 0.70 → temperature 상승 + 재생성 (최대 2회) |
| 용어집 매니저 | 반응형 싱글톤, 배치 중 실시간 용어 추가 |
| 캐릭터 레지스터 | stranger/formal/colleague/friend/intimate/hostile 6단계 |
| CAT 표준 | XLIFF 1.2 + TMX 1.4 + TBX |
| 언어별 현지화 | JP(나로계 단문, 俺/僕/私), CN(网文, 성어 치환) |

---

## Design System v8.0

| 티어 | 토큰 | 사용처 |
|------|------|--------|
| FULL | ~3,000 | CSS 레이아웃, ChatPanel |
| COMPACT | ~800 | App Generator, Autopilot |
| MINIMAL | ~100 | 채팅 폴백 |

- 시맨틱 토큰 필수 (`bg-bg-primary`, raw Tailwind 금지)
- z-index 변수 (`--z-dropdown` ~ `--z-tooltip`)
- 4px 간격 그리드, 44px 터치 타겟
- 16룰 런타임 린터, 5 프리셋

---

## i18n

한국어(KO), 영어(EN), 일본어(JP), 중국어(CN) — 실시간 전환.
Fallback: JP/CN → EN → KO.

---

## 보안

- CSP + HSTS + X-Frame-Options (`next.config.ts headers()`)
- API 키 암호화 (AES-GCM v4)
- Firebase Auth + 관리자 역할 게이트
- 입력 검증 (maxLength 45건 + 엔진 50K 하드 리밋)

---

## 문서

| 문서 | 설명 |
|------|------|
| [CHANGELOG.md](CHANGELOG.md) | 버전 히스토리 (v1.4.0) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 아키텍처 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 기여 가이드 |
| [SECURITY.md](SECURITY.md) | 보안 정책 |
| [RUNBOOK.md](RUNBOOK.md) | 운영 런북 |

---

## 라이선스

[CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/) — 비상업적 용도 무료.

<div align="center">

---

*"어디로 향할까요?"*

Next.js 16.2, TypeScript, 7개 AI 프로바이더, CS Quill로 구축.

</div>
