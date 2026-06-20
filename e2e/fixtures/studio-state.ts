/**
 * Shared fixtures for Novel Studio E2E scenarios.
 *
 * - Seed localStorage via page.addInitScript so state is ready on first paint.
 * - Mock DGX Spark / internal AI endpoints with deterministic fulfil handlers.
 * - No real network I/O in E2E; these fixtures ensure hermetic runs.
 */

import type { Page, Route } from '@playwright/test';

// ============================================================
// PART 1 — Constants & Types
// ============================================================

/** Matches eh-onboarded key used by /welcome in src/app/welcome/page.tsx. */
export const ONBOARD_KEY = 'eh-onboarded';

/** Matches noa_studio_lang default used by useStudioTheme. */
export const LANG_KEY = 'noa_studio_lang';

/** Matches project v2 storage key declared in src/lib/project-migration.ts. */
export const PROJECTS_V2_KEY = 'noa_projects_v2';

/** A minimal, well-formed StoryConfig stub (see src/lib/studio-types.ts). */
export const STUB_CONFIG = {
  title: 'E2E Smoke Novel',
  genre: 'fantasy',
  episode: 1,
  setting: '검과 마법의 세계',
  corePremise: '회귀한 주인공이 왕국을 구한다',
  synopsis: 'E2E 테스트용 가짜 시놉시스',
  characters: [
    {
      name: 'E2E 주인공',
      role: '기사',
      traits: '용맹한 성격',
    },
  ],
} as const;

/** A minimal, well-formed ChatSession stub. */
export const STUB_SESSION = {
  id: 'e2e-sess-1',
  title: 'E2E 에피소드 1',
  messages: [],
  config: STUB_CONFIG,
  lastUpdate: 1_734_000_000_000,
} as const;

/** A minimal, well-formed Project stub. */
export const STUB_PROJECT = {
  id: 'e2e-proj-1',
  name: 'E2E Test Project',
  description: 'Playwright hermetic project',
  genre: 'fantasy',
  createdAt: 1_734_000_000_000,
  lastUpdate: 1_734_000_000_000,
  sessions: [STUB_SESSION],
  volumes: [],
} as const;

// ============================================================
// PART 2 — localStorage seeding
// ============================================================

interface SeedOptions {
  /** Mark onboarding as complete. Default: true. */
  onboarded?: boolean;
  /** Inject a project + session so Studio has content. Default: false. */
  withProject?: boolean;
  /** AppLanguage (KO default matches welcome/page default). */
  lang?: 'KO' | 'EN' | 'JP' | 'CN';
}

/**
 * Seed localStorage before the page loads so React hydrates with a known state.
 * Uses addInitScript (runs before any app script) — safe across navigations.
 */
export async function seedLocalStorage(page: Page, opts: SeedOptions = {}): Promise<void> {
  const onboarded = opts.onboarded ?? true;
  const withProject = opts.withProject ?? false;
  const lang = opts.lang ?? 'KO';

  // Serialize plain objects — stubs are `as const` so we spread into mutable shape.
  const projects = withProject ? [JSON.parse(JSON.stringify(STUB_PROJECT))] : [];

  await page.addInitScript(
    ({ onboardKey, langKey, projectsKey, onboarded, lang, projects }) => {
      try {
        if (onboarded) {
          localStorage.setItem(onboardKey, '1');
        } else {
          localStorage.removeItem(onboardKey);
        }
        localStorage.setItem(langKey, lang);
        if (projects.length > 0) {
          localStorage.setItem(projectsKey, JSON.stringify(projects));
        }
        // Disable first-visit quick-start modal chatter.
        localStorage.setItem('noa_first_visit_seen', '1');
      } catch {
        // Private browsing / quota — ignore.
      }
    },
    {
      onboardKey: ONBOARD_KEY,
      langKey: LANG_KEY,
      projectsKey: PROJECTS_V2_KEY,
      onboarded,
      lang,
      projects,
    },
  );
}

// ============================================================
// PART 3 — DGX Spark / AI network mocking
// ============================================================

/** vLLM-style OpenAI completion response chunk for non-stream requests. */
const FAKE_COMPLETION = {
  id: 'chatcmpl-e2e-stub',
  object: 'chat.completion',
  created: 1_734_000_000,
  model: 'e2e-stub-model',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'E2E 가짜 응답입니다. 실제 AI 호출은 차단되었습니다.',
      },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 12, total_tokens: 22 },
};

/**
 * Fulfil every DGX Spark / internal AI endpoint with deterministic fake data.
 * Must be called BEFORE page.goto so route handlers intercept first request.
 */
export async function mockDGXSpark(page: Page): Promise<void> {
  const handler = async (route: Route) => {
    const url = route.request().url();
    // Health / usage — lightweight JSON
    if (/\/api\/usage$/.test(url)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 0, limit: 100, remaining: 100 }),
      });
      return;
    }
    if (/\/(api\/health)?\/?$/.test(new URL(url).pathname)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', lm_studio: 'stub' }),
      });
      return;
    }
    // Chat completions (stream=false only — we never stream in E2E)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FAKE_COMPLETION),
    });
  };

  // Catch both external gateway + internal proxy + Cloudflare tunnel patterns.
  await page.route(/\/v1\/chat\/completions(\?.*)?$/, handler);
  await page.route(/\/api\/chat(\?.*)?$/, handler);
  await page.route(/\/api\/spark[\w\-/]*$/, handler);
  await page.route(/\/api\/rag\/(search|prompt)$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [], prompt: '' }),
    });
  });
}

// ============================================================
// PART 4 — Combined helper
// ============================================================

/** One-shot: seed storage + mock AI. Call before page.goto(). */
export async function primeStudio(
  page: Page,
  opts: SeedOptions = {},
): Promise<void> {
  await mockDGXSpark(page);
  await seedLocalStorage(page, opts);
}
