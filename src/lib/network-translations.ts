// ============================================================
// Network i18n — 네트워크 컴포넌트 다국어 라벨 (KO/EN/JA/ZH)
// ============================================================

interface L4 { ko: string; en: string; ja?: string; zh?: string }

function t(pair: L4, lang: string): string {
  const l = lang.toLowerCase();
  if (l === 'ko') return pair.ko;
  if (l === 'ja') return pair.ja || pair.ko;
  if (l === 'zh') return pair.zh || pair.ko;
  return pair.en;
}

export const NET_LABELS = {
  // Common
  signInRequired: { ko: '로그인이 필요합니다', en: 'Sign in required', ja: 'ログインが必要です', zh: '需要登录' },
  loading: { ko: '불러오는 중...', en: 'Loading...', ja: '読み込み中...', zh: '加载中...' },
  save: { ko: '저장', en: 'Save', ja: '保存', zh: '保存' },
  cancel: { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' },
  delete: { ko: '삭제', en: 'Delete', ja: '削除', zh: '删除' },
  edit: { ko: '수정', en: 'Edit', ja: '編集', zh: '编辑' },
  submit: { ko: '제출', en: 'Submit', ja: '送信', zh: '提交' },
  back: { ko: '← 뒤로', en: '← Back', ja: '← 戻る', zh: '← 返回' },
  close: { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' },

  // Network Home
  registerPlanet: { ko: '행성 등록하기', en: 'Register Planet', ja: '惑星を登録', zh: '注册行星' },
  latestLogs: { ko: '최신 로그 보기', en: 'View Latest Logs', ja: '最新ログを見る', zh: '查看最新日志' },
  latestPlanets: { ko: '최근 갱신된 행성', en: 'Recently Updated Planets', ja: '最近更新された惑星', zh: '最近更新的行星' },
  latestPosts: { ko: '최신 관측 로그', en: 'Latest Observation Logs', ja: '最新の観測ログ', zh: '最新观测日志' },
  latestSettlements: { ko: '최근 정산 결과', en: 'Recent Settlements', ja: '最近の決算結果', zh: '最近结算结果' },
  viewAll: { ko: '전체 보기', en: 'View All', ja: 'すべて表示', zh: '查看全部' },
  noPlanets: { ko: '등록된 행성이 없습니다', en: 'No planets registered', ja: '登録された惑星はありません', zh: '没有注册的行星' },
  noPosts: { ko: '관측 로그가 아직 없습니다', en: 'No observation logs yet', ja: '観測ログはまだありません', zh: '暂无观测日志' },
  registerFirst: { ko: '실제 행성을 등록해보세요', en: 'Register a planet', ja: '惑星を登録してみましょう', zh: '注册一个行星吧' },

  // Planet Detail
  planetNotFound: { ko: '행성을 찾을 수 없습니다', en: 'Planet not found', ja: '惑星が見つかりません', zh: '未找到行星' },
  overview: { ko: '개요', en: 'Overview', ja: '概要', zh: '概览' },
  logs: { ko: '관측 로그', en: 'Observation Logs', ja: '観測ログ', zh: '观测日志' },
  settlements: { ko: '정산', en: 'Settlements', ja: '決算', zh: '结算' },
  members: { ko: '구성원', en: 'Members', ja: 'メンバー', zh: '成员' },
  tags: { ko: '태그', en: 'Tags', ja: 'タグ', zh: '标签' },
  status: { ko: '상태', en: 'Status', ja: 'ステータス', zh: '状态' },

  // Post/Log
  writeLog: { ko: '로그 작성', en: 'Write Log', ja: 'ログ作成', zh: '写日志' },
  writePost: { ko: '글쓰기', en: 'Write Post', ja: '投稿する', zh: '发帖' },
  title: { ko: '제목', en: 'Title', ja: 'タイトル', zh: '标题' },
  content: { ko: '내용', en: 'Content', ja: '内容', zh: '内容' },
  author: { ko: '작성자', en: 'Author', ja: '作者', zh: '作者' },

  // Comments
  writeComment: { ko: '댓글 작성', en: 'Write Comment', ja: 'コメントを書く', zh: '写评论' },
  noComments: { ko: '댓글이 없습니다', en: 'No comments yet', ja: 'コメントはまだありません', zh: '暂无评论' },
  reply: { ko: '답글', en: 'Reply', ja: '返信', zh: '回复' },
  report: { ko: '신고', en: 'Report', ja: '報告', zh: '举报' },

  // Settlement
  settlementTitle: { ko: '정산 결과', en: 'Settlement Result', ja: '決算結果', zh: '结算结果' },
  riskLevel: { ko: '위험도', en: 'Risk Level', ja: 'リスクレベル', zh: '风险等级' },
  verdict: { ko: '판정', en: 'Verdict', ja: '判定', zh: '判定' },

  // Wizard
  planetName: { ko: '행성 이름', en: 'Planet Name', ja: '惑星名', zh: '行星名称' },
  planetDesc: { ko: '행성 설명', en: 'Planet Description', ja: '惑星の説明', zh: '行星描述' },
  genre: { ko: '장르', en: 'Genre', ja: 'ジャンル', zh: '类型' },
  createPlanet: { ko: '행성 생성', en: 'Create Planet', ja: '惑星を作成', zh: '创建行星' },

  // Board categories
  all: { ko: '전체', en: 'All', ja: 'すべて', zh: '全部' },
  planetRegistry: { ko: '행성 등록소', en: 'Planet Registry', ja: '惑星登録所', zh: '行星注册处' },
  observationLog: { ko: '관측 로그', en: 'Observation Logs', ja: '観測ログ', zh: '观测日志' },
  settlementResult: { ko: '정산 결과', en: 'Settlement Results', ja: '決算結果', zh: '结算结果' },
  ifZone: { ko: 'IF 구역', en: 'IF Zone', ja: 'IF区域', zh: 'IF区域' },
  feedback: { ko: '피드백 / 협업', en: 'Feedback / Collab', ja: 'フィードバック / 協業', zh: '反馈 / 协作' },

  // Time relative
  justNow: { ko: '방금', en: 'Just now', ja: 'たった今', zh: '刚刚' },
  minutesAgo: { ko: '분 전', en: 'm ago', ja: '分前', zh: '分钟前' },
  hoursAgo: { ko: '시간 전', en: 'h ago', ja: '時間前', zh: '小时前' },
  daysAgo: { ko: '일 전', en: 'd ago', ja: '日前', zh: '天前' },
} as const;

export type NetLabelKey = keyof typeof NET_LABELS;

export function netT(key: NetLabelKey, lang: string): string {
  const pair = NET_LABELS[key];
  return t(pair, lang);
}

// IDENTITY_SEAL: network-translations | role=네트워크 다국어 라벨 KO/EN/JA/ZH | inputs=key,lang | outputs=localized string
