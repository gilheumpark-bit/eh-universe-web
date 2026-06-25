import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const COMPLIANCE_PATH = path.join(ROOT, 'docs', 'compliance.yml');
const REMOVED_ROUTES = [
  '/code-studio',
  '/network',
  '/archive',
  '/codex',
  '/reports',
  '/reference',
  '/rulebook',
  '/tools',
  '/world',
];
const REQUIRED_TESTS = [
  'src/lib/__tests__/compliance-policy.test.ts',
  'src/lib/creative-process/__tests__/regulatory-profile.test.ts',
];
const RISKY_PUBLIC_CLAIMS = [
  /저작권(?:을)?\s*보증/,
  /100%\s*저작권\s*보호/,
  /표절\s*완전\s*방지/,
  /완전\s*방어/,
  /인간\s*창작성\s*인증/,
  /AI\s*판별/,
];
const PUBLIC_COPY_ROOTS = [
  'src/app',
  'src/components/certification',
  'src/components/loreguard',
  'src/lib/creative-process',
];

function readCompliance(): string {
  return readFileSync(COMPLIANCE_PATH, 'utf8');
}

function extractSourcePaths(text: string): string[] {
  return Array.from(text.matchAll(/(?:^|\s)(src\/[^\s"'`]+)(?:\s|$)/gm), (match) => match[1])
    .map((rawPath) => rawPath.replace(/[,)]$/, ''))
    .filter((rawPath) => !rawPath.includes('*'));
}

function listFiles(target: string): string[] {
  const absolutePath = path.join(ROOT, target);
  if (!existsSync(absolutePath)) return [];
  const info = statSync(absolutePath);
  if (absolutePath.includes(`${path.sep}__tests__${path.sep}`)) return [];
  if (info.isFile()) return [absolutePath];
  const files: string[] = [];
  for (const entry of readdirSync(absolutePath)) {
    const child = path.join(absolutePath, entry);
    const childInfo = statSync(child);
    if (childInfo.isDirectory()) {
      if (entry === '__tests__') continue;
      files.push(...listFiles(path.relative(ROOT, child)));
    } else if (/\.(ts|tsx|md)$/.test(child) && !/\.test\.(ts|tsx)$/.test(child)) {
      files.push(child);
    }
  }
  return files;
}

describe('compliance.yml policy-as-test', () => {
  it('matrix references existing implementation and test files', () => {
    const compliance = readCompliance();
    const referencedPaths = new Set([...extractSourcePaths(compliance), ...REQUIRED_TESTS]);

    for (const relativePath of referencedPaths) {
      expect(existsSync(path.join(ROOT, relativePath))).toBe(true);
    }
  });

  it('active route scope excludes removed surfaces', () => {
    const compliance = readCompliance();

    for (const route of REMOVED_ROUTES) {
      expect(compliance).not.toContain(`    - ${route}`);
    }
    expect(compliance).toContain('    - /studio');
    expect(compliance).toContain('    - /translation-studio');
    expect(compliance).toContain('    - /docs');
    expect(compliance).toContain('    - /verify');
  });

  it('jurisdiction matrices are attached to executable tests', () => {
    const compliance = readCompliance();

    for (const relativePath of REQUIRED_TESTS) {
      expect(compliance).toContain(relativePath);
    }
    expect(compliance).toContain('gate_status: PARTIAL');
    expect(compliance).toContain('current_verdict: HOLD');
  });

  it('public copy avoids high-risk certification or guarantee claims', () => {
    const files = PUBLIC_COPY_ROOTS.flatMap(listFiles);

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of RISKY_PUBLIC_CLAIMS) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});
