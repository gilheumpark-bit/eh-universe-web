<div align="center">

<img src="public/images/logo-badge.svg" alt="로어가드 스튜디오" width="320" />

# 로어가드 스튜디오 (Loreguard Studio)

**NOA 엔진 기반 AI 소설 집필 스튜디오**

글을 쓰면 NOA가 문체를 학습하고, 품질을 검사하고, 연속성을 지킵니다.

[![한국어](https://img.shields.io/badge/lang-한국어-blue?style=flat-square)](README.ko.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-3,304_passing-22c55e?style=flat-square)
![A11y](https://img.shields.io/badge/Lighthouse_A11y-100%2F100-22c55e?style=flat-square)
![Stage](https://img.shields.io/badge/stage-Alpha-orange?style=flat-square)
![License](https://img.shields.io/badge/AGPL--3.0--or--later-blue?style=flat-square) ![Commercial](https://img.shields.io/badge/Commercial-available-8a2be2?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-KO%20EN%20JA%20ZH-green?style=flat-square)

[Live](https://ehsu.app) · [Changelog](https://ehsu.app/changelog) · [Architecture](ARCHITECTURE.md) · [AI 고지](https://ehsu.app/ai-disclosure)

</div>

---

## 한 줄 소개

**"VS Code 감성의 소설 IDE. 글만 쓰면 나머지는 NOA가."**

- 장르 프리셋 한 번이면 연출 세팅 끝
- Tab 누르면 다음 문장 제안
- 저장하면 GitHub에 자동 백업 (설정 1분 가이드 제공)
- 에피소드마다 품질 등급 자동 채점
- 99만 문서 RAG (위키백과 CC BY-SA 라이선스 선별) + 25 장르 규칙 자동 주입

---

## 이런 분을 위한 도구입니다

| | |
|---|---|
| 웹소설 작가 | 노벨피아/문피아/카카오페이지 연재 |
| 라이트노벨 작가 | 나로우계/판타지/회귀물 |
| 스토리 기획자 | 세계관 설계 + 캐릭터 관리 |
| 1인 창작자 | 글쓰기 + 번역 + 출판까지 |

---

## 역할 기반 UI (2026-04-19)

처음 들어오면 단순한 화면, 필요할 때 펼치는 **Progressive Disclosure** 구조.

| 역할 | 기본 화면 | opt-in 기능 |
|------|----------|------------|
| **둘러보기** | 30초 샘플 번역 데모 | — |
| **작가** | 수동 편집기 + 씬시트 | 5가지 집필 모드 / 평행우주 / 품질 게이트 |
| **번역가** | Translation Studio + 6축 점수 | RAG 세계관 / Voice Guard / Episode Memory |
| **출판사** | EPUB·DOCX·XLIFF·TMX 내보내기 | 19+ 콘텐츠 자가 선언 / AI 사용 고지 |
| **개발자** | Code Studio + Quill | 9팀 파이프라인 / 224룰 검증 |

Settings는 4탭 (Easy / Writing / Advanced / Developer). 12개 핵심 용어는 4언어 툴팁 사전 제공.

---

## 핵심 기능

### 1. 글쓰기

| 기능 | 설명 |
|------|------|
| **Tiptap 블록 에디터** | 서체·줄간격·들여쓰기 소설 전용 에디터 |
| **Tab 자동완성** | 1.5초 멈추면 다음 문장 제안 → Tab으로 수락 |
| **인라인 리라이트** | 텍스트 선택 → 다시쓰기/확장/축약/문체변환/복사 |
| **5가지 집필 모드** | 직접 쓰기 · AI 생성 · 3단계 캔버스 · 자동 다듬기 · 고급 |
| **고급 모드 상황 프리셋** | 전투씬/일상씬/고백씬/추격씬/대화씬 원클릭 |

### 2. 품질 자동화

| 기능 | 설명 |
|------|------|
| **품질 검사** | 문단별 점수 (출판 수준/게시 가능/수정 권장) |
| **디렉터 리포트** | S++~D 등급 + 구체적 개선점 |
| **연속성 검사** | 캐릭터 이름 오타, 설정 모순 자동 감지 |
| **작가 프로파일** | 에피소드마다 문체 학습 → 문체 특징 분석 |

### 3. 연출 시트

| 기능 | 설명 |
|------|------|
| **10개 장르 프리셋** | 🔪스릴러 💕로맨스 ⚔️액션 🔍미스터리 🐉판타지 👻호러 🚀SF ☕힐링 🗡️무협 🌑다크 |
| **3섹션 구조** | 줄거리 (고구마·사이다·클리프) + 분위기 (감정·긴장·훅) + 캐릭터 (대사 톤) |
| **에피소드별 저장** | 화마다 독립 연출 시트 → 오른쪽에 이력 쌓임 |
| **고급 설정** | 도파민 장치 · 복선 관리 · 플롯 구조 · 씬 전환 (접기 가능) |

### 4. 세계관 · 캐릭터

| 기능 | 설명 |
|------|------|
| **캐릭터 프로파일** | 이름/역할/특성/외모 + 배경/동기/대사 스타일 + 관계 그래프 |
| **세계관 3-tier** | 핵심 전제 → 권력 구조 → 세부 설정 (단계별 가이드 포함) |
| **109개 아카이브** | 8개 카테고리 설정 문서 DB |
| **아이템/스킬/마법** | AI 자동 생성 + 레어리티 시스템 |

### 5. 관리 · 내보내기

| 기능 | 설명 |
|------|------|
| **에피소드 탐색기** | Volume/Episode 트리 + 상태 아이콘 + 요약 툴팁 |
| **다른 결말 만들기** | 분기점에서 버전 생성 → 평행우주 타임라인 시각화 |
| **GitHub 클라우드 백업** | Markdown+YAML 포맷, git diff 친화 |
| **내보내기** | EPUB(전자책) · DOCX(워드) · TXT(플랫폼용) · MD · JSON |
| **씬 플레이어** | 소설을 시네마 모드(비주얼노벨) / 라디오 모드로 체험 |

---

## 더 알고 싶다면

<details>
<summary><b>🖥️ 코드 스튜디오</b> — 검증형 코드 생성 IDE</summary>

- Monaco 에디터 + 52개 패널
- 9팀 멀티에이전트 파이프라인 (PM→Architect→Frontend→Backend→QA→Security→DevOps→TechLead→Quill)
- Quill Engine 224룰 4-layer 검증
- 디자인 시스템 v8.0 (시맨틱 토큰)
- 터미널 + 라이브 프리뷰 + Git 패널

</details>

<details>
<summary><b>🌐 번역 스튜디오</b> — 소설 전용 AI 번역</summary>

- 원문/번역 양방향 에디터 (앰버/블루 톤 분리)
- 4축 채점 (정확성/자연스러움/완성도/포맷)
- 용어집 관리 + 번역 메모리
- 배치 번역 (다국어 병렬)

</details>

<details>
<summary><b>🌍 EH Network</b> — 작가 커뮤니티</summary>

- 행성 기반 커뮤니티 시스템
- 게시판 + 댓글 + 반응
- 신고/관리 시스템

</details>

---

## AI 서버

| 방식 | 설명 |
|------|------|
| **BYOK** | Gemini, OpenAI, Claude, Groq, Mistral, Ollama, LM Studio — API 키만 넣으면 동작 |
| **자체 서버** | NVIDIA DGX Spark (GB10, 128GB) — Qwen 3.6-35B-A3B-FP8 MoE 단일 서빙 (vLLM 8001) + SSE 직결 스트리밍 |
| **RAG** | ChromaDB 99만 문서 (위키백과 CC BY-SA 라이선스 선별) + 25 장르 작법 규칙 자동 조립 (`/api/rag/prompt`) |
| **이미지** | Flux-Schnell FP8 (4-step, `/api/image/generate`) |

모든 백엔드 트래픽은 단일 게이트웨이 `https://api.ehuniverse.com`로 통합 (Nginx LB least_conn 자동 분산).

API 키 없어도 글쓰기·편집·내보내기·아카이브는 100% 사용 가능.

---

## 시작하기

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install
npm run dev
```

[localhost:3000](http://localhost:3000)에서 바로 사용.

```bash
npm run build    # 프로덕션 빌드
npm test         # 테스트
```

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 16.2, React 19.2, TypeScript 5 |
| 에디터 | Tiptap (소설) + Monaco (코드) + 인라인 자동완성 |
| AI | 7개 프로바이더 + DGX Spark **Qwen 3.6-35B-A3B-FP8 MoE** (자체) |
| RAG | ChromaDB 99만 문서 (위키백과 CC BY-SA 라이선스 선별) + 25 장르 규칙 |
| 집필 엔진 | ANS 10.0 — 품질 검사, 디렉터, 연속성, HFCP, 장르 프리셋 |
| 코드 엔진 | 9팀 파이프라인 + Quill 224룰 |
| 저장 | localStorage + IndexedDB + GitHub(Octokit) + Drive + Firestore |
| 직렬화 | Markdown + YAML (git diff 친화) |
| UI | Tailwind CSS 4, Design System v8.0, Lucide Icons |
| 인증 | Firebase Auth + Stripe 티어 |
| 내보내기 | EPUB 3.0 / DOCX / TXT / MD / JSON |
| i18n | 4개국어 (한국어, English, 日本語, 中文) |
| 배포 | Vercel |

---

## 프로젝트 상태 (2026-04-24)

| 지표 | 값 |
|------|----|
| 테스트 | **3,304 passing** / 298 suites |
| 타입 체크 | **0 errors** (strict) |
| Lighthouse A11y | **100/100** × 5 페이지 (/, /studio, /translation-studio, /network, /archive) |
| 보안 감사 | P0 6건 + P1 13건 수리 완료 |
| 3루프 정밀 진단 | 850+ 파일 / 91 이슈 수리 |
| ARCS 레이어 | 11-agent `WRITING_AGENT_REGISTRY` · IP Guard L1-L5 · Compliance 7축 채점 |
| 특허 | KIPO 2026-03-03 출원, PCT 진행 중 |
| 단계 | **알파** (브릿G 작가 모집 중) |

---

## 문서

| 문서 | 설명 |
|------|------|
| [CHANGELOG.md](CHANGELOG.md) | 버전 히스토리 (v2.3.0-alpha) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 아키텍처 |
| [AGENTS.md](AGENTS.md) | 에이전트 가이드 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 기여 가이드 |
| [SECURITY.md](SECURITY.md) | 보안 정책 |
| [RUNBOOK.md](RUNBOOK.md) | 운영 런북 |

### 법적 문서 (배포 사이트)

- [/terms](https://ehsu.app/terms) — 서비스 약관
- [/privacy](https://ehsu.app/privacy) — 개인정보 처리방침
- [/copyright](https://ehsu.app/copyright) — 저작권 정책
- [/ai-disclosure](https://ehsu.app/ai-disclosure) — AI 사용 고지 (Amazon KDP 대응)
- [/changelog](https://ehsu.app/changelog) — 변경 이력 (사용자용)

---

## 알파 작가 모집

**브릿G 장르문학 작가 50명 얼리 액세스 멤버** 모집 중.

- 기간 한정 할인 (구체 조건 추후 공지)
- 알파 기여자 명시
- 해외 플랫폼 런칭 지원
- 직통 피드백 채널

문의: [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com)

---

## 라이선스

**Dual License** — 오픈소스 + 상업 2-트랙.

| 트랙 | 라이선스 | 대상 |
|------|----------|------|
| 오픈소스 | [AGPL-3.0-or-later](LICENSE) | 개인/학술/소스 공개 SaaS |
| 상업 | [Commercial License](COMMERCIAL-LICENSE.md) | 클로즈드 SaaS / OEM / 퍼블리셔 / 엔터프라이즈 자가호스트 |

AGPL은 네트워크 서비스 제공 시 §13에 따라 전체 소스 공개 의무. 이 조항이 맞지 않으면 상업 라이선스 문의.

**이전 릴리스** — 커밋 `414fe9ea` 및 그 이전은 CC-BY-NC-4.0 (비취소 권리 유지). 이후 커밋부터 AGPL/Commercial dual.

**특허**: KIPO 출원 (Fast-Track) 진행 중. AGPL §11 적용, 상업 라이선스 구매자에겐 명시 grant + indemnification.

문의: [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com)

<div align="center">

---

*"글만 쓰면 나머지는 NOA가."*

</div>
