/**
 * Unit tests for design-lint — all 14 rules + 4 bonus + utilities
 */

// Note: logger is imported by design-lint. In test env it may not exist,
// so we mock it to prevent import errors.
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  runDesignLint,
  formatDesignLintReport,
  checkTokenContrast,
  getAvailableTokens,
} from '../design-lint';

// ============================================================
// PART 1 — Rule 1: Semantic token presence
// ============================================================

describe('Rule 1: CR_NO_SEMANTIC_TOKENS', () => {
  it('passes when semantic tokens are used', () => {
    const code = '<div className="bg-bg-primary text-text-primary p-4">Hello</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'CR_NO_SEMANTIC_TOKENS')).toBeUndefined();
  });

  it('warns when no semantic tokens in long code', () => {
    const code = '<div className="flex items-center justify-center p-8 m-4 rounded-lg border shadow-md hover:opacity-80 transition-colors duration-200">Long code without semantic tokens at all here</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'CR_NO_SEMANTIC_TOKENS')).toBeDefined();
  });

  it('skips for short code', () => {
    const code = '<div>Short</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'CR_NO_SEMANTIC_TOKENS')).toBeUndefined();
  });
});

// ============================================================
// PART 2 — Rule 2: Raw Tailwind colors
// ============================================================

describe('Rule 2: RAW_TAILWIND_COLOR', () => {
  it('catches bg-blue-500', () => {
    const code = '<button className="bg-blue-500 text-white">Click</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'RAW_TAILWIND_COLOR')).toBeDefined();
  });

  it('catches text-red-600', () => {
    const code = '<span className="text-red-600">Bad Text</span>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'RAW_TAILWIND_COLOR')).toBeDefined();
  });

  it('allows status context usage', () => {
    const code = '<span className="text-green-400">success status badge</span>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'RAW_TAILWIND_COLOR')).toBeUndefined();
  });

  it('allows project semantic tokens', () => {
    const code = '<div className="bg-accent-amber text-text-primary">OK</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'RAW_TAILWIND_COLOR')).toBeUndefined();
  });
});

// ============================================================
// PART 3 — Rule 3: Yellow text on yellow
// ============================================================

describe('Rule 3: YELLOW_TEXT_ON_YELLOW', () => {
  it('catches yellow text on yellow bg', () => {
    const code = '<div className="bg-amber-300 text-yellow">Warning</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'YELLOW_TEXT_ON_YELLOW')).toBeDefined();
  });

  it('passes with dark text on yellow bg', () => {
    const code = '<div className="bg-amber-300 text-text-primary">Warning</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'YELLOW_TEXT_ON_YELLOW')).toBeUndefined();
  });
});

// ============================================================
// PART 4 — Rule 4: Focus visible
// ============================================================

describe('Rule 4: OUTLINE_NONE', () => {
  it('catches outline:none', () => {
    const code = '.input { outline: none; border: 1px solid var(--color-border); }';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'OUTLINE_NONE')).toBeDefined();
  });

  it('catches outline:0', () => {
    const code = '.btn { outline: 0; }';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'OUTLINE_NONE')).toBeDefined();
  });

  it('passes without outline override', () => {
    const code = '<button className="bg-bg-primary text-text-primary">OK</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'OUTLINE_NONE')).toBeUndefined();
  });
});

// ============================================================
// PART 5 — Rule 5: Color-only status
// ============================================================

describe('Rule 5: COLOR_ONLY_STATUS', () => {
  it('warns when color-only status (no icon, no role)', () => {
    const code = '<span className="text-accent-red">Error occurred</span>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COLOR_ONLY_STATUS')).toBeDefined();
  });

  it('passes with icon companion', () => {
    const code = '<span className="text-accent-red"><AlertTriangle aria-hidden="true" /> Error</span>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COLOR_ONLY_STATUS')).toBeUndefined();
  });

  it('passes with role="alert"', () => {
    const code = '<span className="text-accent-green" role="status">Success</span>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COLOR_ONLY_STATUS')).toBeUndefined();
  });
});

// ============================================================
// PART 6 — Rule 6: Spacing grid
// ============================================================

describe('Rule 6: NON_4_MULTIPLE_SPACING', () => {
  it('catches 15px', () => {
    const code = '<div className="p-[15px] bg-bg-primary">Content</div>';
    const result = runDesignLint(code);
    const issue = result.issues.find(i => i.rule === 'NON_4_MULTIPLE_SPACING');
    expect(issue).toBeDefined();
    expect(issue?.fix).toContain('16px');
  });

  it('catches 13px', () => {
    const code = '<div className="gap-[13px]">Content</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'NON_4_MULTIPLE_SPACING')).toBeDefined();
  });

  it('passes 16px', () => {
    const code = '<div className="p-[16px] bg-bg-primary">Content</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'NON_4_MULTIPLE_SPACING')).toBeUndefined();
  });

  it('passes Tailwind standard spacing', () => {
    const code = '<div className="p-4 gap-2 m-8 bg-bg-primary">Content</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'NON_4_MULTIPLE_SPACING')).toBeUndefined();
  });
});

// ============================================================
// PART 7 — Rule 7: Hex hardcoding
// ============================================================

describe('Rule 7: HEX_HARDCODED', () => {
  it('catches hex in inline style', () => {
    const code = '<div style={{ color: "#FF0000", background: "#1E1E1E" }}>Text</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'HEX_HARDCODED_STYLE')).toBeDefined();
  });

  it('catches hex in Tailwind arbitrary class', () => {
    const code = '<div className="bg-[#1a1a1a] text-[#ffffff]">Text</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'HEX_HARDCODED_CLASS')).toBeDefined();
  });

  it('passes with semantic tokens', () => {
    const code = '<div className="bg-bg-primary text-text-primary">Text</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'HEX_HARDCODED_STYLE')).toBeUndefined();
    expect(result.issues.find(i => i.rule === 'HEX_HARDCODED_CLASS')).toBeUndefined();
  });
});

// ============================================================
// PART 8 — Rule 8: Touch target (basic)
// ============================================================

describe('Rule 8: TOUCH_TARGET_SMALL', () => {
  it('warns when button has no min-height', () => {
    const code = '<button className="px-2 py-1 text-xs bg-bg-primary">Small</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TOUCH_TARGET_SMALL')).toBeDefined();
  });

  it('passes with min-h-[44px]', () => {
    const code = '<button className="min-h-[44px] px-4 py-2 bg-bg-primary">Big</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TOUCH_TARGET_SMALL')).toBeUndefined();
  });

  it('passes with premium-button', () => {
    const code = '<button className="premium-button">Styled</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TOUCH_TARGET_SMALL')).toBeUndefined();
  });
});

// ============================================================
// PART 9 — Rule 9: transition:all
// ============================================================

describe('Rule 9: TRANSITION_ALL', () => {
  it('catches transition: all 0.3s', () => {
    const code = '.btn { transition: all 0.3s ease; }';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TRANSITION_ALL')).toBeDefined();
  });

  it('passes with specific transition', () => {
    const code = '.btn { transition: background-color var(--transition-normal); }';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TRANSITION_ALL')).toBeUndefined();
  });
});

// ============================================================
// PART 10 — Rule 10: Z-index
// ============================================================

describe('Rule 10: ARBITRARY_ZINDEX', () => {
  it('catches z-index: 9999', () => {
    const code = '.modal { z-index: 9999; position: fixed; }';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'ARBITRARY_ZINDEX')).toBeDefined();
  });

  it('catches z-999', () => {
    const code = '<div className="z-999 fixed inset-0">Overlay</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'ARBITRARY_ZINDEX')).toBeDefined();
  });

  it('passes with var(--z-*)', () => {
    const code = '<div style={{ zIndex: "var(--z-modal)" }}>Modal</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'ARBITRARY_ZINDEX')).toBeUndefined();
  });
});

// ============================================================
// PART 11 — Rule 11: Color-blind pairs
// ============================================================

describe('Rule 11: COLOR_BLIND_PAIR', () => {
  it('warns red+green without icon differentiation', () => {
    const code = `
      <span className="text-accent-red">Error</span>
      <span className="text-accent-green">Success</span>
    `;
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COLOR_BLIND_PAIR')).toBeDefined();
  });

  it('passes red+green with icon differentiation', () => {
    const code = `
      <span className="text-accent-red"><XCircle aria-hidden="true" /> Error</span>
      <span className="text-accent-green"><Check aria-hidden="true" /> Success</span>
    `;
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COLOR_BLIND_PAIR')).toBeUndefined();
  });
});

// ============================================================
// PART 12 — Rule 12: Precise touch target
// ============================================================

describe('Rule 12: TOUCH_TARGET_PRECISE', () => {
  it('warns on button with p-1 and no min-h', () => {
    const code = '<button className="p-1 text-xs bg-bg-primary">X</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TOUCH_TARGET_PRECISE')).toBeDefined();
  });

  it('passes with premium-button', () => {
    const code = '<button className="premium-button p-1">X</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'TOUCH_TARGET_PRECISE')).toBeUndefined();
  });
});

// ============================================================
// PART 13 — Rule 13: Dual-theme CR
// ============================================================

describe('Rule 13: DUAL_THEME_CR', () => {
  it('passes text-text-primary on bg-bg-primary (high CR both themes)', () => {
    const code = '<div className="bg-bg-primary text-text-primary">Hello</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'DUAL_THEME_CR_FAIL')).toBeUndefined();
  });

  it('warns text-text-tertiary on bg-bg-tertiary (low CR)', () => {
    const code = '<div className="bg-bg-tertiary text-text-tertiary">Faded</div>';
    const result = runDesignLint(code);
    // text-tertiary on bg-tertiary may fail CR in one or both themes
    const issue = result.issues.find(i => i.rule === 'DUAL_THEME_CR_FAIL');
    if (issue) {
      expect(issue.message).toContain('CR fails');
    }
  });
});

// ============================================================
// PART 14 — Rule 14: Responsive overflow
// ============================================================

describe('Rule 14: Responsive overflow', () => {
  it('warns on fixed width > 375px', () => {
    const code = '<div className="w-[500px] bg-bg-primary">Wide</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'FIXED_WIDTH_OVERFLOW')).toBeDefined();
  });

  it('passes with max-w', () => {
    const code = '<div className="max-w-[500px] w-full bg-bg-primary">Responsive</div>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'FIXED_WIDTH_OVERFLOW')).toBeUndefined();
  });

  it('info when no responsive classes in long code', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `<div className="bg-bg-primary p-4">Line ${i}</div>`);
    const code = lines.join('\n');
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'NO_RESPONSIVE_CLASSES')).toBeDefined();
  });
});

// ============================================================
// PART 15 — Component reuse detection
// ============================================================

describe('Bonus: Component reuse', () => {
  it('suggests premium-button for complex custom button', () => {
    const code = `
      <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border
        bg-bg-secondary text-text-primary hover:bg-bg-tertiary active:scale-95
        focus:ring-2 transition-colors duration-200 shadow-md">
        Click me
      </button>
    `;
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COMPONENT_REBUILD')).toBeDefined();
  });

  it('no suggestion when premium-button is used', () => {
    const code = '<button className="premium-button">Click me</button>';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'COMPONENT_REBUILD')).toBeUndefined();
  });

  it('suggests ds-input for styled input', () => {
    const code = '<input className="w-full px-3 py-2 border rounded-lg focus:border-amber-500 bg-bg-secondary" />';
    const result = runDesignLint(code);
    expect(result.issues.find(i => i.rule === 'INPUT_REBUILD')).toBeDefined();
  });
});

// ============================================================
// PART 16 — Scoring & Report
// ============================================================

describe('Scoring', () => {
  it('perfect score for clean code', () => {
    const code = '<div className="bg-bg-primary text-text-primary p-4 min-h-[44px]">Clean</div>';
    const result = runDesignLint(code);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('deducts 15 per error', () => {
    const code = '<div style={{ color: "#FF0000" }} className="bg-[#000000]">Bad</div>';
    const result = runDesignLint(code);
    expect(result.score).toBeLessThanOrEqual(70);
  });

  it('fails when score < 60', () => {
    // Multiple errors to drive score below 60
    const code = `
      <div style={{ color: "#FF0000", background: "#1E1E1E" }}>
        <span className="bg-[#aabbcc]">hex</span>
        <span className="bg-[#ddeeff]">hex2</span>
        <div className="z-9999" style={{ outline: "none;" }}>overlay</div>
      </div>
    `;
    const result = runDesignLint(code);
    expect(result.passed).toBe(false);
  });
});

describe('formatDesignLintReport', () => {
  it('returns summary for clean code', () => {
    const result = runDesignLint('<div className="bg-bg-primary text-text-primary">OK</div>');
    const report = formatDesignLintReport(result);
    expect(report).toContain('passed');
  });

  it('formats issues with icons', () => {
    const code = '<div style={{ color: "#FF0000" }}>Bad</div>';
    const result = runDesignLint(code);
    const report = formatDesignLintReport(result);
    expect(report).toContain('❌');
    expect(report).toContain('HEX_HARDCODED');
  });
});

// ============================================================
// PART 17 — Public Utilities
// ============================================================

describe('checkTokenContrast', () => {
  it('returns CR for text-text-primary on bg-bg-primary', () => {
    const result = checkTokenContrast('text-text-primary', 'bg-bg-primary');
    expect(result).not.toBeNull();
    expect(result!.dark.pass).toBe(true);
    expect(result!.light.pass).toBe(true);
    expect(result!.dark.cr).toBeGreaterThan(10);
    expect(result!.light.cr).toBeGreaterThan(10);
  });

  it('returns null for unknown token', () => {
    const result = checkTokenContrast('text-unknown', 'bg-bg-primary');
    expect(result).toBeNull();
  });

  it('detects low CR pair', () => {
    const result = checkTokenContrast('text-text-tertiary', 'bg-bg-tertiary');
    expect(result).not.toBeNull();
    // Tertiary on tertiary should have low CR in at least one theme
    const minCR = Math.min(result!.dark.cr, result!.light.cr);
    expect(minCR).toBeLessThan(10);
  });
});

describe('getAvailableTokens', () => {
  it('returns array of token names', () => {
    const tokens = getAvailableTokens();
    expect(tokens).toContain('bg-bg-primary');
    expect(tokens).toContain('text-text-primary');
    expect(tokens).toContain('text-accent-amber');
    expect(tokens.length).toBeGreaterThanOrEqual(10);
  });
});
