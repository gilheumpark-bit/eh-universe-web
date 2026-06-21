import type {
  CertificateOutputPlan,
  CertificateOutputStatus,
} from "@/lib/creative-process/certificate-output-profile";
import { Shield } from "../icons";

type TabExportCertificateOutputCardProps = {
  certificateOutputPlan: CertificateOutputPlan;
};

function statusPillClass(status: CertificateOutputStatus): string {
  if (status === "ready") return "green";
  if (status === "review") return "amber";
  return "red";
}

export default function TabExportCertificateOutputCard({
  certificateOutputPlan,
}: TabExportCertificateOutputCardProps) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Shield size={15} />
        공개용 카드·제출용 문서
        <span className={"pill " + statusPillClass(certificateOutputPlan.status)} style={{ marginLeft: "auto" }}>
          {certificateOutputPlan.profile.shortLabelKo}
        </span>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        형태 <b>{certificateOutputPlan.profile.visualMode === "compact-card" ? "공개 카드" : "전체 문서"}</b>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        쓰임 <b>{certificateOutputPlan.profile.purposeKo}</b>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        봉인번호 <b>{certificateOutputPlan.sealNumber ?? "발급 전"}</b>
      </div>
      <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
        <span>조회 링크</span>
        <b style={{ textAlign: "right", wordBreak: "break-all" }}>
          {certificateOutputPlan.verificationUrl ?? "발급 전"}
        </b>
      </div>
      <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
        <span>보이는 항목</span>
        <b style={{ textAlign: "right" }}>{certificateOutputPlan.exposedFieldsKo.slice(0, 5).join(" · ")}</b>
      </div>
      <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
        <span>숨기는 항목</span>
        <b style={{ textAlign: "right" }}>{certificateOutputPlan.privateFieldsKo.slice(0, 5).join(" · ")}</b>
      </div>
      <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
        <span>첨부 산출물</span>
        <b style={{ textAlign: "right" }}>
          {certificateOutputPlan.includedArtifactsKo.join(" · ") || "첨부 산출물 없음"}
        </b>
      </div>
      <div className="wr-srow" style={{ alignItems: "flex-start", color: "var(--ink-3)" }}>
        <span>권리 원장</span>
        <b style={{ textAlign: "right" }}>{certificateOutputPlan.rightsLedgerPolicyKo}</b>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        발급 전 확인{" "}
        <b>{certificateOutputPlan.missingKo.length > 0 ? certificateOutputPlan.missingKo.join(" · ") : "추가 항목 없음"}</b>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
        {certificateOutputPlan.profile.boundaryKo}
      </div>
    </div>
  );
}
