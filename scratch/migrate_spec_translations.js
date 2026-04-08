const fs = require('fs');
const path = require('path');

const transPath = path.join(process.cwd(), 'apps/desktop/renderer/lib/studio-translations.ts');
let transContent = fs.readFileSync(transPath, 'utf8');

const interfaceInsertion = `
interface ProjectSpecFormStrings {
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

interface TerminalPanelStrings {`;

transContent = transContent.replace('interface TerminalPanelStrings {', interfaceInsertion);

// In type TranslationRecord: add projectSpecForm
transContent = transContent.replace(
  '  terminalPanel: TerminalPanelStrings;',
  '  terminalPanel: TerminalPanelStrings;\n  projectSpecForm: ProjectSpecFormStrings;'
);

const koStrings = `  projectSpecForm: {
    title: '프로젝트 명세서',
    step1Title: '어떤 프로젝트를 만드시겠어요?',
    step1Desc: '프롬프트를 입력하면 카테고리가 자동 선택됩니다',
    step1Placeholder: '예: 수제 케이크 쇼핑몰 만들어줘',
    reviewTitle: '명세서 확인',
    autoFillLabel: 'AI 자동 완성',
    btnPrev: '이전',
    btnNext: '다음',
    btnConfirm: '확인',
    btnCreate: '프로젝트 생성',
    otherOption: '기타',
    categories: {
      webApp: '웹 앱', api: 'API 서버', mobile: '모바일', library: '라이브러리', cli: 'CLI 도구', other: '기타'
    },
    questions: {
      q1: '프로젝트의 주요 기능은 무엇인가요?', q1Group: '기능', q1Placeholder: '핵심 기능을 설명해주세요',
      q2: '기술 스택을 선택하세요', q2Group: '기술',
      q3: '대상 사용자는 누구인가요?', q3Group: '기획', q3Placeholder: '예: 개발자, 일반 사용자, 기업',
      q4: '배포 환경은?', q4Group: '인프라',
      q5: '디자인 스타일을 선택하세요', q5Group: '디자인',
      q6: '테마를 선택하세요', q6Group: '디자인',
    },
    opts: {
      q5Opt1: 'IDE / 코딩 앱', q5Opt2: '랜딩페이지 / 마케팅', q5Opt3: '대시보드 / 어드민', q5Opt4: '이커머스 / 쇼핑몰', q5Opt5: 'SaaS / 웹 서비스',
      q6Opt1: '다크 (Archive)', q6Opt2: '다크 (Night)', q6Opt3: '라이트', q6Opt4: '라이트 (Bright)', q6Opt5: '베이지 (Warm)'
    }
  },
};`;

const enStrings = `  projectSpecForm: {
    title: 'Project Specification',
    step1Title: 'What kind of project do you want to build?',
    step1Desc: 'Enter a prompt and the category will be selected automatically',
    step1Placeholder: 'Ex: Make a handmade cake shopping mall',
    reviewTitle: 'Review Specification',
    autoFillLabel: 'AI Auto Fill',
    btnPrev: 'Previous',
    btnNext: 'Next',
    btnConfirm: 'Confirm',
    btnCreate: 'Create Project',
    otherOption: 'Other',
    categories: {
      webApp: 'Web App', api: 'API Server', mobile: 'Mobile', library: 'Library', cli: 'CLI Tool', other: 'Other'
    },
    questions: {
      q1: 'What are the main features of the project?', q1Group: 'Features', q1Placeholder: 'Please describe the core features',
      q2: 'Select tech stack', q2Group: 'Technology',
      q3: 'Who is the target audience?', q3Group: 'Planning', q3Placeholder: 'Ex: Developers, General Users, Enterprises',
      q4: 'Deployment environment?', q4Group: 'Infrastructure',
      q5: 'Select design style', q5Group: 'Design',
      q6: 'Select theme', q6Group: 'Design',
    },
    opts: {
      q5Opt1: 'IDE / Coding App', q5Opt2: 'Landing Page / Marketing', q5Opt3: 'Dashboard / Admin', q5Opt4: 'E-commerce / Shopping', q5Opt5: 'SaaS / Web Service',
      q6Opt1: 'Dark (Archive)', q6Opt2: 'Dark (Night)', q6Opt3: 'Light', q6Opt4: 'Light (Bright)', q6Opt5: 'Beige (Warm)'
    }
  },
};`;

const jpStrings = `  projectSpecForm: {
    title: 'プロジェクト仕様',
    step1Title: 'どのようなプロジェクトを作成しますか？',
    step1Desc: 'プロンプトを入力すると、カテゴリが自動的に選択されます',
    step1Placeholder: '例: 手作りケーキのショッピングモールを作って',
    reviewTitle: '仕様の確認',
    autoFillLabel: 'AI 自動生成',
    btnPrev: '前へ',
    btnNext: '次へ',
    btnConfirm: '確認',
    btnCreate: 'プロジェクト作成',
    otherOption: 'その他',
    categories: {
      webApp: 'ウェブアプリ', api: 'APIサーバー', mobile: 'モバイル', library: 'ライブラリ', cli: 'CLIツール', other: 'その他'
    },
    questions: {
      q1: 'プロジェクトの主な機能は何ですか？', q1Group: '機能', q1Placeholder: 'コア機能について説明してください',
      q2: '技術スタックを選択してください', q2Group: '技術',
      q3: 'ターゲット層は誰ですか？', q3Group: '企画', q3Placeholder: '例: 開発者、一般ユーザー、企業',
      q4: '展開環境は？', q4Group: 'インフラ',
      q5: 'デザインのスタイルを選択してください', q5Group: 'デザイン',
      q6: 'テーマを選択してください', q6Group: 'デザイン',
    },
    opts: {
      q5Opt1: 'IDE / コーディング', q5Opt2: 'LP / マーケティング', q5Opt3: 'ダッシュボード / 管理画面', q5Opt4: 'EC / ショッピング', q5Opt5: 'SaaS / ウェブサービス',
      q6Opt1: 'ダーク (Archive)', q6Opt2: 'ダーク (Night)', q6Opt3: 'ライト', q6Opt4: 'ライト (Bright)', q6Opt5: 'ベージュ (Warm)'
    }
  },
};`;

const cnStrings = `  projectSpecForm: {
    title: '项目规格',
    step1Title: '您想要创建什么样的项目？',
    step1Desc: '输入提示后将自动选择类别',
    step1Placeholder: '例：帮我建一个手工蛋糕购物网站',
    reviewTitle: '确认规格',
    autoFillLabel: 'AI 自动填充',
    btnPrev: '上一步',
    btnNext: '下一步',
    btnConfirm: '确认',
    btnCreate: '创建项目',
    otherOption: '其他',
    categories: {
      webApp: 'Web 应用', api: 'API 服务', mobile: '移动端', library: '库', cli: 'CLI 工具', other: '其他'
    },
    questions: {
      q1: '项目的主要功能是什么？', q1Group: '功能', q1Placeholder: '请描述核心功能',
      q2: '请选择技术栈', q2Group: '技术',
      q3: '目标用户群体是？', q3Group: '策划', q3Placeholder: '例：开发者、普通用户、企业',
      q4: '部署环境是？', q4Group: '基础设施',
      q5: '请选择设计风格', q5Group: '设计',
      q6: '请选择主题', q6Group: '设计',
    },
    opts: {
      q5Opt1: 'IDE / 代码应用', q5Opt2: '落地页 / 营销', q5Opt3: '仪表盘 / 后台', q5Opt4: '电商 / 购物', q5Opt5: 'SaaS / Web 服务',
      q6Opt1: '暗色 (Archive)', q6Opt2: '暗色 (Night)', q6Opt3: '亮色', q6Opt4: '亮色 (Bright)', q6Opt5: '米色 (Warm)'
    }
  },
};`;

// Substitute the last bracket for each language block
transContent = transContent.replace(/};\s*$/, ''); // this might match the last one, wait I need to be more precise
// There are 4 occurrences of "};" at the end of each language block.
let matches = 0;
transContent = transContent.replace(/^  \},$\n^\};/gm, (match) => {
  matches++;
  if (matches === 1) return koStrings;
  if (matches === 2) return enStrings;
  if (matches === 3) return jpStrings;
  if (matches === 4) return cnStrings;
  return match;
});

fs.writeFileSync(transPath, transContent);
console.log('Translations inserted');
