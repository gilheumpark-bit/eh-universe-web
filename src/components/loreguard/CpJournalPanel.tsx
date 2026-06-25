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
import { useCreativeProcessTrackingPreference } from "@/hooks/useCreativeProcessTrackingPreference";
import { L4 } from "@/lib/i18n";
import { Check, Download, Scroll, Sync, X } from "@/components/loreguard/icons";
import {
  EVENTS_REFRESH_THROTTLE_MS,
  toCertLang,
  type CpView,
} from "@/components/loreguard/CpJournalPanel.helpers";
import { useCpJournalIssue } from "@/components/loreguard/CpJournalPanel.issue";
import {
  CpJournalSubViews,
} from "@/components/loreguard/CpJournalPanel.subviews";
import { SealCard } from "@/components/loreguard/SealCard";
import type {
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
import { canShareFiles, shareFile, shareText } from "@/lib/browser/web-share";

// ============================================================
// PART 4 — 메인 컴포넌트
// ============================================================

export default function CpJournalPanel() {
  const { currentSession, currentProjectId, projects, language } = useStudio();
  const { getIdToken } = useAuth();
  const certLang = toCertLang(language);
  const [trackingEnabled, setTrackingEnabled] = useCreativeProcessTrackingPreference();

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

  const {
    issueView,
    setIssueView,
    issueStatus,
    issueError,
    lastFilenames,
    lastIssuedMd,
    lastCert,
    shareSupported,
    registerOptIn,
    setRegisterOptIn,
    registerStatus,
    registerDetail,
    mirrorNotice,
    handleIssue,
  } = useCpJournalIssue({
    currentProjectId,
    events,
    projects,
    language,
    certLang,
    getIdToken,
  });

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
      className="eh-app cpjournal-overlay"
      onClick={() => setOpen(false)}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "창작 과정 확인서", en: "Authorship Journal" })}
        onClick={(e) => e.stopPropagation()}
        className="cpjournal-panel"
      >
        {/* head */}
        <div className="pcard-h cpjournal-head">
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
            data-align="end"
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
          <div className="wr-srow cpjournal-warning" role="alert">
            <span className="rdot amber" />
            {L4(language, { ko: "이벤트 로드 실패:", en: "Failed to load events:" })} {eventsError}
            <button
              type="button"
              className="mini-btn"
              data-align="end"
              onClick={() => refreshEvents()}
            >
              <Sync size={13} />
              {retryLabel}
            </button>
          </div>
        )}
        {!eventsLoading && !eventsError && !currentProjectId && (
          <div className="wr-srow cpjournal-muted">
            {L4(language, { ko: "프로젝트가 선택되지 않았습니다", en: "No project selected" })}
          </div>
        )}
        {!eventsLoading && !eventsError && zeroEvents && (
          <div className="wr-srow cpjournal-muted">
            {L4(language, {
              ko: trackingEnabled
                ? "기록된 창작 이벤트가 없습니다 — 집필을 시작하면 과정기록이 쌓입니다"
                : "과정기록이 꺼져 있습니다 — 확인서가 필요할 때 지금부터 기록을 시작하세요",
              en: trackingEnabled
                ? "No creative events recorded yet — records will build as you write"
                : "Process records are off — start recording when you need a journal",
            })}
          </div>
        )}

        <div className="pcard">
          <div className="pcard-h">
            <Scroll size={15} />
            {L4(language, { ko: "발급용 기록", en: "Journal records" })}
            <span className={`pill ${trackingEnabled ? "green" : "gray"} cpjournal-push`}>
              {trackingEnabled
                ? L4(language, { ko: "켜짐", en: "On" })
                : L4(language, { ko: "꺼짐", en: "Off" })}
            </span>
          </div>
          <div className="wr-srow cpjournal-muted">
            {L4(language, {
              ko: "확인서에 넣을 작업 흐름은 작가가 켠 뒤부터 남깁니다. 끄면 일반 집필 도구처럼 동작합니다.",
              en: "Work records are kept only after you turn this on. When off, the editor behaves like a regular writing tool.",
            })}
          </div>
          <button
            type="button"
            className={trackingEnabled ? "mini-btn" : "btn primary"}
            data-full-action="true"
            role="switch"
            aria-checked={trackingEnabled}
            onClick={() => setTrackingEnabled(!trackingEnabled)}
          >
            {trackingEnabled
              ? L4(language, { ko: "기록 끄기", en: "Stop recording" })
              : L4(language, { ko: "지금부터 기록 시작", en: "Start recording now" })}
          </button>
        </div>

        {/* ① 확인서 발급 — buildCertificate → HTML+MD 다운로드 */}
        <div className="pcard">
          <div className="pcard-h">
            <Download size={15} />
            {L4(language, { ko: "확인서 발급", en: "Issue journal" })}
            {issueStatus === "success" && (
              <span className="pill green cpjournal-push">
                <Check size={12} />
                {L4(language, { ko: "발급 완료", en: "Issued" })}
              </span>
            )}
          </div>
          <div className="wr-srow cpjournal-muted">
            {L4(language, {
              ko: "작업 과정을 정리한 확인서 (HTML + Markdown 2파일). 법적 효력 없음 — 참조 자료.",
              en: "A journal of your creative process (HTML + Markdown, 2 files). No legal effect — reference material.",
            })}
          </div>
          {/* 공개 범위 — CreativeProcessSection 과 동일 4 옵션 (value 비교 로직 무변경 — 라벨만 번역) */}
          <div className="wr-srow cpjournal-visibility-row">
            <label htmlFor="cp-issue-view" className="cpjournal-visibility-label">
              {L4(language, { ko: "공개 범위", en: "Visibility" })}
            </label>
            <select
              id="cp-issue-view"
              value={issueView}
              onChange={(e) => setIssueView(e.target.value as CertificateView)}
              disabled={issueStatus === "working"}
              className="cpjournal-select"
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
            data-register-row="true"
          >
            <input
              type="checkbox"
              checked={registerOptIn}
              onChange={(e) => setRegisterOptIn(e.target.checked)}
              disabled={issueStatus === "working"}
              className="cpjournal-checkbox"
              aria-describedby="cp-register-privacy"
            />
            <span className="cpjournal-copy">
              {L4(language, {
                ko: "원본 확인 기록 남기기 — 메타데이터만 저장",
                en: "Leave an original confirmation record — metadata only",
              })}
              <span
                id="cp-register-privacy"
                className="cpjournal-copy-sub"
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
            data-full-action="true"
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
            <div className="wr-srow cpjournal-result-row">
              <span className="rdot green" />
              <span className="cpjournal-truncate">
                {lastFilenames.join(" · ")}
              </span>
              {/* [Z1c-mid-ports] OS 공유 — 발급된 MD 그대로 공유 (capability 감지·미지원 미노출).
                  파일 공유 미지원 브라우저는 텍스트 공유 폴백 (4000자 상한). 취소 = 무동작. */}
              {shareSupported && lastIssuedMd && (
                <button
                  type="button"
                  className="mini-btn"
                  data-share-action="true"
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
          {/* 봉인 카드 — SealNumber + QR */}
          {issueStatus === "success" && lastCert?.sealNumber && lastCert.verificationUrl && (
            <SealCard
              sealNumber={lastCert.sealNumber}
              verificationUrl={lastCert.verificationUrl}
              language={language}
            />
          )}

          {/* [D2-github-mirror] 미러 결과 — 옵트인 시에만 표시. 성공 줄에 정직 표기 문구 포함 */}
          {mirrorNotice && (
            <div
              className={`wr-srow cpjournal-notice ${mirrorNotice.ok ? "is-ok" : "is-warning"}`}
              role={mirrorNotice.ok ? "status" : "alert"}
            >
              <span className={`rdot ${mirrorNotice.ok ? "green" : "amber"}`} />
              <span className="cpjournal-inline-text">{mirrorNotice.text}</span>
            </div>
          )}
          {issueStatus === "error" && issueError && (
            <div className="wr-srow cpjournal-alert-row" role="alert">
              <span className="rdot amber" />
              {L4(language, { ko: "발급 실패:", en: "Issue failed:" })} {issueError}
            </div>
          )}
          {/* [D3-registry] 등록 결과 — 발급 성공과 분리 표면화 (실패 비침묵) */}
          {(registerStatus === "success" || registerStatus === "already") && registerDetail && (
            <div className="wr-srow cpjournal-result-row">
              <span className="rdot green" />
              {registerStatus === "success"
                ? L4(language, { ko: "확인 기록 저장 완료:", en: "Confirmation record saved:" })
                : L4(language, { ko: "이미 남긴 확인 기록:", en: "Confirmation record already exists:" })}{" "}
              <span className="cpjournal-truncate">
                {registerDetail}
              </span>
            </div>
          )}
          {registerStatus === "error" && (
            <div className="wr-srow cpjournal-alert-row" role="alert">
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
        <div className="seg cpjournal-seg">
          <button
            type="button"
            className={view === "inspector" ? "on" : ""}
            data-seg-button="true"
            aria-label={L4(language, { ko: "기여도 보기", en: "View contribution" })}
            aria-pressed={view === "inspector"}
            onClick={() => setView("inspector")}
          >
            {L4(language, { ko: "기여도", en: "Contribution" })}
          </button>
          <button
            type="button"
            className={view === "provenance" ? "on" : ""}
            data-seg-button="true"
            aria-label={L4(language, { ko: "출처 보고서 보기", en: "View provenance report" })}
            aria-pressed={view === "provenance"}
            onClick={() => setView("provenance")}
          >
            {L4(language, { ko: "출처", en: "Provenance" })}
          </button>
          <button
            type="button"
            className={view === "submission" ? "on" : ""}
            data-seg-button="true"
            aria-label={L4(language, { ko: "투고 패키지 보기", en: "View submission package" })}
            aria-pressed={view === "submission"}
            onClick={() => setView("submission")}
          >
            {L4(language, { ko: "투고 패키지", en: "Submission package" })}
          </button>
        </div>

        <CpJournalSubViews
          view={view}
          events={events}
          language={language}
          certLang={certLang}
          config={config}
          currentProjectId={currentProjectId}
          boundaryFail={boundaryFail}
          retryLabel={retryLabel}
        />
      </aside>
    </div>
  );
}
