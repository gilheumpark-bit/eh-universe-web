# LEGAL — License Audit & Compliance

**Status:** Living document (updated per dependency change)
**Last Audit:** 2026-06-08 (P11 루프3)
**License (this project):** UNLICENSED / Proprietary / All rights reserved

## Policy

EH Universe (Loreguard) 소프트웨어는 비공개 상용 제품으로 관리한다. 의존성은 다음 정책을 따른다:

| 분류 | 라이선스 | 조치 |
|------|---------|------|
| ALLOW | MIT / ISC / Apache-2.0 / BSD-2/3 / 0BSD / Unlicense / CC0-1.0 / WTFPL / Zlib | 자유 사용 |
| WARN | LGPL-* / MPL-2.0 / EPL-2.0 | 사용 가능 — dynamic link 권장, source 제공 의무 |
| FAIL | GPL-2.0 / GPL-3.0 / AGPL / SSPL / BUSL / Commons-Clause | **사용 금지** |
| UNKNOWN | (라이선스 미상) | 검토 후 분류 |

## Enforcement

```bash
npm run check:licenses
# scripts/check-licenses.mjs — exit 1 if FAIL category detected.
```

CI 게이트:
- `.github/workflows/ci.yml` 에 `npm run check:licenses` 추가 (별도 PR 에서).
- 새 dependency 추가 시 PR pre-merge check.

## Allowlist (의도적 예외)

`scripts/check-licenses.mjs:PACKAGE_ALLOWLIST` 에 등록. 현재 비어있음.

추가 시 본 파일에 사유 명시 필수:
- 패키지명@버전
- 라이선스
- 사유 (왜 FAIL 카테고리이지만 허용하는가)
- 검토자
- 검토일

## SPDX 헤더

신규 핵심 파일은 다음 SPDX 헤더 권장 (강제 X — README/LICENSE 가 1차 source):

```typescript
// SPDX-License-Identifier: UNLICENSED
```

대상 파일 (server-side AI orchestration 등):
- `src/services/sparkService.ts`
- `src/lib/dgx-models.ts`
- `src/engine/pipeline.ts`
- `src/lib/build-prompt.ts`
- 신규 server-side orchestration 파일

## Audit History

| 일자 | 트리거 | 결과 |
|------|--------|------|
| 2026-06-08 | P11 루프3 — script + LEGAL.md 신규 작성 | 초기 audit 정책 확정 |

## References

- [SPDX License List](https://spdx.org/licenses/)
- [SPDX UNLICENSED](https://spdx.org/licenses/UNLICENSED.html)
- [Choose A License](https://choosealicense.com/appendix/)
- AGENTS.md Notation 표준 — `[L-XX YYYY-MM-DD]`
