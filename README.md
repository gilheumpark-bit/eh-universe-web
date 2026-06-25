<div align="center">

<img src="public/images/logo-badge.svg" alt="로어가드 스튜디오" width="320" />

# 로어가드 스튜디오 (Loreguard Studio)

**소설가의 IDE — The IDE for Novelists**

> 코드처럼 검증되는 소설. *Novels, verified like code.*

| 한국어 | English | 日本語 | 中文 |
|---|---|---|---|
| **소설가의 IDE** | **The IDE for Novelists** | **小説家のためのIDE** | **小说家的 IDE** |

작가가 방향을 정하고, 노아가 제안하고, 과정기록이 남습니다.

**번역·현지화 작업실** — Studio 프로젝트의 세계관, 캐릭터, 용어집, 회차 맥락을 불러와 보존안과 현지화안을 나란히 검토합니다.

- **보존안**: 작가 의도, 고유명사, 복선, 문체를 우선 확인
- **현지화안**: 대상 독자의 호칭, 대사 리듬, 장르 문법을 우선 확인
- **작가 승인**: 의미 변화, 설정 흔들림, 출고 가능 여부를 한국어 근거로 기록

> 원문 맥락은 보존하고, 독자 경험은 현지화합니다.

[![한국어](https://img.shields.io/badge/lang-한국어-blue?style=flat-square)](README.ko.md)
![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-3,912_passing-22c55e?style=flat-square)
![A11y](https://img.shields.io/badge/Lighthouse_A11y-100%2F100-22c55e?style=flat-square)
![License](https://img.shields.io/badge/UNLICENSED-proprietary-red?style=flat-square)
![Patent](https://img.shields.io/badge/KIPO-10--2026--0038027-d4af37?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-KO%20EN%20JA%20ZH-green?style=flat-square)

[Live](https://ehsu.app) · [Changelog](https://ehsu.app/changelog) · [Architecture](ARCHITECTURE.md) · [AI 고지](https://ehsu.app/ai-disclosure)

</div>

---

## 2026-06-24 문서 기준 메모

상단 배지의 테스트/접근성 수치는 구현 시점 공개 스냅샷 성격입니다. 현재 repo 기준 최신 문서 기준선은 `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/FEATURE_FLAGS.md`, `docs/CLEANUP-STATUS.md` 를 우선합니다.

## 2026-06-15 현재 기준

현재 공개 제품 표면은 Loreguard Studio(`/studio`), 번역·현지화 작업실(`/translation-studio`), 문서/가격/상태/법적 페이지입니다.
Code Studio, Network, Archive, Codex, Reports, Reference, Rulebook, Tools는 현재 Loreguard 공개 제품 약속으로 되살리지 않습니다.

Studio 작업 흐름은 다음 10단계입니다.

`프로젝트 생성 → 세계관 생성 → 캐릭터·아이템 → 메인 시나리오 → 씬시트 → 연출 → 집필 → 퇴고 → 번역·현지화 → 출고`

리딤 코드는 아직 활성 기능이 아닙니다. `/api/redeem`과 리딤 입력 UI는 없으며, checkout은 기능 게이트 뒤에 있습니다.
노아/에이전트/리딤 최신 기준은 [docs/redeem-agent-operations-2026-06-14.md](docs/redeem-agent-operations-2026-06-14.md)를 봅니다.

## 한 줄 소개

**"작가가 지휘하고, 노아가 제안하고, 과정이 남는 창작 전문 IDE."**

- 프로젝트 생성부터 출고 패키지까지 10단계 흐름
- 세계관·캐릭터·씬시트·연출 준수율 점검
- 노아 인터뷰와 캔버스 채택 구조
- Hosted/연결 키/Local/Offline 운영 모드
- 과정기록, 권리/IP 점검, 출고 패키지

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
| **작가** | 프로젝트 생성 + 씬시트 + 원고 편집 | 노아 제안 / 품질 게이트 / 과정기록 |
| **번역가** | 번역·현지화 작업실 + 보존안/현지화안 검토 | 세계관 맥락 / 말투 점검 / 회차 기억 |
| **출판사** | 출고 패키지 + 권리/IP 요약 | 확인서 보조 문서 / 제출용 묶음 |
| **그룹 관리자** | 그룹/좌석 설계 대기 | 퍼블리셔 워크스페이스 후속 |

Settings는 4탭 (Easy / Writing / Advanced / Developer). 12개 핵심 용어는 4언어 툴팁 사전 제공.

---

## 핵심 기능

### 0. 창작 과정 확인서 (Authorship Journal — Visual Charter v1.0, 2026-05-10)

> **모델 활용 시대 작가의 작업 흔적 자동 누적 + 명시 발급**. 출판사·플랫폼 제출 시 "어떻게 만들었는가" 노트 첨부.

| 컴포넌트 | 화면 | 역할 |
|---|---|---|
| `_1` Submission Package | 제출 묶음 | 4 artifact bundle (manuscript / cert / source / signature) × 4 distribution profile |
| `_2` Contribution Inspector | 기여도 분석 | Chapter 단위 Origin Track + HCI + Context + Witness Log |
| `_3` Issue Form | 발급 UI | Settings → Advanced → "작업 정리 노트" 발급 |
| `_4` Provenance Report | 출처 보고서 | 3축 (Core Integrity / Narrative Drift / Control Density) + Active Actors + Chronology + Cryptographic Ledger |

**디자인 사상**: Modern Institutionalism — Sharp 0px corners (Witness Seal 만 50%) · Newsreader serif 헤드 · Public Sans 본문 · Inter mono 데이터 · Accent Gold #D4AF37 봉인 · Royal Blue #4169E1 verified status · 외부 link 0건.

**HCI (Human Control Index)**: 0~100% 단일 숫자 + 3축 (Author Intent / Manual Edit Density / Narrative Logic) + 9 Origin 가중치.

**4언어 byte-level**: LIMITATION_TEXT_4LANG / ATTESTATION_OF_GENESIS_4LANG / SIGNATURE_DISCLAIMER_4LANG — 변경 시 변호사 재감수 + Major bump.

### 1. 글쓰기

| 기능 | 설명 |
|------|------|
| **Tiptap 블록 에디터** | 서체·줄간격·들여쓰기 소설 전용 에디터 |
| **Tab 자동완성** | 1.5초 멈추면 다음 문장 제안 → Tab으로 수락 |
| **인라인 리라이트** | 텍스트 선택 → 다시쓰기/확장/축약/문체변환/복사 |
| **집필 작업 모드** | 직접 쓰기 · 노아 제안 후보 · 3단계 캔버스 · 승인형 다듬기 · 고급 |
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
| **아이템/스킬/마법** | 노아 제안 후보 + 레어리티 시스템 |

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
<summary><b>번역·현지화 작업실</b> — Studio 프로젝트를 읽어오는 전문 검토 화면</summary>

- Studio 활성 프로젝트의 회차, 세계관, 캐릭터, 용어집 불러오기
- 보존안/현지화안 나란히 비교
- 대상 언어를 모르는 작가도 볼 수 있는 한국어 위험 설명
- 작가 승인, 과정기록, 저장·백업, 출고 패키지 연결

</details>

<details>
<summary><b>🧭 운영 상태</b> — 리딤·에이전트·레거시 표면</summary>

- 리딤 코드는 준비 중이며 현재 앱에서 바로 적용되지 않습니다.
- Agent Builder / Network Agent 검색 라우트는 disabled 호환 경로입니다.
- Code Studio / Network / Archive / Codex 계열은 현 Loreguard 공개 표면이 아닙니다.
- 기준 문서: `docs/redeem-agent-operations-2026-06-14.md`

</details>

---

## 모델 운영

| 방식 | 설명 |
|------|------|
| **Hosted** | 앱 운영 경로. 서버 측 개발 API 키가 설정된 provider를 사용하며, `NEXT_PUBLIC_PAYMENT_LIVE=true`에서는 Free/Pro 제공량 기준을 따릅니다 |
| **연결 키** | 사용자가 보유한 제공자 계정을 연결하는 경로. Hosted 사용량을 쓰지 않습니다 |
| **Local** | LM Studio, Ollama, DGX 호환 로컬 서버 경로 |
| **Offline** | 모델 호출 없이 직접 쓰기, 편집, 저장, 출고 준비 |

특정 외부 제공자나 DGX를 호스팅 기본값처럼 안내하지 않습니다. DGX는 로컬·개발·비상 검증용 OpenAI 호환 경로이며, 제공자 목록과 키 관리는 앱의 환경 설정 기준을 따릅니다.

연결 키가 없어도 직접 쓰기·편집·저장·내보내기·출고 준비는 사용할 수 있습니다.

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
| 에디터 | Manuscript editor + resizable IDE panels + Noa dock |
| 모델 운영 | Hosted / 연결 키 / Local / Offline |
| Provider | 환경 설정의 연결 키 카탈로그 + 로컬 서버 |
| RAG | ChromaDB 99만 문서 (위키백과 CC BY-SA 라이선스 선별) + 25 장르 규칙 |
| 집필 엔진 | ANS 10.0 — 품질 검사, 디렉터, 연속성, HFCP, 장르 프리셋 |
| 과정기록 엔진 | Work Receipt + Creative Process Record + 출고 패키지 |
| 저장 | localStorage + IndexedDB + GitHub(Octokit) + Drive + Firestore |
| 직렬화 | Markdown + YAML (git diff 친화) |
| UI | Tailwind CSS 4, Design System v8.0, Lucide Icons |
| 계정·결제 | Firebase Auth + Stripe 티어 |
| 내보내기 | EPUB 3.0 / DOCX / TXT / MD / JSON |
| i18n | 4개국어 (한국어, English, 日本語, 中文) |
| 배포 | Vercel |

---

## 프로젝트 상태 (2026-06-15)

| 지표 | 값 |
|------|----|
| 대상 회귀 | P0/Docs 관련 대상 Jest 통과 |
| 타입 체크 | `npx tsc --noEmit` 0 errors |
| 전체 검증 | 릴리스 직전 전체 Jest/빌드/브라우저 QA 별도 실행 |
| Lighthouse A11y | `/studio` · `/translation-studio` 100/100, `/` 96/100 — **3 페이지 측정** (5 페이지 확장 일정: ROADMAP §2.1) |
| 보안 감사 | P0 6건 + P1 13건 + 2026-05-10 INTERNAL 7건 수리 완료 |
| ARCS 레이어 | 11-agent `WRITING_AGENT_REGISTRY` · IP Guard L1-L5 · Compliance 7축 |
| Visual Charter v1.0 | 창작 과정 확인서 4 화면 (`_1`/`_2`/`_3`/`_4`) + HCI + Witness Seal |
| Novel IDE 16가치 | 매트릭스 46% → **95%+** (Phase B-F 완성) |
| 특허 | **KIPO 10-2026-0038027** 출원 (Fast-Track) |
| 단계 | **알파** (Phase 1 quality push 완료, P2 진행 중) |

---

## 문서

| 문서 | 설명 |
|------|------|
| [CHANGELOG.md](CHANGELOG.md) | 버전 히스토리 |
| [ROADMAP.md](ROADMAP.md) | 공개 로드맵 (14축 목표 + Phase 2-4) |
| [GOVERNANCE.md](GOVERNANCE.md) | 거버넌스 (1인 메인테이너 + CLA + 의사결정) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 시스템 아키텍처 |
| [AGENTS.md](AGENTS.md) | 에이전트 가이드 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 기여 가이드 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | 행동 강령 |
| [SECURITY.md](SECURITY.md) | 보안 정책 (security@eh-universe.dev) |
| [SUPPORT.md](SUPPORT.md) | 지원 채널 |
| [NOTICE](NOTICE) | Third-party attribution |
| [LICENSE](LICENSE) | Proprietary / All rights reserved |
| [docs/novel-ide/handbook.md](docs/novel-ide/handbook.md) | Novel IDE 종합 핸드북 (단축키 / 기능 / 코드 위치) |
| [docs/novel-ide/lsp-spec.md](docs/novel-ide/lsp-spec.md) | Loreguard LSP API 사양 |

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

**Proprietary / All rights reserved** — Loreguard 소프트웨어(엔진·파이프라인·UI·CLI)는 비공개 상용 제품 기준으로 관리됩니다.

| 항목 | 라이선스 | 대상 |
|------|----------|------|
| 소프트웨어 | [UNLICENSED / Proprietary](LICENSE) | 엔진·파이프라인·UI·CLI |
| EH Universe 원본 세계관 자료 | 별도 표기 | 공개 샘플·세계관 원본 자료 |

저작권자의 사전 서면 허가 없이 사용, 복제, 수정, 배포, 호스팅, 판매, 재라이선스할 수 없습니다.

**이전 릴리스** — 커밋 `414fe9ea` 및 그 이전을 별도 라이선스로 받은 수령자의 권리는 해당 시점의 고지에 따릅니다.

**특허**: KIPO 출원(Fast-Track) 진행 중인 항목은 별도 서면 계약 범위 안에서만 사용 권한을 부여합니다.

문의: [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com)

<div align="center">

---

*"글만 쓰면 나머지는 NOA가."*

</div>
