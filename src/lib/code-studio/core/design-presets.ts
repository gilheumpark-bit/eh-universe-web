// ============================================================
// PART 1 — Preset Definitions (5 types)
// ============================================================
// Design Team Lead AI v8.0 — Preset-specific rules.
// Dynamically selected by chat / composer based on user request.

export type DesignPresetId = 1 | 2 | 3 | 4 | 5;

export interface DesignPreset {
  id: DesignPresetId;
  name: string;
  nameKo: string;
  defaultTheme: 'dark' | 'light';
  prompt: string;
}

export const DESIGN_PRESETS: Record<DesignPresetId, DesignPreset> = {
  1: {
    id: 1, name: 'IDE / Coding App', nameKo: 'IDE / 코딩 앱', defaultTheme: 'dark',
    prompt: `[PRESET-1: IDE / Coding App]
Default theme: Dark
Font: var(--font-mono) mandatory
Layout: ActivityBar(48px) | Sidebar(240px) | Editor | Panel(bottom)

FORBIDDEN:
  - backdrop-filter:blur — NEVER in editor/panel areas
  - background-image, gradients — NEVER in editor area
  - arbitrary z-index numbers — var(--z-*) tokens only
REQUIRED:
  - All 5 syntax highlighting tokens must be specified
  - line-height: var(--leading-relaxed) (1.6)
  - Layer separation by background lightness difference (ΔL ≈ 0.006–0.013)
  - Code font: var(--text-sm) 13px

REFERENCE: VS Code Web, Linear, Warp Terminal patterns.
  - Layout: Left ActivityBar + Sidebar + main editor 3-column
  - Density: information-dense, minimal internal padding (8-16px)
  - Typography: monospace, small text (12-13px), generous line-height (1.6)
  - Layers: background lightness steps for area separation (no blur)`,
  },

  2: {
    id: 2, name: 'Landing Page / Marketing', nameKo: '랜딩페이지 / 마케팅', defaultTheme: 'light',
    prompt: `[PRESET-2: Landing Page / Marketing]
Default theme: Light
Layout: Hero → Features(3-col) → Social Proof → Pricing → CTA → Footer

FORBIDDEN:
  - 2+ CTA buttons at same visual weight
  - Text on Hero background image without dim overlay
  - Yellow stars(★) alone — must pair with "4.9점" text
REQUIRED:
  - Hero title: CR ≥ 7.0:1 (AAA) mandatory
  - Primary CTA: 1 per page, padding ≥ 12px 24px, min-height 44px
  - Section background alternation: minimum 2 different backgrounds for rhythm
  - Hero title: var(--text-3xl), letter-spacing: var(--tracking-tight)

REFERENCE: Stripe, Vercel, Framer patterns.
  - Layout: Hero → Features 3-col → Social Proof → Pricing → CTA sequence
  - Density: generous breathing room (section gap 64-96px)
  - Typography: large Hero titles (40-60px), clear size hierarchy (3+ levels)
  - Rhythm: alternating backgrounds (white ↔ light grey ↔ accent)`,
  },

  3: {
    id: 3, name: 'Dashboard / Admin', nameKo: '대시보드 / 어드민', defaultTheme: 'light',
    prompt: `[PRESET-3: Dashboard / Admin]
Default theme: Light (dark sidebar allowed)
Layout: Sidebar(240px) | TopBar(56px) | KPI Row(4-col) | Chart | Table

FORBIDDEN:
  - KPI up/down expressed by color only → ▲▼ icons mandatory
  - Chart legend omitted with color-only series distinction
REQUIRED:
  - font-variant-numeric: tabular-nums (number alignment)
  - Table row height: minimum 40px
  - Chart colors: color + shape (solid/dashed) combination for color-blind users

REFERENCE: Vercel Analytics, Planetscale, Linear Issues patterns.
  - Layout: Left Sidebar + TopBar + KPI card 4-column grid
  - Density: information-efficient, card padding 16px, card gap 16px
  - Typography: tabular-nums for numeric alignment, small data labels (12px)
  - Visualization: chart color + shape dual encoding (color-blind safe)`,
  },

  4: {
    id: 4, name: 'E-Commerce / Shopping', nameKo: '이커머스 / 쇼핑몰', defaultTheme: 'light',
    prompt: `[PRESET-4: E-Commerce / Shopping]
Default theme: Light
Layout: Header | Product Grid(4→2col) | Detail(60/40) | Cart | Checkout

FORBIDDEN:
  - Color overlay on product images
  - Stock status by color only
REQUIRED:
  - Sold out: grayscale(50%) + "품절" text + disabled button (all 3)
  - Ratings: icon + "4.8점 (2,341개)" text mandatory
  - Price: original(strikethrough) + discounted(bold) + discount%(badge) (all 3)
  - Purchase button: min-height: 48px (enhanced touch target)

REFERENCE: Apple Store, Allbirds, Musinsa patterns.
  - Layout: product image dominant (60%+), details secondary
  - Density: generous whitespace around images (product focus)
  - Typography: price emphasis (bold, large), original price strikethrough
  - Trust: star rating + review count combined, shipping date text`,
  },

  5: {
    id: 5, name: 'SaaS / Web Service', nameKo: 'SaaS / 웹 서비스', defaultTheme: 'light',
    prompt: `[PRESET-5: SaaS / Web Service]
Default theme: Light
Layout: TopNav(56px) | Sidebar(240px) | Main

FORBIDDEN:
  - Form validation only after submit (must validate on blur in real-time)
  - Recommended plan highlighted by color only
  - Onboarding without Skip option
REQUIRED:
  - Recommended plan: border emphasis + badge + aria-label="추천 플랜" (all 3)
  - Toast: role="alert" + icon + color (all 3)
  - Toast z-index: var(--z-toast) mandatory
  - Brand color → run BRAND correction algorithm

REFERENCE: Linear, Figma, Clerk, Supabase, Notion patterns.
  - Layout: TopNav + Left Sidebar(240px) + Main 3-column
  - Density: moderate (component padding 16px, section gap 32px)
  - Typography: clear information hierarchy, form labels 14px medium
  - Interaction: immediate feedback (Toast), real-time form validation`,
  },
};

// IDENTITY_SEAL: PART-1 | role=design-presets | inputs=none | outputs=DESIGN_PRESETS

// ============================================================
// PART 2 — Fallback & Preset Detection
// ============================================================

export const DESIGN_FALLBACK = `
### Default Fallback (when unspecified)

  Preset: PRESET-2 (Landing, Light)
  Theme: preset default
  Framework: plain HTML + CSS Custom Properties
  Brand color: --color-focus-ring (#007ACC) as accent
  Font: var(--font-sans), body var(--text-md) / var(--leading-normal)
  Spacing: component 16px | section 64px | item 8px
  Motion: var(--duration-normal) var(--ease-standard) + prefers-reduced-motion

  → When fallback applied, add comment at top of code:
    /* [Fallback] Preset unspecified → PRESET-2 Light defaults applied */
`.trim();

/** Detect preset number from user message. Returns null if ambiguous. */
export function detectPreset(message: string): DesignPresetId | null {
  const presetMatch = message.match(/\[?\s*PRESET[- ]?(\d)\s*\]?/i);
  if (presetMatch) {
    const n = Number(presetMatch[1]);
    if (n >= 1 && n <= 5) return n as DesignPresetId;
  }

  const lower = message.toLowerCase();
  if (/\b(ide|에디터|editor|terminal|터미널|코딩)\b/.test(lower)) return 1;
  if (/\b(랜딩|landing|hero|마케팅|marketing)\b/.test(lower)) return 2;
  if (/\b(대시보드|dashboard|admin|어드민|analytics)\b/.test(lower)) return 3;
  if (/\b(이커머스|e-?commerce|쇼핑|shopping|상품|product|장바구니|cart)\b/.test(lower)) return 4;
  if (/\b(saas|서비스|pricing|온보딩|onboarding|폼|form)\b/.test(lower)) return 5;

  return null;
}

/**
 * Build the design prompt for a detected preset.
 * If no preset detected, returns fallback + PRESET-2 prompt.
 */
export function buildPresetPrompt(presetId: DesignPresetId | null): string {
  const id = presetId ?? 2;
  const preset = DESIGN_PRESETS[id];
  const header = presetId === null ? DESIGN_FALLBACK + '\n\n' : '';
  return `${header}${preset.prompt}`;
}

// IDENTITY_SEAL: PART-2 | role=preset-detection | inputs=message | outputs=DesignPresetId,preset-prompt
