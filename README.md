# EH Universe Web

**EH Universe** 세계관 포털 + **NOA Studio** AI 소설 창작 워크벤치가 하나의 저장소에 결합된 프로젝트입니다.

## 구성

| 영역 | 경로 | 설명 |
|------|------|------|
| **EH Universe 포털** | `/` `/about` `/archive` `/reference` `/rulebook` | 세계관 소개, 아카이브, 룰북 |
| **NOA Studio** | `/studio` | AI 기반 소설 창작 도구 (세계관 설계 → 캐릭터 → 연출 → 집필 → 원고 관리) |
| **Tools** | `/tools/*` | 스타일 스튜디오, 네카사운드, 갤럭시맵, 사운드트랙 |

## 기술 스택

- **Framework:** Next.js 16 + React 19
- **Styling:** Tailwind CSS 4
- **AI:** Multi-provider (Gemini, OpenAI, Claude, Groq, Mistral) — BYOK 또는 서버 프록시
- **Auth:** Firebase (Google 로그인)
- **Sync:** Google Drive REST API v3
- **Export:** EPUB / DOCX (브라우저 완결형, 외부 라이브러리 없음)
- **Engine:** ANS 10.0 (장르별 벤치마크, HFCP 대화 보정, 맥락 추적, 상표 필터)
- **Test:** Jest 30 + Playwright

## 시작

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인.

## 주요 명령

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | Jest 단위 테스트 |
| `npm run test:e2e` | Playwright E2E 테스트 |
| `npm run lint` | ESLint |

## 프로젝트 구조

```
src/
  app/           Next.js App Router (페이지)
  components/    React 컴포넌트 (studio/ 30개+)
  engine/        서사 엔진 (pipeline, validator, genre-review, HFCP, continuity-tracker)
  hooks/         커스텀 훅 (useProjectManager, useStudioKeyboard, useStudioAI)
  lib/           유틸리티, 타입, 컨텍스트
  services/      외부 서비스 (Gemini, Drive)
```
