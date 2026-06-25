"use client";

import { useCallback, useState } from "react";
import { L4 } from "@/lib/i18n";
import { canShare } from "@/lib/browser/web-share";
import type { AppLanguage, Project } from "@/lib/studio-types";
import type {
  CertificateLanguage,
  CertificateView,
  CreativeEvent,
} from "@/lib/creative-process/types";
import {
  triggerDownload,
  type IssueStatus,
  type RegisterStatus,
} from "@/components/loreguard/CpJournalPanel.helpers";

interface UseCpJournalIssueArgs {
  currentProjectId: string | null;
  events: CreativeEvent[] | null;
  projects: Project[];
  language: AppLanguage;
  certLang: CertificateLanguage;
  getIdToken: () => Promise<string | null>;
}

export function useCpJournalIssue({
  currentProjectId,
  events,
  projects,
  language,
  certLang,
  getIdToken,
}: UseCpJournalIssueArgs) {
  const [issueView, setIssueView] = useState<CertificateView>("private");
  const [issueStatus, setIssueStatus] = useState<IssueStatus>("idle");
  const [issueError, setIssueError] = useState<string | null>(null);
  const [lastFilenames, setLastFilenames] = useState<string[] | null>(null);
  const [lastIssuedMd, setLastIssuedMd] = useState<{ name: string; content: string } | null>(null);
  const [shareSupported] = useState(() => canShare());
  const [registerOptIn, setRegisterOptIn] = useState(false);
  const [registerStatus, setRegisterStatus] = useState<RegisterStatus>("idle");
  const [registerDetail, setRegisterDetail] = useState<string | null>(null);
  const [mirrorNotice, setMirrorNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const handleIssue = useCallback(async () => {
    if (!currentProjectId || !events || events.length === 0 || issueStatus === "working") return;
    setIssueStatus("working");
    setIssueError(null);
    setLastFilenames(null);
    setLastIssuedMd(null);
    setRegisterStatus("idle");
    setRegisterDetail(null);
    setMirrorNotice(null);
    try {
      const cp = await import("@/lib/creative-process");
      const project = projects.find((candidate) => candidate.id === currentProjectId);
      const fallbackName: Record<AppLanguage, string> = {
        KO: "내 작품",
        EN: "My Work",
        JP: "自作品",
        CN: "我的作品",
      };
      const projectName = project?.name || fallbackName[language] || fallbackName.KO;

      const episodes: Array<{ episode: number; content: string }> = [];
      const charsSet = new Map<string, { id: string; name: string }>();
      let worldGenre: string | undefined;
      for (const session of project?.sessions ?? []) {
        for (const manuscript of session.config?.manuscripts ?? []) {
          if (typeof manuscript.content === "string") {
            episodes.push({ episode: manuscript.episode, content: manuscript.content });
          }
        }
        for (const character of session.config?.characters ?? []) {
          if (character?.id) charsSet.set(character.id, { id: character.id, name: character.name || character.id });
        }
        if (!worldGenre) worldGenre = session.config?.worldSimData?.selectedGenre;
      }

      const result = await cp.buildCertificate({
        projectId: currentProjectId,
        view: issueView,
        language: certLang,
        projectMeta: { name: projectName },
        episodes,
        worldSummary: worldGenre ? { genre: worldGenre } : undefined,
        characters: Array.from(charsSet.values()),
        generatedBy: "loreguard@certificate-service",
      });

      const html = cp.renderCertificateHtml(result.cert, result.sections, issueView, certLang);
      const md = cp.renderCertificateMarkdown(result.cert, result.sections, issueView, certLang);
      const htmlName = cp.buildCertificateFilename(result.cert, "html");
      const mdName = cp.buildCertificateFilename(result.cert, "md");
      triggerDownload(htmlName, html, "text/html;charset=utf-8");
      triggerDownload(mdName, md, "text/markdown;charset=utf-8");

      setLastFilenames([htmlName, mdName]);
      setLastIssuedMd({ name: mdName, content: md });
      setIssueStatus("success");
      const certHtmlHash = await cp.computeSha256Hex(html);

      try {
        const mirror = await import("@/lib/creative-process/github-mirror");
        if (await mirror.isCpMirrorEnabled()) {
          const mirrored = await mirror.mirrorCertificate(result.cert);
          if (mirrored?.commitSha) {
            setMirrorNotice({
              ok: true,
              text: L4(language, {
                ko: `GitHub 미러 완료 — commit ${mirrored.commitSha.slice(0, 7)} · ${mirror.ANCHOR_HONESTY_NOTICE.ko}`,
                en: `Mirrored to GitHub — commit ${mirrored.commitSha.slice(0, 7)} · ${mirror.ANCHOR_HONESTY_NOTICE.en}`,
              }),
            });
          } else {
            setMirrorNotice({
              ok: false,
              text: L4(language, {
                ko: "GitHub 미러 실패 — 확인서 다운로드는 정상 (다음 발급/이벤트 주기에 재시도)",
                en: "GitHub mirror failed — journal downloads are unaffected (will retry on next cycle)",
              }),
            });
          }
        }
      } catch (mirrorErr) {
        setMirrorNotice({
          ok: false,
          text: L4(language, {
            ko: `GitHub 미러 모듈 로드 실패 — 확인서 다운로드는 정상: ${mirrorErr instanceof Error ? mirrorErr.message.slice(0, 80) : String(mirrorErr).slice(0, 80)}`,
            en: `Failed to load GitHub mirror module — journal downloads are unaffected: ${mirrorErr instanceof Error ? mirrorErr.message.slice(0, 80) : String(mirrorErr).slice(0, 80)}`,
          }),
        });
      }

      try {
        await cp.saveProcessCertificate(result.cert);
      } catch {
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail: {
              message: L4(language, {
                ko: "발급본 저장 실패 — 다운로드 파일은 유지되지만 출고 화면 연결은 나중에 다시 시도해 주세요",
                en: "Failed to save the issued record — downloads are available, but export linking may need another try",
              }),
              variant: "warning",
            },
          }),
        );
      }

      try {
        await cp.recordCreativeEvent({
          projectId: currentProjectId,
          targetType: "metadata",
          targetId: `certificate:${htmlName}`,
          eventType: "create",
          actorType: "system",
          actorId: "certificate-issuer",
          originType: "SYSTEM_GENERATED",
          beforeHash: null,
          afterHash: certHtmlHash,
          note: `certificate-issued (view=${issueView}, lang=${certLang}${result.cert.githubCommitSha ? `, githubCommitSha=${result.cert.githubCommitSha}` : ""})`,
        });
      } catch {
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail: {
              message: L4(language, {
                ko: "발급 이벤트 기록 실패 — 확인서는 정상 다운로드됨",
                en: "Failed to record issuance event — journal downloaded successfully",
              }),
              variant: "warning",
            },
          }),
        );
      }

      const noticeMap: Record<AppLanguage, string> = {
        KO: "확인서가 다운로드되었습니다. 법적 효력은 없으며, 출판사·플랫폼 제출 시 참조 자료로 사용 가능합니다.",
        EN: "Authorship Journal downloaded. Not a legal certification — usable as a reference document for publishers/platforms.",
        JP: "確認書をダウンロードしました。法的効力はなく、出版社・プラットフォーム提出時の参考資料として使用可能です。",
        CN: "确认书已下载。不具有法律效力,可用作向出版社·平台提交时的参考资料。",
      };
      window.dispatchEvent(
        new CustomEvent("noa:alert", {
          detail: { message: noticeMap[language] || noticeMap.KO, variant: "info", duration: 6000 },
        }),
      );

      if (registerOptIn) {
        let outcome: RegisterStatus = "error";
        let detail: string | null = null;
        try {
          const idToken = await getIdToken();
          if (!idToken) {
            detail = L4(language, {
              ko: "로그인 필요 — 등록 건너뜀",
              en: "Sign-in required — registration skipped",
            });
          } else {
            const res = await fetch("/api/cp/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(15_000) : undefined,
              body: JSON.stringify({
                certId: result.cert.id,
                projectId: currentProjectId,
                certHash: certHtmlHash,
                chainTipHash: result.cert.chainTipHash ?? null,
                visibility: issueView,
                issuerType: result.cert.issuer?.type ?? "self",
                githubCommitSha: result.cert.githubCommitSha ?? null,
              }),
            });
            if (res.status === 201) {
              outcome = "success";
              detail = result.cert.id;
            } else if (res.status === 409) {
              outcome = "already";
              detail = result.cert.id;
            } else {
              const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
              detail =
                errBody?.error === "registry_disabled"
                  ? L4(language, {
                      ko: "공개 확인 기록을 사용할 수 없음",
                      en: "Public confirmation record is unavailable",
                    })
                  : `HTTP ${res.status}${errBody?.error ? ` — ${errBody.error}` : ""}`;
            }
          }
        } catch (regErr) {
          detail = regErr instanceof Error ? regErr.message.slice(0, 120) : String(regErr).slice(0, 120);
        }
        setRegisterStatus(outcome);
        setRegisterDetail(detail);
        window.dispatchEvent(
          new CustomEvent("noa:alert", {
            detail:
              outcome === "success"
                ? {
                    message: L4(language, {
                      ko: "공개 확인 기록에 남겼습니다. 원고 본문은 저장하지 않고, 발급 시점 이후의 변경 여부를 확인하는 메타데이터만 보관합니다.",
                      en: "Saved to the public confirmation record. The manuscript body is not stored; only metadata for later change checks is kept.",
                    }),
                    variant: "info",
                    duration: 8000,
                  }
                : outcome === "already"
                  ? {
                      message: L4(language, {
                        ko: "이미 남긴 확인 기록입니다. 기존 기록을 유지합니다.",
                        en: "This confirmation record already exists. The existing record was kept.",
                      }),
                      variant: "info",
                    }
                  : {
                      message: `${L4(language, {
                        ko: "공개 확인 기록 저장 실패 — 확인서는 정상 발급됨:",
                        en: "Public confirmation record failed — journal was issued normally:",
                      })} ${detail ?? ""}`,
                      variant: "warning",
                    },
          }),
        );
      }
    } catch (err) {
      setIssueStatus("error");
      setIssueError(err instanceof Error ? err.message.slice(0, 160) : String(err).slice(0, 160));
    }
  }, [certLang, currentProjectId, events, getIdToken, issueStatus, issueView, language, projects, registerOptIn]);

  return {
    issueView,
    setIssueView,
    issueStatus,
    issueError,
    lastFilenames,
    lastIssuedMd,
    shareSupported,
    registerOptIn,
    setRegisterOptIn,
    registerStatus,
    registerDetail,
    mirrorNotice,
    handleIssue,
  };
}
