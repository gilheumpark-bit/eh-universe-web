import type { Dispatch, SetStateAction } from "react";
import type { PublishAuditReport } from "@/lib/translation/publish-audit";
import { Download } from "../icons";
import {
  EXPORT_SECTION_TABS,
  type ExportSectionId,
} from "@/components/loreguard/tabs/TabExport.constants";

interface TabExportHeaderTabsProps {
  activeExportSection: ExportSectionId;
  hasAuditTarget: boolean;
  onSectionChange: Dispatch<SetStateAction<ExportSectionId>>;
}

export function TabExportHeaderTabs({
  activeExportSection,
  hasAuditTarget,
  onSectionChange,
}: TabExportHeaderTabsProps) {
  return (
    <>
      <div className="wd-chat-head">
        <div className="wd-chat-title">
          <Download size={17} />
          출고 문서함
          <span className="wd-online">
            <span className={"rdot " + (hasAuditTarget ? "green" : "gray")} />
            {hasAuditTarget ? "패키지 준비" : "원고 대기"}
          </span>
        </div>
        <span className="pill gray">출고 패키지 · 과정기록 포함</span>
      </div>
      <nav className="lg-export-tabs" role="tablist" aria-label="출고 내부 보기">
        {EXPORT_SECTION_TABS.map((section) => {
          const selected = activeExportSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className="lg-export-tab"
              data-selected={selected ? "true" : "false"}
              onClick={() => onSectionChange(section.id)}
            >
              <b>{section.labelKo}</b>
              <span>{section.detailKo}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

interface TabExportStatsGridProps {
  audit: PublishAuditReport | null;
  ipTier: string;
  manuscriptCount: number;
  platformFits: Array<{
    fit: {
      checkedAt: string;
      withinRange: boolean;
    };
  }>;
  recommendedPlanLabel: string;
}

export function TabExportStatsGrid({
  audit,
  ipTier,
  manuscriptCount,
  platformFits,
  recommendedPlanLabel,
}: TabExportStatsGridProps) {
  return (
    <div className="tex-stat-grid">
      <div className="pcard">
        <div className="stat-label">회차 원고</div>
        <div className="stat-val">{manuscriptCount}</div>
        <div className="stat-foot">저장된 원고 기준</div>
      </div>
      <div className="pcard">
        <div className="stat-label">출고 검수</div>
        <div className="stat-val">{audit ? (audit.findings.length === 0 ? "완료" : "확인") : "대기"}</div>
        <div className="stat-foot">{audit ? `${audit.findings.length}건` : "검수 실행 필요"}</div>
      </div>
      <div className="pcard">
        <div className="stat-label">플랫폼 적합</div>
        <div className="stat-val">{platformFits.filter((item) => item.fit.withinRange).length}/{platformFits.length || 5}</div>
        <div className="stat-foot">자수 기준 참고 · {platformFits[0]?.fit.checkedAt ?? "기준일 대기"}</div>
      </div>
      <div className="pcard">
        <div className="stat-label">IP 준비도</div>
        <div className="stat-val">{ipTier}</div>
        <div className="stat-foot">권리/IP 점검 반영</div>
      </div>
      <div className="pcard">
        <div className="stat-label">패키지 조건</div>
        <div className="stat-val">{recommendedPlanLabel}</div>
        <div className="stat-foot">자세한 조건은 접어서 확인</div>
      </div>
    </div>
  );
}
