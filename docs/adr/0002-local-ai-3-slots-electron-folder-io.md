# 0002. 로컬 AI 3슬롯 + Electron 폴더 IO

- Status: Accepted
- Date: 2026-06-06
- Deciders: 프로젝트 오너

## Context
Linux + 셀프호스트 OSS AI 전제의 로컬 데스크톱 제품 요구. "로컬 AI는 최대 3개 연결 가능한 구조" + "컴퓨터 폴더에서 지침/원고 읽고 저장" 명시. 웹은 IndexedDB만 가능(로컬 FS 불가).

## Decision
- **로컬 AI 3슬롯 구조** (`lib/local-ai/local-ai-config.ts`): 슬롯당 {label, baseUrl(OpenAI 호환), model, enabled}, localStorage 영속, 첫 활성 유효 슬롯 resolve + 폴백 체인. `MAX_LOCAL_AI_SLOTS=3`.
- **Electron 로컬 폴더 IO** (`eh-universe-desktop`): main.js IPC `fs:pickFolder/listMd/readFile/saveFile` + preload `window.ehDesktop.fs.*`. `/desktop` 셸이 폴더 열기·.md 읽어오기·저장 사용.
- **보안**: Electron `next start` `-H 127.0.0.1`(LAN 노출 차단).

## Rationale
- 앱 AI가 OpenAI 호환이라 슬롯의 baseUrl만 다르면 vLLM/Ollama/llama.cpp/LM Studio 혼용 가능.
- 3슬롯 = 다중 로컬 모델 라우팅/폴백(예: 빠른 7B + 품질 14B + 번역 전용).
- Electron만 로컬 FS 가능 → 데스크톱의 차별 기능.

## Consequences
- 긍정: 클라우드 0 로컬 구동, 지침/원고 로컬 .md 직접 read/save, 다중 로컬 AI.
- 부정: 3슬롯 라우팅 정책(active/폴백/역할별)은 단순(첫 활성)에서 시작 — 정교화 후속.

## Alternatives
- 단일 로컬 AI 엔드포인트 — 기각: 요구가 "최대 3개".
- File System Access API(웹) — 기각: 브라우저 제약·권한 UX 열위, Electron fs가 우월.
