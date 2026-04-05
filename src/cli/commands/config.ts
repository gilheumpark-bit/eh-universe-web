// ============================================================
// CS Quill 🦔 — cs config command
// ============================================================
// 설정 조회/변경. 키 관리, 구조, 레벨, 파일모드.

import {
  loadGlobalConfig, saveGlobalConfig, addKey, removeKey,
  getGlobalConfigPath, type CSConfig, type KeyConfig,
} from '../core/config';

// ============================================================
// PART 1 — Config Actions
// ============================================================

function showConfig(config: CSConfig): void {
  console.log('🦔 CS Quill — 현재 설정\n');
  console.log(`  언어:     ${config.language}`);
  console.log(`  레벨:     ${config.level}`);
  console.log(`  구조:     ${config.structure}`);
  console.log(`  파일모드: ${config.fileMode}`);
  console.log(`  프레임워크: ${config.framework ?? '미감지'}`);
  console.log(`  경로:     ${getGlobalConfigPath()}`);

  if (config.keys.length > 0) {
    console.log(`\n  🔑 키 (${config.keys.length}개):`);
    for (const key of config.keys) {
      const masked = key.key.slice(0, 8) + '***';
      console.log(`     ${key.id} (${key.provider}/${key.model}) → [${key.roles.join(', ')}] ${masked}`);
    }
  } else {
    console.log('\n  🔑 키 없음 — cs config keys add 로 추가');
  }
  console.log('');
}

function showHelp(): void {
  console.log('🦔 CS Quill — config 명령어\n');
  console.log('  cs config show          현재 설정 조회');
  console.log('  cs config keys          키 목록');
  console.log('  cs config keys add      키 추가 (대화형)');
  console.log('  cs config keys remove   키 삭제');
  console.log('  cs config structure     코드 구조 (auto/on/off)');
  console.log('  cs config level         경험 수준 (easy/normal/pro)');
  console.log('  cs config filemode      파일 모드 (safe/auto/yolo)');
  console.log('  cs config language      언어 (ko/en/ja/zh)');
  console.log('');
}

// IDENTITY_SEAL: PART-1 | role=config-actions | inputs=CSConfig | outputs=console

// ============================================================
// PART 2 — Config Runner
// ============================================================

export async function runConfig(action: string): Promise<void> {
  const config = loadGlobalConfig();

  switch (action) {
    case 'show':
    case undefined:
      showConfig(config);
      break;

    case 'keys': {
      if (config.keys.length === 0) {
        console.log('  🔑 등록된 키 없음\n');
      } else {
        console.log(`  🔑 등록된 키 (${config.keys.length}개)\n`);
        for (const [i, key] of config.keys.entries()) {
          console.log(`  [${i + 1}] ${key.id}`);
          console.log(`      ${key.provider} / ${key.model}`);
          console.log(`      역할: [${key.roles.join(', ')}]`);
          if (key.budget) console.log(`      예산: ${key.budget}`);
          console.log('');
        }
      }
      break;
    }

    case 'structure': {
      // MVP: toggle through auto → on → off
      const next = config.structure === 'auto' ? 'on' : config.structure === 'on' ? 'off' : 'auto';
      config.structure = next;
      saveGlobalConfig(config);
      console.log(`  구조: ${next} ✅`);
      break;
    }

    case 'level': {
      const next = config.level === 'easy' ? 'normal' : config.level === 'normal' ? 'pro' : 'easy';
      config.level = next;
      saveGlobalConfig(config);
      const icons = { easy: '🟢', normal: '🟡', pro: '🔴' };
      console.log(`  레벨: ${icons[next]} ${next} ✅`);
      break;
    }

    case 'filemode': {
      const next = config.fileMode === 'safe' ? 'auto' : config.fileMode === 'auto' ? 'yolo' : 'safe';
      config.fileMode = next;
      saveGlobalConfig(config);
      const icons = { safe: '🔒', auto: '🔓', yolo: '⚡' };
      console.log(`  파일모드: ${icons[next]} ${next} ✅`);
      break;
    }

    case 'language': {
      const langs: CSConfig['language'][] = ['ko', 'en', 'ja', 'zh'];
      const idx = langs.indexOf(config.language);
      config.language = langs[(idx + 1) % langs.length];
      saveGlobalConfig(config);
      console.log(`  언어: ${config.language} ✅`);
      break;
    }

    default:
      showHelp();
  }
}

// IDENTITY_SEAL: PART-2 | role=config-runner | inputs=action | outputs=console
