import {
  PublishPlatform,
  type ImportFileReportStatus,
  type ProjectReleasePurpose,
  type ProjectRightsStatus,
  type ProjectTargetMarket,
} from "@/lib/studio-types";

export interface ProjectDraft {
  title: string;
  premise: string;
  format: "novel" | "webtoon" | "drama" | "game";
  targetLanguage: "KO" | "EN" | "JP" | "CN";
  targetMarket: ProjectTargetMarket;
  releasePurpose: ProjectReleasePurpose;
  rightsStatus: ProjectRightsStatus;
  publishPlatform: PublishPlatform;
  totalEpisodes: string;
  episodeLength: string;
  releaseCadence: string;
  rightsNote: string;
}

export const IMPORT_FILE_REPORT_LABELS_UI: Record<ImportFileReportStatus, { ko: string; en: string; ja: string; zh: string }> = {
  success: { ko: "자료 분류", en: "Material sorted", ja: "資料分類", zh: "资料已分类" },
  failed: { ko: "읽기 실패", en: "Read failed", ja: "読み取り失敗", zh: "读取失败" },
  unsupported: { ko: "미지원", en: "Unsupported", ja: "未対応", zh: "不支持" },
  empty: { ko: "분류 항목 없음", en: "No usable material", ja: "分類項目なし", zh: "无可分类资料" },
};

export const EMPTY_DRAFT: ProjectDraft = {
  title: "",
  premise: "",
  format: "novel",
  targetLanguage: "KO",
  targetMarket: "KR",
  releasePurpose: "serial",
  rightsStatus: "author_owned",
  publishPlatform: PublishPlatform.NONE,
  totalEpisodes: "",
  episodeLength: "",
  releaseCadence: "",
  rightsNote: "",
};

export const PROJECT_FORMAT_VALUES = ["novel", "webtoon", "drama", "game"] as const;
export const TARGET_LANGUAGE_VALUES = ["KO", "EN", "JP", "CN"] as const;
export const TARGET_MARKET_VALUES: ProjectTargetMarket[] = ["KR", "US", "EU", "GB", "AU", "JP", "CN", "TW", "GLOBAL"];
export const RELEASE_PURPOSE_VALUES: ProjectReleasePurpose[] = ["serial", "contest", "publisher", "ip_pitch", "private_archive"];
export const RIGHTS_STATUS_VALUES: ProjectRightsStatus[] = [
  "author_owned",
  "co_created",
  "licensed_source",
  "external_materials",
  "needs_review",
];

export const FORMAT_LABEL: Record<ProjectDraft["format"], string> = {
  novel: "소설",
  webtoon: "웹툰",
  drama: "드라마",
  game: "게임",
};

export const FORMAT_LABEL_UI: Record<ProjectDraft["format"], { ko: string; en: string; ja: string; zh: string }> = {
  novel: { ko: "소설", en: "Novel", ja: "小説", zh: "小说" },
  webtoon: { ko: "웹툰", en: "Webtoon", ja: "ウェブトゥーン", zh: "网漫" },
  drama: { ko: "드라마", en: "Drama", ja: "ドラマ", zh: "剧集" },
  game: { ko: "게임", en: "Game", ja: "ゲーム", zh: "游戏" },
};

export const TARGET_LANGUAGE_LABEL: Record<ProjectDraft["targetLanguage"], string> = {
  KO: "한국어",
  EN: "영어권",
  JP: "일본어권",
  CN: "중국어권",
};

export const TARGET_LANGUAGE_LABEL_UI: Record<ProjectDraft["targetLanguage"], { ko: string; en: string; ja: string; zh: string }> = {
  KO: { ko: "한국어", en: "Korean", ja: "韓国語", zh: "韩语" },
  EN: { ko: "영어권", en: "English market", ja: "英語圏", zh: "英语圈" },
  JP: { ko: "일본어권", en: "Japanese market", ja: "日本語圏", zh: "日语圈" },
  CN: { ko: "중국어권", en: "Chinese market", ja: "中国語圏", zh: "中文圈" },
};

export const TARGET_MARKET_LABEL: Record<ProjectTargetMarket, string> = {
  KR: "한국",
  US: "미국·영어권",
  EU: "EU 영어권",
  GB: "영국",
  AU: "호주",
  JP: "일본",
  CN: "중국어권",
  TW: "대만",
  GLOBAL: "글로벌 공통",
};

export const TARGET_MARKET_LABEL_UI: Record<ProjectTargetMarket, { ko: string; en: string; ja: string; zh: string }> = {
  KR: { ko: "한국", en: "Korea", ja: "韓国", zh: "韩国" },
  US: { ko: "미국·영어권", en: "US / English", ja: "米国・英語圏", zh: "美国/英语圈" },
  EU: { ko: "EU 영어권", en: "EU / English", ja: "EU・英語圏", zh: "EU/英语圈" },
  GB: { ko: "영국", en: "United Kingdom", ja: "英国", zh: "英国" },
  AU: { ko: "호주", en: "Australia", ja: "豪州", zh: "澳大利亚" },
  JP: { ko: "일본", en: "Japan", ja: "日本", zh: "日本" },
  CN: { ko: "중국어권", en: "Chinese market", ja: "中国語圏", zh: "中文圈" },
  TW: { ko: "대만", en: "Taiwan", ja: "台湾", zh: "台湾" },
  GLOBAL: { ko: "글로벌 공통", en: "Global", ja: "グローバル共通", zh: "全球通用" },
};

export const RELEASE_PURPOSE_LABEL: Record<ProjectReleasePurpose, string> = {
  serial: "연재 시작",
  contest: "공모전·심사 제출",
  publisher: "출판사·매니지먼트 제출",
  ip_pitch: "IP 판매·피칭",
  private_archive: "개인 보관·정리",
};

export const RELEASE_PURPOSE_LABEL_UI: Record<ProjectReleasePurpose, { ko: string; en: string; ja: string; zh: string }> = {
  serial: { ko: "연재 시작", en: "Serial launch", ja: "連載開始", zh: "开始连载" },
  contest: { ko: "공모전·심사 제출", en: "Contest / review submission", ja: "公募・審査提出", zh: "比赛/审查提交" },
  publisher: { ko: "출판사·매니지먼트 제출", en: "Publisher / management submission", ja: "出版社・マネジメント提出", zh: "出版社/经纪公司提交" },
  ip_pitch: { ko: "IP 판매·피칭", en: "IP sale / pitch", ja: "IP販売・ピッチ", zh: "IP 销售/提案" },
  private_archive: { ko: "개인 보관·정리", en: "Private records", ja: "個人保管・整理", zh: "个人归档整理" },
};

export const RIGHTS_STATUS_LABEL: Record<ProjectRightsStatus, string> = {
  author_owned: "작가 단독 창작",
  co_created: "공동기획·공동저작 있음",
  licensed_source: "원작·사용권 계약 있음",
  external_materials: "외부자료 포함",
  needs_review: "권리 확인 필요",
};

export const RIGHTS_STATUS_LABEL_UI: Record<ProjectRightsStatus, { ko: string; en: string; ja: string; zh: string }> = {
  author_owned: { ko: "작가 단독 창작", en: "Author-owned", ja: "作者単独", zh: "作者独立创作" },
  co_created: { ko: "공동기획·공동저작 있음", en: "Co-created", ja: "共同企画・共同著作あり", zh: "有共同策划/共同创作" },
  licensed_source: { ko: "원작·사용권 계약 있음", en: "Licensed source", ja: "原作・利用契約あり", zh: "已有原作/使用权合同" },
  external_materials: { ko: "외부자료 포함", en: "External materials", ja: "外部資料あり", zh: "包含外部资料" },
  needs_review: { ko: "권리 확인 필요", en: "Needs rights review", ja: "権利確認が必要", zh: "需要权利检查" },
};

export const TARGET_MARKET_OPTIONS: Array<{ value: ProjectTargetMarket; label: string; lang: ProjectDraft["targetLanguage"] | "ALL" }> = [
  { value: "KR", label: "한국", lang: "KO" },
  { value: "US", label: "미국·영어권", lang: "EN" },
  { value: "EU", label: "EU 영어권", lang: "EN" },
  { value: "GB", label: "영국", lang: "EN" },
  { value: "AU", label: "호주", lang: "EN" },
  { value: "JP", label: "일본", lang: "JP" },
  { value: "CN", label: "중국어권", lang: "CN" },
  { value: "TW", label: "대만", lang: "CN" },
  { value: "GLOBAL", label: "글로벌 공통", lang: "ALL" },
];

export const DEFAULT_MARKET_BY_LANGUAGE: Record<ProjectDraft["targetLanguage"], ProjectTargetMarket> = {
  KO: "KR",
  EN: "US",
  JP: "JP",
  CN: "CN",
};

export const PUBLISH_PLATFORM_OPTIONS: Array<{ value: PublishPlatform; label: string; lang: ProjectDraft["targetLanguage"] | "ALL" }> = [
  { value: PublishPlatform.NONE, label: "미정", lang: "ALL" },
  { value: PublishPlatform.MUNPIA, label: "문피아", lang: "KO" },
  { value: PublishPlatform.NOVELPIA, label: "노벨피아", lang: "KO" },
  { value: PublishPlatform.KAKAOPAGE, label: "카카오페이지", lang: "KO" },
  { value: PublishPlatform.SERIES, label: "네이버 시리즈", lang: "KO" },
  { value: PublishPlatform.ROYAL_ROAD, label: "Royal Road", lang: "EN" },
  { value: PublishPlatform.WEBNOVEL, label: "WebNovel", lang: "EN" },
  { value: PublishPlatform.KINDLE_VELLA, label: "Kindle Vella", lang: "EN" },
  { value: PublishPlatform.WATTPAD, label: "Wattpad", lang: "EN" },
  { value: PublishPlatform.KAKUYOMU, label: "Kakuyomu", lang: "JP" },
  { value: PublishPlatform.NAROU, label: "Shosetsuka ni Naro", lang: "JP" },
  { value: PublishPlatform.ALPHAPOLIS, label: "Alphapolis", lang: "JP" },
  { value: PublishPlatform.QIDIAN, label: "Qidian", lang: "CN" },
  { value: PublishPlatform.JJWXC, label: "JJWXC", lang: "CN" },
  { value: PublishPlatform.FANQIE, label: "Fanqie", lang: "CN" },
];

export const GRAMMAR_REGION_BY_LANGUAGE: Record<ProjectDraft["targetLanguage"], "KR" | "US" | "JP" | "CN"> = {
  KO: "KR",
  EN: "US",
  JP: "JP",
  CN: "CN",
};
