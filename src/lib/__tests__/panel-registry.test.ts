/**
 * Unit tests for src/lib/code-studio-panel-registry.ts
 * Covers: registry size, ID uniqueness, getPanelDef, required fields, category validation
 */

import {
  PANEL_REGISTRY,
  getPanelDef,
  type PanelDef,
  type RightPanel,
} from '../code-studio-panel-registry';

// ============================================================
// PART 1 — Registry Size & Structure
// ============================================================

describe('PANEL_REGISTRY', () => {
  test('has exactly 37 entries', () => {
    expect(PANEL_REGISTRY).toHaveLength(37);
  });

  test('all IDs are unique', () => {
    const ids = PANEL_REGISTRY.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // ============================================================
  // PART 2 — Required Fields Validation
  // ============================================================

  test('every panel has all required fields (id, label, icon, category, color)', () => {
    for (const panel of PANEL_REGISTRY) {
      expect(typeof panel.id).toBe('string');
      expect(panel.id.length).toBeGreaterThan(0);

      expect(typeof panel.label).toBe('string');
      expect(panel.label.length).toBeGreaterThan(0);

      expect(typeof panel.icon).toBe('string');
      expect(panel.icon.length).toBeGreaterThan(0);

      expect(typeof panel.category).toBe('string');
      expect(panel.category.length).toBeGreaterThan(0);

      expect(typeof panel.color).toBe('string');
      expect(panel.color.length).toBeGreaterThan(0);
    }
  });

  // ============================================================
  // PART 3 — Category Validation
  // ============================================================

  test('all categories are valid values', () => {
    const validCategories = new Set(['View', 'Tools', 'File', 'Edit']);
    for (const panel of PANEL_REGISTRY) {
      expect(validCategories.has(panel.category)).toBe(true);
    }
  });

  test('each category has at least one panel', () => {
    const categories = new Set(PANEL_REGISTRY.map((p) => p.category));
    expect(categories).toContain('View');
    expect(categories).toContain('Tools');
    expect(categories).toContain('File');
    expect(categories).toContain('Edit');
  });

  // ============================================================
  // PART 4 — Color Class Validation
  // ============================================================

  test('all color values follow text-accent-* pattern', () => {
    for (const panel of PANEL_REGISTRY) {
      expect(panel.color).toMatch(/^text-accent-/);
    }
  });
});

// ============================================================
// PART 5 — getPanelDef
// ============================================================

describe('getPanelDef', () => {
  test('returns correct entry for existing ID', () => {
    const def = getPanelDef('chat');
    expect(def).toBeDefined();
    expect(def!.id).toBe('chat');
    expect(def!.label).toBe('AI Chat');
    expect(def!.icon).toBe('MessageSquare');
  });

  test('returns correct entry for a new panel ID', () => {
    const def = getPanelDef('database');
    expect(def).toBeDefined();
    expect(def!.id).toBe('database');
    expect(def!.label).toBe('Database');
  });

  test('returns undefined for non-existent ID', () => {
    const def = getPanelDef('non-existent-panel');
    expect(def).toBeUndefined();
  });

  test('returns undefined for empty string', () => {
    const def = getPanelDef('');
    expect(def).toBeUndefined();
  });

  test('every registry ID is retrievable via getPanelDef', () => {
    for (const panel of PANEL_REGISTRY) {
      const def = getPanelDef(panel.id);
      expect(def).toBeDefined();
      expect(def!.id).toBe(panel.id);
      expect(def!.label).toBe(panel.label);
    }
  });
});

// ============================================================
// PART 6 — Known Panel Spot Checks
// ============================================================

describe('known panel spot checks', () => {
  test('pipeline panel exists with correct metadata', () => {
    const def = getPanelDef('pipeline');
    expect(def).toMatchObject({
      id: 'pipeline',
      label: 'Pipeline',
      icon: 'Activity',
      category: 'View',
    });
  });

  test('composer panel exists with correct metadata', () => {
    const def = getPanelDef('composer');
    expect(def).toMatchObject({
      id: 'composer',
      label: 'Multi-file Composer',
      icon: 'Edit3',
      category: 'Tools',
    });
  });

  test('search panel has a shortcut defined', () => {
    const def = getPanelDef('search');
    expect(def).toBeDefined();
    expect((def as PanelDef & { shortcut?: string }).shortcut).toBe('Ctrl+Shift+F');
  });
});
