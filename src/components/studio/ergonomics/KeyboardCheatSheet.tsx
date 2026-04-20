"use client";

// ============================================================
// KeyboardCheatSheet — 단축키 치트시트 오버레이
// ============================================================
// '?' 키 (인풋 외부) 누르면 오픈. ESC로 닫기. focus trap 적용.
// 단축키 표기는 useStudioKeyboard의 실제 바인딩과 정렬 (하드코딩 최소화).
// 역할 그룹 4개: Navigation / Editing / AI / Writing.
//
// 접근성:
//  - role="dialog" + aria-modal="true" + aria-labelledby
//  - useFocusTrap으로 Tab 순환 + ESC 콜백
//  - 4언어 라벨
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Keyboard } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 1 — 단축키 데이터 (useStudioKeyboard과 정렬)
// ============================================================

type ShortcutGroup = "nav" | "edit" | "ai" | "writing";

interface Shortcut {
  keys: string; // 표시용 (예: "Ctrl+K", "F9")
  group: ShortcutGroup;
  description: { ko: string; en: string; ja: string; zh: string };
}

/** 상단 20개 핵심 단축키 — src/hooks/useStudioKeyboard.ts에서 실제 바인딩 확인 */
const SHORTCUTS: readonly Shortcut[] = [
  // Navigation
  {
    keys: "Ctrl+K",
    group: "nav",
    description: {
      ko: "글로벌 검색 팔레트",
      en: "Global search palette",
      ja: "グローバル検索パレット",
      zh: "全局搜索面板",
    },
  },
  {
    keys: "Ctrl+P",
    group: "nav",
    description: {
      ko: "프린트 / 파일 열기",
      en: "Print / Open file",
      ja: "印刷 / ファイル",
      zh: "打印 / 打开文件",
    },
  },
  {
    keys: "F1 ~ F8",
    group: "nav",
    description: {
      ko: "탭 전환 (세계/캐릭터/규칙/집필/스타일/원고/이력/설정)",
      en: "Switch tabs (World/Characters/Rules/Writing/Style/Manuscript/History/Settings)",
      ja: "タブ切替 (世界観/キャラ/規則/執筆/文体/原稿/履歴/設定)",
      zh: "切换标签 (世界/角色/规则/创作/文体/稿件/历史/设置)",
    },
  },
  {
    keys: "Ctrl+/",
    group: "nav",
    description: {
      ko: "어시스턴트 패널 토글",
      en: "Toggle assistant panel",
      ja: "アシスタントパネル",
      zh: "切换助手面板",
    },
  },
  // Editing
  {
    keys: "Ctrl+S",
    group: "edit",
    description: { ko: "수동 저장", en: "Manual save", ja: "手動保存", zh: "手动保存" },
  },
  {
    keys: "Ctrl+Z",
    group: "edit",
    description: { ko: "실행 취소", en: "Undo", ja: "元に戻す", zh: "撤销" },
  },
  {
    keys: "Ctrl+Shift+Z",
    group: "edit",
    description: { ko: "다시 실행", en: "Redo", ja: "やり直し", zh: "重做" },
  },
  {
    keys: "Ctrl+Shift+N",
    group: "edit",
    description: {
      ko: "새 에피소드",
      en: "New episode",
      ja: "新規エピソード",
      zh: "新建章节",
    },
  },
  {
    keys: "Ctrl+Shift+H",
    group: "edit",
    description: { ko: "일괄 변경", en: "Rename dialog", ja: "一括変更", zh: "批量重命名" },
  },
  {
    keys: "Ctrl+F",
    group: "edit",
    description: {
      ko: "본문 검색",
      en: "Find in document",
      ja: "本文検索",
      zh: "正文搜索",
    },
  },
  {
    keys: "Ctrl+=",
    group: "edit",
    description: { ko: "글자 크게", en: "Font size up", ja: "文字拡大", zh: "字号增大" },
  },
  {
    keys: "Ctrl+-",
    group: "edit",
    description: {
      ko: "글자 작게",
      en: "Font size down",
      ja: "文字縮小",
      zh: "字号减小",
    },
  },
  // AI
  {
    keys: "Ctrl+Enter",
    group: "ai",
    description: {
      ko: "AI 생성 실행 (FAB)",
      en: "Run AI generation (FAB)",
      ja: "AI生成実行 (FAB)",
      zh: "运行 AI 生成 (FAB)",
    },
  },
  {
    keys: "Tab",
    group: "ai",
    description: {
      ko: "인라인 자동완성 수락",
      en: "Accept inline completion",
      ja: "インライン補完を受入",
      zh: "接受内联补全",
    },
  },
  {
    keys: "Esc",
    group: "ai",
    description: {
      ko: "생성 취소 / 모달 닫기",
      en: "Cancel generation / Close modal",
      ja: "生成キャンセル / モーダル閉",
      zh: "取消生成 / 关闭弹窗",
    },
  },
  // Writing
  {
    keys: "F11",
    group: "writing",
    description: {
      ko: "포커스 / 젠 모드",
      en: "Focus / Zen mode",
      ja: "集中 / 禅モード",
      zh: "专注 / 禅模式",
    },
  },
  {
    keys: "F12",
    group: "writing",
    description: {
      ko: "단축키 오버레이 (이 창)",
      en: "Shortcut overlay (this window)",
      ja: "ショートカット一覧 (このウィンドウ)",
      zh: "快捷键覆盖 (本窗口)",
    },
  },
  {
    keys: "Ctrl+\\",
    group: "writing",
    description: {
      ko: "분할 뷰 토글",
      en: "Toggle split view",
      ja: "分割ビュー",
      zh: "切换分屏视图",
    },
  },
  {
    keys: "Ctrl+E",
    group: "writing",
    description: { ko: "TXT 내보내기", en: "Export TXT", ja: "TXTエクスポート", zh: "导出TXT" },
  },
  {
    keys: "?",
    group: "writing",
    description: {
      ko: "이 치트시트 열기",
      en: "Open this cheat sheet",
      ja: "このヒントを表示",
      zh: "打开此快捷键列表",
    },
  },
];

// ============================================================
// PART 2 — Props + 그룹 레이블
// ============================================================

export interface KeyboardCheatSheetProps {
  language?: AppLanguage;
  /** 외부에서 강제로 여닫을 때 — 미지정 시 '?' 키만으로 제어 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function groupLabel(
  g: ShortcutGroup,
  lang: AppLanguage,
): string {
  switch (g) {
    case "nav":
      return L4(lang, {
        ko: "내비게이션",
        en: "Navigation",
        ja: "ナビゲーション",
        zh: "导航",
      });
    case "edit":
      return L4(lang, { ko: "편집", en: "Editing", ja: "編集", zh: "编辑" });
    case "ai":
      return L4(lang, { ko: "AI", en: "AI", ja: "AI", zh: "AI" });
    case "writing":
      return L4(lang, { ko: "집필", en: "Writing", ja: "執筆", zh: "创作" });
  }
}

const GROUP_ORDER: readonly ShortcutGroup[] = ["nav", "edit", "ai", "writing"];

// ============================================================
// PART 3 — 컴포넌트
// ============================================================

export default function KeyboardCheatSheet({
  language = "KO",
  open: controlledOpen,
  onOpenChange,
}: KeyboardCheatSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? (controlledOpen as boolean) : internalOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // '?' 키 전역 바인딩 — 입력 요소 focus 중이면 무시
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "?" && !(e.key === "/" && e.shiftKey)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        if (
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();
      setOpen(!isOpen);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, setOpen]);

  const handleEscape = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  useFocusTrap(containerRef, isOpen, handleEscape);

  if (!isOpen) return null;

  const titleId = "ergo-cheatsheet-title";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // backdrop click to close (but not inner dialog click)
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-bg-primary shadow-[0_16px_48px_rgba(0,0,0,0.45)] p-6 md:p-8"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Keyboard className="w-5 h-5 text-accent-blue" aria-hidden="true" />
            <h2 id={titleId} className="text-base md:text-lg font-black text-text-primary">
              {L4(language, {
                ko: "키보드 단축키",
                en: "Keyboard Shortcuts",
                ja: "キーボードショートカット",
                zh: "键盘快捷键",
              })}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-bg-secondary focus-visible:ring-2 focus-visible:ring-accent-blue"
            aria-label={L4(language, {
              ko: "닫기",
              en: "Close",
              ja: "閉じる",
              zh: "关闭",
            })}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 그룹별 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GROUP_ORDER.map((grp) => {
            const items = SHORTCUTS.filter((s) => s.group === grp);
            if (items.length === 0) return null;
            return (
              <section
                key={grp}
                className="rounded-xl bg-bg-secondary/40 border border-border p-4"
              >
                <h3 className="text-[11px] font-black uppercase tracking-widest text-text-tertiary mb-3">
                  {groupLabel(grp, language)}
                </h3>
                <ul className="space-y-2">
                  {items.map((s) => (
                    <li
                      key={s.keys + s.group}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-text-secondary leading-relaxed">
                        {L4(language, s.description)}
                      </span>
                      <kbd className="shrink-0 px-2 py-1 rounded-md bg-bg-tertiary border border-border font-mono text-[11px] text-text-primary">
                        {s.keys}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* 푸터 */}
        <div className="mt-6 text-center text-[11px] text-text-tertiary">
          {L4(language, {
            ko: "ESC 또는 ?를 다시 누르면 닫힙니다.",
            en: "Press ESC or ? again to close.",
            ja: "ESCまたは?を再度押すと閉じます。",
            zh: "按 ESC 或再次按 ? 关闭。",
          })}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: KeyboardCheatSheet | role=shortcut-overlay | inputs=language | outputs=modal
