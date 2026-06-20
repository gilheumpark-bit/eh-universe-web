"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useAuth } from "@/lib/AuthContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Check, Download, Scroll, Sync, X } from "@/components/loreguard/icons";
import {
  CreativeContributionInspector,
  ProvenanceReport,
  SubmissionPackageBuilder,
  SubViewBoundary,
} from "@/components/loreguard/CpJournalPanel.views";
import type { AppLanguage } from "@/lib/studio-types";
import type {
  CertificateLanguage,
  CertificateView,
  CreativeEvent,
} from "@/lib/creative-process/types";
// 이벤트 read — 작은 IDB 모듈 (recordCreativeEvent 와 동일 파일). 상수(CREATIVE_EVENT_CAPTURED)
// 가 필요해 정적 import — report-builder·renderer 등 무거운 모듈은 발급 시 dynamic import.
import {
  CREATIVE_EVENT_CAPTURED,
  listCreativeEvents,
} from "@/lib/creative-process/event-recorder";
// [Z1c-mid-ports] Web Share — 기존 @/lib/browser/web-share 재사용. capability 감지
// (canShare/canShareFiles) 후 지원 브라우저에만 공유 버튼 노출 — 미지원 무동작.
import { canShare, canShareFiles, shareFile, shareText } from "@/lib/browser/web-share";

// ============================================================
// PART 3 — 헬퍼 (CreativeProcessSection PART 2/3 동일 로직)
// ============================================================

/** AppLanguage('KO'|'EN'|'JP'|'CN') → CertificateLanguage('ko'|'en'|'ja'|'zh') */
function toCertLang(lang: AppLanguage): CertificateLanguage {
  switch (lang) {
    case "KO": return "ko";
    case "EN": return "en";
    case "JP": return "ja";
    case "CN": return "zh";
    default: return "ko";
  }
}

/** Blob 다운로드 (CreativeProcessSection triggerDownload 동일 — 실패는 throw → 호출부 표면화) */
function triggerDownload(filename: string, content: string, mimeType: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const EVENTS_REFRESH_THROTTLE_MS = 5000;

type CpView = "inspector" | "provenance" | "submission";
type IssueStatus = "idle" | "working" | "success" | "error";

/** [D3-registry] 옵트인 레지스트리 등록 결과 — 발급 성공과 분리 표면화 (실패 비침묵) */
type RegisterStatus = "idle" | "success" | "already" | "error";

// ============================================================
// PART 4 — 메인 컴포넌트
// ============================================================

export default function CpJournalPanel() {
  const { currentSession, currentProjectId, projects, language } = useStudio();
  const { getIdToken } = useAuth();
  const certLang = toCertLang(language);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CpView>("inspector");

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단 (OnboardingOverlay 패턴).
  const dialogRef = useRef<HTMLElement>(null);
  // onEscape 생략 — 매 렌더 새 arrow identity 가 useFocusTrap effect 를 재실행시켜
  // rAF 가 입력 포커스를 닫기 버튼으로 빼앗는 회귀 차단. Escape 는 아래 window
  // keydown 핸들러가 담당 (WorldOpsPanel·TranslatePanels 동일 패턴).
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  // events: null = 아직 로드 안 됨(또는 실패) — 빈 배열([]) "0건" 과 구분 (정직 표면화)
  const [events, setEvents] = useState<CreativeEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const lastEventsRefreshRef = useRef(0);

  const [issueView, setIssueView] = useState<CertificateView>("private");
  const [issueStatus, setIssueStatus] = useState<IssueStatus>("idle");
  const [issueError, setIssueError] = useState<string | null>(null);
  const [lastFilenames, setLastFilenames] = useState<string[] | null>(null);

  // [Z1c-mid-ports] 마지막 발급 MD 본문 — OS 공유 시트 재공유용 (발급 성공 시에만 set)
  const [lastIssuedMd, setLastIssuedMd] = useState<{ name: string; content: string } | null>(null);
  // Web Share capability — lazy init 1회 감지 (canShare 는 SSR 안전 가드 내장).
  // 패널은 open 게이트(미오픈 = null 렌더)라 hydration 불일치 없음. 미지원 = 버튼 미노출.
  const [shareSupported] = useState(() => canShare());

  // [D3-registry] 홈페이지 검증 레지스트리 옵트인 — 기본 false (동의 시에만 register 호출)
  const [registerOptIn, setRegisterOptIn] = useState(false);
  const [registerStatus, setRegisterStatus] = useState<RegisterStatus>("idle");
  const [registerDetail, setRegisterDetail] = useState<string | null>(null);

  // [D2-github-mirror] 발급 후 GitHub 미러 결과 표면 — 옵트인 활성 시에만 set (null = 미옵트인·미표시)
  const [mirrorNotice, setMirrorNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // ----- 오픈 이벤트 청취 — unmount 시 cleanup (PART 4/5 패턴 동일) -----
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-cp", onOpen);
    return () => window.removeEventListener("loreguard:open-cp", onOpen);
  }, []);

  // ----- Escape 닫기 — 패널 오픈 중에만 청취 -----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ----- creative events 로드 (NovelIDELauncher journal 탭과 동일 호출) -----
  const refreshEvents = useCallback(async () => {
    if (!currentProjectId) {
      setEvents(null);
      setEventsError(null);
      return;
    }
    setEventsLoading(true);
    setEventsError(null);
    try {
      const evts = await listCreativeEvents({ projectId: currentProjectId, limit: 500 });
      setEvents(evts);
    } catch (err) {
      // 실패 ≠ 0건 — events 를 [] 로 위장하지 않는다 (정직 표면화)
      setEvents(null);
      setEventsError(err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120));
    } finally {
      setEventsLoading(false);
    }
  }, [currentProjectId]);

  // 오픈 시 + 프로젝트 전환 시(refreshEvents identity 변경) 로드
  useEffect(() => {
    if (!open) return;
    refreshEvents();
  }, [open, refreshEvents]);

  // 오픈 중 신규 기록 발생 → 5s throttle 재로드 (CreativeProcessSection PART 5.2 동일)
  useEffect(() => {
    if (!open) return;
    const handler = () => {
      const now = Date.now();
      if (now - lastEventsRefreshRef.current < EVENTS_REFRESH_THROTTLE_MS) return;
      lastEventsRefreshRef.current = now;
      refreshEvents();
    };
    window.addEventListener(CREATIVE_EVENT_CAPTURED, handler);
    return () => window.removeEventListener(CREATIVE_EVENT_CAPTURED, handler);
  }, [open, refreshEvents]);

  // ----- 발급 (CreativeProcessSection PART 5.3 흐름 — HTML + MD 동시) -----
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
      // 무거운 빌더·렌더러는 발급 시점에만 로드
      const cp = await import("@/lib/creative-process");

      // 프로젝트 실데이터 — useStudio projects (구 호출부 'noa_projects_v2' read 의 live 본체)
      const proj = projects.find((p) => p.id === currentProjectId);
      const fallbackName: Record<AppLanguage, string> = {
        KO: "내 작품", EN: "My Work", JP: "自作品", CN: "我的作品",
      };
      const projectName = proj?.name || fallbackName[language] || fallbackName.KO;

      const episodes: Array<{ episode: number; content: string }> = [];
      const charsSet = new Map<string, { id: string; name: string }>();
      let worldGenre: string | undefined;
      for (const sess of proj?.sessions ?? []) {
        for (const m of sess.config?.manuscripts ?? []) {
          if (typeof m.content === "string") {
            episodes.push({ episode: m.episode, content: m.content });
          }
        }
        for (const c of sess.config?.characters ?? []) {
          if (c?.id) charsSet.set(c.id, { id: c.id, name: c.name || c.id });
        }
        // 구 호출부 world.genre||worldSimData.genre 의 typed 실존 필드 = selectedGenre
        if (!worldGenre) worldGenre = sess.config?.worldSimData?.selectedGenre;
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

      // HTML + MD 둘 다 발급
      const html = cp.renderCertificateHtml(result.cert, result.sections, issueView, certLang);
      const md = cp.renderCertificateMarkdown(result.cert, result.sections, issueView, certLang);
      const htmlName = cp.buildCertificateFilename(result.cert, "html");
      const mdName = cp.buildCertificateFilename(result.cert, "md");
      triggerDownload(htmlName, html, "text/html;charset=utf-8");
      triggerDownload(mdName, md, "text/markdown;charset=utf-8");

      setLastFilenames([htmlName, mdName]);
      // [Z1c-mid-ports] OS 공유 재공유용 MD 본문 보존 (다운로드와 동일 산출물 — 재생성 X)
      setLastIssuedMd({ name: mdName, content: md });
      setIssueStatus("success");

      // 발급 HTML SHA-256 — 발급 이벤트 afterHash + 레지스트리 certHash 공용 (1회 계산)
      const certHtmlHash = await cp.computeSha256Hex(html);

      // ----- [D2-github-mirror] 옵트인 (noa-github-config + GITHUB_SYNC 플래그) 시에만 —
      // 확인서 GitHub 미러 → 반환 commitSha 를 cert 에 additive 보존 (githubCommitSha).
      // 순차 1 호출 (rate limit) · 실패해도 발급은 이미 성공 — 비차단, 표면화만.
      // 발급 이벤트 기록보다 먼저 실행 — note 에 commitSha 를 체인 안에 박기 위함.
      try {
        const mirror = await import("@/lib/creative-process/github-mirror");
        // [D1-pat-security] isCpMirrorEnabled 는 vault 토큰 복호화 포함 — async (await 필수)
        if (await mirror.isCpMirrorEnabled()) {
          const mirrored = await mirror.mirrorCertificate(result.cert);
          if (mirrored?.commitSha) {
            // 정직 표기 의무 — 앵커 한계 문구를 확인서 표면에 함께 노출
            setMirrorNotice({
              ok: true,
              text: L4(language, {
                ko: `GitHub 미러 완료 — commit ${mirrored.commitSha.slice(0, 7)} · ${mirror.ANCHOR_HONESTY_NOTICE.ko}`,
                en: `Mirrored to GitHub — commit ${mirrored.commitSha.slice(0, 7)} · ${mirror.ANCHOR_HONESTY_NOTICE.en}`,
              }),
            });
          } else {
            // null = 미러 실패 (모듈이 noa:alert 1회/60s 표면화) — 패널에도 국소 표시 (정직)
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
        // mirror 청크 로드 실패 — 발급 성공 유지, 비침묵 국소 표시
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

      // [s82-stage-coverage] 발급 이벤트 기록 — logger 5 메서드 중 의미 일치 없음
      // (logHumanEdit = 작가 1.0 오귀속·logExternalImport = 외부 편입 — 둘 다 부정직)
      // → recordCreativeEvent 직접: actorType 'system' + SYSTEM_GENERATED (HCI weight 0
      //   — hci-calculator.ts 설계 의도와 일치: "시스템 자동·작가 의도 무관").
      //   afterHash = 발급 HTML SHA-256 (체인 무결성 — 발급물 위변조 검출 가능).
      // 실패 비침묵: 발급 자체는 성공이므로 차단 X, noa:alert warning 표면화.
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
          // [D2-github-mirror] commitSha 를 체인 이벤트에 박음 — 발급물·외부 앵커 상호 참조
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

      // 법적 무게 안내 — CreativeProcessSection 발급 후 toast 동일 문구
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

      // ----- [D3-registry] 옵트인 동의 시에만 — 홈페이지 검증 레지스트리 등록 -----
      // 전송 = 메타데이터만 (certId·해시·공개범위 — 원고 본문 0byte). 등록 실패해도
      // 발급 자체는 이미 성공 — 차단 X, noa:alert 로 비침묵 표면화.
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
              // 타임아웃 — 레지스트리 hang 이 발급 플로우를 영구 점유하지 않게
              signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(15_000) : undefined,
              body: JSON.stringify({
                certId: result.cert.id,
                projectId: currentProjectId,
                certHash: certHtmlHash,
                chainTipHash: result.cert.chainTipHash ?? null,
                visibility: issueView,
                issuerType: result.cert.issuer?.type ?? "self",
                // [D2-github-mirror 연계] 미러 성공 시 commitSha 도 레지스트리에 앵커
                githubCommitSha: result.cert.githubCommitSha ?? null,
              }),
            });
            if (res.status === 201) {
              outcome = "success";
              detail = result.cert.id;
            } else if (res.status === 409) {
              // write-once — 같은 certId 재등록은 기존 등록 유지
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
  }, [currentProjectId, events, issueStatus, projects, language, certLang, issueView, registerOptIn, getIdToken]);

  // ----- 가드: 미오픈/세션 없음 → 미렌더 (TabWriting 버튼 gating 과 일치) -----
  const config = currentSession?.config;
  if (!open || !currentSession) return null;

  const zeroEvents = events !== null && events.length === 0;
  const issueDisabled =
    !currentProjectId || eventsLoading || events === null || zeroEvents || issueStatus === "working";

  // ----- S6 i18n — SubViewBoundary 주입 문자열 (class component 라 props 주입) -----
  const boundaryFail = (label: string) =>
    L4(language, {
      ko: `${label} 모듈을 불러오지 못했습니다 — 연결 상태를 확인한 뒤 다시 시도하세요`,
      en: `Failed to load the ${label} module — check your connection and try again`,
    });
  const retryLabel = L4(language, { ko: "다시 시도", en: "Retry" });

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "창작 과정 확인서", en: "Authorship Journal" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 94vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* head */}
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Scroll size={16} />
          {L4(language, { ko: "창작 과정 확인서", en: "Authorship Journal" })}
          {events !== null && (
            <span className="pill gray">
              {L4(language, {
                ko: `${events.length.toLocaleString()}건 기록`,
                en: `${events.length.toLocaleString()} events logged`,
              })}
            </span>
          )}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* events 상태 줄 — 로딩/에러/빈 상태 정직 표면화 */}
        {eventsLoading && (
          <div className="wr-srow" role="status" aria-live="polite">
            <span className="rdot blue" />
            {L4(language, { ko: "창작 이벤트 불러오는 중…", en: "Loading creative events…" })}
          </div>
        )}
        {!eventsLoading && eventsError && (
          <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)" }}>
            <span className="rdot amber" />
            {L4(language, { ko: "이벤트 로드 실패:", en: "Failed to load events:" })} {eventsError}
            <button
              type="button"
              className="mini-btn"
              style={{ marginLeft: "auto" }}
              onClick={() => refreshEvents()}
            >
              <Sync size={13} />
              {retryLabel}
            </button>
          </div>
        )}
        {!eventsLoading && !eventsError && !currentProjectId && (
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
            {L4(language, { ko: "프로젝트가 선택되지 않았습니다", en: "No project selected" })}
          </div>
        )}
        {!eventsLoading && !eventsError && zeroEvents && (
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
            {L4(language, {
              ko: "기록된 창작 이벤트가 없습니다 — 집필을 시작하면 자동으로 기록됩니다",
              en: "No creative events recorded yet — they are logged automatically once you start writing",
            })}
          </div>
        )}

        {/* ① 확인서 발급 — buildCertificate → HTML+MD 다운로드 */}
        <div className="pcard">
          <div className="pcard-h">
            <Download size={15} />
            {L4(language, { ko: "확인서 발급", en: "Issue journal" })}
            {issueStatus === "success" && (
              <span className="pill green" style={{ marginLeft: "auto" }}>
                <Check size={12} />
                {L4(language, { ko: "발급 완료", en: "Issued" })}
              </span>
            )}
          </div>
          <div className="wr-srow" style={{ color: "var(--c-sub, #888)" }}>
            {L4(language, {
              ko: "작업 과정을 정리한 확인서 (HTML + Markdown 2파일). 법적 효력 없음 — 참조 자료.",
              en: "A journal of your creative process (HTML + Markdown, 2 files). No legal effect — reference material.",
            })}
          </div>
          {/* 공개 범위 — CreativeProcessSection 과 동일 4 옵션 (value 비교 로직 무변경 — 라벨만 번역) */}
          <div className="wr-srow" style={{ gap: 10 }}>
            <label htmlFor="cp-issue-view" style={{ fontSize: 12, color: "var(--c-sub, #888)", whiteSpace: "nowrap" }}>
              {L4(language, { ko: "공개 범위", en: "Visibility" })}
            </label>
            <select
              id="cp-issue-view"
              value={issueView}
              onChange={(e) => setIssueView(e.target.value as CertificateView)}
              disabled={issueStatus === "working"}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 9,
                border: "1px solid var(--line)",
                background: "var(--card-2)",
                color: "inherit",
                font: "inherit",
                fontSize: 12.5,
              }}
            >
              <option value="private">{L4(language, { ko: "비공개 (작가)", en: "Private (author)" })}</option>
              <option value="publisher">{L4(language, { ko: "출판사", en: "Publisher" })}</option>
              <option value="public">{L4(language, { ko: "공개", en: "Public" })}</option>
              <option value="legal">{L4(language, { ko: "분쟁 보조 자료", en: "Dispute support material" })}</option>
            </select>
          </div>
          {/* [D3-registry] 옵트인 — 동의 시에만 /api/cp/register 호출. PIPA 정직 표기:
              저장 항목 명시 + "직접 작성 확인 불가" 한계 고지 (과장 문구 금지) */}
          <label
            className="wr-srow"
            style={{ gap: 8, alignItems: "flex-start", cursor: "pointer", marginTop: 8 }}
          >
            <input
              type="checkbox"
              checked={registerOptIn}
              onChange={(e) => setRegisterOptIn(e.target.checked)}
              disabled={issueStatus === "working"}
              style={{ marginTop: 2, flexShrink: 0 }}
              aria-describedby="cp-register-privacy"
            />
            <span style={{ fontSize: 12, lineHeight: 1.5 }}>
              {L4(language, {
                ko: "원본 확인 기록 남기기 — 메타데이터만 저장",
                en: "Leave an original confirmation record — metadata only",
              })}
              <span
                id="cp-register-privacy"
                style={{ display: "block", color: "var(--c-sub, #888)" }}
              >
                {L4(language, {
                  en: "Stored: journal ID, hashes, issue time, visibility, account UID (0 bytes of manuscript). It supports later change checks from the anchor time. Sign-in required.",
                  ko: "저장 항목: 확인서 ID·해시·발급 시각·공개 범위·계정 UID (원고 본문 0byte). 앵커 시점 이후 변경 여부 확인에 쓰입니다. 로그인 필요.",
                })}
              </span>
            </span>
          </label>
          <button
            type="button"
            className="btn primary"
            aria-label={L4(language, {
              ko: "창작 과정 확인서 발급 — HTML과 Markdown 다운로드",
              en: "Issue Authorship Journal — download HTML and Markdown",
            })}
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            disabled={issueDisabled}
            onClick={handleIssue}
          >
            {issueStatus === "working" ? (
              <>
                <Sync size={14} className="animate-spin" />
                {L4(language, { ko: "생성 중…", en: "Generating…" })}
              </>
            ) : (
              <>
                <Download size={14} />
                {zeroEvents
                  ? L4(language, { ko: "발급 불가 — 기록된 이벤트 없음", en: "Cannot issue — no recorded events" })
                  : L4(language, { ko: "확인서 발급 (HTML + MD)", en: "Issue journal (HTML + MD)" })}
              </>
            )}
          </button>
          {issueStatus === "success" && lastFilenames && (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 6 }}>
              <span className="rdot green" />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {lastFilenames.join(" · ")}
              </span>
              {/* [Z1c-mid-ports] OS 공유 — 발급된 MD 그대로 공유 (capability 감지·미지원 미노출).
                  파일 공유 미지원 브라우저는 텍스트 공유 폴백 (4000자 상한). 취소 = 무동작. */}
              {shareSupported && lastIssuedMd && (
                <button
                  type="button"
                  className="mini-btn"
                  style={{ marginLeft: "auto", flexShrink: 0 }}
                  aria-label={L4(language, {
                    ko: "발급된 확인서(Markdown)를 OS 공유 시트로 공유",
                    en: "Share the issued journal (Markdown) via the OS share sheet",
                  })}
                  onClick={() => {
                    void (async () => {
                      const ok = canShareFiles()
                        ? await shareFile(lastIssuedMd.name, lastIssuedMd.content, "text/markdown")
                        : await shareText(lastIssuedMd.name, lastIssuedMd.content.slice(0, 4000));
                      if (!ok) return; // 사용자 취소/미지원 — 무동작 (오류 위장 금지)
                    })();
                  }}
                >
                  {L4(language, { ko: "공유 (OS)", en: "Share (OS)" })}
                </button>
              )}
            </div>
          )}
          {/* [D2-github-mirror] 미러 결과 — 옵트인 시에만 표시. 성공 줄에 정직 표기 문구 포함 */}
          {mirrorNotice && (
            <div
              className="wr-srow"
              role={mirrorNotice.ok ? "status" : "alert"}
              style={{ color: mirrorNotice.ok ? "var(--c-sub, #888)" : "var(--c-amber)", marginTop: 4 }}
            >
              <span className={`rdot ${mirrorNotice.ok ? "green" : "amber"}`} />
              <span style={{ minWidth: 0 }}>{mirrorNotice.text}</span>
            </div>
          )}
          {issueStatus === "error" && issueError && (
            <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)", marginTop: 6 }}>
              <span className="rdot amber" />
              {L4(language, { ko: "발급 실패:", en: "Issue failed:" })} {issueError}
            </div>
          )}
          {/* [D3-registry] 등록 결과 — 발급 성공과 분리 표면화 (실패 비침묵) */}
          {(registerStatus === "success" || registerStatus === "already") && registerDetail && (
            <div className="wr-srow" style={{ color: "var(--c-sub, #888)", marginTop: 6 }}>
              <span className="rdot green" />
              {registerStatus === "success"
                ? L4(language, { ko: "확인 기록 저장 완료:", en: "Confirmation record saved:" })
                : L4(language, { ko: "이미 남긴 확인 기록:", en: "Confirmation record already exists:" })}{" "}
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                {registerDetail}
              </span>
            </div>
          )}
          {registerStatus === "error" && (
            <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)", marginTop: 6 }}>
              <span className="rdot amber" />
              {L4(language, {
                ko: "확인 기록 저장 실패 (확인서는 정상 발급):",
                en: "Confirmation record failed (journal issued normally):",
              })}{" "}
              {registerDetail}
            </div>
          )}
        </div>

        {/* ② sub-view 토글 — .seg (기존 세그먼트 클래스 재사용) */}
        <div className="seg" style={{ display: "flex", width: "100%" }}>
          <button
            type="button"
            className={view === "inspector" ? "on" : ""}
            style={{ flex: 1 }}
            aria-label={L4(language, { ko: "기여도 보기", en: "View contribution" })}
            aria-pressed={view === "inspector"}
            onClick={() => setView("inspector")}
          >
            {L4(language, { ko: "기여도", en: "Contribution" })}
          </button>
          <button
            type="button"
            className={view === "provenance" ? "on" : ""}
            style={{ flex: 1 }}
            aria-label={L4(language, { ko: "출처 보고서 보기", en: "View provenance report" })}
            aria-pressed={view === "provenance"}
            onClick={() => setView("provenance")}
          >
            {L4(language, { ko: "출처", en: "Provenance" })}
          </button>
          <button
            type="button"
            className={view === "submission" ? "on" : ""}
            style={{ flex: 1 }}
            aria-label={L4(language, { ko: "투고 패키지 보기", en: "View submission package" })}
            aria-pressed={view === "submission"}
            onClick={() => setView("submission")}
          >
            {L4(language, { ko: "투고 패키지", en: "Submission package" })}
          </button>
        </div>

        {/* ③ sub-view 본문 — 구 NovelIDELauncher journal 탭과 동일 props */}
        {view === "inspector" && (
          <SubViewBoundary
            failMessage={boundaryFail(L4(language, { ko: "기여도", en: "contribution" }))}
            retryLabel={retryLabel}
          >
            <CreativeContributionInspector
              events={events ?? []}
              language={certLang}
              view="private"
              contextMeta={{
                sceneCount: config?.manuscripts?.length,
                activeCharacters: config?.characters?.map((c) => c.name).slice(0, 8),
              }}
              compact
            />
          </SubViewBoundary>
        )}
        {view === "provenance" && (
          <SubViewBoundary
            failMessage={boundaryFail(L4(language, { ko: "출처 보고서", en: "provenance report" }))}
            retryLabel={retryLabel}
          >
            <ProvenanceReport
              events={events ?? []}
              language={certLang}
              workTitle={config?.synopsis?.slice(0, 40) ?? undefined}
            />
          </SubViewBoundary>
        )}
        {view === "submission" && (
          <SubViewBoundary
            failMessage={boundaryFail(L4(language, { ko: "투고 패키지", en: "submission package" }))}
            retryLabel={retryLabel}
          >
            <SubmissionPackageBuilder language={language} projectIdOverride={currentProjectId} />
          </SubViewBoundary>
        )}
      </aside>
    </div>
  );
}
