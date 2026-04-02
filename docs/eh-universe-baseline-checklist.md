# EH Universe — 기본 체크리스트 (레포 전역)

PR·릴리스·주요 기능 추가 전에 **최소한** 확인하는 기본 리스트다. 세부 스튜디오 전용 항목은 각 플랜·설계서를 병행한다.

- NTE 번역: [`.cursor/plans/eh-translator-nte-5enhancements.plan.md`](../.cursor/plans/eh-translator-nte-5enhancements.plan.md), [`docs/eh-translator-nte-5-enhancements.md`](eh-translator-nte-5-enhancements.md)

---

## 1. 레포 규칙 · 품질 (항상)

- [ ] [`GEMINI.md`](../GEMINI.md) / [`AGENTS.md`](../AGENTS.md)와 충돌 시 **GEMINI 우선**
- [ ] `console.*` 대신 [`@/lib/logger`](../src/lib/logger.ts) (예외: 명시된 스크립트만)
- [ ] 보안 헤더는 [`src/proxy.ts`](../src/proxy.ts)에서 통합 — **`middleware.ts` 중복 추가 금지** (Next 16 빌드 충돌 방지)
- [ ] Code Studio·패널 등록은 **레지스트리** 경유 — 하드코딩 금지 ([`panel-registry`](../src/lib/code-studio/core/panel-registry.ts) 등)

---

## 2. 인증 · API · 비용

- [ ] 서버 AI·호스티드 경로: Firebase ID 토큰·BYOK 게이트 정책과 맞는지 ([`translate`](../src/app/api/translate/route.ts), [`chat`](../src/app/api/chat/route.ts) 참고)
- [ ] 새 공개 API: CSRF·Origin·크기 제한·레이트 리밋 패턴 검토
- [ ] 비용 민감 경로: 토큰·쿼터·로그에 PII 노출 없음

---

## 3. 스튜디오별 최소 스모크 (해당 영역 변경 시)

### 번역 스튜디오 (`/translation-studio`)

- [ ] 로컬 상태 복원·저장(또는 변경한 저장 경로)
- [ ] 로그인 시 클라우드 동기화 에러 시 사용자 메시지
- [ ] 호스트 AI: 토큰 없을 때 기대한 401/메시지

### NOA / 소설 스튜디오 (`/studio`)

- [ ] 집필 스트리밍 또는 변경한 AI 경로
- [ ] `gemini-structured`·`/api/chat` 중 수정한 쪽

### 코드 스튜디오 (`/code-studio`)

- [ ] 수정한 패널·AI 기능 (Ghost·에이전트 등은 **호스티드만** 사용자 시나리오 포함 권장)

---

## 4. 배포 · 운영

- [ ] 필수 env: `NEXT_PUBLIC_*`, Supabase, AI 키·Vertex 등 **배포 환경에 문서화**
- [ ] Stripe·웹훅·권한 연동을 건드린 경우: **스테이징에서 결제 플로우** 확인
- [ ] 빌드: `pnpm build` (또는 CI와 동일 명령) 통과

---

## 5. 문서 동기화

- [ ] 사용자 메시지·스튜디오 목록이 바뀌면 [`README.md`](../README.md) 등 **공개 문서** 갱신 여부 판단
- [ ] 설계·플랜만 수정한 경우: 해당 `.md` 링크가 끊기지 않았는지

---

## 변경 이력

- 2026-04-03: 초안 — 레포 전역 기본 리스트.
