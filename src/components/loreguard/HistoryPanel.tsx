"use client";

/* ===========================================================
   HistoryPanel — 히스토리 slide-over (Z2c-history-visual)

   오픈: window CustomEvent 'loreguard:open-history'
         (발신 = LoreguardStudio 검색 팔레트 Action '히스토리' + 설정 헤더 버튼 — 2 진입점).
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — MemoPanel 과 동일 slide-over 패턴
         (리스너 전부 cleanup).

   구 셸 HistoryTab(src/components/studio/tabs/HistoryTab.tsx — 세션 그리드 열람)의
   가치를 새 셸 데이터로 재구성. 읽기 전용 우선 — 신규 엔진 0:
   - 회차 저장 이력 → useStudio sessions (현재 프로젝트 · lastUpdate desc).
     행 클릭 = 해당 회차 열기 (setCurrentSessionId + 집필 탭 — useLoreguardTab.
     구 HistoryTab openSession 과 동일 가치 · 새 셸 탭 ID 로).
   - 버전 백업    → useStudio versionedBackups (IDB — 오픈 시 refreshBackupList).
     복원 실행은 기존 경로(설정 → 백업 복원) 단일 유지 — 본 패널은 열람만
     (파괴 경로 중복 금지 · 읽기 전용).
   - 창작 이벤트 요약 → listCreativeEvents({ projectId, limit: 500 })
     (CpJournalPanel 과 동일 호출). 실패 ≠ 0건 — null 과 [] 구분 (정직 표면화).

   토큰 스코프: MemoPanel/ToastHost 패턴 — 루트에 .eh-app 직접 부여
   (LoreguardStudio sibling mount = LoreguardShell .eh-app 트리 밖).
   다크: html/body data-theme → [data-theme="dark"] .eh-app 토큰 연쇄.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useLoreguardTab } from "./LoreguardTabContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Clock, Sync, X } from "./icons";
import { listCreativeEvents } from "@/lib/creative-process/event-recorder";
import { reportError } from "@/components/ErrorBoundary";
import type { CreativeEvent } from "@/lib/creative-process/types";
import type { AppLanguage, ChatSession } from "@/lib/studio-types";

// ============================================================
// PART 1 — 헬퍼 (locale 매핑 · 날짜 포맷)
// ============================================================

const LOCALE: Record<AppLanguage, string> = {
  KO: "ko-KR",
  EN: "en-US",
  JP: "ja-JP",
  CN: "zh-CN",
};

/** epoch ms 또는 ISO 문자열 → 짧은 로컬 일시. 파싱 불가 시 '—' (날조 금지). */
function formatAt(ts: number | string, language: AppLanguage): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(LOCALE[language] ?? "ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EVENTS_LIMIT = 500; // CpJournalPanel 과 동일 상한
const RECENT_EVENTS_SHOWN = 5;

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

export default function HistoryPanel() {
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    currentProjectId,
    versionedBackups,
    refreshBackupList,
    lastSaveTime,
    language,
  } = useStudio();
  const { setActiveTab } = useLoreguardTab();

  const [open, setOpen] = useState(false);

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단 (OnboardingOverlay 패턴).
  const dialogRef = useRef<HTMLElement>(null);
  // onEscape 생략 — 매 렌더 새 arrow identity 가 useFocusTrap effect 를 재실행시켜
  // rAF 가 입력 포커스를 닫기 버튼으로 빼앗는 회귀 차단. Escape 는 아래 window
  // keydown 핸들러가 담당 (WorldOpsPanel·TranslatePanels 동일 패턴).
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  // events: null = 미로드/실패 — [] "0건" 과 구분 (CpJournalPanel 정직 표면화 패턴)
  const [events, setEvents] = useState<CreativeEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // ----- creative events 로드 (CpJournalPanel refreshEvents 동일 흐름) -----
  const refreshEvents = useCallback(async () => {
    if (!currentProjectId) {
      setEvents(null);
      setEventsError(null);
      return;
    }
    setEventsLoading(true);
    setEventsError(null);
    try {
      const evts = await listCreativeEvents({ projectId: currentProjectId, limit: EVENTS_LIMIT });
      setEvents(evts);
    } catch (err) {
      setEvents(null);
      setEventsError(err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120));
      // [QA-robustness (5)] 인라인 에러에 더해 Sentry 보고 + toast (관측 사각 제거·침묵 금지).
      reportError(err instanceof Error ? err : new Error(String(err)), "HistoryPanel.refreshEvents");
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("noa:toast", {
            detail: {
              message: L4(language, {
                ko: "창작 이벤트를 불러오지 못했습니다.",
                en: "Failed to load creative events.",
                ja: "創作イベントを読み込めませんでした。",
                zh: "无法加载创作事件。",
              }),
              variant: "error",
            },
          }));
        } catch { /* window 부재 (SSR) */ }
      }
    } finally {
      setEventsLoading(false);
    }
  }, [currentProjectId, language]);

  // ----- 오픈 이벤트 청취 — 열 때마다 백업 목록·이벤트 재로드 (최신 반영) -----
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      refreshBackupList?.();
      void refreshEvents();
    };
    window.addEventListener("loreguard:open-history", onOpen);
    return () => window.removeEventListener("loreguard:open-history", onOpen);
  }, [refreshBackupList, refreshEvents]);

  // ----- Escape 닫기 — 패널 오픈 중에만 청취 -----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 회차 — lastUpdate desc (구 HistoryTab filtered sort 동일)
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.lastUpdate - a.lastUpdate),
    [sessions],
  );

  // 회차 열기 — 구 HistoryTab openSession 가치 · 새 셸 탭 전환은 useLoreguardTab 단일 경로
  const openSession = useCallback(
    (s: ChatSession) => {
      setCurrentSessionId(s.id);
      setActiveTab("writing");
      setOpen(false);
    },
    [setCurrentSessionId, setActiveTab],
  );

  const recentEvents = useMemo(
    () => (events ?? []).slice(0, RECENT_EVENTS_SHOWN),
    [events],
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="eh-app history-overlay"
      onClick={() => setOpen(false)}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "히스토리", en: "History", ja: "履歴", zh: "历史" })}
        onClick={(e) => e.stopPropagation()}
        className="history-panel"
      >
        {/* head */}
        <div className="pcard-h history-head">
          <Clock size={16} />
          {L4(language, { ko: "히스토리", en: "History", ja: "履歴", zh: "历史" })}
          <span className="history-meta">
            {lastSaveTime
              ? `${L4(language, { ko: "마지막 저장", en: "Last saved", ja: "最終保存", zh: "最后保存" })} · ${formatAt(lastSaveTime, language)}`
              : L4(language, { ko: "저장 전", en: "Not saved yet", ja: "未保存", zh: "尚未保存" })}
          </span>
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel", ja: "パネルを閉じる", zh: "关闭面板" })}
            autoFocus
            data-align="end"
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── 회차 저장 이력 (현재 프로젝트 · 읽기 + 열기) ── */}
        <section className="pcard" aria-label={L4(language, { ko: "회차 저장 이력", en: "Saved sessions", ja: "保存された回", zh: "已保存章节" })}>
          <div className="pcard-h">
            {L4(language, { ko: "회차 저장 이력", en: "Saved sessions", ja: "保存された回", zh: "已保存章节" })}
            <span className="history-count">
              {sortedSessions.length}
            </span>
          </div>
          {sortedSessions.length === 0 ? (
            <div className="wr-srow history-muted-row">
              {L4(language, {
                ko: "현재 프로젝트에 저장된 회차가 없습니다.",
                en: "No saved sessions in this project.",
                ja: "このプロジェクトに保存された回はありません。",
                zh: "当前项目没有已保存的章节。",
              })}
            </div>
          ) : (
            <ul className="history-list history-list-sessions">
              {sortedSessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openSession(s)}
                    aria-label={L4(language, {
                      ko: `회차 열기: ${s.title || s.config.genre}`,
                      en: `Open session: ${s.title || s.config.genre}`,
                      ja: `回を開く: ${s.title || s.config.genre}`,
                      zh: `打开章节: ${s.title || s.config.genre}`,
                    })}
                    className={`history-session-btn ${currentSessionId === s.id ? "is-current" : ""}`}
                  >
                    <div className="history-session-title">
                      {s.title || s.config.genre || "Untitled"}
                    </div>
                    <div className="history-session-meta">
                      <span>{s.config.genre}</span>
                      <span>EP.{s.config.episode}</span>
                      <span>{s.messages.length} msg</span>
                      <span className="history-time-push">{formatAt(s.lastUpdate, language)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── 버전 백업 (열람만 — 복원은 설정 → 백업) ── */}
        <section className="pcard" aria-label={L4(language, { ko: "버전 백업", en: "Version backups", ja: "バージョンバックアップ", zh: "版本备份" })}>
          <div className="pcard-h">
            {L4(language, { ko: "버전 백업", en: "Version backups", ja: "バージョンバックアップ", zh: "版本备份" })}
            <span className="history-count">
              {(versionedBackups ?? []).length}
            </span>
          </div>
          {(versionedBackups ?? []).length === 0 ? (
            <div className="wr-srow history-muted-row">
              {L4(language, {
                ko: "버전 백업이 없습니다 (저장 시 자동 적재).",
                en: "No version backups yet (created automatically on save).",
                ja: "バージョンバックアップはありません（保存時に自動作成）。",
                zh: "暂无版本备份（保存时自动创建）。",
              })}
            </div>
          ) : (
            <ul className="history-list history-list-backups">
              {(versionedBackups ?? []).map((b) => (
                <li
                  key={b.timestamp}
                  className="history-backup-item"
                >
                  <span className="history-backup-title">
                    {b.label || formatAt(b.timestamp, language)}
                  </span>
                  <span className="history-backup-meta">
                    {L4(language, {
                      ko: `프로젝트 ${b.projects.length}개`,
                      en: `${b.projects.length} project(s)`,
                      ja: `プロジェクト ${b.projects.length}件`,
                      zh: `${b.projects.length} 个项目`,
                    })}
                  </span>
                  <span className="history-backup-time">
                    {formatAt(b.timestamp, language)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="history-note">
            {L4(language, {
              ko: "복원 실행은 설정 → 백업 복원에서 (본 패널은 열람 전용).",
              en: "To restore, use Settings → Backup restore (this panel is read-only).",
              ja: "復元は 設定 → バックアップ復元 から（本パネルは閲覧専用）。",
              zh: "如需恢复请前往 设置 → 备份恢复（本面板为只读）。",
            })}
          </p>
        </section>

        {/* ── 창작 이벤트 요약 (CP 이벤트 체인 — CpJournalPanel 동일 소스) ── */}
        <section className="pcard" aria-label={L4(language, { ko: "창작 이벤트", en: "Creative events", ja: "創作イベント", zh: "创作事件" })}>
          <div className="pcard-h">
            {L4(language, { ko: "창작 이벤트", en: "Creative events", ja: "創作イベント", zh: "创作事件" })}
            {events !== null && (
              <span className="history-count">
                {events.length >= EVENTS_LIMIT ? `${EVENTS_LIMIT}+` : events.length}
              </span>
            )}
            <button
              type="button"
              className="mini-btn"
              data-align="end"
              disabled={eventsLoading}
              onClick={() => void refreshEvents()}
            >
              <Sync size={13} />
              {L4(language, { ko: "새로고침", en: "Refresh", ja: "更新", zh: "刷新" })}
            </button>
          </div>
          {eventsLoading ? (
            <div className="wr-srow history-muted-row">
              {L4(language, { ko: "불러오는 중…", en: "Loading…", ja: "読み込み中…", zh: "加载中…" })}
            </div>
          ) : eventsError ? (
            <div className="wr-srow history-warning" role="alert">
              <span className="rdot amber" />
              {L4(language, { ko: "이벤트 로드 실패: ", en: "Failed to load events: ", ja: "イベントの読み込みに失敗: ", zh: "事件加载失败: " })}
              {eventsError}
            </div>
          ) : !currentProjectId ? (
            <div className="wr-srow history-muted-row">
              {L4(language, { ko: "프로젝트가 없습니다.", en: "No project.", ja: "プロジェクトがありません。", zh: "没有项目。" })}
            </div>
          ) : events === null || events.length === 0 ? (
            <div className="wr-srow history-muted-row">
              {L4(language, {
                ko: "기록된 창작 이벤트가 없습니다. 상세는 집필 탭 → 확인서.",
                en: "No creative events recorded. See Writing tab → Certificate for details.",
                ja: "記録された創作イベントはありません。詳細は執筆タブ → 確認書。",
                zh: "暂无创作事件记录。详情见写作标签 → 确认书。",
              })}
            </div>
          ) : (
            <>
              <ul className="history-list history-event-list">
                {recentEvents.map((e) => (
                  <li key={e.id} className="wr-srow history-event-row">
                    <span className="rdot blue" />
                    <span className="history-event-type">{e.eventType}</span>
                    <span className="history-event-target">{e.targetType}</span>
                    <span className="history-event-time">
                      {formatAt(e.createdAt, language)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="history-note">
                {L4(language, {
                  ko: "최근 5건 — 전체·발급은 집필 탭 → 확인서.",
                  en: "Latest 5 — full list & certificate in Writing tab → Certificate.",
                  ja: "最新5件 — 全件・発行は執筆タブ → 確認書。",
                  zh: "最近 5 条 — 完整列表与签发见写作标签 → 确认书。",
                })}
              </p>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
