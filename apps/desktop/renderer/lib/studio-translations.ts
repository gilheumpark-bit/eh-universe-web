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

// ============================================================
// PART 2 — Code Studio UI Strings
// ============================================================

interface CodeStudioStrings {
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
}

// ============================================================
// PART 3 — Sidebar / Engine Common Strings
// ============================================================

interface SidebarStrings {
  newProject: string;
  openProject: string;
  settings: string;
}

interface EngineStrings {
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
}

// ============================================================
// PART 4 — Translation Record Shape
// ============================================================

interface TranslationRecord {
  codeStudio: CodeStudioStrings;
  sidebar: SidebarStrings;
  engine: EngineStrings;
}

type TranslationDictionary = Record<AppLanguage, TranslationRecord>;

// ============================================================
// PART 5 — KO (한국어)
// ============================================================

const KO: TranslationRecord = {
  codeStudio: {
    title: 'EH Code Studio',
    subtitle: '에이전트 코딩 엔진',
    loading: '로딩 중...',
    openDemo: '데모 열기',
    openDemoDesc: '데모 프로젝트로 시작하기',
    resumeProject: '마지막 프로젝트 이어서',
    resumeProjectDesc: '이전 작업을 계속합니다',
    newFile: '새 파일',
    newFileDesc: '빈 파일을 만들어 편집을 시작하세요',
    blankProject: '빈 프로젝트',
    importFiles: '파일 가져오기',
    savedLocally: '로컬에 저장됨',
    demoLoaded: '데모 로드됨',
    fileCreated: '파일 생성됨',
    fileDeleted: '파일 삭제됨',
    blankCreated: '빈 프로젝트 생성됨',
    verificationFailed: '검증 실패',
    selectFile: '파일을 선택하세요',
  },
  sidebar: {
    newProject: '새로운 소설 시작',
    openProject: '프로젝트 열기',
    settings: '설정',
  },
  engine: {
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    delete: '삭제',
  },
};

// ============================================================
// PART 6 — EN (English)
// ============================================================

const EN: TranslationRecord = {
  codeStudio: {
    title: 'EH Code Studio',
    subtitle: 'Agentic coding engine',
    loading: 'Loading...',
    openDemo: 'Open Demo',
    openDemoDesc: 'Start with a demo project',
    resumeProject: 'Resume last project',
    resumeProjectDesc: 'Continue where you left off',
    newFile: 'New file',
    newFileDesc: 'Create an empty file and start editing',
    blankProject: 'Blank project',
    importFiles: 'Import files',
    savedLocally: 'Saved locally',
    demoLoaded: 'Demo loaded',
    fileCreated: 'File created',
    fileDeleted: 'File deleted',
    blankCreated: 'Blank project created',
    verificationFailed: 'Verification failed',
    selectFile: 'Select a file',
  },
  sidebar: {
    newProject: 'Start a new novel',
    openProject: 'Open project',
    settings: 'Settings',
  },
  engine: {
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
  },
};

// ============================================================
// PART 7 — JP (日本語)
// ============================================================

const JP: TranslationRecord = {
  codeStudio: {
    title: 'EH Code Studio',
    subtitle: 'エージェントコーディングエンジン',
    loading: '読み込み中...',
    openDemo: 'デモを開く',
    openDemoDesc: 'デモプロジェクトで開始',
    resumeProject: '前回のプロジェクトを再開',
    resumeProjectDesc: '前回の作業を続けます',
    newFile: '新しいファイル',
    newFileDesc: '空のファイルを作成して編集を開始',
    blankProject: '空のプロジェクト',
    importFiles: 'ファイルをインポート',
    savedLocally: 'ローカルに保存済み',
    demoLoaded: 'デモが読み込まれました',
    fileCreated: 'ファイルが作成されました',
    fileDeleted: 'ファイルが削除されました',
    blankCreated: '空のプロジェクトが作成されました',
    verificationFailed: '検証失敗',
    selectFile: 'ファイルを選択してください',
  },
  sidebar: {
    newProject: '新しい小説を始める',
    openProject: 'プロジェクトを開く',
    settings: '設定',
  },
  engine: {
    cancel: 'キャンセル',
    confirm: '確認',
    save: '保存',
    delete: '削除',
  },
};

// ============================================================
// PART 8 — CN (中文)
// ============================================================

const CN: TranslationRecord = {
  codeStudio: {
    title: 'EH Code Studio',
    subtitle: '智能编码引擎',
    loading: '加载中...',
    openDemo: '打开演示',
    openDemoDesc: '从演示项目开始',
    resumeProject: '继续上次的项目',
    resumeProjectDesc: '接续上次的工作',
    newFile: '新建文件',
    newFileDesc: '创建空文件并开始编辑',
    blankProject: '空白项目',
    importFiles: '导入文件',
    savedLocally: '已保存到本地',
    demoLoaded: '演示已加载',
    fileCreated: '文件已创建',
    fileDeleted: '文件已删除',
    blankCreated: '空白项目已创建',
    verificationFailed: '验证失败',
    selectFile: '请选择一个文件',
  },
  sidebar: {
    newProject: '开始新小说',
    openProject: '打开项目',
    settings: '设置',
  },
  engine: {
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    delete: '删除',
  },
};

// IDENTITY_SEAL: PART-5..8 | role=language records | inputs=none | outputs=KO,EN,JP,CN

// ============================================================
// PART 9 — Export
// ============================================================

export const TRANSLATIONS: TranslationDictionary = { KO, EN, JP, CN };

// IDENTITY_SEAL: PART-9 | role=export | inputs=KO,EN,JP,CN | outputs=TRANSLATIONS
