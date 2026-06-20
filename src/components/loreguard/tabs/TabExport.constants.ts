import type { ProjectRightsStatus, StoryConfig } from "@/lib/studio-types";
import type { SourceRecord } from "@/lib/creative-process";
import type { IpBibleCluster } from "@/lib/creative/ip-bible-builder";
import { Book, Download, Scale, Shield } from "../icons";

export const IP_BIBLE_CLUSTER_LABEL_KO: Record<IpBibleCluster, string> = {
  entry: "진입 자료",
  story: "스토리 자료",
  setting: "설정 자료",
  business: "제작·사업 자료",
};

export const IP_BIBLE_CLUSTER_DESCRIPTION_KO: Record<IpBibleCluster, string> = {
  entry: "처음 보는 사람이 30초 안에 작품을 파악하는 묶음",
  story: "무슨 이야기인지, 결말과 전환점이 어떻게 서는지 보는 묶음",
  setting: "세계관, 인물, 용어가 서로 어긋나지 않는지 보는 묶음",
  business: "비주얼, 시장 위치, 회차 호흡, 매체 확장을 보는 묶음",
};

export const OVERSEAS_RELEASE_REVIEW_FIELD_IDS = [
  "source-preservation-copy",
  "market-release-copy",
  "back-translation-summary-ko",
  "cultural-risk-summary-ko",
  "localization-decision-log",
] as const;

export const RIGHTS_STATUS_LABEL_KO: Record<ProjectRightsStatus, string> = {
  author_owned: "작가 단독 창작",
  co_created: "공동기획·공동저작 있음",
  licensed_source: "원작·사용권 계약 있음",
  external_materials: "외부자료 포함",
  needs_review: "권리 확인 필요",
};

export const SOURCE_TYPE_LABEL_KO: Record<SourceRecord["sourceType"], string> = {
  ai_output: "노아 산출물",
  external_doc: "외부 문서",
  web_clip: "웹 클립",
  image_caption: "이미지 캡션",
  reference: "참고 자료",
  collaborator_text: "협업자 제공 텍스트",
  other: "기타 자료",
};

export const SOURCE_VISIBILITY_LABEL_KO: Record<SourceRecord["visibility"], string> = {
  public: "공개 가능",
  publisher: "제출용",
  private: "비공개",
};

export type ImportFileReportRecord = NonNullable<StoryConfig["importFileReports"]>[number];

export const IMPORT_REPORT_STATUS_LABEL_KO: Record<ImportFileReportRecord["status"], string> = {
  success: "후보 생성",
  failed: "읽기 실패",
  unsupported: "미지원",
  empty: "빈 자료",
};

export type ExportSectionId = "overview" | "asset" | "evidence" | "package";

export const EXPORT_SECTION_TABS: Array<{
  id: ExportSectionId;
  labelKo: string;
  detailKo: string;
}> = [
  { id: "overview", labelKo: "개요", detailKo: "목적·조건" },
  { id: "asset", labelKo: "자산화", detailKo: "권리/IP·등록" },
  { id: "evidence", labelKo: "점검", detailKo: "과정기록·검수" },
  { id: "package", labelKo: "제출 묶음", detailKo: "ZIP·산출물" },
];

export const EMPTY_EXPORT_PREVIEW = [
  {
    titleKo: "과정기록",
    detailKo: "노아 제안, 작가 승인, 수정 이력이 회차별 확인서로 정리됩니다.",
    itemsKo: ["작가 결정과 제안 출처 분리", "회차별 변경 이력", "제출용 요약 카드"],
    icon: Shield,
  },
  {
    titleKo: "권리/IP 점검",
    detailKo: "세계관, 캐릭터, 외부 자료, 매체 확장 권리 상태를 출고 전에 묶습니다.",
    itemsKo: ["공동기획·원작 여부", "캐릭터·소품 자산화", "플랫폼·국가별 확인 메모"],
    icon: Scale,
  },
  {
    titleKo: "저작권 등록 준비",
    detailKo: "제호, 창작연월일, 작품 설명, 복제물 범위를 등록 전 확인하기 쉬운 형태로 정리합니다.",
    itemsKo: ["A/B/C 설명안", "창작연월일·제호 점검", "보완 요청 대응 메모"],
    icon: Book,
  },
  {
    titleKo: "출고 패키지",
    detailKo: "공모전, 플랫폼, 출판사 제출에 필요한 원고와 설정 자료를 한 묶음으로 준비합니다.",
    itemsKo: ["원고 파일과 설정집", "권리/IP 메모", "제출 전 점검 목록"],
    icon: Download,
  },
];
