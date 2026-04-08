// ============================================================
// PART 1 — Studio Translations (4-language dictionary)
// ============================================================
// Central translation dictionary consumed by:
//   - i18n.ts (createT)
//   - CodeStudioShell.tsx (runtime strings)
//   - WelcomeScreen.tsx / page.tsx (loading/CTA labels)
//
// Leaf count MUST be identical across all languages (project rule).
// Fallback chain: JP/CN → EN → KO

import type { AppLanguage } from '@eh/shared-types';
import KO from '../locales/ko.json';

// ============================================================
// PART 2 — Code Studio UI Strings
// ============================================================

export interface CodeStudioStrings {
  title: string;
  subtitle: string;
  loading: string;
  openDemo: string;
  openDemoDesc: string;
  resumeProject: string;
  resumeProjectDesc: string;
  newFile: string;
  newFileDesc: string;
  blankProject: string;
  importFiles: string;
  savedLocally: string;
  demoLoaded: string;
  fileCreated: string;
  fileDeleted: string;
  blankCreated: string;
  verificationFailed: string;
  selectFile: string;
  explorerClosedTitle: string;
  explorerClosedDesc: string;
  greetingTitle: string;
  greetingDesc: string;
  quickVerifyTitle: string;
  quickVerifyDesc: string;
  openLocalFolder: string;
  openLocalFolderDesc: string;
  lessOptions: string;
  moreOptions: string;
  commandPalette: string;
  terminal: string;
}

// ============================================================
// PART 3 — Sidebar / Engine Common Strings
// ============================================================

export interface SidebarStrings {
  newProject: string;
  openProject: string;
  settings: string;
}

export interface EngineStrings {
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
}

export interface SearchPanelStrings {
  title: string;
  close: string;
  searchPlaceholder: string;
  history: string;
  toggleReplace: string;
  replaceWith: string;
  replaceAll: string;
  caseSensitive: string;
  useRegex: string;
  fileTypeFilter: string;
  allFiles: string;
  typeMore: string;
  noResults: string;
  replace: string;
}

export interface PipelinePanelStrings {
  pass: string;
  warn: string;
  fail: string;
  noResults: string;
  runTitle: string;
  lastRun: string;
  running: string;
  abort: string;
  runningTitle: string;
  resultsTitle: string;
  rerun: string;
  copyReport: string;
  downloadReport: string;
  findingsCount: string;
  teamSimulation: string;
  teamGeneration: string;
  teamValidation: string;
  teamSizeDensity: string;
  teamAssetTrace: string;
  teamStability: string;
  teamReleaseIp: string;
  teamGovernance: string;
}

export interface ProjectSpecFormStrings {
  title: string;
  step1Title: string;
  step1Desc: string;
  step1Placeholder: string;
  reviewTitle: string;
  autoFillLabel: string;
  btnPrev: string;
  btnNext: string;
  btnConfirm: string;
  btnCreate: string;
  otherOption: string;
  categories: {
    webApp: string;
    api: string;
    mobile: string;
    library: string;
    cli: string;
    other: string;
  };
  questions: {
    q1: string;
    q1Group: string;
    q1Placeholder: string;
    q2: string;
    q2Group: string;
    q3: string;
    q3Group: string;
    q3Placeholder: string;
    q4: string;
    q4Group: string;
    q5: string;
    q5Group: string;
    q6: string;
    q6Group: string;
  };
  opts: {
    q5Opt1: string;
    q5Opt2: string;
    q5Opt3: string;
    q5Opt4: string;
    q5Opt5: string;
    q6Opt1: string;
    q6Opt2: string;
    q6Opt3: string;
    q6Opt4: string;
    q6Opt5: string;
  };
}

export interface TerminalPanelStrings {
  terminal: string;
  copyOutput: string;
  runAgain: string;
  booting: string;
  commandInput: string;
  analysisComplete: string;
  stderrLogs: string;
  copiedToClipboard: string;
  simulatedMode: string;
  actualCommands: string;
  simulatedFallback: string;
  fallbackToBuiltin: string;
  aiAnalysisInProgress: string;
  suggestion: string;
  bootFailed: string;
  scrollLock: string;
  autoScrollOn: string;
  clickToFix: string;
}

// ============================================================
// PART 4 — Translation Record Shape
// ============================================================

export interface TranslationRecord {
  codeStudio: CodeStudioStrings;
  sidebar: SidebarStrings;
  engine: EngineStrings;
  searchPanel: SearchPanelStrings;
  pipelinePanel: PipelinePanelStrings;
  terminalPanel: TerminalPanelStrings;
  projectSpecForm: ProjectSpecFormStrings;
}

type TranslationDictionary = Partial<Record<AppLanguage, TranslationRecord>>;

// ============================================================
// PART 5 — Export & Dynamic Loading
// ============================================================

export const TRANSLATIONS: TranslationDictionary = { 
  KO: KO as unknown as TranslationRecord 
};

export async function loadTranslation(lang: AppLanguage | string): Promise<void> {
  const l = typeof lang === 'string' ? lang.toUpperCase() : lang;
  
  if (l === 'KO' || TRANSLATIONS[l as AppLanguage]) return;

  try {
    if (l === 'EN') {
      const dict = await import('../locales/en.json');
      TRANSLATIONS.EN = (dict.default || dict) as unknown as TranslationRecord;
    } else if (l === 'JP' || l === 'JA') {
      const dict = await import('../locales/ja.json');
      TRANSLATIONS.JP = (dict.default || dict) as unknown as TranslationRecord;
    } else if (l === 'CN' || l === 'ZH') {
      const dict = await import('../locales/zh.json');
      TRANSLATIONS.CN = (dict.default || dict) as unknown as TranslationRecord;
    }
  } catch (err) {
    console.error(`Failed to load translation for ${lang}:`, err);
  }
}

// IDENTITY_SEAL: PART-5 | role=export | inputs=KO,EN,JP,CN | outputs=TRANSLATIONS
