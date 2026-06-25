import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { buildReceipt } from "@/lib/creative/work-receipt";
import type { IPReadinessResult } from "@/lib/creative/ip-readiness";
import type { PublishAuditReport } from "@/lib/translation/publish-audit";
import type { checkPlatformFit } from "@/lib/writing-workspace/export-spec";
import type { buildCopyrightRegistrationPrep } from "@/lib/creative-process/copyright-registration-prep";
import type { buildCoreCopyrightPackage } from "@/lib/creative-process/core-copyright-package";
import type { buildRightsProposalAdvisor } from "@/lib/creative-process/rights-proposal-advisor";

type AuditTarget = {
  content: string;
  label: string;
} | null;
type PlatformFitItem = {
  fit: ReturnType<typeof checkPlatformFit>;
};
type CopyrightRegistrationPrep = ReturnType<typeof buildCopyrightRegistrationPrep>;
type CoreCopyrightPackage = ReturnType<typeof buildCoreCopyrightPackage>;
type RightsProposalAdvisor = ReturnType<typeof buildRightsProposalAdvisor>;

interface UseTabExportReceiptIssuerArgs {
  audit: PublishAuditReport | null;
  auditTarget: AuditTarget;
  coreCopyrightPackage: CoreCopyrightPackage;
  copyrightRegistrationPrep: CopyrightRegistrationPrep;
  ipResult: IPReadinessResult;
  platformFits: PlatformFitItem[];
  rightsProposalAdvisor: RightsProposalAdvisor;
  setReceipt: Dispatch<SetStateAction<string>>;
}

export function useTabExportReceiptIssuer({
  audit,
  auditTarget,
  coreCopyrightPackage,
  copyrightRegistrationPrep,
  ipResult,
  platformFits,
  rightsProposalAdvisor,
  setReceipt,
}: UseTabExportReceiptIssuerArgs) {
  return useCallback(() => {
    const did: { action: string; evidence: string }[] = [];
    const skipped: { action: string; reason: string }[] = [];
    if (audit && auditTarget) {
      did.push({
        action: "출고 검수",
        evidence: `${audit.findings.length}건 확인 · ${auditTarget.label}`,
      });
    } else {
      skipped.push({ action: "출고 검수", reason: "아직 실행하지 않음" });
    }
    if (auditTarget && platformFits.length > 0) {
      const okCount = platformFits.filter((item) => item.fit.withinRange).length;
      did.push({
        action: "플랫폼 자수 적합 점검",
        evidence: `${okCount}/${platformFits.length} 적합 · ${platformFits[0].fit.chars.toLocaleString()}자`,
      });
    } else {
      skipped.push({ action: "플랫폼 자수 적합 점검", reason: "검수할 저장 원고 없음" });
    }
    did.push({
      action: "IP 준비도 산출",
      evidence: `${ipResult.tier} 단계 · 권리/IP 점검 반영`,
    });
    did.push({
      action: "저작권 등록 준비 3안",
      evidence: `${copyrightRegistrationPrep.readyCount}/${copyrightRegistrationPrep.checks.length} 점검 · A/B/C + 혼합안`,
    });
    did.push({
      action: "코어 저작권 패키지",
      evidence: `${coreCopyrightPackage.documents.length}개 기준본 · ${coreCopyrightPackage.readiness.summaryKo}`,
    });
    if (rightsProposalAdvisor.hasProposal) {
      did.push({
        action: "권리 제안 어드바이저",
        evidence: rightsProposalAdvisor.summaryKo,
      });
    } else {
      skipped.push({ action: "권리 제안 어드바이저", reason: "제안 문구 입력 대기" });
    }
    setReceipt(
      buildReceipt({
        did,
        skipped,
        metrics: {
          chars: auditTarget?.content.length,
          dialogueRatio: audit ? audit.stats.dialogueRatio * 100 : undefined,
        },
      }),
    );
  }, [audit, auditTarget, copyrightRegistrationPrep, coreCopyrightPackage, ipResult.tier, platformFits, rightsProposalAdvisor, setReceipt]);
}
