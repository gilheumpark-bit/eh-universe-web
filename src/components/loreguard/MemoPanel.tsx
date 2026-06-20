"use client";

/* ===========================================================
   MemoPanel — 메모 보드 slide-over (Z1c-mid-ports · MID 이식)

   오픈: window CustomEvent 'loreguard:open-memo'
         (발신 = LoreguardStudio 검색 팔레트 'Action' "메모 보드" — 단일 진입점).
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — RevisionPanel·CpJournalPanel
         과 동일 slide-over 패턴 (리스너 전부 cleanup).

   내용: 데스크톱 src/app/desktop/page.tsx MemoBoard(~93줄) 이식 — 즉흥
   아이디어 스크래치패드 (Muvel 4부 흡수 동일 사상). 신규 엔진 0:
   - 영속  = localStorage `noa-lg-memos:<projectId>` (프로젝트별 스크래치 —
     아직 "설정"이 아닌 것들이라도 타 프로젝트로 넘어가지 않게 격리).
     데스크톱 키 'noa_desktop_memos_v1' 과는 별개 보드 — 자동 병합/마이그레이션 없음.
   - 요약  = 기존 summarizeNotes(@/lib/creative/work-note) 재사용
     (데스크톱과 동일하게 메모 전부를 phase 'plan' 노트로 집계).

   토큰 스코프: ToastHost 패턴 — 루트에 .eh-app 직접 부여해 loreguard
   토큰 상속 (StudioShell children 분기 mount = LoreguardShell 트리 밖).
   .eh-app 의 레이아웃(min-width 1180px·height 100%·배경)은 inline 으로 override.
   다크: html/body data-theme → [data-theme="dark"] .eh-app 토큰 연쇄 (F1 가드).

   가드: SSR 안전(typeof window) · quota 초과 silent · 깨진 JSON → 빈 배열.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { StickyNote, X } from "./icons";
import { summarizeNotes, type WorkPhase } from "@/lib/creative/work-note";
import { reportError } from "@/components/ErrorBoundary";
import type { AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 1 — 영속 (localStorage `noa-lg-memos:<projectId>`)
// ============================================================

interface MemoCard {
  id: string;
  text: string;
  at: number;
}

const MEMO_KEY_PREFIX = "noa-lg-memos";
const UNBOUND_MEMO_SCOPE = "no-project";

export function buildMemoStorageKey(projectId?: string | null): string {
  const trimmed = projectId?.trim();
  return `${MEMO_KEY_PREFIX}:${trimmed ? encodeURIComponent(trimmed) : UNBOUND_MEMO_SCOPE}`;
}

/** noa:toast 발화 (ToastHost 계약). SSR/이벤트 차단 시 no-op. */
function memoToast(message: string, variant: "error" | "info" = "error"): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("noa:toast", { detail: { message, variant, duration: 8000 } }));
  } catch { /* window 부재 (SSR) */ }
}

/**
 * loadMemos 결과 — 부분 손상 고지를 위해 droppedCount 동반.
 * [QA-robustness (5)] 침묵 드롭/전체 폐기 금지 — 손상 발생 시 호출자가 고지한다.
 */
interface LoadMemosResult {
  memos: MemoCard[];
  droppedCount: number; // 형식 위반으로 버려진 항목 수 (부분 손상)
  parseError: boolean;  // JSON 파싱 자체 실패 (전체 로드 불가)
}

function loadMemos(storageKey: string): LoadMemosResult {
  if (typeof window === "undefined") return { memos: [], droppedCount: 0, parseError: false };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { memos: [], droppedCount: 0, parseError: false };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { memos: [], droppedCount: 0, parseError: true };
    // 깨진 항목은 드랍 (전체 폐기 X — 부분 보존). 단 드롭 수를 집계해 고지한다.
    const memos = parsed.filter(
      (m): m is MemoCard =>
        !!m &&
        typeof m === "object" &&
        typeof (m as MemoCard).id === "string" &&
        typeof (m as MemoCard).text === "string" &&
        typeof (m as MemoCard).at === "number",
    );
    return { memos, droppedCount: parsed.length - memos.length, parseError: false };
  } catch (err) {
    // 전체 파싱 실패 — Sentry 보고 (침묵 폐기 금지). 빈 보드로 폴백.
    reportError(err instanceof Error ? err : new Error(String(err)), "MemoPanel.loadMemos");
    return { memos: [], droppedCount: 0, parseError: true };
  }
}

/** @returns 저장 성공 여부 (false = quota/private 등으로 실패 → 호출자가 고지). */
function saveMemos(storageKey: string, memos: MemoCard[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(memos));
    return true;
  } catch (err) {
    // quota/사파리 private — 세션 내 state 로는 유지되나, 영속 실패는 사용자에게 고지.
    reportError(err instanceof Error ? err : new Error(String(err)), "MemoPanel.saveMemos");
    return false;
  }
}

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

export default function MemoPanel({
  language,
  projectId = null,
}: {
  language: AppLanguage;
  projectId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [memos, setMemos] = useState<MemoCard[]>([]);
  const [draft, setDraft] = useState("");
  const memoStorageKey = useMemo(() => buildMemoStorageKey(projectId), [projectId]);

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단 (OnboardingOverlay 패턴).
  const dialogRef = useRef<HTMLElement>(null);
  // onEscape 생략 — 매 렌더 새 arrow identity 가 useFocusTrap effect 를 재실행시켜
  // rAF 가 입력 포커스를 닫기 버튼으로 빼앗는 회귀 차단. Escape 는 아래 window
  // keydown 핸들러가 담당 (WorldOpsPanel·TranslatePanels 동일 패턴).
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  const loadScopedMemos = useCallback(
    () => {
      const { memos: loaded, droppedCount, parseError } = loadMemos(memoStorageKey);
      setMemos(loaded);
      if (parseError) {
        memoToast(
          L4(language, {
            ko: "메모 데이터가 손상되어 일부를 불러오지 못했습니다.",
            en: "Memo data was corrupted and could not be fully loaded.",
            ja: "メモデータが破損し、一部を読み込めませんでした。",
            zh: "便签数据已损坏，无法完整加载。",
          }),
        );
      } else if (droppedCount > 0) {
        memoToast(
          L4(language, {
            ko: `손상된 메모 ${droppedCount}건을 건너뛰고 나머지를 불러왔습니다.`,
            en: `Skipped ${droppedCount} corrupted memo(s); the rest were loaded.`,
            ja: `破損したメモ ${droppedCount}件をスキップし、残りを読み込みました。`,
            zh: `已跳过 ${droppedCount} 条损坏的便签，其余已加载。`,
          }),
          "info",
        );
      }
    },
    [language, memoStorageKey],
  );

  // ----- 오픈 이벤트 청취 — 열 때마다 재로드 (다른 탭/세션 변경 흡수) -----
  const openMemoPanel = useCallback(() => {
    setOpen(true);
    queueMicrotask(() => {
      loadScopedMemos();
    });
  }, [loadScopedMemos]);

  useEffect(() => {
    window.addEventListener("loreguard:open-memo", openMemoPanel);
    return () => window.removeEventListener("loreguard:open-memo", openMemoPanel);
  }, [openMemoPanel]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      loadScopedMemos();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadScopedMemos, open]);

  // ----- Escape 닫기 — 패널 오픈 중에만 청취 -----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    const next = [{ id: `${Date.now()}_${memos.length}`, text: t, at: Date.now() }, ...memos];
    setMemos(next);
    if (!saveMemos(memoStorageKey, next)) {
      // [QA-robustness (5)] 영속 실패(quota/private) — 침묵 금지. state 는 유지되나 고지.
      memoToast(
        L4(language, {
          ko: "메모를 저장하지 못했습니다 (저장 공간 부족). 작품을 내보낸 뒤 다시 시도해 주세요.",
          en: "Failed to save the memo (storage full). Export your work and try again.",
          ja: "メモを保存できませんでした（容量不足）。作品を書き出してから再試行してください。",
          zh: "无法保存便签（存储空间不足）。请导出作品后重试。",
        }),
      );
    }
    setDraft("");
  };

  const remove = (id: string) => {
    const next = memos.filter((m) => m.id !== id);
    setMemos(next);
    if (!saveMemos(memoStorageKey, next)) {
      memoToast(
        L4(language, {
          ko: "메모 삭제를 저장하지 못했습니다 (저장 공간 부족).",
          en: "Failed to persist memo deletion (storage full).",
          ja: "メモ削除を保存できませんでした（容量不足）。",
          zh: "无法保存便签删除（存储空间不足）。",
        }),
      );
    }
  };

  // 작업노트 요약 — 기존 summarizeNotes 재사용 (데스크톱 MemoBoard 동일 매핑)
  const summary = useMemo(
    () =>
      summarizeNotes(
        memos.map((m) => ({ id: m.id, phase: "plan" as WorkPhase, note: m.text, at: m.at })),
      ),
    [memos],
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="eh-app"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        minWidth: 0,
        height: "auto",
        background: "var(--overlay-scrim)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "메모 보드", en: "Memo board", ja: "メモボード", zh: "便签板" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 94vw)",
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
          <StickyNote size={16} />
          {L4(language, { ko: "메모 보드", en: "Memo board", ja: "メモボード", zh: "便签板" })}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel", ja: "パネルを閉じる", zh: "关闭面板" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* 입력 줄 — 데스크톱 MemoBoard 동일 (Enter = 추가) */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            aria-label={L4(language, { ko: "새 메모", en: "New memo", ja: "新しいメモ", zh: "新便签" })}
            placeholder={L4(language, {
              ko: "즉흥 아이디어를 적고 Enter — 아직 설정이 아닌 것들",
              en: "Jot an idea and press Enter — things that aren't canon yet",
              ja: "思いつきを書いて Enter — まだ設定ではないもの",
              zh: "记下灵感后按 Enter — 还不是正式设定的内容",
            })}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "9px 12px",
              borderRadius: 11,
              border: "1px solid var(--line)",
              background: "var(--card-2)",
              color: "inherit",
              font: "inherit",
              fontSize: 13,
            }}
          />
          <button
            type="button"
            className="btn primary"
            disabled={!draft.trim()}
            onClick={add}
            aria-label={L4(language, { ko: "메모 추가", en: "Add memo", ja: "メモを追加", zh: "添加便签" })}
            style={{ flexShrink: 0 }}
          >
            <StickyNote size={14} />
            {L4(language, { ko: "메모", en: "Memo", ja: "メモ", zh: "便签" })}
          </button>
        </div>

        {/* 작업노트 요약 — summarizeNotes 재사용 (메모 있을 때만) */}
        {memos.length > 0 && (
          <div className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
            {L4(language, { ko: "작업노트: ", en: "Work notes: ", ja: "作業ノート: ", zh: "工作笔记: " })}
            {summary}
          </div>
        )}

        {/* 목록 / 빈 상태 — 정직 표면화 */}
        {memos.length === 0 ? (
          <div className="wr-srow" style={{ color: "var(--ink-3)", marginTop: 24, justifyContent: "center" }}>
            {L4(language, {
              ko: "즉흥 아이디어·메모를 모으는 곳. 정리되면 세계관·캐릭터 탭으로 옮기세요.",
              en: "Collect spur-of-the-moment ideas here. Move them to World/Character tabs once they settle.",
              ja: "思いつき・メモを集める場所。固まったら世界観・キャラクタータブへ。",
              zh: "收集灵感与便签的地方。整理好后移到世界观·角色标签页。",
            })}
          </div>
        ) : (
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: 8,
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {memos.map((m) => (
              <li
                key={m.id}
                style={{
                  position: "relative",
                  border: "1px solid var(--line)",
                  background: "var(--card-2)",
                  borderRadius: 12,
                  padding: "10px 30px 10px 12px",
                  fontSize: 12.5,
                }}
              >
                <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--ink-1)" }}>{m.text}</p>
                <button
                  type="button"
                  className="eh-icbtn"
                  aria-label={L4(language, { ko: "메모 삭제", en: "Delete memo", ja: "メモを削除", zh: "删除便签" })}
                  onClick={() => remove(m.id)}
                  style={{ position: "absolute", right: 4, top: 4 }}
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
