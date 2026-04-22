@AGENTS.md

# NOA Rules — 강제 적용
# 이 섹션의 모든 규칙은 선택이 아닌 강제. 코드 편집 시 반드시 수령증 출력.

## 판단 체계 (Judgment Framework)
- 신규 코드 생성 시: `/first-production-judgment` 스킬 적용 (4-GATE: Intent→Contract→Minimal→Simulation)
- 기존 코드 수정 시: `/multi-agent-judgment-v2` 스킬 적용 (Builder→Critic→Arbiter 2-Pass)

## NOA Unified Stack v2.1
9개 스킬이 단일 파이프라인으로 통합:
- MODULE 1: noa-code-structure (PART 구조 강제)
- MODULE 2: noa-3persona-inspection (3관점 검사)
- MODULE 3: noa-confidence-gate (확신도 게이트)
- MODULE 6: noa-repair-strategy (수리 에스컬레이션)
- MODULE 8: noa-anti-repeat (반복 금지)
- MODULE 9: noa-response-tuner (응답 튜닝)
+ first-production-judgment (신규 코드 4-GATE)
+ multi-agent-judgment-v2 (리웍 Builder/Critic)

## ARI + Scope Policy
- ARI Circuit Breaker: 모든 AI 호출에 적용 (EMA 감점, 자동 failover)
- Scope Policy: Global > Workspace > Module 정책 우선순위

---

## 언어 규칙
- 사용자 입력 언어 자동 감지 → 동일 언어로 응답
- 대화 중 언어 전환 시 즉시 따라감. 선언 금지, 그냥 전환.

---

## [응답 튜너] 자동 스타일 매칭

**길이 매칭**
- 1–10자 → 1–3문장
- 10–50자 → 3–5문장
- 50–200자 → 적절한 깊이
- 200자+ → 구조화된 상세 응답

**톤 매칭**
- ㅋㅋ/ㅎㅎ/lol 등 → 캐주얼. 격식 버림.
- 공식 문어체 → 격식 유지
- 반박(아닌데/but) → 방어 금지. 타당한 부분 인정, 핵심만.

**금지 패턴**
- "톤을 맞추겠습니다" 같은 메타 선언 → 금지. 그냥 함.
- "좋은 질문입니다" 류 서두 → 금지
- 불필요한 요약/recap → 금지

---

## [반복 금지] 같은 답 두 번 금지

- 최근 5턴 내 사용한 오프닝 패턴 재사용 금지
- 같은 주제 재질문 → 다른 각도로 답변
- 이전에 목록 사용 → 이번엔 서술형
- "아까 말했듯이" 패턴 (모든 언어 동일) → 금지

**예외:** 코드 재사용, 공식 정의, 사용자가 명시적으로 반복 요청

---

## [코드 검사] 3-Persona 강제 적용

**트리거:** 신규 코드 작성, 기존 코드 수정, 20줄+ 생성/편집 시
**이 규칙을 무시하면 안 됨. Edit/Write 도구 사용 후 반드시 수령증 출력.**

**3가지 관점 (생성 단계에서 동시 적용)**

- **[C] 안전성:** None/빈 리스트/경계값 방어, 예외처리, 타입힌트, 가변 기본인수 금지, exec/eval/os.system 금지, 리소스 컨텍스트매니저
- **[G] 성능:** O(n²)+ → 최적화, 반복 계산 → 변수 추출, 불필요한 리스트 복사 제거, N+1 → 배치 처리
- **[K] 간결성:** 불필요한 추상화 제거, 데드코드 미생성, DRY 적용

**심각도 처리**
- P0/P1 (크래시·보안·잘못된 결과) → 수정 후 출력. 실패 코드 절대 미출력.
- P2 (비효율·가독성) → 수정 적용 후 간략 요약
- P3~P4 (스타일) → 가능하면 적용

**출력 형식:** 코드 편집 완료 후 아래 형식의 수령증을 반드시 출력:
```
[검사 적용]
- [C] None 가드 추가 (page.tsx:23)
- [G] set 조회로 교체 (utils.ts:45)
- [K] 미사용 import 제거 (types.ts:3)
```

**예외:** 10줄 미만 스니펫, 예시용 코드, 사용자가 명시적 검사 거부 시

---

## [코드 구조] PART 강제 분리

**트리거:** 100줄+ 코드 생성 시 (플랫 출력 금지)

**분리 기준**
- 1–50줄: PART 불필요
- 50–100줄: 선택
- 100줄+: 필수
- 300줄+: 최소 3 PART
- 500줄+: 최소 5 PART

**PART 형식**
```
# ============================================================
# PART {N} — {역할 한 줄 설명}
# ============================================================
```

**의존성 방향:** 하위 → 상위만 허용. 순환 참조 금지.

**금지:** 100줄+ 플랫 블록, PART 내 다중 역할, 순환 참조

---

## [확신도 게이트] NIB 0.55 원칙

**트리거:** 코드 생성, 기술 판단, 디버깅 원인 추정, 아키텍처 결정 시

**위험 패턴 — 생성 단계 차단**
- exec() / eval() / `__import__()` / os.system() → 대안으로 교체

**불확실 코드 — 자동 마킹**
```
// [확인 필요] 호환성 미검증
// [미검증 API] 사용 전 존재 확인 필요
```

**생성 거부 조건:** API/함수 존재 불확실, 버전 미확인 기능, 라이브러리 미확인

**금지:** "확실히", "100%" 표현, 존재하지 않는 함수 자신있게 작성

---

## [수리 전략] 점진적 에스컬레이션

**트리거:** 동일 오류 재발, 연속 테스트 실패, 연속 린트 실패 시

| 단계 | 전략 | 범위 |
|------|------|------|
| L1 TARGETED_FIX | 오류 라인/함수만 수정 | 위치 명확, 5개 이하 이슈 |
| L2 DIFF_PATCH | 관련 함수/클래스 전체 교체 | L1 실패 시 자동 전환 |
| L3 FULL_REGEN | 파일/모듈 전체 재생성 | L2 실패 시 자동 전환 |
| LX HUMAN | 즉시 중단, 로그 제출 | L3 실패 시 강제 |

**수리 수령증**
```
[수리 L1] auth.ts:45 — None 체크 추가 → 성공
```

**금지:** 동일 방법 재시도, 수령증 없는 수정, L3 실패 후 4번째 시도

---

## 우선순위

안전성 [C] > 성능 [G] > 간결성 [K]

코드 검사 실패 코드는 절대 출력하지 않음.

---

## [인프라 연동] DGX Spark 35B MoE 단일 모델 (2026-04-23 갱신)

**NVIDIA DGX GB10 (128GB VRAM) 단일 장비** + vLLM 단일 엔진 구성.
이전 Engine A/B 쌍포(9B) + Nginx LB(8090) + `https://api.ehuniverse.com` 게이트웨이 구조는 **폐기**.

### 모델
- **vLLM 포트 8001:** `Qwen 3.6-35B-A3B-FP8 MoE` — 집필·번역·요약·보조 통합 단일
- **모델 ID:** `qwen36` (vLLM `--served-model-name`)
- **max_model_len:** 8192 tokens
- **가속:** FlashInfer + N-Gram Speculative Decoding
- **실측:** 40~50 tok/s, TTFT 0.05초

### 변경 사유 (2026-04-20 전환)
- 35B MoE 단일 모델이 쌍포 9B보다 품질 우위 (긴 컨텍스트 유지·장르 클리셰 탈피 등)
- FlashInfer + Spec Decoding으로 속도도 9B 쌍포 대비 역전
- **추론 전략 재수립:** Auditor 분리형 검증은 같은 vLLM 서버에 **low-temp self-critique 세션 추가 호출**로 구현. Engine B 개념 없음.

### 엔드포인트
- **DGX 서버:** `http://<DGX-IP>:8001/v1` — vLLM OpenAI 호환 엔드포인트 직결
- **RAG API (포트 8082):** ChromaDB 99만 문서 + 25 장르 규칙 (`/api/rag/search`, `/api/rag/prompt`)
- **ComfyUI (포트 8188):** Flux-Schnell FP8 이미지 생성 (`/api/image/generate`)
- **우선순위:** `NEXT_PUBLIC_SPARK_GATEWAY_URL` → `NEXT_PUBLIC_SPARK_SERVER_URL` → `http://localhost:8001`
- **샌드박스:** `/api/sandbox/execute` — Code Studio 격리 코드 검증

### Cloudflare Tunnel 상태
- **차단 중:** 포트 직결이 여전히 불안정하여 게이트웨이 재구성 전까지 내부망(192.168.x.x) 직결로 운용
- **SSE:** vLLM OpenAI 호환 엔드포인트가 `stream:true` 시 직접 SSE 송출 (프록시 레이어 불필요)
- **폐기:** `/api/spark-stream` Vercel Edge 프록시 + non-stream 타자기 폴백

### Qwen 3.6-35B 추론 아티팩트 처리
- 35B MoE도 답변 전 영어 "Thinking Process:" 누출 지속 확인 (2026-04-20 프로브)
- 프롬프트만으로 완전 차단 불가 — 이중 방어:
  1. **서버 주입 가드:** [src/lib/dgx-models.ts:79](src/lib/dgx-models.ts) `NO_ENGLISH_THINKING_GUARD` + `/no_think` 토큰, `buildSparkSystemPrompt()`가 모든 `streamSparkAI` 호출에 자동 주입
  2. **클라이언트 필터:** [src/engine/pipeline.ts](src/engine/pipeline.ts) `stripEngineArtifacts`:
     - `<think></think>` 태그 블록 제거
     - "Thinking Process:" / "Reasoning:" 선행 감지 → 첫 한글 문자까지 건너뛰기

### 통신 구조
- **스트리밍 (집필·번역):** `streamSparkAI()` ([src/services/sparkService.ts](src/services/sparkService.ts)) → `stream:true` → vLLM 직결 SSE
- **구조화 생성 (캐릭터·아이템·스킬):** `generateJsonViaSpark()` → `stream:false` → JSON 파싱
- **RAG 보강:** `useStudioAI` → `ragBuildPrompt()` → 세계관+규칙 프롬프트 자동 조립
- **Vercel 배포:** `SPARK_SERVER_URL` 환경 변수 우선, 없으면 `NEXT_PUBLIC_SPARK_GATEWAY_URL`

### AI 호출 엔트리 역할 정의 (2026-04-23 감사 결과)
- **Studio 본문 집필:** [src/engine/pipeline.ts:387](src/engine/pipeline.ts) `buildSystemInstruction()` — 캐릭터 DNA Tier 1/2/3, actGuide, tensionCurve 주입
- **Tab 자동완성:** [src/app/api/complete/route.ts:22](src/app/api/complete/route.ts) `buildSystemPrompt(language)` — 한/영 분기
- **번역 6단계:** [src/lib/build-prompt.ts](src/lib/build-prompt.ts) `buildPrompt()` — stage별 온도 + 언어별 `/no_think` 가드 주입 (Phase 3 갱신)
- **Network Agent 검색:** [src/lib/vertex-network-agent.ts:173](src/lib/vertex-network-agent.ts) `modelPromptSpec.preamble` — 집필 보조 + HSE 4대 권리 (Phase 2 갱신)
- **Chat 채팅/분석:** [src/app/api/chat/route.ts:273](src/app/api/chat/route.ts) `buildSystemInstruction()` — PRISM 3등급 + LoRA 어댑터
- **공통 레지스트리:** [src/lib/ai/writing-agent-registry.ts](src/lib/ai/writing-agent-registry.ts) — 집필판 AGENT 역할 정의 집중화 (Phase 4 신설)
