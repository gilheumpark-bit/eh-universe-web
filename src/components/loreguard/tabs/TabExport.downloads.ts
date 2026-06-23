import { useCallback } from "react";
import {
  buildMediaIpPackMarkdown,
  type MediaIpPackMarkdownInput,
} from "@/lib/creative/media-ip-pack-markdown";
import {
  serializeCopyrightRegistrationPrepMarkdown,
} from "@/lib/creative-process/copyright-registration-prep";
import {
  serializeCoreCopyrightPackageMarkdown,
} from "@/lib/creative-process/core-copyright-package";
import {
  serializeRightsProposalAdvisorMarkdown,
} from "@/lib/creative-process/rights-proposal-advisor";
import {
  downloadTextDocument,
  safeDownloadName,
} from "@/components/loreguard/tabs/TabExport.helpers";

type CopyrightRegistrationPrep = Parameters<typeof serializeCopyrightRegistrationPrepMarkdown>[0];
type CoreCopyrightPackage = Parameters<typeof serializeCoreCopyrightPackageMarkdown>[0];
type RightsProposalAdvisor = Parameters<typeof serializeRightsProposalAdvisorMarkdown>[0];

interface UseTabExportDownloadsArgs {
  coreCopyrightPackage: CoreCopyrightPackage;
  copyrightRegistrationPrep: CopyrightRegistrationPrep;
  mediaIpPackMarkdownInput: MediaIpPackMarkdownInput | null;
  rightsProposalAdvisor: RightsProposalAdvisor;
}

const generatedAtKo = () => new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

export function useTabExportDownloads({
  coreCopyrightPackage,
  copyrightRegistrationPrep,
  mediaIpPackMarkdownInput,
  rightsProposalAdvisor,
}: UseTabExportDownloadsArgs) {
  const downloadMediaIpPackMarkdown = useCallback(() => {
    if (!mediaIpPackMarkdownInput) return;
    const content = buildMediaIpPackMarkdown({
      ...mediaIpPackMarkdownInput,
      generatedAt: generatedAtKo(),
    });
    const fileName = `${safeDownloadName(mediaIpPackMarkdownInput.workTitle)}_권리_IP_자산화_초안.md`;
    downloadTextDocument(fileName, content);
  }, [mediaIpPackMarkdownInput]);

  const downloadCopyrightRegistrationPrep = useCallback(() => {
    const content = serializeCopyrightRegistrationPrepMarkdown({
      ...copyrightRegistrationPrep,
      generatedAtKo: generatedAtKo(),
    });
    const fileName = `${safeDownloadName(copyrightRegistrationPrep.workTitle)}_저작권_등록_준비_3안.md`;
    downloadTextDocument(fileName, content);
  }, [copyrightRegistrationPrep]);

  const downloadCoreCopyrightPackage = useCallback(() => {
    const content = serializeCoreCopyrightPackageMarkdown({
      ...coreCopyrightPackage,
      generatedAtKo: generatedAtKo(),
    });
    const fileName = `${safeDownloadName(coreCopyrightPackage.workTitle)}_코어_저작권_패키지.md`;
    downloadTextDocument(fileName, content);
  }, [coreCopyrightPackage]);

  const downloadRightsProposalAdvisor = useCallback(() => {
    const content = serializeRightsProposalAdvisorMarkdown({
      ...rightsProposalAdvisor,
      generatedAtKo: generatedAtKo(),
    });
    const fileName = `${safeDownloadName(rightsProposalAdvisor.workTitle)}_권리_제안_어드바이저.md`;
    downloadTextDocument(fileName, content);
  }, [rightsProposalAdvisor]);

  return {
    downloadCoreCopyrightPackage,
    downloadCopyrightRegistrationPrep,
    downloadMediaIpPackMarkdown,
    downloadRightsProposalAdvisor,
  };
}
