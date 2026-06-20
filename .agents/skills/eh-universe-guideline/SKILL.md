---
name: eh-universe-guideline
description: "Loreguard 공식 운영 지침 (NOA Rules v1.2 + Design v8.0 + 2026-06-14 현재 제품 기준)"
---

# Loreguard — Agent Guideline & Operations Skill

이 스킬은 `eh-universe-web` 프로젝트 작업 시 적용하는 요약 지침이다.
상세 원칙은 저장소 루트 `AGENTS.md`, 현재 아키텍처는 `docs/ARCHITECTURE.md`, 리딤/노아 운영 상태는 `docs/redeem-agent-operations-2026-06-14.md`를 우선한다.

## 1. 응답 및 소통 (NOA-CORE)

- 사용자 언어와 톤을 따른다.
- 불확실한 API, 외부 정책, 최신 모델 정보는 단정하지 않는다.
- 코드와 문서가 충돌하면 현재 코드와 최근 문서를 우선한다.
- 공개 제품 문구는 `노아`, `노아 인터뷰`, `노아 제안`, `과정기록`, `출고 패키지`, `권리/IP 점검`을 쓴다.
- 법적/정책 문서 밖에서는 `AI 생성`, `AI 채팅`, `인증`, `보증`, `완전 방어` 표현을 피한다.

## 2. 코드 실행 (NOA-EXEC)

- 3개 이상 파일 수정 가능성이 있으면 변경 목적, 범위, 위험을 먼저 짚는다.
- 검증은 메인 에이전트가 직접 확인한다.
- 코드 편집 후 수령증을 남긴다.

검사 수령증 형식:

```text
[검사 적용] - [C] 안전성 - [G] 성능 - [K] 간결성
```

3-Persona 기준:

1. `[C] 안전성`: 널/경계값, 런타임 경계, 예외 처리, 위험 함수 회피
2. `[G] 성능`: 불필요 반복, 과도한 렌더, 중복 네트워크 호출 회피
3. `[K] 간결성`: 기존 공용 시스템 재사용, 과잉 추상화 금지

## 3. 현재 제품 표면 (2026-06-14)

활성 제품 표면:

| 표면 | 경로 | 역할 |
|---|---|---|
| Loreguard Studio | `/studio` | 창작 전문 IDE |
| Translation Studio | `/translation-studio` | 번역·현지화 작업 표면 |
| Docs | `/docs` | 사용자 매뉴얼 |
| Public pages | `/`, `/about`, `/pricing`, `/status`, `/changelog` | 소개·가격·상태·변경 이력 |
| Legal/support | `/terms`, `/privacy`, `/copyright`, `/ai-disclosure`, `/cookies`, `/refund`, `/verify` | 법적/지원 문서 |

공개 제품 표면으로 복구하지 않을 것:

- Code Studio
- Network
- Archive
- Codex
- Reports
- Reference
- Rulebook
- Tools

필요 기능은 `히스토리`, `불러오기`, `참조 컨텍스트`, `출고 패키지`, `환경 설정` 같은 Loreguard 용어로 흡수한다.

## 4. Studio 10단계

1. 프로젝트 생성
2. 세계관 생성
3. 캐릭터·아이템
4. 메인 시나리오
5. 씬시트
6. 연출
7. 집필
8. 퇴고
9. 번역·현지화
10. 출고

각 탭은 좌우 패널 접힘/펼침, 폭 조절, 모바일 sheet, 상태 표시, 키보드 접근성을 갖춰야 한다.
노아는 중간에서 질문하고, 사용자가 채택한 내용만 캔버스에 반영한다.

## 5. 리딤·결제 기준

- `/api/checkout`은 기능 게이트 뒤에 있다.
- 활성화 조건: Stripe 환경변수 + `FEATURE_STRIPE_CHECKOUT=on` + Firebase 토큰 + 런타임 검증.
- `/api/redeem`은 현재 없다.
- 리딤 입력 UI도 현재 없다.
- 문서와 UI는 리딤을 활성 기능처럼 말하지 않는다.

향후 리딤은 엔타이틀먼트 원장, idempotency key, 적용 영수증, 취소/회수 정책과 함께 구현한다.

## 6. 노아·에이전트 기준

활성 기준:

- 노아 대화 도크: `src/components/loreguard/ChatCanvasDock.tsx`
- 채팅 프록시: `/api/chat`
- 인라인 이어쓰기: `/api/complete`
- 구조화 제안: `/api/structured-generate`, `/api/gemini-structured`
- 번역: `/api/translate`
- 게이트/고지: `docs/NOA_POLICY.md`

비활성 호환 라우트:

- `POST /api/agent-search`
- `GET /api/agent-search/status`
- `GET/POST /api/network-agent/search`
- `GET/POST /api/network-agent/ingest`

이 라우트들은 disabled 응답을 반환한다. 외부 검색, 색인, 크레딧 사용 기능으로 설명하지 않는다.

## 7. 모델 운영

Provider 기준은 `src/lib/ai-providers.ts`가 단일 소스다.

운영 모드:

- Hosted: 앱 운영 경로
- BYOK: 사용자 키
- Local: LM Studio, Ollama, DGX 호환 로컬 서버
- Offline: 모델 호출 없이 편집/저장/출고 준비

DeepSeek, Qwen, MiniMax, Kimi 같은 신규 Provider는 코드 정의와 설정 UI 노출 상태를 함께 확인한 뒤 문서화한다.

## 8. Design System v8.0

- 시맨틱 토큰 우선
- 4px 배수 spacing
- 최소 44px 터치 타겟
- focus-visible 포커스
- 상태는 색상만으로 전달하지 않는다.
- 카드 안 카드 구조를 피한다.
- 상단바와 아이콘은 전문 IDE처럼 낮고 얇게 유지한다.

## 9. 검증 기준

기본 검증:

```bash
npx tsc --noEmit
```

관련 변경이 있으면 대상 Jest/Playwright를 실행한다.
브라우저 UI 변경은 실제 화면을 열어 클릭, 스크롤, 모바일/고해상도 레이아웃을 확인한다.

## 10. 최신 기준 문서

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/FEATURE_FLAGS.md`
- `docs/NOA_POLICY.md`
- `docs/redeem-agent-operations-2026-06-14.md`
- `docs/stripe-revenue-path.md`
- `docs/security/auth-matrix.md`
