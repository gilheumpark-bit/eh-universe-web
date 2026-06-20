# Contributing to EH Universe Web

EH Universe Web에 기여해 주셔서 감사합니다.
Thank you for your interest in contributing to EH Universe Web.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/gilheumpark-bit/eh-universe-web.git
cd eh-universe-web

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Auth/DB**: Firebase (Google Sign-In, Firestore)
- **AI**: Multi-provider (Gemini, OpenAI, Claude, Groq, Mistral)
- **Testing**: Playwright (E2E)

## Development Workflow

1. Create a branch from `master`
2. Make your changes
3. Run checks before submitting:

```bash
# Type check
npx tsc --noEmit

# Lint
npx eslint src/

# E2E tests (requires dev server running)
npx playwright test
```

4. Open a Pull Request

## Commit Message Convention (2026-05-10 강제)

Conventional Commits 표준 — `<type>(<scope>): <description>`.

| type | 의미 | 예시 |
|---|---|---|
| `feat` | 신규 기능 | `feat(token-meter): add pressure level dispatcher` |
| `fix` | 버그 수정 | `fix(toast): correct event name mapping` |
| `chore` | 인프라·도구 | `chore(deps): bump tiptap to 3.22.4` |
| `docs` | 문서만 | `docs(roadmap): update Phase 2 timeline` |
| `refactor` | 동작 변경 X | `refactor(creative-process): split ORIGIN_VISUAL` |
| `test` | 테스트만 | `test(seal-issuer): add IDB race condition case` |
| `perf` | 성능 | `perf(symbol-index): replace regex with Aho-Corasick` |

**금지 패턴**:
- `[Phase-1] feat(quality-up): SSS roadmap Phase 1` ← 마케팅 라벨링 X
- `[comprehensive] feat(...): ...통합` ← "comprehensive" 등 자기-라벨 X
- 한글 description OK, 그러나 type/scope 는 영문

**상세 본문** (선택, 큰 변경 시):
- 1줄 요약 → 빈 줄 → 본문
- "Why" 위주, "What" 은 diff 가 보여줌

자세한 정책: `docs/internal/git-commit-policy.md`.

## Test Convention

### Trivial 테스트 회피 룰 (2026-05-10)

다음 패턴은 작성 X — mutation testing survival rate ↓ 효과만 있고 회귀 방지 가치 0.

```ts
// ❌ 금지 — 상수가 상수인지 검증
expect(VISUAL_TOKENS.color.deepCharcoal).toBe('#1A1A1A');

// ❌ 금지 — type 단순 매칭
expect(typeof labels.headerLabel).toBe('string');

// ❌ 금지 — 길이만 검증
expect(LIMITATION_TEXT_4LANG.ko.length).toBeGreaterThan(0);
```

**대신 작성 가치 있는 테스트**:

```ts
// ✅ 동작 분기 검증
it('빈 events → hci 0 + intent unverified', () => {
  expect(computeHCIDetail([]).hci).toBe(0);
  expect(computeHCIDetail([]).intent).toBe('unverified');
});

// ✅ 4언어 byte-level 회귀 방지 (변호사 감수 후 변경 시 실패)
it('LIMITATION_TEXT_4LANG.ko byte-level 보존', () => {
  expect(LIMITATION_TEXT_4LANG.ko).toContain('이 문서는 법적 효력');
});

// ✅ Race condition 회귀 방지
it('동시 발급 시 sealNumber 중복 없음', async () => {
  // ...
});
```

### Mutation Testing (Phase 2 도입 예정)

`stryker.js` 연동 후 mutation survival rate 70%+ 강제. 그 전까지는 본 룰 수동 적용.

## Code Conventions

### File Structure

- Large files (100+ lines) must use `PART` section markers
- Each PART ends with an `IDENTITY_SEAL` comment
- Components go in `src/components/`, hooks in `src/hooks/`

### Naming

- Components: PascalCase (`StudioSidebar.tsx`)
- Hooks: camelCase with `use` prefix (`useProjectManager.ts`)
- Utilities: camelCase (`ai-providers.ts`)
- Constants: SCREAMING_SNAKE_CASE

### Styling

- Use Tailwind CSS utility classes
- Design tokens defined in CSS variables (`--color-bg-primary`, etc.)
- Premium components use the `premium-panel-soft` class

### Internationalization

- All user-facing strings must support KO/EN/JP/CN
- Use `createT(language)` for translations
- Add new keys to `src/lib/studio-constants.ts` TRANSLATIONS object

## What to Contribute

### Welcome
- Bug fixes with reproduction steps
- Accessibility improvements
- Performance optimizations
- Translation corrections (KO/EN/JP/CN)
- Documentation improvements

### Needs Discussion First
- New features (open an Issue first)
- Architecture changes
- New AI provider integrations
- World-building lore additions

### Not Accepted
- Changes to core EH Universe lore without author approval
- Commercial use integrations that bypass the dual-license model (see LICENSE: AGPL-3.0-or-later + COMMERCIAL-LICENSE.md)
- Dependencies with incompatible licenses

## Reporting Bugs

Use the **Bug Report** issue template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Console errors (if any)

## License & CLA

By contributing to this repository, you agree that your contributions will be
**dual-licensed** under both:

1. [**GNU Affero General Public License v3.0 or later**](./LICENSE) — for the open-source track.
2. [**EH Universe Commercial License**](./COMMERCIAL-LICENSE.md) — for the commercial track (operated by 박길흠 / EH Universe Project).

This dual grant is required to maintain the project's dual-license business model
(MongoDB pattern: AGPL open-source + Commercial).

A formal **Contributor License Agreement (CLA)** will be required via
[cla-assistant.io](https://cla-assistant.io/) once external contributions are opened.

Prior (pre-`414fe9ea`) releases remain available under CC-BY-NC-4.0 for those
who obtained them under that license; subsequent releases are governed by the
dual license above.
