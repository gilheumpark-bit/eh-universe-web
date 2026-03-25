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
- Commercial use integrations (see LICENSE: CC BY-NC 4.0)
- Dependencies with incompatible licenses

## Reporting Bugs

Use the **Bug Report** issue template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Console errors (if any)

## License

By contributing, you agree that your contributions will be licensed under
the [CC BY-NC 4.0](./LICENSE) license.
