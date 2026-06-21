<div align="center">

<img src="public/images/logo-badge.svg" alt="EH Universe" width="320" />

### 소설가의 IDE — The IDE for Novelists

> 코드처럼 검증되는 소설. *Novels, verified like code.*

창작 전문 IDE — 작가가 지휘하고, 노아가 제안하고, 과정기록이 남는 작업 도구.

[![English](https://img.shields.io/badge/lang-English-blue?style=flat-square)](README.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-3,912_passing-22c55e?style=flat-square)
![A11y](https://img.shields.io/badge/Lighthouse_A11y-100%2F100-22c55e?style=flat-square)
![License](https://img.shields.io/badge/AGPL--3.0--or--later-blue?style=flat-square) ![Commercial](https://img.shields.io/badge/Commercial-available-8a2be2?style=flat-square)
![Patent](https://img.shields.io/badge/KIPO-10--2026--0038027-d4af37?style=flat-square)

[라이브](https://ehsu.app) · [문서](#문서) · [기여 가이드](CONTRIBUTING.md)

</div>

---

## 개요

Loreguard는 단일 Next.js 앱 위에서 작가의 프로젝트 생성, 세계관, 캐릭터·아이템, 메인 시나리오, 씬시트, 연출, 집필, 퇴고, 번역·현지화, 출고를 묶는 창작 전문 IDE입니다.

- **현재 공개 표면** — `/studio`, `/translation-studio`, `/docs`, 가격/상태/법적 문서.
- **복구하지 않을 표면** — Code Studio, Network, Archive, Codex, Reports, Reference, Rulebook, Tools.
- **리딤 상태** — `/api/redeem`과 리딤 입력 UI는 아직 없습니다. checkout은 기능 게이트 뒤에 있습니다.
- **최신 기준 문서** — [docs/redeem-agent-operations-2026-06-14.md](docs/redeem-agent-operations-2026-06-14.md)

---

## 현재 제품 표면

| 앱 | 경로 | 설명 |
|----|------|------|
| **Loreguard Studio** | `/studio` | 프로젝트 생성부터 출고까지 이어지는 10단계 창작 IDE |
| **번역·현지화 작업실** | `/translation-studio` | 대상 언어를 모르는 작가도 검토할 수 있는 전문 번역 표면 |
| **Docs** | `/docs` | 사용자 매뉴얼 |
| **Public pages** | `/`, `/about`, `/pricing`, `/status`, `/changelog` | 소개·가격·상태·변경 이력 |
| **Legal/support** | `/terms`, `/privacy`, `/copyright`, `/ai-disclosure`, `/cookies`, `/refund`, `/verify` | 법적/지원 문서 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16.2, React 19, TypeScript 5 |
| UI | Tailwind CSS 4, Design System v8.0 (3-Tier), Lucide Icons |
| 모델 운영 | Hosted / 연결 키 / Local / Offline |
| Provider | 환경 설정의 연결 키 카탈로그 + 로컬 서버 |
| 집필 엔진 | 노아 제안, 품질 게이트, 텐션 곡선, 장르 프리셋, 준수율 점검 |
| 과정기록 엔진 | Work Receipt + Creative Process Record + 출고 패키지 |
| DGX 개발 경로 | 로컬·개발용 OpenAI 호환 서버. 정식 Hosted 기본값은 서버 측 개발 API 키 기준 |
| 번역 엔진 | 보존안/현지화안 비교, 위험 설명, 역번역/의미 비교, 작가 승인 |
| 에디터 | 원고 편집기 + 접힘/펼침 IDE 패널 + 노아 도크 |
| 저장소 | localStorage + IndexedDB + 클라우드 동기화 옵션 + Google Drive |
| 계정·결제 | Firebase Auth + Stripe 구독 |
| 내보내기 | EPUB 3.0 / DOCX / TXT / XLIFF / TMX — 순수 JS |
| 테스트 | Jest + Playwright E2E. 최신 통과 범위는 작업 완료 보고와 CI 기준 |
| 배포 | Vercel (ehsu.app) |

---

## 시작하기

```bash
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web
npm install
npm run dev
```

[localhost:3000](http://localhost:3000) 접속. 수동 편집, 로컬 저장, 내보내기는 모델 호출 없이 사용 가능.

---

## Loreguard Studio — 창작 전문 IDE

| 기능 | 설명 |
|------|------|
| **10단계 작업 흐름** | 프로젝트 생성 → 세계관 생성 → 캐릭터·아이템 → 메인 시나리오 → 씬시트 → 연출 → 집필 → 퇴고 → 번역·현지화 → 출고 |
| **집필 작업 모드** | 직접 쓰기 / 노아 제안 후보 / 3단계 캔버스 / 승인형 다듬기 / 고급 |
| **실시간 품질 분석** | 문단별 점수: show/tell, 반복어, 문장 다양성, 밀도, 대사 비율 (NOD 게이지) |
| **연속성 검사** | 캐릭터 이름 오타(편집거리 1), 특성 모순, 시간대/장르 모순 |
| **인라인 리라이트** | 텍스트 선택 → Ctrl+Shift+R → 문맥 인식 노아 제안 + Undo 스택 |
| **품질 게이트** | 6차원 평가(등급/감독/EOS/텐션/문체 흔들림/레드태그) + 시도별 이력 |
| **버전 히스토리** | 300자+ 변경 시 자동 스냅샷, LCS 기반 diff 뷰 |
| **내보내기** | EPUB 3.0, DOCX, TXT, MD, JSON, HTML, CSV |
| **창작 IDE UI** | 접힘/펼침 패널, 상태표시줄, 젠 모드, 노아 도크 |

### 노아 워크플로우

| 기능 | 상세 |
|------|------|
| 재시도 | 3회 + 지터 백오프 + Retry-After 헤더 연동 |
| 토큰 버짓 | 시스템 프롬프트 30% 초과 시 경고 |
| 캐릭터 절삭 | 20명 초과 시 이벤트 알림 |
| ARI 회로 차단기 | EMA 감점, 건강한 프로바이더로 자동 전환 |
| Firestore 동기화 | 3초 디바운스 + onSnapshot 실시간 (CLOUD_SYNC 플래그) |

---

## 운영 상태

| 기능 | 설명 |
|------|------|
| 리딤 코드 | 준비 중. 현재 `/api/redeem`과 입력 UI 없음 |
| checkout | 기능 게이트와 Stripe 환경변수 필요 |
| Agent Builder 검색 | disabled 호환 라우트. 활성 기능으로 안내하지 않음 |
| Network Agent | disabled 호환 라우트. 색인/검색 수행 없음 |
| 구 표면 | Code Studio / Network / Archive / Codex 계열은 현 공개 제품 표면 아님 |

---

## 번역 스튜디오

| 기능 | 설명 |
|------|------|
| Studio 작품 불러오기 | 활성 프로젝트의 회차 원고, 세계관, 캐릭터, 용어집을 가져옵니다 |
| 보존안/현지화안 | 원문 맥락 보존안과 독자 경험 현지화안을 나란히 비교합니다 |
| 작가 검토 기준 | 대상 언어를 몰라도 의미 변화, 설정 흔들림, 출고 보류 사유를 한국어로 확인합니다 |
| 과정기록 | 번역 후보, 채택, 보류, 작가 승인 이력을 남깁니다 |
| 저장·백업 | JSON 불러오기/내보내기와 대표 5형식 내보내기를 제공합니다 |
| 다국어 확장 | KO/EN/JP/CN 작업을 기본 표면으로 두고, 후속 언어는 프로젝트 설정과 연결합니다 |

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
- 연결 키 암호화 (AES-GCM v4)
- Firebase Auth + 관리자 역할 게이트
- 입력 검증 (maxLength 45건 + 엔진 50K 하드 리밋)

---

## 문서

| 문서 | 설명 |
|------|------|
| [CHANGELOG.md](CHANGELOG.md) | 버전 히스토리 (v2.1.3) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 아키텍처 |
| [AGENTS.md](AGENTS.md) | 에이전트 가이드 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 기여 가이드 |
| [SECURITY.md](SECURITY.md) | 보안 정책 |
| [RUNBOOK.md](RUNBOOK.md) | 운영 런북 |

---

## 라이선스

**Dual License** — 오픈소스 + 상업 2-트랙.

| 트랙 | 라이선스 | 대상 |
|------|----------|------|
| 오픈소스 | [AGPL-3.0-or-later](LICENSE) | 개인/학술/소스 공개 SaaS |
| 상업 | [Commercial](COMMERCIAL-LICENSE.md) | 클로즈드 SaaS / OEM / 퍼블리셔 / 엔터프라이즈 |

세계관 원본(아카이브·코덱스·룰북)은 소프트웨어와 분리되어 [CC-BY-NC-4.0](https://creativecommons.org/licenses/by-nc/4.0/)으로 유지. 이전 릴리스(커밋 `414fe9ea` 및 그 이전)는 CC-BY-NC-4.0 영구 권리 유지.

문의: [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com)

<div align="center">

---

*"어디로 향할까요?"*

Next.js 16.2, TypeScript, 다중 운영 모드, Loreguard 창작 IDE로 구축.

</div>
