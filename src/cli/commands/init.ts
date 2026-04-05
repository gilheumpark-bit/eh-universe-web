// ============================================================
// CS Quill 🦔 — cs init command
// ============================================================
// 온보딩: 언어 → 프로젝트 스캔 → API 키 → PART 설정 → 저장

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { saveGlobalConfig, loadGlobalConfig, type CSConfig, type KeyConfig } from '../core/config';

// ============================================================
// PART 1 — Framework Detection
// ============================================================

interface DetectedFramework {
  name: string;
  version: string;
}

function detectFrameworks(): DetectedFramework[] {
  const pkgPath = join(process.cwd(), 'package.json');
  if (!existsSync(pkgPath)) return [];

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const detected: DetectedFramework[] = [];

    const checks: Array<[string, string]> = [
      ['next', 'Next.js'],
      ['react', 'React'],
      ['vue', 'Vue'],
      ['svelte', 'Svelte'],
      ['@angular/core', 'Angular'],
      ['express', 'Express'],
      ['nestjs', 'NestJS'],
      ['tailwindcss', 'Tailwind CSS'],
      ['typescript', 'TypeScript'],
    ];

    for (const [pkg, name] of checks) {
      if (allDeps[pkg]) {
        detected.push({ name, version: allDeps[pkg].replace(/[\^~]/, '') });
      }
    }

    return detected;
  } catch {
    return [];
  }
}

// IDENTITY_SEAL: PART-1 | role=framework-detection | inputs=package.json | outputs=DetectedFramework[]

// ============================================================
// PART 2 — Interactive Init Flow
// ============================================================

const LABELS: Record<string, Record<string, string>> = {
  ko: {
    welcome: '🦔 CS Quill v0.1.0\n',
    langSelect: '언어를 선택하세요',
    scanning: '프로젝트 스캔 중...',
    detected: '감지됨',
    noFramework: '프레임워크 감지 안 됨',
    apiKey: 'API 키를 입력하세요',
    provider: '프로바이더',
    role: '역할 (generate, verify, judge)',
    structure: '코드 구조 (auto/on/off)',
    level: '경험 수준',
    saved: '설정 저장 완료',
    ready: '준비 완료. "cs 생성 아무거나" 로 시작하세요.',
    step: '단계',
  },
  en: {
    welcome: '🦔 CS Quill v0.1.0\n',
    langSelect: 'Select language',
    scanning: 'Scanning project...',
    detected: 'detected',
    noFramework: 'No framework detected',
    apiKey: 'Enter API key',
    provider: 'Provider',
    role: 'Role (generate, verify, judge)',
    structure: 'Code structure (auto/on/off)',
    level: 'Experience level',
    saved: 'Settings saved',
    ready: 'Ready. Start with "cs generate anything".',
    step: 'Step',
  },
};

export async function runInit(): Promise<void> {
  // For MVP, use simple console prompts (inquirer will be added later)
  const config = loadGlobalConfig();

  console.log('🦔 CS Quill v0.1.0\n');

  // Step 1: Language
  console.log('  [1/5] 언어 선택 / Select Language');
  console.log('        > 한국어 (ko)');
  console.log('          English (en)');
  console.log('          日本語 (ja)');
  console.log('          中文 (zh)');
  // MVP: default to ko, interactive selection with inquirer later
  config.language = 'ko';
  console.log('        ✅ 한국어 설정됨\n');

  // Step 2: Framework detection
  const l = LABELS[config.language] ?? LABELS['en'];
  console.log(`  [2/5] ${l.scanning}`);
  const frameworks = detectFrameworks();
  if (frameworks.length > 0) {
    for (const fw of frameworks) {
      console.log(`        ✅ ${fw.name} ${fw.version} ${l.detected}`);
    }
    config.framework = frameworks.map(f => f.name).join(' + ');
  } else {
    console.log(`        ⚠️  ${l.noFramework}`);
  }
  console.log('');

  // Step 3: API Key (MVP: placeholder, interactive later)
  console.log(`  [3/5] ${l.apiKey}`);
  if (config.keys.length === 0) {
    console.log('        ⚠️  키가 없습니다. cs config keys add 로 추가하세요.');
    console.log('        (검증/감사는 API 없이 로컬로 실행 가능)');
  } else {
    for (const key of config.keys) {
      console.log(`        ✅ ${key.id} (${key.provider}) → [${key.roles.join(', ')}]`);
    }
  }
  console.log('');

  // Step 4: Structure
  console.log(`  [4/5] ${l.structure}`);
  console.log('        > auto (50줄↓ flat, 100줄↑ part)');
  config.structure = 'auto';
  console.log('        ✅ auto 설정됨\n');

  // Step 5: Level
  console.log(`  [5/5] ${l.level}`);
  console.log('        🟢 Easy — 알아서 다 해줘');
  console.log('        > 🟡 Normal — 중요한 건 물어봐');
  console.log('        🔴 Pro — 내가 다 제어할게');
  config.level = 'normal';
  console.log('        ✅ Normal 설정됨\n');

  // Save
  saveGlobalConfig(config);
  console.log(`  ✅ ${l.saved}: ~/.cs/config.json`);
  console.log(`\n  🦔 ${l.ready}\n`);
}

// IDENTITY_SEAL: PART-2 | role=init-flow | inputs=user-input | outputs=CSConfig
