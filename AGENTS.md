<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## EH Universe — agent instructions (human + AI)

- **NOA Rules v1.2 + 프로젝트 규칙(전체)**: 저장소 루트의 `GEMINI.md`
- **제미나이/에이전트 요약 스킬**: `.agents/skills/eh-universe-guideline/SKILL.md`
- **보안 헤더**: `src/proxy.ts`에서 통합 (이 레포는 `middleware.ts`와 중복 금지)
- **Code Studio (에이전트·LLM)**: 공통 시스템 지시문은 `src/lib/code-studio/core/architecture-spec.ts`의 `CODE_STUDIO_ARCHITECTURE_APPENDIX` — 상세 규칙은 `GEMINI.md` 코드 스튜디오 섹션
