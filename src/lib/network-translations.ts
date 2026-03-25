// ============================================================
// Network i18n — 네트워크 컴포넌트 다국어 라벨
// 기존 L2 패턴(ko/en pair)과 호환되는 구조
// ============================================================

type Lang = 'ko' | 'en';

interface L2 { ko: string; en: string }

function t(pair: L2, lang: Lang): string {
  return lang === 'ko' ? pair.ko : pair.en;
}

export const NET_LABELS = {
  // Common
  signInRequired: { ko: '로그인이 필요합니다', en: 'Sign in required' },
  loading: { ko: '불러오는 중...', en: 'Loading...' },
  save: { ko: '저장', en: 'Save' },
  cancel: { ko: '취소', en: 'Cancel' },
  delete: { ko: '삭제', en: 'Delete' },
  edit: { ko: '수정', en: 'Edit' },
  submit: { ko: '제출', en: 'Submit' },
  back: { ko: '← 뒤로', en: '← Back' },
  close: { ko: '닫기', en: 'Close' },

  // Network Home
  registerPlanet: { ko: '행성 등록하기', en: 'Register Planet' },
  latestLogs: { ko: '최신 로그 보기', en: 'View Latest Logs' },
  latestPlanets: { ko: '최근 갱신된 행성', en: 'Recently Updated Planets' },
  latestPosts: { ko: '최신 관측 로그', en: 'Latest Observation Logs' },
  latestSettlements: { ko: '최근 정산 결과', en: 'Recent Settlements' },
  viewAll: { ko: '전체 보기', en: 'View All' },
  noPlanets: { ko: '등록된 행성이 없습니다', en: 'No planets registered' },
  noPosts: { ko: '관측 로그가 아직 없습니다', en: 'No observation logs yet' },
  registerFirst: { ko: '실제 행성을 등록해보세요', en: 'Register a planet' },

  // Planet Detail
  planetNotFound: { ko: '행성을 찾을 수 없습니다', en: 'Planet not found' },
  overview: { ko: '개요', en: 'Overview' },
  logs: { ko: '관측 로그', en: 'Observation Logs' },
  settlements: { ko: '정산', en: 'Settlements' },
  members: { ko: '구성원', en: 'Members' },
  tags: { ko: '태그', en: 'Tags' },
  status: { ko: '상태', en: 'Status' },

  // Post/Log
  writeLog: { ko: '로그 작성', en: 'Write Log' },
  writePost: { ko: '글쓰기', en: 'Write Post' },
  title: { ko: '제목', en: 'Title' },
  content: { ko: '내용', en: 'Content' },
  author: { ko: '작성자', en: 'Author' },

  // Comments
  writeComment: { ko: '댓글 작성', en: 'Write Comment' },
  noComments: { ko: '댓글이 없습니다', en: 'No comments yet' },
  reply: { ko: '답글', en: 'Reply' },
  report: { ko: '신고', en: 'Report' },

  // Settlement
  settlementTitle: { ko: '정산 결과', en: 'Settlement Result' },
  riskLevel: { ko: '위험도', en: 'Risk Level' },
  verdict: { ko: '판정', en: 'Verdict' },

  // Wizard
  planetName: { ko: '행성 이름', en: 'Planet Name' },
  planetDesc: { ko: '행성 설명', en: 'Planet Description' },
  genre: { ko: '장르', en: 'Genre' },
  createPlanet: { ko: '행성 생성', en: 'Create Planet' },

  // Board categories
  all: { ko: '전체', en: 'All' },
  planetRegistry: { ko: '행성 등록소', en: 'Planet Registry' },
  observationLog: { ko: '관측 로그', en: 'Observation Logs' },
  settlementResult: { ko: '정산 결과', en: 'Settlement Results' },
  ifZone: { ko: 'IF 구역', en: 'IF Zone' },
  feedback: { ko: '피드백 / 협업', en: 'Feedback / Collab' },
} as const;

export type NetLabelKey = keyof typeof NET_LABELS;

export function netT(key: NetLabelKey, lang: string): string {
  const pair = NET_LABELS[key];
  return t(pair, lang === 'ko' || lang === 'KO' ? 'ko' : 'en');
}
