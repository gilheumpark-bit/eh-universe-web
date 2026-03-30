import { L4 } from "@/lib/i18n";
import type {
  BoardType,
  Officiality,
  PlanetGoal,
  PlanetStatus,
  ReportType,
  Visibility,
} from "@/lib/network-types";
import type { Lang } from "@/lib/LangContext";

type LabelPair = { ko: string; en: string; jp?: string; cn?: string };

// ============================================================
// PART 1 - DOMAIN LABEL MAPS
// ============================================================

export const BOARD_TYPE_LABELS: Record<BoardType, LabelPair> = {
  notice: { ko: "중앙 공문", en: "Central Notice", jp: "中央公文", cn: "中央公文" },
  registry: { ko: "행성 등록소", en: "Planet Registry", jp: "惑星登録所", cn: "行星注册处" },
  log: { ko: "관측 로그", en: "Observation Log", jp: "観測ログ", cn: "观测日志" },
  settlement: { ko: "정산 결과", en: "Settlement Result", jp: "決算結果", cn: "结算结果" },
  if: { ko: "IF 구역", en: "IF Zone", jp: "IF区域", cn: "IF区域" },
  feedback: { ko: "피드백 / 협업", en: "Feedback / Collaboration", jp: "フィードバック / 協業", cn: "反馈 / 协作" },
};

export const REPORT_TYPE_LABELS: Record<ReportType, LabelPair> = {
  manual: { ko: "운용교범", en: "Operations Manual", jp: "運用教範", cn: "操作手册" },
  guide: { ko: "공식해설", en: "Official Guide", jp: "公式解説", cn: "官方指南" },
  technical: { ko: "기술보고", en: "Technical Report", jp: "技術報告", cn: "技术报告" },
  settlement: { ko: "정산보고", en: "Settlement Report", jp: "決算報告", cn: "结算报告" },
  observation: { ko: "관측보고", en: "Observation Report", jp: "観測報告", cn: "观测报告" },
  incident: { ko: "사건기록", en: "Incident Record", jp: "事件記録", cn: "事件记录" },
  testimony: { ko: "증언기록", en: "Testimony Record", jp: "証言記録", cn: "证言记录" },
  recovered: { ko: "회수문서", en: "Recovered Document", jp: "回収文書", cn: "回收文件" },
};

export const PLANET_GOAL_LABELS: Record<PlanetGoal, LabelPair> = {
  maintain: { ko: "유지", en: "Maintain", jp: "維持", cn: "维持" },
  develop: { ko: "발전", en: "Develop", jp: "発展", cn: "发展" },
  collapse: { ko: "붕괴", en: "Collapse", jp: "崩壊", cn: "崩溃" },
  experiment: { ko: "실험", en: "Experiment", jp: "実験", cn: "实验" },
};

export const PLANET_STATUS_LABELS: Record<PlanetStatus, LabelPair> = {
  maintain: { ko: "유지", en: "Maintain", jp: "維持", cn: "维持" },
  develop: { ko: "발전", en: "Develop", jp: "発展", cn: "发展" },
  collapse: { ko: "붕괴", en: "Collapse", jp: "崩壊", cn: "崩溃" },
  experiment: { ko: "실험", en: "Experiment", jp: "実験", cn: "实验" },
  freeze: { ko: "동결", en: "Freeze", jp: "凍結", cn: "冻结" },
  discard: { ko: "폐기", en: "Discard", jp: "廃棄", cn: "废弃" },
};

export const OFFICIALITY_LABELS: Record<Officiality, LabelPair> = {
  official: { ko: "공식", en: "Official", jp: "公式", cn: "官方" },
  unofficial: { ko: "비공식", en: "Unofficial", jp: "非公式", cn: "非官方" },
  fan: { ko: "팬기록", en: "Fan Record", jp: "ファン記録", cn: "粉丝记录" },
  experimental: { ko: "실험기록", en: "Experimental Record", jp: "実験記録", cn: "实验记录" },
  pending: { ko: "검토중", en: "Pending Review", jp: "審査中", cn: "审核中" },
};

export const VISIBILITY_LABELS: Record<Visibility, LabelPair> = {
  public: { ko: "공개", en: "Public", jp: "公開", cn: "公开" },
  members: { ko: "회원 공개", en: "Members", jp: "会員公開", cn: "会员公开" },
  private: { ko: "비공개", en: "Private", jp: "非公開", cn: "非公开" },
};

// IDENTITY_SEAL: PART-1 | role=localized label maps | inputs=domain enums | outputs=ko/en labels

// ============================================================
// PART 2 - REPORT TEMPLATES
// ============================================================

export const REPORT_TYPE_TEMPLATES: Record<ReportType, { ko: string; en: string }> = {
  manual: {
    ko: `[문서 제목]

문서 유형: 운용교범
문서 번호:
발행 주체:
적용 대상:
적용 범위:
발행 일자:

1. 목적
2. 기본 원칙
3. 운용 절차
4. 금지 사항
5. 예외 규정
6. 부칙

[본문]`,
    en: `[Document Title]

Document Type: Operations Manual
Document ID:
Issued By:
Audience:
Scope:
Issued At:

1. Purpose
2. Core Principles
3. Procedures
4. Prohibited Actions
5. Exceptions
6. Appendix

[Body]`,
  },
  guide: {
    ko: `[문서 제목]

문서 유형: 공식해설
해설 대상:
발행 주체:
적용 범위:
발행 일자:

1. 문서 목적
2. 핵심 정의
3. 분류 체계 설명
4. 적용 기준
5. 예외 항목
6. 실제 적용 예시

[본문]`,
    en: `[Document Title]

Document Type: Official Guide
Subject:
Issued By:
Scope:
Issued At:

1. Purpose
2. Core Definitions
3. Classification Structure
4. Application Rules
5. Exceptions
6. Examples

[Body]`,
  },
  technical: {
    ko: `[문서 제목]

문서 유형: 기술보고
대상:
작성 부서:
분석 기준:
위험도:
발행 일자:

1. 개요
2. 대상 설명
3. 분류 기준
4. 핵심 특징
5. 비교 분석
6. 위험 요소
7. 결론

[본문]`,
    en: `[Document Title]

Document Type: Technical Report
Subject:
Department:
Criteria:
Risk:
Issued At:

1. Overview
2. Subject
3. Classification Criteria
4. Key Traits
5. Comparative Analysis
6. Risk Factors
7. Conclusion

[Body]`,
  },
  settlement: {
    ko: `[문서 제목]

문서 유형: 정산보고
대상 행성:
대상 로그:
정산 주체:
판정:
EH 수치:
위험도:
보관 등급:
발행 일자:

1. 정산 개요
2. 대상 사건 요약
3. 현재 상태 판정
4. 위험 분석
5. 권고 조치
6. 후속 관측 필요 사항

[본문]`,
    en: `[Document Title]

Document Type: Settlement Report
Planet:
Target Log:
Operator:
Verdict:
EH Value:
Risk:
Archive Level:
Issued At:

1. Overview
2. Incident Summary
3. Current Verdict
4. Risk Analysis
5. Recommended Action
6. Follow-up Notes

[Body]`,
  },
  observation: {
    ko: `[로그 제목]

문서 유형: 관측보고
소속 행성:
기록자:
기록 시점:
지역:
사건 분류:
EH 영향도:
개입 여부:

1. 관측 개요
2. 사건 전개
3. 상태 변화
4. 관측 결론

[본문]`,
    en: `[Log Title]

Document Type: Observation Report
Planet:
Recorder:
Observed At:
Region:
Event Type:
EH Impact:
Intervention:

1. Observation Summary
2. Event Flow
3. State Change
4. Conclusion

[Body]`,
  },
  incident: {
    ko: `[사건명]

문서 유형: 사건기록
소속 행성:
기록자:
발생 시점:
발생 지역:
연루 대상:
사건 분류:
현재 상태:

1. 발생 배경
2. 사건 경과
3. 주요 피해 / 변화
4. 현재 후속 상태

[본문]`,
    en: `[Incident Title]

Document Type: Incident Record
Planet:
Recorder:
Occurred At:
Region:
Parties Involved:
Event Type:
Current Status:

1. Background
2. Progression
3. Damage / Change
4. Current Follow-up

[Body]`,
  },
  testimony: {
    ko: `[문서 제목]

문서 유형: 증언기록
증언자:
소속 / 신분:
증언 시점:
관련 사건:
소속 행성:

1. 진술 개요
2. 목격 내용
3. 개인 판단 / 감정
4. 신빙성 메모

[본문]`,
    en: `[Document Title]

Document Type: Testimony Record
Witness:
Affiliation:
Recorded At:
Related Incident:
Planet:

1. Statement Summary
2. Witnessed Content
3. Personal Judgment / Emotion
4. Credibility Notes

[Body]`,
  },
  recovered: {
    ko: `[문서 제목]

문서 유형: 회수문서
회수 위치:
회수 시점:
문서 상태:
복원 여부:
소속 행성:
관련 사건:

1. 회수 배경
2. 원문 상태
3. 복원 메모
4. 해석 주의 사항

[본문]`,
    en: `[Document Title]

Document Type: Recovered Document
Recovered From:
Recovered At:
Document State:
Restored:
Planet:
Related Incident:

1. Recovery Background
2. Original State
3. Restoration Notes
4. Interpretation Warnings

[Body]`,
  },
};

// IDENTITY_SEAL: PART-2 | role=report templates | inputs=report type | outputs=ko/en template body

// ============================================================
// PART 3 - LABEL HELPERS
// ============================================================

export function pickNetworkLabel(pair: LabelPair, lang: Lang) {
  return L4(lang, pair);
}

// IDENTITY_SEAL: PART-3 | role=label helper | inputs=label pair and language | outputs=resolved string
