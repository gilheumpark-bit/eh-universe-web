// ============================================================
// CS Quill — Detector Registry
// ============================================================
// Plugin mechanism for AST-based rule detectors.
// Ported from local-code-studio/packages/quill-engine/src/registry.ts

// ============================================================
// PART 1 — Types + Registry
// ============================================================

/**
 * Minimal SourceFile interface — compatible with ts-morph SourceFile
 * without requiring ts-morph as a hard dependency.
 */
export interface QuillSourceFile {
  getFullText(): string;
  getFilePath?(): string;
}

export interface RuleFinding {
  line: number;
  message: string;
}

export interface RuleDetector {
  /** Rule ID from the catalog (e.g. 'ERR-005') */
  ruleId: string;
  /** AST traversal plugin that finds violations */
  detect: (sourceFile: QuillSourceFile) => RuleFinding[];
}

export class DetectorRegistry {
  private detectors = new Map<string, RuleDetector>();

  register(detector: RuleDetector) {
    // Catalog validation is optional — quill-catalog may not be present
    this.detectors.set(detector.ruleId, detector);
  }

  getDetectors(): RuleDetector[] {
    return Array.from(this.detectors.values());
  }

  getRegistryStatus() {
    return {
      connected: this.detectors.size,
      registeredRules: Array.from(this.detectors.keys()),
    };
  }
}

export const detectorRegistry = new DetectorRegistry();
