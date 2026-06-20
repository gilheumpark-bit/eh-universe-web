<div align="center">

<img src="public/images/logo-badge.svg" alt="Loreguard Studio" width="300" />

# Loreguard

**창작의 IDE**

작가가 방향을 정하고, 노아가 후보를 제안하고, 선택과 수정의 과정이 기록으로 남는 창작 작업실입니다.

[Live](https://ehsu.app) · [Docs](docs/README.md) · [Architecture](docs/ARCHITECTURE.md) · [Status](https://ehsu.app/status)

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=111)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Stage](https://img.shields.io/badge/stage-alpha-4169E1?style=flat-square)
![i18n](https://img.shields.io/badge/i18n-KO%20EN%20JA%20ZH-22c55e?style=flat-square)
![License](https://img.shields.io/badge/license-AGPL%20%2B%20Commercial-blue?style=flat-square)

</div>

---

## 2026-06-20 기준

현재 공개 제품 표면은 다음으로 제한합니다.

| 표면 | 경로 | 역할 |
|---|---|---|
| Loreguard Studio | `/studio` | 창작 프로젝트 생성, 세계관, 캐릭터, 집필, 퇴고, 출고 준비 |
| Translation Studio | `/translation-studio` | 번역, 현지화, 용어집, 보존안/현지화안 비교 |
| Docs / Public | `/docs`, `/`, `/about`, `/pricing`, `/status`, `/changelog` | 안내, 상태, 변경 이력 |
| Legal / Support | `/terms`, `/privacy`, `/copyright`, `/ai-disclosure`, `/cookies`, `/refund`, `/verify` | 약관, 개인정보, 저작권, 사용 고지, 검증 페이지 |

구 연구 표면은 현재 공개 제품 약속에 포함하지 않습니다. 필요한 기능은 Loreguard Studio 안의 히스토리, 불러오기, 참조 컨텍스트, 권리/IP 점검, 출고 패키지, 환경 설정으로 흡수합니다.

---

## 한 줄 소개

**작가가 주도하고, 노아가 보조하며, 창작 과정이 자산으로 남는 창작 전문 IDE.**

Loreguard는 "대신 써주는 도구"가 아니라 창작자가 판단권을 가진 작업 환경입니다. 노아는 후보를 제안하고, 사용자가 채택한 내용만 캔버스와 기록에 반영됩니다.

---

## Studio 10단계

```text
프로젝트 생성
→ 세계관 생성
→ 캐릭터·아이템
→ 메인 시나리오
→ 씬시트
→ 연출
→ 집필
→ 퇴고
→ 번역·현지화
→ 출고
```

각 단계는 독립 화면이 아니라 하나의 프로젝트 흐름으로 연결됩니다. 세계관과 캐릭터가 집필 기준이 되고, 집필과 퇴고 과정이 과정기록과 출고 패키지로 이어집니다.

---

## 핵심 가치

### 1. 창작자가 판단권을 가진 작업실

- 노아 제안은 후보로 표시합니다.
- 원고 반영은 사용자 승인 이후에만 진행합니다.
- 직접 쓴 문장, 채택한 후보, 수정 흐름을 분리해 남깁니다.

### 2. 장편 창작을 위한 맥락 유지

- 세계관, 캐릭터, 아이템, 메인 시나리오, 씬시트를 한 프로젝트 안에서 관리합니다.
- 회차가 쌓일수록 설정 충돌, 말투 흔들림, 복선 누락을 점검할 수 있게 설계합니다.
- 좌우 패널은 접힘을 기본으로 두고, 필요한 순간에만 펼치는 구조를 지향합니다.

### 3. 과정기록과 권리/IP 점검

- 작업 로그, 채택 기록, 수정 흐름을 출고 전 검토 자료로 묶습니다.
- 권리/IP 점검은 법적 결론을 대신하지 않고, 제출 전 확인해야 할 항목을 정리합니다.
- 저작권 등록 보완 요청에서 자주 나오는 주제, 줄거리, 인물, 주요 사건, 갈등 요소, 표현상 특징을 준비 흐름에 반영합니다.

### 4. 번역과 현지화

- 원문 보존안과 현지화안을 나란히 비교합니다.
- 사용자가 대상 언어를 잘 몰라도 위험 지점과 의미 변화 가능성을 한국어 근거로 확인할 수 있게 합니다.
- 용어집, 캐릭터 말투, 세계관 맥락을 번역 검토에 연결합니다.

---

## 주요 기능

| 영역 | 기능 |
|---|---|
| 프로젝트 시작 | 새 작품, 최근 작품, 파일에서 가져오기, 시작 기준 정리 |
| 세계관 | 핵심 전제, 권력 구조, 장소, 규칙, 금지 설정 |
| 캐릭터·아이템 | 인물 프로필, 관계, 말투, 아이템/스킬 관리 |
| 시나리오·씬시트 | 메인 전개, 회차 목적, 갈등, 훅, 복선 |
| 집필 | 직접 쓰기, 노아 제안 후보, 인라인 다듬기, 저장, 회차 관리 |
| 퇴고 | 문장 결함, 반복, 리듬, 장면 목적, 캐릭터 일관성 점검 |
| 과정기록 | 작업 흔적, 채택 기록, 수정 이력, 출고 전 요약 |
| 권리/IP 점검 | 등록 준비 묶음, 제출용 설명 후보, 위험 항목 점검 |
| 번역·현지화 | 보존안/현지화안 비교, 용어집, 현지 독자 관점 리뷰 |
| 출고 | DOCX, TXT, MD, JSON, 제출 패키지 준비 |

---

## 운영 모드

| 모드 | 설명 |
|---|---|
| Hosted | 앱 운영 경로입니다. 서버 측 개발 API 키와 기능 게이트 기준을 따릅니다. |
| 연결 키 | 사용자가 보유한 제공자 계정을 연결하는 경로입니다. |
| Local | LM Studio, Ollama, DGX 호환 로컬 서버 등 개발·검증용 경로입니다. |
| Offline | 모델 호출 없이 직접 쓰기, 편집, 저장, 출고 준비를 수행합니다. |

DGX/Qwen/vLLM은 로컬·개발·비상 검증용 OpenAI 호환 경로입니다. 공개 운영 기본값으로 설명하지 않습니다.

창작 RAG는 Studio 집필 경로에 자동 주입하지 않습니다. 외부 참조 검색은 번역 보강용 레거시 경로로만 남겨 둡니다.

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| App | Next.js 16.2, React 19.2, TypeScript 5 |
| UI | Tailwind CSS 4, Design System v8.0, Lucide Icons |
| Editor | Manuscript editor, resizable IDE panels, Noa dock |
| State | React context, localStorage, IndexedDB |
| Cloud | Firebase Auth, Firestore, GitHub sync |
| Billing | Stripe 기능 게이트 뒤에서 운영 |
| Model boundary | Hosted, 연결 키, Local, Offline |
| Export | DOCX, TXT, MD, JSON, package builders |
| i18n | 한국어, English, 日本語, 中文 |

---

## 개발 시작

```bash
git clone https://github.com/gilheumpark-bit/loreguard.git
cd loreguard
npm install
npm run dev
```

로컬 주소:

```text
http://localhost:3000
```

주요 확인 명령:

```bash
npx tsc --noEmit
npm test
```

---

## 검증 기준

출시 전에는 다음을 별도 확인합니다.

- TypeScript 타입 체크
- 대상 Jest 회귀 테스트
- 핵심 화면 브라우저 점검
- `/studio`와 `/translation-studio` 접근성 점검
- 사용자 노출 문구 점검
- 보안 헤더와 민감 정보 노출 점검

현재 단계는 알파입니다. 공개 약속보다 실제 작동과 검증 근거를 우선합니다.

---

## 문서

| 문서 | 설명 |
|---|---|
| [docs/README.md](docs/README.md) | 내부 문서 입구 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템 구조 |
| [docs/API.md](docs/API.md) | API 기준 |
| [docs/FEATURE_FLAGS.md](docs/FEATURE_FLAGS.md) | 기능 게이트 |
| [docs/NOA_POLICY.md](docs/NOA_POLICY.md) | 노아 운영 기준 |
| [docs/redeem-agent-operations-2026-06-14.md](docs/redeem-agent-operations-2026-06-14.md) | 리딤/노아/표면 기준 |
| [docs/security/auth-matrix.md](docs/security/auth-matrix.md) | 로그인·권한 기준 |
| [AGENTS.md](AGENTS.md) | 작업 에이전트 지침 |
| [CHANGELOG.md](CHANGELOG.md) | 변경 이력 |
| [SECURITY.md](SECURITY.md) | 보안 정책 |

---

## 라이선스

Dual License.

| 트랙 | 라이선스 | 대상 |
|---|---|---|
| Open Source | [AGPL-3.0-or-later](LICENSE) | 개인, 학술, 소스 공개 SaaS |
| Commercial | [Commercial License](COMMERCIAL-LICENSE.md) | 클로즈드 SaaS, OEM, 퍼블리셔, 엔터프라이즈 자가호스트 |

문의: [gilheumpark@gmail.com](mailto:gilheumpark@gmail.com)

<div align="center">

---

Loreguard keeps the writer in command.

</div>
