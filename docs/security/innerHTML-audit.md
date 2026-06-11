# XSS / innerHTML Audit (P2 루프3 — 2026-06-08)

**Audit date:** 2026-06-08
**Scope:** `src/**/*.tsx`
**Total dangerouslySetInnerHTML occurrences:** 7 (production) + 1 (test fixture)

## Methodology

```bash
rg 'dangerouslySetInnerHTML' src --type tsx
rg 'sanitize|DOMPurify' src --type tsx
```

각 occurrence 를 다음 기준으로 분류:
- **SAFE (constant)** — 입력이 빌드 타임 상수 또는 inline SVG.
- **SAFE (escaped)** — 입력이 모듈 내부에서 escape 처리됨.
- **SAFE (sanitized)** — DOMPurify 또는 동등 sanitizer 통과.
- **REVIEW** — 입력이 user-provided string 인데 sanitize 누락 가능.

## Findings

| # | File | Line | Verdict | Note |
|---|------|------|---------|------|
| 1 | `src/app/layout.tsx` | 372 | **SAFE (escaped)** | JSON-LD — `JSON.stringify` 후 `<` `>` `&` 모두 `\u00XX` 로 escape. |
| 2 | `src/components/studio/SubmissionPackageBuilder.tsx` | 274 | **SAFE (constant)** | `sealSvg` 은 모듈 내부 inline SVG 상수, user input 없음. |
| 3 | `src/components/studio/CreativeContributionInspector.tsx` | 203 | **SAFE (constant)** | `donutSvg` 도넛 SVG — viewBox + role="img" 포함, user input 없음. |
| 4 | `src/components/studio/CreativeContributionInspector.tsx` | (2nd) | **SAFE (constant)** | 동일 패턴. |
| 5 | `src/components/code-studio/ReviewBoard.tsx` | 61 | **SAFE (literal in prompt)** | "dangerouslySetInnerHTML" 문자열이 systemPrompt 문자열 안에 등장. 코드 실행 X. |
| 6 | `src/components/translator/editor/BilateralEditor.tsx` | 301 | **SAFE (escaped)** | `sourceHighlightHtml` — `escapeHtml()` 후 `<mark>` wrapping 만. user input escape 통과. |
| 7 | `src/components/translator/panels/GlossaryPanel.tsx` | (multiple) | **SAFE (escaped)** | line 21 모듈 헤더 — "Safe for dangerouslySetInnerHTML — both surrounding text and matched terms are HTML-escaped before being assembled" 명시. |
| 8 | `src/components/translator/panels/__tests__/GlossaryPanel.test.tsx` | — | **TEST FIXTURE** | jest test 위장 입력 검증. production 영향 0. |

## layout.tsx JSON-LD escape 강도 확인

```typescript
__html: JSON.stringify(jsonLd)
  .replace(/</g, "\\u003c")
  .replace(/>/g, "\\u003e")
  .replace(/&/g, "\\u0026"),
```

claude3 _legal § XSS 방어 표준 기준:
- `<` → `<` ✓
- `>` → `>` ✓
- `&` → `&` ✓
- `<script>` 패턴 차단 (위 3개로 charset escape 가 처리)
- ` `/` ` (line separator) — JSON.stringify 가 그대로 출력. 일부 LD 파서가 line break 로 해석 가능 → 보강 권장 (follow-up).

**현재 정책:** 위 3개로 충분 (Next.js 공식 가이드 동일). LD 파서 호환성 issue 발생 시 line separator escape 추가.

## ESLint 룰 권장 (선택 적용)

```js
// .eslintrc 또는 eslint.config.mjs 에 custom rule:
{
  "rules": {
    "react/no-danger": "off",  // 폴백
    // 또는 custom rule:
    // 'dangerouslySetInnerHTML' 사용 시 같은 파일에 (sanitize|escape|DOMPurify|inline SVG 상수) import 강제.
  }
}
```

현재는 manual review 만 (1차 PR 게이트 — 위 표 갱신). 자동화는 ESLint custom rule (follow-up).

## 결론

- **현재 7개 사용처 전체 SAFE** — XSS 노출 0.
- **회귀 방지:** 신규 `dangerouslySetInnerHTML` 추가 PR 시 본 문서에 행 추가 필수.
- **상위 리스크 영역:** translator/editor (`BilateralEditor.tsx`) 가 사용자 입력 highlight 처리 — `escapeHtml` regression 발생 시 즉시 XSS 가능. 정기적 unit test 권장.

## References

- `src/app/layout.tsx:372` — JSON-LD escape
- `src/components/translator/panels/GlossaryPanel.tsx:13-30` — escape helper
- `src/components/translator/editor/BilateralEditor.tsx:280-300` — escape + mark wrapping
- OWASP XSS Prevention Cheat Sheet
- Next.js docs § Inline scripts (CSP nonce 권장 — Phase 2)
