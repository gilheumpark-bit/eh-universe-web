// ============================================================
// Error Messages — 4-language support
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';
import { StudioErrorCode } from './error-codes';

interface ErrorMessage {
  title: string;
  message: string;
  action?: string;
}

const MESSAGES: Record<StudioErrorCode, Record<AppLanguage, ErrorMessage>> = {
  [StudioErrorCode.KEY_MISSING]: {
    KO: { title: '연결 키 필요', message: '노아 제안을 쓰려면 연결 키를 등록해 주세요.', action: '등록하기' },
    EN: { title: 'Connection Key Required', message: 'Set up a connection key to use Noa features.', action: 'Set Up' },
    JP: { title: '接続キーが必要', message: 'ノア機能を使用するには接続キーを設定してください。', action: '設定する' },
    CN: { title: '需要连接密钥', message: '请设置连接密钥以使用诺亚功能。', action: '设置' },
  },
  [StudioErrorCode.KEY_INVALID]: {
    KO: { title: '연결 키 오류', message: '키가 유효하지 않습니다. 확인 후 다시 입력해 주세요.' },
    EN: { title: 'Invalid Connection Key', message: 'The key is invalid. Please check and re-enter.' },
    JP: { title: '接続キーエラー', message: 'キーが無効です。確認して再入力してください。' },
    CN: { title: '连接密钥无效', message: '密钥无效，请检查后重新输入。' },
  },
  [StudioErrorCode.KEY_EXPIRED]: {
    KO: { title: '연결 키 만료', message: '키가 만료되었습니다. 새 키를 발급받으세요.' },
    EN: { title: 'Connection Key Expired', message: 'Your key has expired. Please generate a new one.' },
    JP: { title: '接続キー期限切れ', message: 'キーの期限が切れました。新しいキーを発行してください。' },
    CN: { title: '连接密钥已过期', message: '密钥已过期，请重新获取。' },
  },
  [StudioErrorCode.MODEL_UNAVAILABLE]: {
    KO: { title: '모델 사용 불가', message: '선택한 모델을 사용할 수 없습니다.' },
    EN: { title: 'Model Unavailable', message: 'The selected model is not available.' },
    JP: { title: 'モデル利用不可', message: '選択されたモデルは利用できません。' },
    CN: { title: '模型不可用', message: '所选模型不可用。' },
  },
  [StudioErrorCode.PROVIDER_ERROR]: {
    KO: { title: '노아 응답 오류', message: '연결한 서비스에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.', action: '다시 시도' },
    EN: { title: 'NOA Service Error', message: 'Provider server error. Please try again shortly.', action: 'Retry' },
    JP: { title: 'NOAサービスエラー', message: 'プロバイダーサーバーにエラーが発生しました。', action: '再試行' },
    CN: { title: 'NOA服务错误', message: '提供商服务器出错，请稍后重试。', action: '重试' },
  },
  [StudioErrorCode.PROVIDER_FALLBACK]: {
    KO: { title: '연결 경로 전환', message: '노아 연결 경로가 자동으로 전환되었습니다.' },
    EN: { title: 'Provider Switched', message: 'NOA provider was automatically switched.' },
    JP: { title: 'プロバイダー切替', message: 'NOAプロバイダーが自動的に切り替えられました。' },
    CN: { title: '提供商已切换', message: 'NOA提供商已自动切换。' },
  },
  [StudioErrorCode.RATE_LIMIT]: {
    KO: { title: '요청 제한', message: '요청이 많습니다. 잠시 뒤 다시 시도해 주세요.', action: '대기' },
    EN: { title: 'Rate Limited', message: 'Too many requests. Please wait a moment.', action: 'Wait' },
    JP: { title: 'レート制限', message: 'リクエストが多すぎます。しばらく待ってください。', action: '待機' },
    CN: { title: '请求限制', message: '请求过多，请稍后再试。', action: '等待' },
  },
  [StudioErrorCode.FREE_TIER_LIMIT]: {
    KO: { title: '무료 사용량 초과', message: '무료 제안 한도에 도달했습니다.' },
    EN: { title: 'Free Tier Limit', message: 'Free suggestion limit reached.' },
    JP: { title: '無料枠超過', message: '無料提案の上限に達しました。' },
    CN: { title: '免费额度已用完', message: '已达到免费建议上限。' },
  },
  [StudioErrorCode.SCHEMA_INVALID]: {
    KO: { title: '스키마 오류', message: '요청 형식이 올바르지 않습니다.' },
    EN: { title: 'Schema Error', message: 'Invalid request format.' },
    JP: { title: 'スキーマエラー', message: 'リクエスト形式が正しくありません。' },
    CN: { title: '格式错误', message: '请求格式不正确。' },
  },
  [StudioErrorCode.PARSE_FAILED]: {
    KO: { title: '응답 처리 실패', message: '노아 응답을 읽어내지 못했습니다.' },
    EN: { title: 'Parse Failed', message: 'Could not parse the Noa response.' },
    JP: { title: '解析失敗', message: 'ノアの応答を解析できませんでした。' },
    CN: { title: '解析失败', message: '无法解析诺亚响应。' },
  },
  [StudioErrorCode.NETWORK_OFFLINE]: {
    KO: { title: '연결 오류', message: '인터넷 연결을 확인해 주세요.', action: '다시 시도' },
    EN: { title: 'Connection Error', message: 'Check your internet connection.', action: 'Retry' },
    JP: { title: '接続エラー', message: 'インターネット接続を確認してください。', action: '再試行' },
    CN: { title: '连接错误', message: '请检查网络连接。', action: '重试' },
  },
  [StudioErrorCode.NETWORK_TIMEOUT]: {
    KO: { title: '시간 초과', message: '요청이 시간 초과되었습니다.', action: '다시 시도' },
    EN: { title: 'Timeout', message: 'Request timed out.', action: 'Retry' },
    JP: { title: 'タイムアウト', message: 'リクエストがタイムアウトしました。', action: '再試行' },
    CN: { title: '超时', message: '请求超时。', action: '重试' },
  },
  [StudioErrorCode.SERVER_ERROR]: {
    KO: { title: '서버 오류', message: '서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.', action: '다시 시도' },
    EN: { title: 'Server Error', message: 'Server error occurred. Please try again.', action: 'Retry' },
    JP: { title: 'サーバーエラー', message: 'サーバーにエラーが発生しました。', action: '再試行' },
    CN: { title: '服务器错误', message: '服务器发生错误，请稍后重试。', action: '重试' },
  },
  [StudioErrorCode.STORAGE_FULL]: {
    KO: { title: '저장 공간 부족', message: '브라우저 저장 공간이 부족합니다. 오래된 세션을 정리해 주세요.', action: '내보내기' },
    EN: { title: 'Storage Full', message: 'Local storage is full. Export and clear old sessions.', action: 'Export' },
    JP: { title: 'ストレージ不足', message: 'ローカルストレージが不足しています。', action: 'エクスポート' },
    CN: { title: '存储空间不足', message: '本地存储空间不足，请导出并清理旧会话。', action: '导出' },
  },
  [StudioErrorCode.SYNC_FAILED]: {
    KO: { title: '동기화 실패', message: 'Drive 동기화에 실패했습니다.', action: '다시 시도' },
    EN: { title: 'Sync Failed', message: 'Drive sync failed.', action: 'Retry' },
    JP: { title: '同期失敗', message: 'Drive同期に失敗しました。', action: '再試行' },
    CN: { title: '同步失败', message: 'Drive同步失败。', action: '重试' },
  },
  [StudioErrorCode.CONTENT_EMPTY]: {
    KO: { title: '내용 없음', message: '텍스트를 입력해 주세요.' },
    EN: { title: 'Empty Content', message: 'Please enter some text.' },
    JP: { title: '内容なし', message: 'テキストを入力してください。' },
    CN: { title: '内容为空', message: '请输入文本。' },
  },
  [StudioErrorCode.CONTENT_TOO_LARGE]: {
    KO: { title: '내용 초과', message: '요청이 너무 큽니다. 텍스트를 줄여 주세요.' },
    EN: { title: 'Content Too Large', message: 'Request is too large. Please reduce the text.' },
    JP: { title: '内容超過', message: 'リクエストが大きすぎます。テキストを減らしてください。' },
    CN: { title: '内容过大', message: '请求过大，请减少文本量。' },
  },
  [StudioErrorCode.UNKNOWN]: {
    KO: { title: '알 수 없는 오류', message: '예기치 않은 오류가 발생했습니다.' },
    EN: { title: 'Unknown Error', message: 'An unexpected error occurred.' },
    JP: { title: '不明なエラー', message: '予期しないエラーが発生しました。' },
    CN: { title: '未知错误', message: '发生了意外错误。' },
  },
};

export function getErrorMessage(code: StudioErrorCode, language: AppLanguage): ErrorMessage {
  return MESSAGES[code]?.[language] ?? MESSAGES[StudioErrorCode.UNKNOWN][language];
}
