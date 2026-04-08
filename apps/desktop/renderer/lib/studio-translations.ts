import type { AppLanguage } from '@eh/shared-types';

type CodeStudioTranslations = {
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
};

export const TRANSLATIONS: Record<AppLanguage, { codeStudio: CodeStudioTranslations }> = {
  KO: {
    codeStudio: {
      title: 'EH Code Studio',
      subtitle: '검증형 에이전틱 코딩 엔진',
      loading: '로딩 중...',
      openDemo: '데모 열기',
      openDemoDesc: '데모 프로젝트로 바로 시작',
      resumeProject: '최근 프로젝트 이어하기',
      resumeProjectDesc: '마지막 작업 지점에서 계속',
      newFile: '새 파일',
      newFileDesc: '빈 파일을 만들고 바로 편집',
      blankProject: '빈 프로젝트',
      importFiles: '파일 가져오기',
    },
  },
  EN: {
    codeStudio: {
      title: 'EH Code Studio',
      subtitle: 'Verified agentic coding engine',
      loading: 'Loading...',
      openDemo: 'Open Demo',
      openDemoDesc: 'Start quickly with a demo project',
      resumeProject: 'Resume last project',
      resumeProjectDesc: 'Continue where you left off',
      newFile: 'New file',
      newFileDesc: 'Create an empty file and start editing',
      blankProject: 'Blank project',
      importFiles: 'Import files',
    },
  },
  JP: {
    codeStudio: {
      title: 'EH Code Studio',
      subtitle: '検証型エージェント開発環境',
      loading: '読み込み中...',
      openDemo: 'デモを開く',
      openDemoDesc: 'デモプロジェクトで開始',
      resumeProject: '前回のプロジェクトを再開',
      resumeProjectDesc: '続きから再開',
      newFile: '新規ファイル',
      newFileDesc: '空のファイルを作成して編集',
      blankProject: '空のプロジェクト',
      importFiles: 'ファイルを取り込む',
    },
  },
  CN: {
    codeStudio: {
      title: 'EH Code Studio',
      subtitle: '可验证的智能编码引擎',
      loading: '加载中...',
      openDemo: '打开演示',
      openDemoDesc: '用演示项目快速开始',
      resumeProject: '继续上次项目',
      resumeProjectDesc: '从上次进度继续',
      newFile: '新建文件',
      newFileDesc: '创建空文件并开始编辑',
      blankProject: '空项目',
      importFiles: '导入文件',
    },
  },
};
