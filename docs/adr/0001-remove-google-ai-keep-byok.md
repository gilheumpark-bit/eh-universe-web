# 0001. Google AI 제거 · BYOK 유지

- Status: Accepted
- Date: 2026-06-06
- Deciders: 프로젝트 오너

## Context
DGX Spark(Qwen 35B MoE, vLLM OpenAI 호환)로 자체 호스팅 AI 전환 완료 상태에서, Google AI(Gemini 호스팅·Vertex AI·Discovery Engine) 의존이 잔존. 셀프호스트 OSS AI 방향과 충돌하고, Vertex/Discovery는 Google Cloud 크레딧·서비스 계정에 묶임. 로그인(Firebase Auth)·동기화(Firestore)·저장(Drive)은 유지 요구.

## Decision
서버측 Google AI(Vertex AI·Discovery Engine·hosted Gemini 분기)를 제거하고, **BYOK Gemini(사용자 키)만 fallback으로 유지**. Firebase Auth/Firestore/Drive(로그인·동기화·저장)와 공유 서비스 계정 `VERTEX_AI_CREDENTIALS`는 유지.

## Rationale
- 앱 AI 클라이언트가 OpenAI 호환(`/v1/chat/completions`)이라 vLLM/Ollama 등 OSS 로컬로 충분.
- Vertex/Discovery는 multi-tenant Google Cloud 종속 → OSS-로컬 배포에 부적합.
- BYOK는 사용자 선택지로 무비용 유지 가능.

## Consequences
- 긍정: 하드 클라우드 AI 의존 0, OSS-로컬 정합, 번들/콜드스타트 감소(`@google-cloud/discoveryengine` 제거).
- 부정: Network Agent 검색(Discovery Engine 기반)은 비활성 503 → 비-구글 검색 백엔드 후속 필요.

## Alternatives
- Vertex 유지 + 로컬 병행 — 기각: 클라우드 종속·복잡도.
- Gemini 완전 제거 — 기각: BYOK는 무비용 사용자 옵션이라 유지 가치.
