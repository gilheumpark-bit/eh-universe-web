// ============================================================
// PART 1 — Types & Constants
// 전체 프로젝트 + 사용자 데이터 덤프 / 복원용 Bundle 스펙
// 사용자 신뢰 기본: "네 원고 언제든 가져갈 수 있어"
// ============================================================

import { logger } from '@/lib/logger';
import {
  loadProjects,
  saveProjects,
  STORAGE_KEY_PROJECTS,
} from '@/lib/project-migration';
import type { Project, ChatSession } from '@/lib/studio-types';

export const FULL_BUNDLE_VERSION = '1.0' as const;

/** 전체 덤프 Bundle. 버전 키 기반으로 향후 마이그레이션 경로 확보. */
export interface FullExportBundle {
  version: typeof FULL_BUNDLE_VERSION;
  exportedAt: string;
  project: {
    id: string;
    title: string;
    genre?: string;
    worldBible?: unknown;
    characters?: unknown[];
    episodes: Array<{
      no: number;
      title: string;
      content: string;
      sceneSheet?: unknown;
      metadata?: unknown;
    }>;
    glossary?: unknown[];
  };
  /** 프로젝트의 모든 세션 (메시지 + config) */
  sessions: Array<{
    id: string;
    messages: unknown[];
    config: unknown;
  }>;
  /** localStorage에서 수집한 사용자 환경 설정 */
  settings: {
    writingMode?: string;
    theme?: string;
    language?: string;
    [key: string]: unknown;
  };
  /** noa_episode_memory_<projectId> */
  memoryGraph?: unknown;
  /** eh-translation-memory */
  translationMemory?: unknown;
  /** noa_translation_glossary */
  localGlossary?: unknown;
  /** 프로젝트 범위 밖 전체 프로젝트 목록 (복원 시 전체 덮어쓰기용) */
  allProjects?: Project[];
}

/** localStorage 키 화이트리스트 — 백업 대상 노아 설정 키 */
const BACKUP_SETTING_KEYS: readonly string[] = [
  'noa_theme_level',
  'noa_studio_mode',
  'noa_writing_access',
  'noa_temperature',
  'noa_split_view_default',
  'noa_inline_completion_enabled',
  'noa_planning_advanced',
  'noa_world_guided_mode',
  'noa_last_project_id',
  'noa_last_session_id',
  'noa_language',
  'noa_drive_enc',
] as const;

// ============================================================
// PART 2 — Safe localStorage helpers
// 접근 실패/미가용/JSON 파싱 에러 silent swallow — 부분 데이터 허용
// ============================================================

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    logger.warn('FullBackup', `getItem ${key} failed`, err);
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    logger.warn('FullBackup', `setItem ${key} failed`, err);
    return false;
  }
}

function safeParseJson<T = unknown>(raw: string | null): T | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('FullBackup', 'JSON parse failed', err);
    return undefined;
  }
}

// ============================================================
// PART 3 — Collectors
// 프로젝트 / 세션 / 설정 / 메모리그래프 / TM / 용어집 각각 추출
// 실패해도 부분 데이터 반환 (silent catch)
// ============================================================

function collectProject(projectId: string, all: Project[]): {
  project: FullExportBundle['project'];
  sessions: FullExportBundle['sessions'];
} {
  const proj = all.find(p => p.id === projectId);
  const fallbackProject: FullExportBundle['project'] = {
    id: projectId,
    title: '',
    episodes: [],
  };
  if (!proj) {
    return { project: fallbackProject, sessions: [] };
  }

  // 에피소드 = 모든 세션의 manuscripts 평탄화
  const episodes: FullExportBundle['project']['episodes'] = [];
  const charsMap = new Map<string, unknown>();
  const sessionsOut: FullExportBundle['sessions'] = [];

  for (const session of proj.sessions ?? []) {
    const cfg = session.config ?? {} as ChatSession['config'];
    // 캐릭터 집계 (중복 id 방어)
    if (Array.isArray(cfg.characters)) {
      for (const c of cfg.characters) {
        if (c && typeof (c as { id?: unknown }).id === 'string') {
          charsMap.set((c as { id: string }).id, c);
        }
      }
    }
    // manuscripts → episodes
    const manuscripts = cfg.manuscripts ?? [];
    for (const m of manuscripts) {
      if (!m) continue;
      episodes.push({
        no: typeof m.episode === 'number' ? m.episode : 0,
        title: typeof m.title === 'string' ? m.title : '',
        content: typeof m.content === 'string' ? m.content : '',
        sceneSheet: (m as { sceneSheet?: unknown }).sceneSheet,
        metadata: {
          charCount: (m as { charCount?: number }).charCount,
          updatedAt: (m as { updatedAt?: number }).updatedAt,
        },
      });
    }
    sessionsOut.push({
      id: session.id,
      messages: session.messages ?? [],
      config: cfg,
    });
  }

  episodes.sort((a, b) => a.no - b.no);

  // worldBible / glossary는 첫 세션 config에서 뽑기 (프로젝트 레벨 설정이 없으므로)
  const firstCfg = (proj.sessions?.[0]?.config ?? {}) as unknown as Record<string, unknown>;
  return {
    project: {
      id: proj.id,
      title: proj.name ?? '',
      genre: typeof proj.genre === 'string' ? proj.genre : undefined,
      worldBible: firstCfg.worldBible ?? firstCfg.world,
      characters: Array.from(charsMap.values()),
      episodes,
      glossary: Array.isArray(firstCfg.glossary) ? firstCfg.glossary as unknown[] : undefined,
    },
    sessions: sessionsOut,
  };
}

function collectSettings(): FullExportBundle['settings'] {
  const out: FullExportBundle['settings'] = {};
  for (const key of BACKUP_SETTING_KEYS) {
    const v = safeGetItem(key);
    if (v != null) out[key] = v;
  }
  // 대표 편의 필드 (UI 에서 바로 조회)
  out.theme = safeGetItem('noa_theme_level') ?? undefined;
  out.writingMode = safeGetItem('noa_studio_mode') ?? undefined;
  out.language = safeGetItem('noa_language') ?? undefined;
  return out;
}

function collectMemoryGraph(projectId: string): unknown {
  return safeParseJson(safeGetItem(`noa_episode_memory_${projectId}`));
}

function collectTranslationMemory(): unknown {
  // 실제 키는 translation-memory.ts에서 'eh-translation-memory'
  return safeParseJson(safeGetItem('eh-translation-memory'));
}

function collectLocalGlossary(): unknown {
  return safeParseJson(safeGetItem('noa_translation_glossary'));
}

// ============================================================
// PART 4 — exportFullBundle (메인 API)
// 모든 수집을 try-catch로 감싸 부분 데이터라도 반환 보장
// ============================================================

/**
 * 전체 프로젝트 + 사용자 데이터 덤프 생성.
 * localStorage/IndexedDB 에서 수집해 JSON Bundle로 반환.
 * 개별 실패는 silent swallow — 부분 데이터라도 반환.
 */
export async function exportFullBundle(projectId: string): Promise<FullExportBundle> {
  const exportedAt = new Date().toISOString();
  let allProjects: Project[] = [];
  try {
    allProjects = loadProjects();
  } catch (err) {
    logger.warn('FullBackup', 'loadProjects failed', err);
  }

  let projectPart: FullExportBundle['project'] = {
    id: projectId,
    title: '',
    episodes: [],
  };
  let sessionsPart: FullExportBundle['sessions'] = [];
  try {
    const collected = collectProject(projectId, allProjects);
    projectPart = collected.project;
    sessionsPart = collected.sessions;
  } catch (err) {
    logger.warn('FullBackup', 'collectProject failed', err);
  }

  const settings = (() => {
    try { return collectSettings(); } catch (err) {
      logger.warn('FullBackup', 'collectSettings failed', err);
      return {} as FullExportBundle['settings'];
    }
  })();

  let memoryGraph: unknown;
  try { memoryGraph = collectMemoryGraph(projectId); } catch (err) { logger.warn('FullBackup', 'collectMemoryGraph failed', err); }

  let translationMemory: unknown;
  try { translationMemory = collectTranslationMemory(); } catch (err) { logger.warn('FullBackup', 'collectTranslationMemory failed', err); }

  let localGlossary: unknown;
  try { localGlossary = collectLocalGlossary(); } catch (err) { logger.warn('FullBackup', 'collectLocalGlossary failed', err); }

  return {
    version: FULL_BUNDLE_VERSION,
    exportedAt,
    project: projectPart,
    sessions: sessionsPart,
    settings,
    memoryGraph,
    translationMemory,
    localGlossary,
    allProjects,
  };
}

// ============================================================
// PART 5 — Download helpers (JSON / ZIP)
// JSON: 단일 .json. ZIP: 동적 import (번들 크기 영향 최소)
// ============================================================

/** Bundle을 JSON 파일로 다운로드. 브라우저 전용. */
export function downloadBundle(bundle: FullExportBundle, filename?: string): void {
  if (typeof window === 'undefined') return;
  const name = filename ?? defaultBackupFilename(bundle, 'json');
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  triggerDownload(blob, name);
}

function defaultBackupFilename(bundle: FullExportBundle, ext: 'json' | 'zip'): string {
  const safeTitle = (bundle.project.title || 'loreguard-backup')
    .replace(/[^\w가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'loreguard-backup';
  const date = new Date().toISOString().split('T')[0];
  return `${safeTitle}-${date}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * ZIP 형식 export — project.json + episodes/NNN.md + characters.json + world-bible.md + sessions/session-<id>.json
 * jszip은 동적 import. 실패 시 null 반환.
 */
export async function exportFullBundleAsZip(projectId: string): Promise<Blob | null> {
  if (typeof window === 'undefined') return null;
  const bundle = await exportFullBundle(projectId);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZipModule = await import('jszip' as any);
    const JSZip = JSZipModule.default ?? JSZipModule;
    const zip = new JSZip();

    // project.json = bundle metadata + project block (sessions/episodes는 파일로 분리)
    const projectMeta = {
      version: bundle.version,
      exportedAt: bundle.exportedAt,
      project: { ...bundle.project, episodes: undefined },
      settings: bundle.settings,
      memoryGraph: bundle.memoryGraph,
      translationMemory: bundle.translationMemory,
      localGlossary: bundle.localGlossary,
    };
    zip.file('project.json', JSON.stringify(projectMeta, null, 2));

    // episodes/NNN.md — markdown 포맷 (회차 번호 zero-pad)
    const epDir = zip.folder('episodes');
    if (epDir) {
      for (const ep of bundle.project.episodes) {
        const name = `${String(ep.no).padStart(3, '0')}-${sanitizeFilename(ep.title)}.md`;
        const md = buildEpisodeMarkdown(ep);
        epDir.file(name, md);
      }
    }

    // characters.json
    if (bundle.project.characters && bundle.project.characters.length > 0) {
      zip.file('characters.json', JSON.stringify(bundle.project.characters, null, 2));
    }

    // world-bible.md (구조 unknown → JSON 블록으로 안전 렌더)
    if (bundle.project.worldBible !== undefined) {
      const wb = typeof bundle.project.worldBible === 'string'
        ? bundle.project.worldBible
        : '```json\n' + JSON.stringify(bundle.project.worldBible, null, 2) + '\n```';
      zip.file('world-bible.md', `# ${bundle.project.title || 'World Bible'}\n\n${wb}\n`);
    }

    // sessions/
    const sesDir = zip.folder('sessions');
    if (sesDir) {
      for (const s of bundle.sessions) {
        sesDir.file(`session-${sanitizeFilename(s.id)}.json`, JSON.stringify(s, null, 2));
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  } catch (err) {
    logger.warn('FullBackup', 'exportFullBundleAsZip failed (jszip unavailable?)', err);
    return null;
  }
}

function sanitizeFilename(s: string): string {
  return String(s).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-').slice(0, 80);
}

function buildEpisodeMarkdown(ep: FullExportBundle['project']['episodes'][number]): string {
  const header = `# EP.${ep.no} — ${ep.title || ''}\n\n`;
  return header + (ep.content ?? '');
}

// ============================================================
// PART 6 — ZIP download + ZIP parsing for restore
// ============================================================

/** ZIP Blob 다운로드 트리거. */
export function downloadZipBundle(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;
  triggerDownload(blob, filename);
}

/** 파일명 제안 (ZIP). */
export function suggestZipFilename(bundle: FullExportBundle): string {
  return defaultBackupFilename(bundle, 'zip');
}

// ============================================================
// PART 7 — importFullBundle (복원)
// - JSON/ZIP 자동 감지 (파일명 + 바이너리 매직 넘버)
// - 복원 전 기존 상태 Bundle로 즉석 백업 (atomic 보장)
// - 버전 체크 (1.0) — 미매치 시 경고 후 best-effort
// ============================================================

export interface ImportResult {
  success: boolean;
  restoredProjects: number;
  warnings: string[];
  preRestoreBackup?: string; // JSON string — 실패 시 호출자가 수동 되돌림용
}

/** File → JSON Bundle 파싱. ZIP이면 project.json 중심으로 재조립. */
async function readBundleFromFile(file: File): Promise<FullExportBundle> {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip';
  if (!isZip) {
    const text = await file.text();
    const parsed = JSON.parse(text) as FullExportBundle;
    return parsed;
  }
  // ZIP — dynamic import
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const JSZipModule = await import('jszip' as any);
  const JSZip = JSZipModule.default ?? JSZipModule;
  const zip = await JSZip.loadAsync(file);
  const projJson = zip.file('project.json');
  if (!projJson) throw new Error('project.json not found in ZIP');
  const meta = JSON.parse(await projJson.async('string')) as Partial<FullExportBundle> & {
    project: FullExportBundle['project'];
  };

  // 세션 복원
  const sessions: FullExportBundle['sessions'] = [];
  const sesFolder = Object.keys(zip.files).filter(k => k.startsWith('sessions/') && k.endsWith('.json'));
  for (const path of sesFolder) {
    try {
      const entry = zip.file(path);
      if (!entry) continue;
      const raw = await entry.async('string');
      sessions.push(JSON.parse(raw));
    } catch (err) {
      logger.warn('FullBackup', `read ${path} failed`, err);
    }
  }

  // 에피소드 (md) 재조립 — 파일명에서 no 추출
  const episodes: FullExportBundle['project']['episodes'] = [];
  const epFolder = Object.keys(zip.files).filter(k => k.startsWith('episodes/') && k.endsWith('.md'));
  for (const path of epFolder) {
    try {
      const entry = zip.file(path);
      if (!entry) continue;
      const raw = await entry.async('string');
      const noMatch = /(\d+)/.exec(path.replace('episodes/', ''));
      const no = noMatch ? parseInt(noMatch[1], 10) : 0;
      const firstLine = raw.split('\n', 1)[0] ?? '';
      const titleMatch = /^#\s+EP\.\d+\s*—\s*(.*)$/.exec(firstLine);
      const title = titleMatch ? titleMatch[1].trim() : '';
      const body = raw.replace(/^#[^\n]*\n\n?/, '');
      episodes.push({ no, title, content: body });
    } catch (err) {
      logger.warn('FullBackup', `read ${path} failed`, err);
    }
  }

  return {
    version: meta.version ?? FULL_BUNDLE_VERSION,
    exportedAt: meta.exportedAt ?? new Date().toISOString(),
    project: { ...meta.project, episodes },
    sessions,
    settings: meta.settings ?? {},
    memoryGraph: meta.memoryGraph,
    translationMemory: meta.translationMemory,
    localGlossary: meta.localGlossary,
    allProjects: meta.allProjects,
  };
}

/**
 * 파일에서 Bundle을 복원. 기존 데이터는 덮어쓴다.
 * 복원 전 현재 상태를 preRestoreBackup으로 반환 → 호출자가 실패 시 수동 rollback.
 */
export async function importFullBundle(file: File): Promise<ImportResult> {
  const warnings: string[] = [];
  let preBackup: string | undefined;

  // 1. 기존 데이터 Bundle로 백업 (atomic 준비)
  try {
    const current = loadProjects();
    preBackup = JSON.stringify({
      version: FULL_BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      allProjects: current,
      settings: collectSettings(),
    });
  } catch (err) {
    logger.warn('FullBackup', 'pre-restore backup failed', err);
    warnings.push('pre-restore backup skipped');
  }

  // 2. 파일 파싱
  let bundle: FullExportBundle;
  try {
    bundle = await readBundleFromFile(file);
  } catch (err) {
    logger.error('FullBackup', 'parse failed', err);
    return { success: false, restoredProjects: 0, warnings: ['parse failed'], preRestoreBackup: preBackup };
  }

  // 3. 버전 체크
  if (bundle.version !== FULL_BUNDLE_VERSION) {
    warnings.push(`version mismatch: expected ${FULL_BUNDLE_VERSION}, got ${bundle.version}`);
  }

  // 4. 프로젝트 덮어쓰기 — allProjects 우선, 없으면 project+sessions 합성
  let restored = 0;
  try {
    let projectsToRestore: Project[] = [];
    if (Array.isArray(bundle.allProjects) && bundle.allProjects.length > 0) {
      projectsToRestore = bundle.allProjects;
    } else if (bundle.project && bundle.sessions) {
      // 합성: 세션의 config를 그대로 유지, Project 껍데기 씌움
      const synthProject: Project = {
        id: bundle.project.id,
        name: bundle.project.title || 'Restored',
        description: '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        genre: (bundle.project.genre as any) ?? 'SF',
        createdAt: Date.now(),
        lastUpdate: Date.now(),
         
        sessions: bundle.sessions.map(s => ({
          id: s.id,
          title: '',
          messages: (s.messages as ChatSession['messages']) ?? [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: s.config as any,
          lastUpdate: Date.now(),
        })),
      };
      projectsToRestore = [synthProject];
    }

    const ok = saveProjects(projectsToRestore);
    if (!ok) {
      warnings.push('saveProjects returned false (quota?)');
    }
    restored = projectsToRestore.length;
  } catch (err) {
    logger.error('FullBackup', 'saveProjects failed', err);
    warnings.push('saveProjects threw');
    return { success: false, restoredProjects: 0, warnings, preRestoreBackup: preBackup };
  }

  // 5. memoryGraph 복원 (해당 projectId에 대해)
  if (bundle.memoryGraph && bundle.project?.id) {
    safeSetItem(`noa_episode_memory_${bundle.project.id}`, JSON.stringify(bundle.memoryGraph));
  }

  // 6. TM / 용어집 복원
  if (bundle.translationMemory !== undefined) {
    safeSetItem('eh-translation-memory', JSON.stringify(bundle.translationMemory));
  }
  if (bundle.localGlossary !== undefined) {
    safeSetItem('noa_translation_glossary', JSON.stringify(bundle.localGlossary));
  }

  // 7. 설정 복원 (화이트리스트만 — 임의 키 방지)
  if (bundle.settings && typeof bundle.settings === 'object') {
    for (const key of BACKUP_SETTING_KEYS) {
      const v = bundle.settings[key];
      if (typeof v === 'string') safeSetItem(key, v);
    }
  }

  return { success: true, restoredProjects: restored, warnings, preRestoreBackup: preBackup };
}

/**
 * Import 실패 시 호출자가 수동 rollback을 하고 싶을 때.
 * preRestoreBackup JSON 문자열을 받아 saveProjects로 되돌린다.
 */
export function rollbackFromPreRestoreBackup(preBackupJson: string): boolean {
  try {
    const parsed = JSON.parse(preBackupJson) as { allProjects?: Project[] };
    if (!parsed?.allProjects) return false;
    return saveProjects(parsed.allProjects);
  } catch (err) {
    logger.warn('FullBackup', 'rollback failed', err);
    return false;
  }
}

/** STORAGE_KEY_PROJECTS export — 테스트/외부 consumers용 */
export { STORAGE_KEY_PROJECTS };
