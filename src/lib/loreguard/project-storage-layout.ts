export type ProjectStorageFolderKey =
  | 'root'
  | 'meta'
  | 'world'
  | 'characters'
  | 'items'
  | 'scenario'
  | 'scenes'
  | 'direction'
  | 'manuscripts'
  | 'revisions'
  | 'translations'
  | 'compose'
  | 'receipts'
  | 'workNotes'
  | 'exports'
  | 'assets'
  | 'settings'
  | 'trash';

export interface ProjectStorageLayout {
  projectId: string;
  projectSegment: string;
  root: string;
  folders: Record<ProjectStorageFolderKey, string>;
  files: {
    projectJson: string;
    manifestJson: string;
    worldSetting: string;
    characterIndex: string;
    itemIndex: string;
    scenarioMain: string;
    sceneIndex: string;
    directionMain: string;
    revisionIndex: string;
    translationGlossary: string;
    receiptDecisionLog: string;
    receiptComposeLog: string;
    receiptExportLog: string;
    workNotesIndex: string;
    noaChatSummary: string;
    noaComposeNote: string;
    exportManifest: string;
    settingsJson: string;
  };
};

export type ProjectStoragePathKind =
  | 'episodeManuscript'
  | 'translatedEpisode'
  | 'composePlan'
  | 'receiptLog'
  | 'workNote'
  | 'exportPackage';

export interface ProjectStoragePathInput {
  projectId?: string | null;
  kind: ProjectStoragePathKind;
  episode?: number;
  language?: string;
  composeId?: string;
  receiptName?: string;
  noteName?: string;
  packageId?: string;
  extension?: string;
}

const NO_PROJECT_SEGMENT = 'no-project';
const DEFAULT_EXTENSION = 'md';

export function normalizeProjectStorageSegment(
  value?: string | null,
  fallback = NO_PROJECT_SEGMENT,
): string {
  const raw = value?.trim() || fallback;
  const cleaned = raw
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (cleaned || fallback).slice(0, 120);
}

function normalizeExtension(extension?: string): string {
  const clean = extension?.replace(/[^a-z0-9]+/gi, '').toLowerCase();
  return clean || DEFAULT_EXTENSION;
}

function episodeFileName(episode?: number, extension?: string): string {
  const episodeNo = Number.isFinite(episode) ? Number(episode) : 0;
  return `episode-${String(episodeNo).padStart(3, '0')}.${normalizeExtension(extension)}`;
}

function safeLanguage(language?: string): string {
  return normalizeProjectStorageSegment(language || 'und', 'und').toLowerCase();
}

function safeFileStem(value: string | undefined, fallback: string): string {
  return normalizeProjectStorageSegment(value, fallback);
}

export function buildProjectStorageRoot(projectId?: string | null): string {
  return `projects/${normalizeProjectStorageSegment(projectId)}`;
}

export function buildProjectStorageLayout(projectId?: string | null): ProjectStorageLayout {
  const projectSegment = normalizeProjectStorageSegment(projectId);
  const root = `projects/${projectSegment}`;
  const folders: Record<ProjectStorageFolderKey, string> = {
    root,
    meta: `${root}/meta`,
    world: `${root}/world`,
    characters: `${root}/characters`,
    items: `${root}/items`,
    scenario: `${root}/scenario`,
    scenes: `${root}/scenes`,
    direction: `${root}/direction`,
    manuscripts: `${root}/manuscripts`,
    revisions: `${root}/revisions`,
    translations: `${root}/translations`,
    compose: `${root}/compose`,
    receipts: `${root}/receipts`,
    workNotes: `${root}/work-notes`,
    exports: `${root}/exports`,
    assets: `${root}/assets`,
    settings: `${root}/settings`,
    trash: `${root}/trash`,
  };

  return {
    projectId: projectId?.trim() || '',
    projectSegment,
    root,
    folders,
    files: {
      projectJson: `${root}/project.json`,
      manifestJson: `${root}/manifest.json`,
      worldSetting: `${folders.world}/setting.json`,
      characterIndex: `${folders.characters}/index.json`,
      itemIndex: `${folders.items}/index.json`,
      scenarioMain: `${folders.scenario}/main.json`,
      sceneIndex: `${folders.scenes}/index.json`,
      directionMain: `${folders.direction}/main.json`,
      revisionIndex: `${folders.revisions}/index.json`,
      translationGlossary: `${folders.translations}/glossary.json`,
      receiptDecisionLog: `${folders.receipts}/decisions.jsonl`,
      receiptComposeLog: `${folders.receipts}/compose.jsonl`,
      receiptExportLog: `${folders.receipts}/exports.jsonl`,
      workNotesIndex: `${folders.workNotes}/index.md`,
      noaChatSummary: `${folders.workNotes}/noa-chat-summary.md`,
      noaComposeNote: `${folders.workNotes}/noa-compose.md`,
      exportManifest: `${folders.exports}/manifest.json`,
      settingsJson: `${folders.settings}/project-settings.json`,
    },
  };
}

export function buildProjectStoragePath(input: ProjectStoragePathInput): string {
  const layout = buildProjectStorageLayout(input.projectId);
  if (input.kind === 'episodeManuscript') {
    return `${layout.folders.manuscripts}/${episodeFileName(input.episode, input.extension)}`;
  }
  if (input.kind === 'translatedEpisode') {
    return `${layout.folders.translations}/${safeLanguage(input.language)}/${episodeFileName(
      input.episode,
      input.extension,
    )}`;
  }
  if (input.kind === 'composePlan') {
    return `${layout.folders.compose}/${safeFileStem(input.composeId, 'active')}.json`;
  }
  if (input.kind === 'receiptLog') {
    return `${layout.folders.receipts}/${safeFileStem(input.receiptName, 'decisions')}.jsonl`;
  }
  if (input.kind === 'workNote') {
    return `${layout.folders.workNotes}/${safeFileStem(input.noteName, 'note')}.md`;
  }
  return `${layout.folders.exports}/${safeFileStem(input.packageId, 'package')}.zip`;
}

export function listProjectStorageFolders(projectId?: string | null): string[] {
  const layout = buildProjectStorageLayout(projectId);
  return [
    layout.folders.meta,
    layout.folders.world,
    layout.folders.characters,
    layout.folders.items,
    layout.folders.scenario,
    layout.folders.scenes,
    layout.folders.direction,
    layout.folders.manuscripts,
    layout.folders.revisions,
    layout.folders.translations,
    layout.folders.compose,
    layout.folders.receipts,
    layout.folders.workNotes,
    layout.folders.exports,
    layout.folders.assets,
    layout.folders.settings,
    layout.folders.trash,
  ];
}

export function isInsideProjectStorage(projectId: string | null | undefined, path: string): boolean {
  const root = `${buildProjectStorageRoot(projectId)}/`;
  return path === buildProjectStorageRoot(projectId) || path.startsWith(root);
}
