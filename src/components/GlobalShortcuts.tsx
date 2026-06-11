"use client";

/**
 * GlobalShortcuts — 글로벌 단축키 등록 (2026-06-07 / rank 15)
 *
 * RootLayout 최상위에 마운트되어 어디서나 작동하는 전역 단축키만 담당.
 * 영역별 단축키는 각 Shell 의 useKeyboardManager 가 등록한다 (area 가드).
 *
 * 등록 단축키 (ADR-0003 4-way 키 표준):
 *   - Ctrl+Shift+K (Win) / Cmd+Shift+K (Mac) → /codex 즉시 이동
 *
 * keyboard-manager 의 matchesCombo 가 ctrl 과 meta(cmd) 를 동등 처리하므로
 * 'ctrl+shift+k' 한 조합으로 양 플랫폼 모두 커버.
 *
 * 2026-06-08 루프 2/3 — Studio 작품 언어(AppLanguage)를 query param 으로 전달.
 *   useLang() 은 브라우저 UI 언어 (eh-lang) 로, Studio 의 noa_studio_lang 과
 *   다를 수 있다. Codex 의 도메인 자동 선택은 "작품 언어" 기준이어야 하므로
 *   localStorage 에서 noa_studio_lang 을 우선 읽어 ?lang=KO 같은 query 로 전달.
 *
 * [C] 안전성: useKeyBinding 내부에서 SSR 가드. localStorage 접근은 try/catch.
 *             router.push 실패 시 .catch 로 콘솔 로깅. navigating ref 로 중복 진입 차단.
 *             prefetch 는 mount 시 1회 시도 (실패해도 navigate 자체엔 영향 없음).
 * [G] 성능: 단일 binding, 단일 window 리스너 (keyboard-manager 가 관리).
 * [K] 간결성: 한 줄 hook + 한 줄 핸들러 + safe 헬퍼.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useKeyBinding } from "@/lib/keyboard/keyboard-manager";

const STUDIO_LANG_KEY = "noa_studio_lang";
const VALID_APP_LANGS = new Set(["KO", "EN", "JP", "CN"]);

/** Studio 작품 언어(noa_studio_lang) safe read. 없거나 비표준이면 null. */
function readStudioWorkingLang(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_LANG_KEY);
    if (raw && VALID_APP_LANGS.has(raw)) return raw;
  } catch {
    // localStorage 접근 실패 (private mode 등) — null fallback
  }
  return null;
}

export default function GlobalShortcuts() {
  const router = useRouter();
  // [P13/low] 중복 navigate 방지 ref — 빠른 Ctrl+Shift+K 연타 시 race 차단.
  const navigatingRef = useRef(false);

  // [P13/low] 사전 로드로 Codex 진입 지연 최소화. 실패해도 navigate 영향 없음.
  useEffect(() => {
    try {
      router.prefetch("/codex");
    } catch {
      // prefetch 실패 — 무시 (navigate 시 일반 로딩)
    }
  }, [router]);

  // [4-way 키 표준] Ctrl+Shift+K / Cmd+Shift+K = Codex 글로벌 진입
  useKeyBinding({
    id: "global-codex-entry",
    keys: "ctrl+shift+k",
    area: "global",
    handler: () => {
      if (navigatingRef.current) return; // 중복 진입 차단
      navigatingRef.current = true;
      const projectLang = readStudioWorkingLang();
      const target = projectLang ? `/codex?lang=${projectLang}` : "/codex";
      try {
        router.push(target);
      } catch (err) {
        // [P13/low] navigate 실패 콘솔 로깅 (토스트는 RootLayout 외부 의존성 회피)
        console.warn("[GlobalShortcuts] codex push failed:", err);
      } finally {
        // 다음 tick 에 해제 — Next.js navigate 는 async 라 즉시 풀면 race
        setTimeout(() => { navigatingRef.current = false; }, 300);
      }
    },
    description: "Codex 글로벌 진입",
  });

  // [P20 루프2 — 2026-06-08] Cmd+? / Ctrl+? — 단축키 도움말 모달.
  // 영역별 단축키 발견성 강화. 본 컴포넌트는 이벤트만 발화; 실제 모달은
  // 영역별 Shell 이 listen 하거나 globally mounted KeyboardShortcutsHelpModal 이 처리.
  useKeyBinding({
    id: "global-shortcuts-help",
    keys: "ctrl+/",
    area: "global",
    handler: () => {
      try {
        window.dispatchEvent(new CustomEvent("noa:open-shortcuts-help"));
      } catch {
        // SSR 가드 — keyboard-manager 가 이미 window 가드하지만 이중 안전.
      }
    },
    description: "Keyboard shortcuts help",
  });

  return null;
}
