import type { CertificateOutputPlan } from "@/lib/creative-process/certificate-output-profile";
import type { CopyrightRegistrationPrepPackage } from "@/lib/creative-process/copyright-registration-prep";
import type { CoreCopyrightPackage } from "@/lib/creative-process/core-copyright-package";
import type { ExportPackageProfilePlan } from "@/lib/creative-process/export-package-profile";
import type { RightsProposalAdvisorResult } from "@/lib/creative-process/rights-proposal-advisor";
import type { ExportSectionId } from "@/components/loreguard/tabs/TabExport.constants";
import { Book, Download, Flag, Scale, Shield } from "../icons";

type PremiumMediaIpPackPlan = {
  completionPercent: number;
  profile: {
    shortLabelKo: string;
  };
  status: "ready" | "review" | "missing" | "hold";
};

type TabExportPremiumRightsPackageCardProps = {
  authorDisplayName: string;
  authorLegalName: string;
  certificateOutputPlan: CertificateOutputPlan;
  copyrightRegistrationPrep: CopyrightRegistrationPrepPackage;
  coreCopyrightPackage: CoreCopyrightPackage;
  mediaIpPackPlan: PremiumMediaIpPackPlan | null;
  packagePlan: ExportPackageProfilePlan;
  rightsLedgerMissingCount: number;
  rightsProposalAdvisor: RightsProposalAdvisorResult;
  onSelectSection: (sectionId: ExportSectionId) => void;
};

type PackageItemTone = "green" | "amber" | "red";

type PackageItem = {
  id: string;
  labelKo: string;
  detailKo: string;
  statusKo: string;
  tone: PackageItemTone;
};

function toneFromStatus(status: "ready" | "review" | "missing"): PackageItemTone {
  if (status === "ready") return "green";
  if (status === "review") return "amber";
  return "red";
}

function readinessTone(score: number): PackageItemTone {
  if (score >= 80) return "green";
  if (score >= 55) return "amber";
  return "red";
}

function authorIdentityTone(displayName: string, legalName: string): PackageItemTone {
  if (displayName.trim() && legalName.trim()) return "green";
  if (displayName.trim() || legalName.trim()) return "amber";
  return "red";
}

function packageScore(items: PackageItem[]): number {
  const total = items.reduce((sum, item) => {
    if (item.tone === "green") return sum + 1;
    if (item.tone === "amber") return sum + 0.55;
    return sum;
  }, 0);
  return Math.round((total / items.length) * 100);
}

function packageTone(score: number): PackageItemTone {
  if (score >= 84) return "green";
  if (score >= 62) return "amber";
  return "red";
}

export default function TabExportPremiumRightsPackageCard({
  authorDisplayName,
  authorLegalName,
  certificateOutputPlan,
  copyrightRegistrationPrep,
  coreCopyrightPackage,
  mediaIpPackPlan,
  packagePlan,
  rightsLedgerMissingCount,
  rightsProposalAdvisor,
  onSelectSection,
}: TabExportPremiumRightsPackageCardProps) {
  const identityTone = authorIdentityTone(authorDisplayName, authorLegalName);
  const mediaTone = mediaIpPackPlan
    ? mediaIpPackPlan.status === "ready"
      ? "green"
      : mediaIpPackPlan.status === "review"
        ? "amber"
        : "red"
    : "red";
  const items: PackageItem[] = [
    {
      id: "certificate",
      labelKo: "확인서",
      detailKo: `${certificateOutputPlan.profile.shortLabelKo} 확인서`,
      statusKo: certificateOutputPlan.missingKo.length > 0 ? `${certificateOutputPlan.missingKo.length}개 보강` : "출력 구성 완료",
      tone: toneFromStatus(certificateOutputPlan.status),
    },
    {
      id: "registration",
      labelKo: "저작권 등록 준비",
      detailKo: "A/B/C + 혼합안",
      statusKo: `${copyrightRegistrationPrep.readyCount}/${copyrightRegistrationPrep.checks.length} 점검`,
      tone: copyrightRegistrationPrep.reviewCount > 0 ? "amber" : "green",
    },
    {
      id: "core",
      labelKo: "코어 저작권 패키지",
      detailKo: "세계관·캐릭터·시나리오 기준본",
      statusKo: `${coreCopyrightPackage.readiness.score}점`,
      tone: readinessTone(coreCopyrightPackage.readiness.score),
    },
    {
      id: "identity",
      labelKo: "작가 등록 정보",
      detailKo: "표시명·실명·필명 확인문",
      statusKo: identityTone === "green" ? "문안 생성" : identityTone === "amber" ? "한 항목 보강" : "입력 필요",
      tone: identityTone,
    },
    {
      id: "ip-pack",
      labelKo: "권리/IP 자산화",
      detailKo: mediaIpPackPlan?.profile.shortLabelKo ?? "작품 기준 필요",
      statusKo: mediaIpPackPlan ? `${mediaIpPackPlan.completionPercent}%` : "기준 보강",
      tone: mediaTone,
    },
    {
      id: "proposal",
      labelKo: "제안 검토",
      detailKo: "계약 전후 조건 분해",
      statusKo: rightsProposalAdvisor.hasProposal ? rightsProposalAdvisor.statusKo : "메모 입력 대기",
      tone: rightsProposalAdvisor.hasProposal
        ? rightsProposalAdvisor.statusKo === "조건 주의"
          ? "amber"
          : "green"
        : "amber",
    },
    {
      id: "submission",
      labelKo: "출고 패키지",
      detailKo: `${packagePlan.profile.shortLabelKo} 구성`,
      statusKo: rightsLedgerMissingCount > 0 ? `원장 ${rightsLedgerMissingCount}개 보강` : "제출 묶음 준비",
      tone: rightsLedgerMissingCount > 0
        ? "amber"
        : packagePlan.status === "ready"
          ? "green"
          : packagePlan.status === "review"
            ? "amber"
            : "red",
    },
  ];
  const score = packageScore(items);
  const tone = packageTone(score);

  return (
    <section className="pcard lg-premium-rights-card" aria-label="상위 권리 패키지 요약">
      <div className="pcard-h">
        <Scale size={15} />
        상위 권리 패키지
        <span className={"pill " + tone} style={{ marginLeft: "auto" }}>
          {score}%
        </span>
      </div>
      <div className="lg-premium-rights-hero">
        <div>
          <span>결제 명분</span>
          <b>작품이 뜨기 전 기준본을 만들고, 뜬 뒤 제안 조건을 비교하는 묶음</b>
          <small>확인서, 등록 준비 문안, 코어 저작권 기준본, 권리/IP 원장, 제출 묶음을 한 흐름으로 묶습니다.</small>
        </div>
        <div>
          <span>현재 빈틈</span>
          <b>
            {items.filter((item) => item.tone !== "green").length > 0
              ? items.filter((item) => item.tone !== "green").map((item) => item.labelKo).join(" · ")
              : "상위 패키지 구성 완료"}
          </b>
          <small>부족한 항목만 채우면 내려받기 문안과 제출 묶음 품질이 함께 올라갑니다.</small>
        </div>
      </div>
      <div className="lg-premium-rights-grid" aria-label="상위 권리 패키지 산출물">
        {items.map((item) => (
          <div key={item.id}>
            <span className={"rdot " + item.tone} aria-hidden="true" />
            <b>{item.labelKo}</b>
            <small>{item.detailKo}</small>
            <strong>{item.statusKo}</strong>
          </div>
        ))}
      </div>
      <div className="lg-premium-rights-actions" aria-label="상위 권리 패키지 바로가기">
        <button type="button" className="mini-btn" onClick={() => onSelectSection("asset")}>
          <Shield size={13} />
          권리/IP 채우기
        </button>
        <button type="button" className="mini-btn" onClick={() => onSelectSection("evidence")}>
          <Book size={13} />
          확인서 점검
        </button>
        <button type="button" className="mini-btn" onClick={() => onSelectSection("package")}>
          <Download size={13} />
          제출 묶음 보기
        </button>
      </div>
      <div className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
        <Flag size={13} />
        공식 등록 대행이 아니라, 신청 전 문안·복제물·권리 범위를 작가 기준으로 정리하는 출고 준비 묶음입니다.
      </div>
    </section>
  );
}
