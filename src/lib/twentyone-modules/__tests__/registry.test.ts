// ============================================================
// twentyone-modules/__tests__/registry.test.ts
// — Verifies registry shape, lookups, and feature-flag tier inclusion.
// ============================================================

import {
  REGISTRY,
  getModule,
  modulesByStatus,
  modulesByHostTab,
  modulesEnabledAt,
  allComplianceHookIds,
  allContextBlockIds,
  auditRegistry,
} from '../registry';
import type { ModuleId } from '../types';

describe('twentyone-modules/registry', () => {
  describe('REGISTRY shape', () => {
    it('contains exactly 21 entries', () => {
      expect(REGISTRY.length).toBe(21);
    });

    it('covers every ModuleId M1..M21 exactly once', () => {
      const seen = new Set<ModuleId>();
      for (const entry of REGISTRY) {
        expect(seen.has(entry.module_id)).toBe(false);
        seen.add(entry.module_id);
      }
      const expected: ModuleId[] = [
        'M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11',
        'M12','M13','M14','M15','M16','M17','M18','M19','M20','M21',
      ];
      for (const id of expected) expect(seen.has(id)).toBe(true);
    });

    it('every entry declares role + name + name_ko', () => {
      for (const entry of REGISTRY) {
        expect(entry.role.length).toBeGreaterThan(0);
        expect(entry.name.length).toBeGreaterThan(0);
        expect(entry.name_ko.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getModule', () => {
    it('returns the correct entry by ID', () => {
      const m2 = getModule('M2');
      expect(m2).toBeDefined();
      expect(m2?.name_ko).toBe('결말 잠금');
      expect(m2?.status_in_loreguard).toBe('gap');
      expect(m2?.priority).toBe('A');
    });

    it('returns undefined for invalid IDs', () => {
      // @ts-expect-error — invalid ModuleId at runtime
      expect(getModule('M99')).toBeUndefined();
    });
  });

  describe('modulesByStatus', () => {
    it('reports the 6 gap modules from the 21-module §A.A audit', () => {
      const gaps = modulesByStatus('gap').map((e) => e.module_id).sort();
      expect(gaps).toEqual(['M11', 'M18', 'M2', 'M4', 'M5', 'M6'].sort());
    });

    it('reports 3 enhancement modules (M8/M9/M12)', () => {
      const enhancements = modulesByStatus('enhancement').map((e) => e.module_id).sort();
      expect(enhancements).toEqual(['M12', 'M8', 'M9']);
    });

    it('reports remaining 12 as covered', () => {
      const covered = modulesByStatus('covered');
      expect(covered.length).toBe(12);
    });
  });

  describe('modulesByHostTab', () => {
    it('groups M2 / M3 / M4 under world tab', () => {
      const worldModules = modulesByHostTab('world').map((e) => e.module_id);
      expect(worldModules).toContain('M1');
      expect(worldModules).toContain('M2');
      expect(worldModules).toContain('M3');
      expect(worldModules).toContain('M4');
    });

    it('groups M7 / M8 / M9 under characters tab', () => {
      const charModules = modulesByHostTab('characters').map((e) => e.module_id).sort();
      expect(charModules).toEqual(['M7', 'M8', 'M9']);
    });

    it('hosts M14 under scene-sheet tab', () => {
      const sceneModules = modulesByHostTab('scene-sheet').map((e) => e.module_id);
      expect(sceneModules).toEqual(['M14']);
    });

    it('has M20 with host_tab=null (pure backend Compliance)', () => {
      const nullHost = modulesByHostTab(null);
      expect(nullHost.length).toBe(1);
      expect(nullHost[0].module_id).toBe('M20');
    });
  });

  describe('modulesEnabledAt (feature-flag tier)', () => {
    it('off: only covered modules visible (12)', () => {
      const off = modulesEnabledAt('off');
      expect(off.length).toBe(12);
      expect(off.every((e) => e.status_in_loreguard === 'covered')).toBe(true);
    });

    it('essential: covered + Tier A gaps (M2 / M4 / M18) = 15', () => {
      const essential = modulesEnabledAt('essential');
      const ids = essential.map((e) => e.module_id);
      expect(ids).toContain('M2');
      expect(ids).toContain('M4');
      expect(ids).toContain('M18');
      // Standard tier modules (M5 / M6 / M11) NOT yet visible
      expect(ids).not.toContain('M5');
      expect(ids).not.toContain('M6');
      expect(ids).not.toContain('M11');
      expect(essential.length).toBe(15);
    });

    it('standard: essential + Tier B gaps (M5 / M6 / M11) = 18', () => {
      const standard = modulesEnabledAt('standard');
      const ids = standard.map((e) => e.module_id);
      expect(ids).toContain('M5');
      expect(ids).toContain('M6');
      expect(ids).toContain('M11');
      // Pro enhancements (M8/M9/M12) NOT yet visible
      expect(ids).not.toContain('M8');
      expect(ids).not.toContain('M9');
      expect(ids).not.toContain('M12');
      expect(standard.length).toBe(18);
    });

    it('pro: all 21 modules visible', () => {
      const pro = modulesEnabledAt('pro');
      expect(pro.length).toBe(21);
    });

    it('tier escalation is monotonic (no module disappears as tier rises)', () => {
      const off = new Set(modulesEnabledAt('off').map((e) => e.module_id));
      const essential = new Set(modulesEnabledAt('essential').map((e) => e.module_id));
      const standard = new Set(modulesEnabledAt('standard').map((e) => e.module_id));
      const pro = new Set(modulesEnabledAt('pro').map((e) => e.module_id));

      for (const id of off) expect(essential.has(id)).toBe(true);
      for (const id of essential) expect(standard.has(id)).toBe(true);
      for (const id of standard) expect(pro.has(id)).toBe(true);
    });
  });

  describe('allComplianceHookIds', () => {
    it('returns at least 8 Compliance hooks (16-axis Phase 2 target subset)', () => {
      const hooks = allComplianceHookIds();
      // Per design: 8 new hooks complement existing 7-axis (= 16 total at runtime).
      expect(hooks.length).toBeGreaterThanOrEqual(8);
    });

    it('includes the expected MVP hooks', () => {
      const hooks = allComplianceHookIds();
      expect(hooks).toContain('ending-match-check');
      expect(hooks).toContain('glossary-surface-form');
      expect(hooks).toContain('secret-release-guard');
      expect(hooks).toContain('platform-rating-check');
      expect(hooks).toContain('foreshadow-pair-check');
    });
  });

  describe('allContextBlockIds', () => {
    it('reports unique ContextBlockIds (no duplicates)', () => {
      const ids = allContextBlockIds();
      const set = new Set(ids);
      expect(set.size).toBe(ids.length);
    });

    it('includes the 6 new ContextBlocks expected from 21-module fusion', () => {
      const ids = allContextBlockIds();
      expect(ids).toContain('ending-lock');         // M2
      expect(ids).toContain('glossary');            // M4
      expect(ids).toContain('timeline-graph');      // M5
      expect(ids).toContain('info-release-table');  // M6
      expect(ids).toContain('beat-bank');           // M11
      expect(ids).toContain('platform-profile');    // M18
      expect(ids).toContain('foreshadow-pair');     // M12
    });
  });

  describe('auditRegistry', () => {
    it('reports 21 total / 12 covered / 6 gap / 3 enhancement', () => {
      const audit = auditRegistry();
      expect(audit.total).toBe(21);
      expect(audit.covered).toBe(12);
      expect(audit.gap).toBe(6);
      expect(audit.enhancement).toBe(3);
      // 12+6+3 = 21
      expect(audit.covered + audit.gap + audit.enhancement).toBe(audit.total);
    });

    it('reports coverage percent ≈ 57% (12/21)', () => {
      const audit = auditRegistry();
      expect(audit.coverage_percent).toBe(57); // round(12/21*100) = 57
    });

    it('priority distribution sums to 21', () => {
      const audit = auditRegistry();
      const sum = audit.by_priority.A + audit.by_priority.B + audit.by_priority.C;
      expect(sum).toBe(21);
    });

    it('feature-flag distribution sums to 21', () => {
      const audit = auditRegistry();
      const sum =
        audit.by_feature_flag.off
        + audit.by_feature_flag.essential
        + audit.by_feature_flag.standard
        + audit.by_feature_flag.pro;
      expect(sum).toBe(21);
    });
  });

  describe('Isolation §1 (registry-level checks)', () => {
    it('every entry referencing a Loreguard tab uses a valid AppTab value', () => {
      // Smoke check — the actual valid set is enforced by TypeScript AppTab type.
      // Here we just verify host_tab is either a string OR the literal 'novel-ide-launcher'
      // OR null. The compiler narrows further.
      for (const entry of REGISTRY) {
        const ht = entry.host_tab;
        if (ht !== null) {
          expect(typeof ht).toBe('string');
          expect((ht as string).length).toBeGreaterThan(0);
        }
      }
    });

    it('no two entries claim the same Compliance hook ID', () => {
      const hooks = allComplianceHookIds();
      expect(new Set(hooks).size).toBe(hooks.length);
    });
  });
});
