export type ImportFileReportReasonCodeLike =
  | "unsupported-format"
  | "requires-login"
  | "server-extraction-failed"
  | "empty-extraction"
  | "magic-byte-mismatch"
  | "file-too-large"
  | "zip-bomb-risk"
  | "password-protected"
  | "image-only-source"
  | "drm-or-corrupt-epub"
  | "missing-epub-navigation"
  | "pdf-page-markers-normalized"
  | "pdf-running-lines-normalized"
  | "unknown";

export type ImportFileReportReasonLanguage = "KO" | "EN" | "JP" | "CN" | "ko" | "en" | "ja" | "zh";

const REASON_LABELS: Record<ImportFileReportReasonCodeLike, Record<"ko" | "en" | "ja" | "zh", string>> = {
  "unsupported-format": {
    ko: "지원하지 않는 형식",
    en: "Unsupported format",
    ja: "未対応形式",
    zh: "不支持的格式",
  },
  "requires-login": {
    ko: "로그인 필요",
    en: "Sign-in required",
    ja: "ログインが必要",
    zh: "需要登录",
  },
  "server-extraction-failed": {
    ko: "문서 추출 실패",
    en: "Document extraction failed",
    ja: "文書抽出失敗",
    zh: "文档提取失败",
  },
  "empty-extraction": {
    ko: "추출 본문 없음",
    en: "No extracted text",
    ja: "抽出本文なし",
    zh: "未提取到正文",
  },
  "magic-byte-mismatch": {
    ko: "파일 형식 불일치",
    en: "File type mismatch",
    ja: "ファイル形式不一致",
    zh: "文件类型不匹配",
  },
  "file-too-large": {
    ko: "파일 용량 초과",
    en: "File too large",
    ja: "ファイル容量超過",
    zh: "文件过大",
  },
  "zip-bomb-risk": {
    ko: "압축 위험",
    en: "Compressed file expansion risk",
    ja: "圧縮展開リスク",
    zh: "压缩包膨胀风险",
  },
  "password-protected": {
    ko: "암호 파일",
    en: "Password-protected file",
    ja: "パスワード付きファイル",
    zh: "受密码保护的文件",
  },
  "image-only-source": {
    ko: "이미지/스캔 PDF",
    en: "Image-only/scanned PDF",
    ja: "画像/スキャンPDF",
    zh: "图片/扫描 PDF",
  },
  "drm-or-corrupt-epub": {
    ko: "DRM/손상 EPUB",
    en: "DRM or corrupt EPUB",
    ja: "DRM/破損EPUB",
    zh: "DRM 或损坏的 EPUB",
  },
  "missing-epub-navigation": {
    ko: "EPUB 목차 정보 없음",
    en: "Missing EPUB navigation",
    ja: "EPUB目次情報なし",
    zh: "缺少 EPUB 导航信息",
  },
  "pdf-page-markers-normalized": {
    ko: "PDF 페이지 표식 정리",
    en: "PDF page markers cleaned",
    ja: "PDFページ表記整理",
    zh: "PDF 页码标记已清理",
  },
  "pdf-running-lines-normalized": {
    ko: "PDF 반복 머리말 정리",
    en: "PDF repeated headers cleaned",
    ja: "PDF反復ヘッダー整理",
    zh: "PDF 重复页眉已清理",
  },
  unknown: {
    ko: "알 수 없는 이유",
    en: "Unknown reason",
    ja: "不明な理由",
    zh: "未知原因",
  },
};

function normalizeLanguage(language: ImportFileReportReasonLanguage): "ko" | "en" | "ja" | "zh" {
  const normalized = language.toLowerCase();
  if (normalized === "ko" || normalized === "en" || normalized === "ja" || normalized === "zh") return normalized;
  if (normalized === "jp") return "ja";
  if (normalized === "cn") return "zh";
  return "ko";
}

export function importFileReportReasonLabel(
  reasonCode: ImportFileReportReasonCodeLike | undefined,
  language: ImportFileReportReasonLanguage,
): string | undefined {
  if (!reasonCode) return undefined;
  return REASON_LABELS[reasonCode]?.[normalizeLanguage(language)];
}
