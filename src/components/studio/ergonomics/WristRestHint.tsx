"use client";

// ============================================================
// WristRestHint — AI 생성 장시간 대기 시 손목 릴렉스 힌트
// ============================================================
// 자체 타이머를 들고 있다가 AI 생성이 10초 이상 지속되면
// 작은 배너 + CSS 원형 애니메이션을 띄운다.
//
// 트리거 우선순위 (자동 연결):
//   1) prop으로 직접 isGenerating 전달 → 그 값을 구독 (테스트/StudioShell)
//   2) 외부 이벤트 `noa:ai-generating` { active: boolean } 수신
//   3) (없으면) 항상 inactive
//
// 접근성:
//  - role="status" + aria-live="polite"
//  - 토글 OFF 시 전체 렌더 생략
// ============================================================

import React, { useEffect, useState } from "react";
import { Hand } from "lucide-react";
import { loadErgonomicsSettings } from "@/lib/ergonomics/ergonomics-settings";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 1 — 상수
// ============================================================

const SHOW_AFTER_MS = 10 * 1000; // AI 생성이 10초 넘게 지속되면 노출
const AUTO_HIDE_MS = 20 * 1000; // 20초 후 자동 hide

// ============================================================
// PART 2 — Props
// ============================================================

export interface WristRestHintProps {
  language?: AppLanguage;
  /** true로 바깥에서 구독한 isGenerating 전달 — 없으면 `noa:ai-generating` 이벤트 수신 */
  isGenerating?: boolean;
  /** 강제로 토글 (설정 무시) — 옵션 */
  forceEnabled?: boolean;
}

// ============================================================
// PART 3 — 컴포넌트
// ============================================================

export default function WristRestHint({
  language = "KO",
  isGenerating: externalIsGenerating,
  forceEnabled,
}: WristRestHintProps) {
  const [internalActive, setInternalActive] = useState(false);
  const [show, setShow] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(false);

  // 설정 로드
  useEffect(() => {
    if (forceEnabled !== undefined) {
      setEnabled(forceEnabled);
      return;
    }
    setEnabled(loadErgonomicsSettings().wristRestHintEnabled);
  }, [forceEnabled]);

  // 외부 이벤트 구독 (prop 미지정 시)
  useEffect(() => {
    if (externalIsGenerating !== undefined) return;
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ active?: boolean }>;
      setInternalActive(Boolean(custom.detail?.active));
    };
    window.addEventListener("noa:ai-generating", handler);
    return () => {
      window.removeEventListener("noa:ai-generating", handler);
    };
  }, [externalIsGenerating]);

  const active = externalIsGenerating ?? internalActive;

  // active 시작 → 10초 후 show true, 20초 후 자동 hide
  useEffect(() => {
    if (!enabled || !active) {
      setShow(false);
      return;
    }
    const showTimer = window.setTimeout(() => setShow(true), SHOW_AFTER_MS);
    const hideTimer = window.setTimeout(
      () => setShow(false),
      SHOW_AFTER_MS + AUTO_HIDE_MS,
    );
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [enabled, active]);

  // active false → 즉시 hide
  useEffect(() => {
    if (!active) setShow(false);
  }, [active]);

  if (!enabled || !show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-6 z-[var(--z-overlay)] max-w-xs rounded-2xl border border-border bg-bg-secondary/90 backdrop-blur-sm shadow-lg p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <span className="wrist-rest-ring shrink-0" aria-hidden="true">
        <Hand className="w-5 h-5 text-accent-amber" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-text-primary">
          {L4(language, {
            ko: "AI 생성 중",
            en: "AI generating",
            ja: "AI生成中",
            zh: "AI 生成中",
          })}
        </p>
        <p className="text-[11px] text-text-tertiary leading-snug mt-0.5">
          {L4(language, {
            ko: "손목 풀어주세요 — 천천히 원을 그려보세요",
            en: "Rest your wrists — draw slow circles",
            ja: "手首を緩めて — ゆっくり円を描いて",
            zh: "活动手腕 — 慢慢画圈",
          })}
        </p>
      </div>

      {/* 손목 원형 애니메이션 — 순수 CSS */}
      <style jsx>{`
        .wrist-rest-ring {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid var(--color-accent-amber, #b8955c);
          animation: wrist-rotate 2.5s linear infinite;
        }
        @keyframes wrist-rotate {
          0% {
            transform: rotate(0deg) scale(1);
            opacity: 0.9;
          }
          50% {
            transform: rotate(180deg) scale(1.06);
            opacity: 1;
          }
          100% {
            transform: rotate(360deg) scale(1);
            opacity: 0.9;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .wrist-rest-ring {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// IDENTITY_SEAL: WristRestHint | role=ai-wait-hint | inputs=isGenerating | outputs=banner
