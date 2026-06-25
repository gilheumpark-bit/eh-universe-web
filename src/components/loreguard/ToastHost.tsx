"use client";

/* ===========================================================
   ToastHost — Sonner식 capped 토스트 스택 (F2 · 라이브러리 없이 직접 구현)

   - bottom-right 고정 · 최대 3개 동시 표시 (초과분은 FIFO 큐 대기)
   - variant: success / error / info (loreguard 토큰 --c-green/--c-red/--c-blue)
   - auto-dismiss: success·info 4s / error 8s (이벤트 detail.duration 으로 override)
   - hover·focus 일시정지 (남은 시간 보존 후 재개) · 수동 close 버튼
   - a11y: role=status aria-live=polite (error 는 role=alert assertive),
     prefers-reduced-motion 시 페이드만 (loreguard.css PART 10)

   이벤트 계약:
   - noa:toast (신규)  detail { message, variant?, duration? }
   - noa:alert (기존)  수신 전용 — 발신부 불변. detail 형태가 발신부마다
     { message|msg|text, variant|kind } 로 갈리므로 전부 흡수.
     성공/정보성(variant 'success'·'info')만 보존, 나머지(warning·critical·
     미지정 포함)는 스펙대로 error 토스트.

   주의: StudioOverlayManager(구 셸 전역 chrome)도 noa:alert 를 bottom-center
   토스트로 표시한다 — 구 토스트 제거는 별도 작업(F-후속)에서 정리.

   토큰 스코프: 루트에 .eh-app 클래스를 직접 부여해 loreguard 토큰을 상속받고,
   .eh-app 의 레이아웃 속성(flex/min-width/배경)은 .noa-toast-host 가 override.
   =========================================================== */

import { useCallback, useEffect, useRef, useState } from "react";
import { L4 } from "@/lib/i18n";
import { Check, Alert, Info, X } from "./icons";

// ============================================================
// PART 1 — 타입 · 상수 · detail 파서
// ============================================================

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  duration: number; // ms
}

const MAX_VISIBLE = 3;
const DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 8000,
};

/** 발신부별 detail 이형 (message/msg/text · variant/kind) 흡수용 느슨한 형태. */
interface LooseDetail {
  message?: unknown;
  msg?: unknown;
  text?: unknown;
  variant?: unknown;
  kind?: unknown;
  duration?: unknown;
}

function extractMessage(d: LooseDetail | null | undefined): string {
  const m = d?.message ?? d?.msg ?? d?.text;
  return typeof m === "string" ? m.trim() : "";
}

function extractDuration(d: LooseDetail | null | undefined, fallback: number): number {
  const v = d?.duration;
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;
}

/** noa:toast 계약 variant — 미지정·미지값은 info. */
function coerceToastVariant(raw: unknown): ToastVariant {
  return raw === "success" || raw === "error" || raw === "info" ? raw : "info";
}

/** noa:alert 레거시 variant — success/info 만 보존, 나머지는 error (F2 계약). */
function coerceAlertVariant(raw: unknown): ToastVariant {
  if (raw === "success") return "success";
  if (raw === "info") return "info";
  return "error";
}

// ============================================================
// PART 2 — ToastHost 본체
// ============================================================

interface TimerEntry {
  handle: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
}

export default function ToastHost({ language = "KO" }: { language?: string }) {
  const [stack, setStack] = useState<{ visible: ToastItem[]; queue: ToastItem[] }>({
    visible: [],
    queue: [],
  });
  const idRef = useRef(0);
  const timersRef = useRef<Map<number, TimerEntry>>(new Map());
  const pausedRef = useRef(false);

  // ---- dismiss: 타이머 해제 + visible 제거 + 큐 승격 (단일 setState 로 race 차단)
  const dismiss = useCallback((id: number) => {
    const entry = timersRef.current.get(id);
    if (entry?.handle != null) clearTimeout(entry.handle);
    timersRef.current.delete(id);
    setStack((s) => {
      if (!s.visible.some((t) => t.id === id)) return s;
      const visible = s.visible.filter((t) => t.id !== id);
      const queue = [...s.queue];
      while (visible.length < MAX_VISIBLE && queue.length > 0) {
        const next = queue.shift();
        if (next) visible.push(next);
      }
      return { visible, queue };
    });
  }, []);

  const push = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = ++idRef.current;
    setStack((s) =>
      s.visible.length < MAX_VISIBLE
        ? { visible: [...s.visible, { ...toast, id }], queue: s.queue }
        : { visible: s.visible, queue: [...s.queue, { ...toast, id }] },
    );
  }, []);

  // ---- 이벤트 수신 — noa:toast(신규) + noa:alert(수신만 추가·발신부 불변)
  useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent).detail as LooseDetail | undefined;
      const message = extractMessage(d);
      if (!message) return;
      const variant = coerceToastVariant(d?.variant);
      push({ message, variant, duration: extractDuration(d, DURATION[variant]) });
    };
    const onAlert = (e: Event) => {
      const d = (e as CustomEvent).detail as LooseDetail | undefined;
      const message = extractMessage(d);
      if (!message) return;
      const variant = coerceAlertVariant(d?.variant ?? d?.kind);
      push({ message, variant, duration: extractDuration(d, DURATION[variant]) });
    };
    window.addEventListener("noa:toast", onToast);
    window.addEventListener("noa:alert", onAlert);
    return () => {
      window.removeEventListener("noa:toast", onToast);
      window.removeEventListener("noa:alert", onAlert);
    };
  }, [push]);

  // ---- 타이머 동기화 — 새 visible 토스트 arm · 사라진 토스트 정리
  useEffect(() => {
    const timers = timersRef.current;
    const visibleIds = new Set(stack.visible.map((t) => t.id));
    for (const [id, entry] of timers) {
      if (!visibleIds.has(id)) {
        if (entry.handle != null) clearTimeout(entry.handle);
        timers.delete(id);
      }
    }
    for (const t of stack.visible) {
      if (timers.has(t.id)) continue;
      const entry: TimerEntry = { handle: null, remaining: t.duration, startedAt: Date.now() };
      if (!pausedRef.current) {
        entry.handle = setTimeout(() => dismiss(t.id), entry.remaining);
        entry.startedAt = Date.now();
      }
      timers.set(t.id, entry);
    }
  }, [stack.visible, dismiss]);

  // ---- hover/focus 일시정지 (남은 시간 보존) · 이탈 시 재개
  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    const now = Date.now();
    for (const entry of timersRef.current.values()) {
      if (entry.handle == null) continue;
      clearTimeout(entry.handle);
      entry.handle = null;
      entry.remaining = Math.max(300, entry.remaining - (now - entry.startedAt));
    }
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    for (const [id, entry] of timersRef.current) {
      if (entry.handle != null) continue;
      // 기존 entry 직접 변형 대신 새 객체로 교체 (react-hooks 불변성 룰 준수)
      timersRef.current.set(id, {
        remaining: entry.remaining,
        startedAt: Date.now(),
        handle: setTimeout(() => dismiss(id), entry.remaining),
      });
    }
  }, [dismiss]);

  // ---- 언마운트 cleanup — 잔여 타이머 전체 해제
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const entry of timers.values()) {
        if (entry.handle != null) clearTimeout(entry.handle);
      }
      timers.clear();
    };
  }, []);

  const closeLabel = L4(language, {
    ko: "알림 닫기",
    en: "Dismiss notification",
    ja: "通知を閉じる",
    zh: "关闭通知",
  });

  // 호스트는 상시 렌더 (aria-live 영역이 콘텐츠 주입 전에 존재해야 안정적으로 낭독됨).
  return (
    <div
      className="eh-app noa-toast-host"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume();
      }}
    >
      {stack.visible.map((t) => {
        const isError = t.variant === "error";
        const Icon = t.variant === "success" ? Check : isError ? Alert : Info;
        return (
          <div
            key={t.id}
            className={`noa-toast ${t.variant}`}
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
          >
            <span className="noa-toast-ic">
              <Icon size={16} aria-hidden="true" />
            </span>
            <span className="noa-toast-msg">{t.message}</span>
            <button
              type="button"
              className="noa-toast-close"
              aria-label={closeLabel}
              onClick={() => dismiss(t.id)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
