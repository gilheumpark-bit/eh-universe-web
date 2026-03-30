// ============================================================
// Code Studio — CI/CD Configuration Generator
// ============================================================

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export type CICDPlatform = 'github-actions' | 'gitlab-ci' | 'vercel' | 'netlify';

export interface CICDConfig {
  platform: CICDPlatform;
  framework: string;
  features: {
    lint: boolean;
    test: boolean;
    build: boolean;
    deploy: boolean;
    typecheck: boolean;
    security: boolean;
    preview: boolean;
  };
  nodeVersion: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

export interface CICDOutput {
  files: Array<{ path: string; content: string }>;
  description: string;
  setupInstructions: string[];
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=CICDConfig,CICDOutput

// ============================================================
// PART 2 — Helpers
// ============================================================

function flattenFiles(nodes: FileNode[], prefix = ''): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === 'file' && n.content != null) out.push({ path: p, content: n.content });
    if (n.children) out.push(...flattenFiles(n.children, p));
  }
  return out;
}

function getInstallCmd(pm: CICDConfig['packageManager']): string {
  switch (pm) {
    case 'yarn': return 'yarn install --frozen-lockfile';
    case 'pnpm': return 'pnpm install --frozen-lockfile';
    case 'bun': return 'bun install --frozen-lockfile';
    default: return 'npm ci';
  }
}

function getRunCmd(pm: CICDConfig['packageManager'], script: string): string {
  switch (pm) {
    case 'yarn': return `yarn ${script}`;
    case 'pnpm': return `pnpm run ${script}`;
    case 'bun': return `bun run ${script}`;
    default: return `npm run ${script}`;
  }
}

// IDENTITY_SEAL: PART-2 | role=helpers | inputs=CICDConfig | outputs=commands

// ============================================================
// PART 3 — GitHub Actions Generator
// ============================================================

function generateGitHubActions(config: CICDConfig): CICDOutput {
  const install = getInstallCmd(config.packageManager);
  const steps: string[] = [];

  steps.push(`      - uses: actions/checkout@v4`);
  steps.push(`      - uses: actions/setup-node@v4\n        with:\n          node-version: '${config.nodeVersion}'`);
  steps.push(`      - run: ${install}`);

  if (config.features.typecheck) steps.push(`      - run: ${getRunCmd(config.packageManager, 'typecheck')}`);
  if (config.features.lint) steps.push(`      - run: ${getRunCmd(config.packageManager, 'lint')}`);
  if (config.features.test) steps.push(`      - run: ${getRunCmd(config.packageManager, 'test')}`);
  if (config.features.build) steps.push(`      - run: ${getRunCmd(config.packageManager, 'build')}`);

  const yaml = `name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n${steps.join('\n')}`;

  return {
    files: [{ path: '.github/workflows/ci.yml', content: yaml }],
    description: 'GitHub Actions CI pipeline',
    setupInstructions: ['Commit .github/workflows/ci.yml to your repository', 'Pipeline runs on push/PR to main'],
  };
}

// IDENTITY_SEAL: PART-3 | role=GitHub Actions | inputs=CICDConfig | outputs=CICDOutput

// ============================================================
// PART 4 — Vercel & Netlify Generator
// ============================================================

function generateVercelConfig(config: CICDConfig): CICDOutput {
  const vercelJson = JSON.stringify({
    buildCommand: getRunCmd(config.packageManager, 'build'),
    installCommand: getInstallCmd(config.packageManager),
    framework: config.framework.toLowerCase() === 'next.js' ? 'nextjs' : null,
  }, null, 2);

  return {
    files: [{ path: 'vercel.json', content: vercelJson }],
    description: 'Vercel deployment configuration',
    setupInstructions: ['Connect your repository to Vercel', 'vercel.json will be auto-detected'],
  };
}

function generateNetlifyConfig(config: CICDConfig): CICDOutput {
  const toml = `[build]\n  command = "${getRunCmd(config.packageManager, 'build')}"\n  publish = "dist"\n\n[build.environment]\n  NODE_VERSION = "${config.nodeVersion}"`;

  return {
    files: [{ path: 'netlify.toml', content: toml }],
    description: 'Netlify deployment configuration',
    setupInstructions: ['Connect your repository to Netlify', 'netlify.toml will be auto-detected'],
  };
}

function generateGitLabCI(config: CICDConfig): CICDOutput {
  const install = getInstallCmd(config.packageManager);
  const stages: string[] = [];
  const jobs: string[] = [];

  if (config.features.lint || config.features.typecheck) {
    stages.push('lint');
    jobs.push(`lint:\n  stage: lint\n  script:\n    - ${install}\n    - ${getRunCmd(config.packageManager, 'lint')}`);
  }
  if (config.features.test) {
    stages.push('test');
    jobs.push(`test:\n  stage: test\n  script:\n    - ${install}\n    - ${getRunCmd(config.packageManager, 'test')}`);
  }
  if (config.features.build) {
    stages.push('build');
    jobs.push(`build:\n  stage: build\n  script:\n    - ${install}\n    - ${getRunCmd(config.packageManager, 'build')}`);
  }

  const yaml = `image: node:${config.nodeVersion}\nstages:\n${stages.map((s) => `  - ${s}`).join('\n')}\n\n${jobs.join('\n\n')}`;

  return {
    files: [{ path: '.gitlab-ci.yml', content: yaml }],
    description: 'GitLab CI pipeline',
    setupInstructions: ['Commit .gitlab-ci.yml to repository root'],
  };
}

// IDENTITY_SEAL: PART-4 | role=Vercel+Netlify+GitLab | inputs=CICDConfig | outputs=CICDOutput

// ============================================================
// PART 5 — Public API
// ============================================================

export function generateCICD(config: CICDConfig): CICDOutput {
  switch (config.platform) {
    case 'github-actions': return generateGitHubActions(config);
    case 'vercel': return generateVercelConfig(config);
    case 'netlify': return generateNetlifyConfig(config);
    case 'gitlab-ci': return generateGitLabCI(config);
  }
}

export function detectProjectConfig(files: FileNode[]): Partial<CICDConfig> {
  const flat = flattenFiles(files);
  const names = flat.map((f) => f.path);
  const pkgFile = flat.find((f) => f.path === 'package.json');

  let packageManager: CICDConfig['packageManager'] = 'npm';
  if (names.some((n) => n.includes('pnpm-lock'))) packageManager = 'pnpm';
  else if (names.some((n) => n.includes('yarn.lock'))) packageManager = 'yarn';
  else if (names.some((n) => n.includes('bun.lockb'))) packageManager = 'bun';

  let framework = 'unknown';
  if (pkgFile) {
    const content = pkgFile.content;
    if (content.includes('"next"')) framework = 'Next.js';
    else if (content.includes('"react"')) framework = 'React';
    else if (content.includes('"vue"')) framework = 'Vue';
    else if (content.includes('"express"')) framework = 'Express';
  }

  const hasLint = pkgFile?.content.includes('"lint"') ?? false;
  const hasTest = pkgFile?.content.includes('"test"') ?? false;
  const hasBuild = pkgFile?.content.includes('"build"') ?? false;
  const hasTypecheck = pkgFile?.content.includes('"typecheck"') ?? false;

  return {
    framework,
    packageManager,
    nodeVersion: '20',
    features: {
      lint: hasLint,
      test: hasTest,
      build: hasBuild,
      deploy: true,
      typecheck: hasTypecheck,
      security: false,
      preview: true,
    },
  };
}

// IDENTITY_SEAL: PART-5 | role=public API | inputs=CICDConfig,FileNode[] | outputs=CICDOutput
