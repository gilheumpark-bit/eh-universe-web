import type { RightsProposalAdvisorResult } from "@/lib/creative-process/rights-proposal-advisor";
import { Download, Quote, Scale } from "../icons";

type TabExportRightsProposalAdvisorCardProps = {
  rightsProposalAdvisor: RightsProposalAdvisorResult;
  proposalAdvisorText: string;
  onProposalAdvisorTextChange: (value: string) => void;
  onDownload: () => void;
};

function statusPillClass(rightsProposalAdvisor: RightsProposalAdvisorResult): string {
  if (rightsProposalAdvisor.statusKo === "조건 주의") return "amber";
  if (rightsProposalAdvisor.hasProposal) return "green";
  return "gray";
}

export default function TabExportRightsProposalAdvisorCard({
  rightsProposalAdvisor,
  proposalAdvisorText,
  onProposalAdvisorTextChange,
  onDownload,
}: TabExportRightsProposalAdvisorCardProps) {
  return (
    <div className="pcard" aria-label="권리 제안 어드바이저">
      <div className="pcard-h">
        <Scale size={15} />
        권리 제안 어드바이저
        <span className={"pill " + statusPillClass(rightsProposalAdvisor)} style={{ marginLeft: "auto" }}>
          {rightsProposalAdvisor.statusKo}
        </span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
        <span style={{ flex: 1 }}>
          출판·웹툰·영상·해외화 제안 문구를 코어 패키지 기준본과 비교해 권리 범위, 기간, 지역, 수익, 각색, 회수, 표기를 분해합니다.
        </span>
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 700 }}>제안서 또는 미팅 메모</span>
        <textarea
          aria-label="제안서 또는 미팅 메모"
          value={proposalAdvisorText}
          onChange={(event) => onProposalAdvisorTextChange(event.target.value)}
          placeholder="예: 웹툰화와 영상화 권리를 5년 독점으로 제안받았고, 수익 배분은 순수익 기준입니다..."
          rows={4}
          style={{
            width: "100%",
            minHeight: 96,
            resize: "vertical",
            border: "1px solid var(--line)",
            background: "var(--card-2)",
            color: "var(--ink)",
            padding: 10,
            font: "inherit",
            borderRadius: 0,
          }}
        />
      </label>
      <div className="wr-srow" style={{ color: "var(--ink-3)", alignItems: "flex-start" }}>
        <span>요약</span>
        <b style={{ textAlign: "right" }}>{rightsProposalAdvisor.summaryKo}</b>
      </div>
      <div className="lg-ip-pack-form-list" aria-label="권리 제안 조건 축 분석">
        {rightsProposalAdvisor.axisReviews.map((axis) => (
          <div key={axis.id} className="lg-ip-pack-form-row">
            <div>
              <b>{axis.labelKo}</b>
              <span>{axis.foundKo} · {axis.noteKo}</span>
            </div>
            <strong>{axis.status === "clear" ? "확인" : axis.status === "watch" ? "주의" : "질문"}</strong>
          </div>
        ))}
      </div>
      <div className="lg-ip-pack-form-list" aria-label="업계 리스크 패턴">
        {rightsProposalAdvisor.industryRiskPatterns.slice(0, 4).map((pattern) => (
          <div key={pattern.id} className="lg-ip-pack-form-row">
            <div>
              <b>{pattern.labelKo}</b>
              <span>{pattern.patternKo} 대응: {pattern.counterMoveKo}</span>
            </div>
            <strong>{pattern.severity === "high" ? "높음" : "주의"}</strong>
          </div>
        ))}
      </div>
      <details className="lg-ip-pack-inline-detail">
        <summary>
          <Quote size={13} />
          회신 초안
          <span className="pill gray">미팅 전</span>
        </summary>
        <div className="lg-ip-pack-inline-detail-body" aria-label="권리 제안 회신 초안">
          <div className="lg-ip-pack-note" style={{ whiteSpace: "pre-wrap" }}>
            {rightsProposalAdvisor.replyDraftKo}
          </div>
          <div className="lg-ip-pack-form-list" aria-label="권리 제안 권리 지도">
            <div className="lg-ip-pack-form-row">
              <div>
                <b>넘어가는 권리</b>
                <span>{rightsProposalAdvisor.rightsMapKo.passingKo.join(" · ")}</span>
              </div>
              <strong>범위</strong>
            </div>
            <div className="lg-ip-pack-form-row">
              <div>
                <b>남길 권리 기준</b>
                <span>{rightsProposalAdvisor.rightsMapKo.retainedKo.join(" · ")}</span>
              </div>
              <strong>보유</strong>
            </div>
            <div className="lg-ip-pack-form-row">
              <div>
                <b>애매한 축</b>
                <span>{rightsProposalAdvisor.rightsMapKo.ambiguousKo.join(" · ")}</span>
              </div>
              <strong>질문</strong>
            </div>
          </div>
        </div>
      </details>
      <button type="button" className="mini-btn" onClick={onDownload}>
        <Download size={13} />
        어드바이저 결과 내려받기
      </button>
      <div className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
        코어 기준본을 바탕으로 조건을 분해합니다. 실제 서명 전에는 원문 계약서와 최종 조건을 별도로 확인해 주세요.
      </div>
    </div>
  );
}
