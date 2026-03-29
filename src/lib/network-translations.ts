// ============================================================
// Network i18n — 네트워크 컴포넌트 다국어 라벨 (KO/EN/JP/CN)
// ============================================================

interface L4 { ko: string; en: string; jp?: string; cn?: string }

function t(pair: L4, lang: string): string {
  const l = lang.toLowerCase();
  if (l === 'ko') return pair.ko;
  if (l === 'jp' || l === 'ja') return pair.jp || pair.ko;
  if (l === 'cn' || l === 'zh') return pair.cn || pair.ko;
  return pair.en;
}

export const NET_LABELS = {
  // Common
  signInRequired: { ko: '로그인이 필요합니다', en: 'Sign in required', jp: 'ログインが必要です', cn: '需要登录' },
  loading: { ko: '불러오는 중...', en: 'Loading...', jp: '読み込み中...', cn: '加载中...' },
  save: { ko: '저장', en: 'Save', jp: '保存', cn: '保存' },
  cancel: { ko: '취소', en: 'Cancel', jp: 'キャンセル', cn: '取消' },
  delete: { ko: '삭제', en: 'Delete', jp: '削除', cn: '删除' },
  edit: { ko: '수정', en: 'Edit', jp: '編集', cn: '编辑' },
  submit: { ko: '제출', en: 'Submit', jp: '送信', cn: '提交' },
  back: { ko: '← 뒤로', en: '← Back', jp: '← 戻る', cn: '← 返回' },
  close: { ko: '닫기', en: 'Close', jp: '閉じる', cn: '关闭' },

  // Network Home
  registerPlanet: { ko: '행성 등록하기', en: 'Register Planet', jp: '惑星を登録', cn: '注册行星' },
  latestLogs: { ko: '최신 로그 보기', en: 'View Latest Logs', jp: '最新ログを見る', cn: '查看最新日志' },
  latestPlanets: { ko: '최근 갱신된 행성', en: 'Recently Updated Planets', jp: '最近更新された惑星', cn: '最近更新的行星' },
  latestPosts: { ko: '최신 관측 로그', en: 'Latest Observation Logs', jp: '最新の観測ログ', cn: '最新观测日志' },
  latestSettlements: { ko: '최근 정산 결과', en: 'Recent Settlements', jp: '最近の決算結果', cn: '最近结算结果' },
  viewAll: { ko: '전체 보기', en: 'View All', jp: 'すべて表示', cn: '查看全部' },
  noPlanets: { ko: '등록된 행성이 없습니다', en: 'No planets registered', jp: '登録された惑星はありません', cn: '没有注册的行星' },
  noPosts: { ko: '관측 로그가 아직 없습니다', en: 'No observation logs yet', jp: '観測ログはまだありません', cn: '暂无观测日志' },
  registerFirst: { ko: '실제 행성을 등록해보세요', en: 'Register a planet', jp: '惑星を登録してみましょう', cn: '注册一个行星吧' },

  // Planet Detail
  planetNotFound: { ko: '행성을 찾을 수 없습니다', en: 'Planet not found', jp: '惑星が見つかりません', cn: '未找到行星' },
  overview: { ko: '개요', en: 'Overview', jp: '概要', cn: '概览' },
  logs: { ko: '관측 로그', en: 'Observation Logs', jp: '観測ログ', cn: '观测日志' },
  settlements: { ko: '정산', en: 'Settlements', jp: '決算', cn: '结算' },
  members: { ko: '구성원', en: 'Members', jp: 'メンバー', cn: '成员' },
  tags: { ko: '태그', en: 'Tags', jp: 'タグ', cn: '标签' },
  status: { ko: '상태', en: 'Status', jp: 'ステータス', cn: '状态' },

  // Post/Log
  writeLog: { ko: '로그 작성', en: 'Write Log', jp: 'ログ作成', cn: '写日志' },
  writePost: { ko: '글쓰기', en: 'Write Post', jp: '投稿する', cn: '发帖' },
  title: { ko: '제목', en: 'Title', jp: 'タイトル', cn: '标题' },
  content: { ko: '내용', en: 'Content', jp: '内容', cn: '内容' },
  author: { ko: '작성자', en: 'Author', jp: '作者', cn: '作者' },

  // Comments
  writeComment: { ko: '댓글 작성', en: 'Write Comment', jp: 'コメントを書く', cn: '写评论' },
  noComments: { ko: '댓글이 없습니다', en: 'No comments yet', jp: 'コメントはまだありません', cn: '暂无评论' },
  reply: { ko: '답글', en: 'Reply', jp: '返信', cn: '回复' },
  report: { ko: '신고', en: 'Report', jp: '報告', cn: '举报' },

  // Settlement
  settlementTitle: { ko: '정산 결과', en: 'Settlement Result', jp: '決算結果', cn: '结算结果' },
  riskLevel: { ko: '위험도', en: 'Risk Level', jp: 'リスクレベル', cn: '风险等级' },
  verdict: { ko: '판정', en: 'Verdict', jp: '判定', cn: '判定' },

  // Wizard
  planetName: { ko: '행성 이름', en: 'Planet Name', jp: '惑星名', cn: '行星名称' },
  planetDesc: { ko: '행성 설명', en: 'Planet Description', jp: '惑星の説明', cn: '行星描述' },
  genre: { ko: '장르', en: 'Genre', jp: 'ジャンル', cn: '类型' },
  createPlanet: { ko: '행성 생성', en: 'Create Planet', jp: '惑星を作成', cn: '创建行星' },

  // Board categories
  all: { ko: '전체', en: 'All', jp: 'すべて', cn: '全部' },
  planetRegistry: { ko: '행성 등록소', en: 'Planet Registry', jp: '惑星登録所', cn: '行星注册处' },
  observationLog: { ko: '관측 로그', en: 'Observation Logs', jp: '観測ログ', cn: '观测日志' },
  settlementResult: { ko: '정산 결과', en: 'Settlement Results', jp: '決算結果', cn: '结算结果' },
  ifZone: { ko: 'IF 구역', en: 'IF Zone', jp: 'IF区域', cn: 'IF区域' },
  feedback: { ko: '피드백 / 협업', en: 'Feedback / Collab', jp: 'フィードバック / 協業', cn: '反馈 / 协作' },

  // Time relative
  justNow: { ko: '방금', en: 'Just now', jp: 'たった今', cn: '刚刚' },
  minutesAgo: { ko: '분 전', en: 'm ago', jp: '分前', cn: '分钟前' },
  hoursAgo: { ko: '시간 전', en: 'h ago', jp: '時間前', cn: '小时前' },
  daysAgo: { ko: '일 전', en: 'd ago', jp: '日前', cn: '天前' },
} as const;

export type NetLabelKey = keyof typeof NET_LABELS;

export function netT(key: NetLabelKey, lang: string): string {
  const pair = NET_LABELS[key];
  return t(pair, lang);
}

// IDENTITY_SEAL: network-translations | role=네트워크 다국어 라벨 KO/EN/JP/CN | inputs=key,lang | outputs=localized string
