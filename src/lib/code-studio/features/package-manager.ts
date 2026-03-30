// ============================================================
// Code Studio — Package Manager
// ============================================================
// package.json 파싱, 의존성 추가/제거, WebContainer install 실행, 오래된 패키지 표시.

import type { FileNode } from '../../code-studio-types';

// ============================================================
// PART 1 — Types
// ============================================================

export interface PackageInfo {
  name: string;
  version: string;
  isDev: boolean;
  description?: string;
  latest?: string;
  outdated?: boolean;
}

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export type PackageManagerType = 'npm' | 'yarn' | 'pnpm' | 'bun';

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=PackageInfo,PackageJson,PackageManagerType

// ============================================================
// PART 2 — Package.json Operations
// ============================================================

/** Parse package.json content */
export function parsePackageJson(content: string): PackageJson | null {
  try {
    const pkg = JSON.parse(content);
    return {
      name: pkg.name ?? 'unnamed',
      version: pkg.version ?? '0.0.0',
      description: pkg.description,
      scripts: pkg.scripts ?? {},
      dependencies: pkg.dependencies ?? {},
      devDependencies: pkg.devDependencies ?? {},
    };
  } catch {
    return null;
  }
}

/** Find package.json in file tree */
export function findPackageJson(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === 'file' && node.name === 'package.json') return node;
    if (node.children) {
      const found = findPackageJson(node.children);
      if (found) return found;
    }
  }
  return null;
}

/** Get all packages as a flat list */
export function listPackages(pkg: PackageJson): PackageInfo[] {
  const result: PackageInfo[] = [];

  for (const [name, version] of Object.entries(pkg.dependencies)) {
    result.push({ name, version, isDev: false });
  }
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    result.push({ name, version, isDev: true });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/** Add a dependency to package.json */
export function addDependency(
  content: string,
  packageName: string,
  version: string,
  isDev = false,
): string {
  try {
    const pkg = JSON.parse(content);
    const key = isDev ? 'devDependencies' : 'dependencies';
    if (!pkg[key]) pkg[key] = {};
    pkg[key][packageName] = version;

    // Sort dependencies
    pkg[key] = Object.fromEntries(Object.entries(pkg[key]).sort(([a], [b]) => a.localeCompare(b)));

    return JSON.stringify(pkg, null, 2) + '\n';
  } catch {
    return content;
  }
}

/** Remove a dependency from package.json */
export function removeDependency(content: string, packageName: string): string {
  try {
    const pkg = JSON.parse(content);

    if (pkg.dependencies) delete pkg.dependencies[packageName];
    if (pkg.devDependencies) delete pkg.devDependencies[packageName];

    return JSON.stringify(pkg, null, 2) + '\n';
  } catch {
    return content;
  }
}

// IDENTITY_SEAL: PART-2 | role=PackageJsonOps | inputs=content,packageName | outputs=PackageInfo[],string

// ============================================================
// PART 3 — Install Commands & Version Parsing
// ============================================================

/** Generate install command for a package manager */
export function getInstallCommand(
  pm: PackageManagerType,
  packages: string[],
  isDev = false,
): string {
  if (packages.length === 0) {
    // Install all
    switch (pm) {
      case 'npm': return 'npm install';
      case 'yarn': return 'yarn';
      case 'pnpm': return 'pnpm install';
      case 'bun': return 'bun install';
    }
  }

  const pkgStr = packages.join(' ');
  switch (pm) {
    case 'npm': return `npm install ${isDev ? '-D ' : ''}${pkgStr}`;
    case 'yarn': return `yarn add ${isDev ? '-D ' : ''}${pkgStr}`;
    case 'pnpm': return `pnpm add ${isDev ? '-D ' : ''}${pkgStr}`;
    case 'bun': return `bun add ${isDev ? '-d ' : ''}${pkgStr}`;
  }
}

/** Generate uninstall command */
export function getUninstallCommand(pm: PackageManagerType, packages: string[]): string {
  const pkgStr = packages.join(' ');
  switch (pm) {
    case 'npm': return `npm uninstall ${pkgStr}`;
    case 'yarn': return `yarn remove ${pkgStr}`;
    case 'pnpm': return `pnpm remove ${pkgStr}`;
    case 'bun': return `bun remove ${pkgStr}`;
  }
}

/** Detect package manager from lock files */
export function detectPackageManager(nodes: FileNode[]): PackageManagerType {
  for (const node of nodes) {
    if (node.type === 'file') {
      if (node.name === 'pnpm-lock.yaml') return 'pnpm';
      if (node.name === 'yarn.lock') return 'yarn';
      if (node.name === 'bun.lockb') return 'bun';
      if (node.name === 'package-lock.json') return 'npm';
    }
  }
  return 'npm';
}

/** Parse version string to extract semver components */
export function parseVersion(version: string): { major: number; minor: number; patch: number; raw: string } | null {
  const cleaned = version.replace(/^[~^>=<]+/, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    raw: cleaned,
  };
}

// IDENTITY_SEAL: PART-3 | role=InstallCommands | inputs=pm,packages | outputs=string,PackageManagerType
