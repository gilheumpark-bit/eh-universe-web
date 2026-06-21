import type {
  CopyrightRegistrationPrepPackage,
  CopyrightPrepCheckStatus,
} from "@/lib/creative-process/copyright-registration-prep";
import { Book, Download, Quote } from "../icons";

type TabExportCopyrightRegistrationPrepCardProps = {
  copyrightRegistrationPrep: CopyrightRegistrationPrepPackage;
  onDownload: () => void;
};

function statusLabelKo(status: CopyrightPrepCheckStatus): string {
  return status === "ready" ? "준비" : "보강";
}

export default function TabExportCopyrightRegistrationPrepCard({
  copyrightRegistrationPrep,
  onDownload,
}: TabExportCopyrightRegistrationPrepCardProps) {
  return (
    <div className="pcard" aria-label="저작권 등록 준비 3안">
      <div className="pcard-h">
        <Book size={15} />
        저작권 등록 준비
        <span className={"pill " + (copyrightRegistrationPrep.reviewCount > 0 ? "amber" : "green")} style={{ marginLeft: "auto" }}>
          {copyrightRegistrationPrep.readyCount}/{copyrightRegistrationPrep.checks.length}
        </span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
        <span style={{ flex: 1 }}>등록 내용설명을 서사·캐릭터·주제 3안과 최종 혼합안으로 정리합니다.</span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
        <span>종류 추천</span>
        <b style={{ textAlign: "right" }}>{copyrightRegistrationPrep.workTypeRecommendationKo}</b>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {copyrightRegistrationPrep.variants.map((variant) => (
          <div
            key={variant.id}
            className="wr-srow"
            style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
          >
            <span className="rdot blue" style={{ marginTop: 5 }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <b>{variant.labelKo}</b>
              <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>{variant.focusKo}</span>
              <span style={{ display: "block", color: "var(--ink-3)", fontSize: 11.5 }}>{variant.bestForKo}</span>
            </span>
          </div>
        ))}
      </div>
      <details className="lg-ip-pack-inline-detail">
        <summary>
          <Quote size={13} />
          정정 입력란용 문안
          <span className="pill gray">A/B/C</span>
        </summary>
        <div className="lg-ip-pack-inline-detail-body" aria-label="저작권 등록 정정 입력란 문안">
          {copyrightRegistrationPrep.variants.map((variant) => (
            <div key={variant.id} className="lg-ip-pack-form-row">
              <div>
                <b>{variant.labelKo}</b>
                <span>{variant.draftText}</span>
              </div>
              <strong>{variant.id === "merged-final" ? "최종" : "후보"}</strong>
            </div>
          ))}
        </div>
      </details>
      <div className="lg-ip-pack-form-list" aria-label="등록 전 보완 방지 검사">
        {copyrightRegistrationPrep.checks.map((check) => (
          <div key={check.id} className="lg-ip-pack-form-row">
            <div>
              <b>{check.labelKo}</b>
              <span>{check.detailKo}</span>
            </div>
            <strong>{statusLabelKo(check.status)}</strong>
          </div>
        ))}
      </div>
      <button type="button" className="mini-btn" onClick={onDownload}>
        <Download size={13} />
        등록 준비 3안 내려받기
      </button>
      <div className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
        공식 신청 전 작품 정보, 표현상 특징, 복제물 범위, 제호·필명 항목을 정리합니다.
      </div>
    </div>
  );
}
