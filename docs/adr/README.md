# Architecture Decision Records (ADR)

> claude3 `_standard/_docs.md` ADR(MADR) 양식 흡수. 신규 기능·의존성·DB·인증·아키텍처 결정 시 1건 작성.
> 파일명: `NNNN-kebab-title.md` (4자리 연번). Status: Proposed → Accepted → (Superseded by NNNN).

## 양식 (복사용)

```markdown
# NNNN. {제목}

- Status: Proposed | Accepted | Deprecated | Superseded by NNNN
- Date: YYYY-MM-DD
- Deciders: {결정자}

## Context
{무엇이 문제/배경인가 — 강제 요인, 제약}

## Decision
{무엇을 하기로 했나}

## Rationale
{왜 이 선택인가 — 근거}

## Consequences
- 긍정: {…}
- 부정/트레이드오프: {…}

## Alternatives
- {대안 1} — 기각 사유
- {대안 2} — 기각 사유
```

## 색인

| # | 제목 | Status | Date |
|---|---|---|---|
| [0001](0001-remove-google-ai-keep-byok.md) | Google AI 제거 · BYOK 유지 | Accepted | 2026-06-06 |
| [0002](0002-local-ai-3-slots-electron-folder-io.md) | 로컬 AI 3슬롯 + Electron 폴더 IO | Accepted | 2026-06-06 |
