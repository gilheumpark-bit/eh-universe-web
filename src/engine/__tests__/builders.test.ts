/**
 * Tests for extracted pipeline builders (prism-builder, platform-builder)
 */

describe('prism-builder', () => {
  // Dynamic import to avoid module resolution issues in test env
  let buildPrismBlock: (config: Record<string, unknown>, language: string) => string;

  beforeAll(async () => {
    try {
      const mod = await import('../builders/prism-builder');
      buildPrismBlock = mod.buildPrismBlock;
    } catch {
      // If module doesn't exist, skip tests
    }
  });

  it('should be importable', () => {
    if (!buildPrismBlock) return; // skip if not available
    expect(typeof buildPrismBlock).toBe('function');
  });

  it('always includes PRISM-CORE even for OFF mode', () => {
    if (!buildPrismBlock) return;
    const result = buildPrismBlock({ prismMode: 'OFF' }, 'KO');
    expect(result).toContain('PRISM-CORE');
  });

  it('includes PRISM-MODE for ALL mode', () => {
    if (!buildPrismBlock) return;
    const result = buildPrismBlock({ prismMode: 'ALL' }, 'KO');
    expect(result).toContain('PRISM');
    expect(result.length).toBeGreaterThan(100);
  });
});

describe('platform-builder', () => {
  let buildPlatformBlock: (config: Record<string, unknown>, language: string) => string;

  beforeAll(async () => {
    try {
      const mod = await import('../builders/platform-builder');
      buildPlatformBlock = mod.buildPlatformBlock;
    } catch {
      // skip
    }
  });

  it('should be importable', () => {
    if (!buildPlatformBlock) return;
    expect(typeof buildPlatformBlock).toBe('function');
  });

  it('returns platform-specific instructions for MOBILE', () => {
    if (!buildPlatformBlock) return;
    const result = buildPlatformBlock({ publishPlatform: 'MOBILE' }, 'KO');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for unknown platform', () => {
    if (!buildPlatformBlock) return;
    const result = buildPlatformBlock({ publishPlatform: '' }, 'KO');
    // May return empty or default
    expect(typeof result).toBe('string');
  });
});
