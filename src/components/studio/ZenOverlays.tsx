"use client";

// ============================================================
// ZenOverlays — Doc 5 인터랙티브 spec 구현 (2026-05-12)
// ============================================================
// 본 컴포넌트는 body[data-zen="true"] 활성 시만 시각적으로 표시되는 보조 UI 모음.
// CSS rules는 globals-studio.css에 정의 (.zen-corner, .zen-toast).
//
// 구성:
//   1) ZenCorners — 4 모서리 mono 라벨 (Doc 5 "숨김 잔향").
//      TL chapter / TR session / BL ⌘B-⌘J / BR words-esc
//   2) ZenToast — 진입 시 2.2s 표시 "Zen · 다른 패널은 ⌘B / ⌘J 로 부르세요".
//
// [C] SSR-safe (typeof window 가드)
// [G] React.memo + props 안정 — 최소 re-render
// [K] CSS 외장 — TS는 마운트 / 토글 / 데이터 바인딩만

import React, { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

// ============================================================
// PART 1 — Types
// ============================================================

export interface ZenOverlaysProps {
  /** Zen 모드 활성 여부 (StudioShell zenMode state). */
  active: boolean;
  language: AppLanguage;
  /** TL — 현재 챕터 표시. 미지정 시 "Loreguard". */
  chapter?: string;
  /** TR — 세션 시간 ("1h 42m"). 미지정 시 hidden. */
  session?: string;
  /** TR — 오늘 누적 글자 수 ("▲ 824"). 미지정 시 hidden. */
  today?: string;
  /** BR — 현재 총 글자 수. */
  words?: number;
}

// ============================================================
// PART 2 — ZenToast (진입 시 2.2s 표시)
// ============================================================

function useZenToast(active: boolean): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, [active]);
  return show;
}

// ============================================================
// PART 3 — Component
// ============================================================

function ZenOverlaysInner({ active, language, chapter, session, today, words }: ZenOverlaysProps) {
  const showToast = useZenToast(active);

  // [R7-B fix — 2026-05-12] SSR-safe portal mount target.
  // Tailwind CSS 4 @layer cascade + #main-content 자손 위치가 inline opacity 조차
  // override (root cause 미특정). createPortal로 body 직계로 이동 → cascade 영향 0.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPortalTarget(document.body);
    }
  }, []);

  // 글자 수 포맷팅 — 한국어 locale 천 단위 콤마.
  const wordsLabel = typeof words === 'number'
    ? words.toLocaleString('ko-KR')
    : '';

  // [R7-B fix — 2026-05-12] OS detect for ⌘ (Mac) vs Ctrl (Win/Linux).
  // CSS specificity 디버그 한계 — 100% inline style + 직접 텍스트로 OS-friendly 표기.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  // [R7-B fix — 2026-05-12] CSS class `.zen-corner` / `.zen-toast` 의존 제거.
  // Tailwind CSS 4 cascade layer가 .zen-corner opacity를 override하는 원인 미특정 →
  // 모든 스타일을 inline으로. CSS variable은 globals.css와 동일.
  const cornerStyle: React.CSSProperties = {
    position: 'fixed',
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontSize: 9,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--color-text-quaternary, #5a5347)',
    zIndex: 6,
    pointerEvents: 'none',
    transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)',
    opacity: active ? 0.5 : 0,
  };
  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    top: 80,
    left: '50%',
    transform: showToast ? 'translate(-50%, 4px)' : 'translateX(-50%)',
    padding: '8px 16px',
    background: 'rgba(36, 32, 24, 0.92)',
    border: '1px solid var(--color-border-strong, #3a352c)',
    borderRadius: 9999,
    fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
    fontSize: 10,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--color-text-secondary, #b5ac9d)',
    zIndex: 50,
    backdropFilter: 'blur(14px)',
    transition: 'opacity 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 300ms cubic-bezier(0.16, 1, 0.3, 1)',
    opacity: showToast ? 1 : 0,
    pointerEvents: 'none',
  };
  const rowStyle: React.CSSProperties = { marginBottom: 3, display: 'flex', gap: 6, alignItems: 'center' };
  const labelStyle: React.CSSProperties = { color: 'var(--color-text-tertiary, #948a7c)' };
  const valStyle: React.CSSProperties = { color: 'var(--color-text-secondary, #b5ac9d)' };

  // SSR / 초기 mount 전엔 nothing render — portal target 확보 후 mount.
  if (!portalTarget) return null;

  // [QA fix 2026-05-12] SWC parser가 inline JSX fragment + createPortal 패턴에서
  // "Expected ',' got ';'" 오해석하는 회귀 — fragment를 변수로 추출하여 우회.
  const portalContent = (
    <>
      {/* ZenToast — Zen 진입 시 2.2s 상단 중앙. 100% inline + body 직계 portal. */}
      <div
        role="status"
        aria-live="polite"
        aria-hidden={!showToast}
        style={toastStyle}
      >
        <span style={{ color: 'var(--color-accent-amber, #b8955c)', marginRight: 4 }}>Zen</span>
        <span>
          {L4(language, {
            ko: `다른 패널은 ${modKey}B / ${modKey}J 로 부르세요`,
            en: `Recall panels with ${modKey}B / ${modKey}J`,
            ja: `パネルは ${modKey}B / ${modKey}J で呼び出し`,
            zh: `使用 ${modKey}B / ${modKey}J 唤出面板`,
          })}
        </span>
      </div>

      {/* 4 모서리 잔향 — Doc 5 spec. 100% inline 스타일 (CSS class 의존 0). */}
      <div aria-hidden="true" style={{ ...cornerStyle, top: 18, left: 24 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>chapter</span>
          <span style={valStyle}>{chapter ?? 'Loreguard'}</span>
        </div>
      </div>

      <div aria-hidden="true" style={{ ...cornerStyle, top: 18, right: 24, textAlign: 'right' }}>
        {session && (
          <div style={rowStyle}>
            <span style={labelStyle}>session</span>
            <span style={valStyle}>{session}</span>
          </div>
        )}
        {today && (
          <div style={rowStyle}>
            <span style={labelStyle}>today</span>
            <span style={valStyle}>{today}</span>
          </div>
        )}
      </div>

      <div aria-hidden="true" style={{ ...cornerStyle, bottom: 14, left: 24 }}>
        <div style={rowStyle}>
          <span style={labelStyle}>{modKey}B</span>
          <span style={valStyle}>sidebar</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>{modKey}J</span>
          <span style={valStyle}>inspector</span>
        </div>
      </div>

      <div aria-hidden="true" style={{ ...cornerStyle, bottom: 14, right: 24, textAlign: 'right' }}>
        {wordsLabel && (
          <div style={rowStyle}>
            <span style={valStyle}>{wordsLabel}</span>
            <span style={{ ...labelStyle, marginLeft: 6 }}>words</span>
          </div>
        )}
        <div style={rowStyle}>
          <span style={labelStyle}>esc</span>
          <span style={valStyle}>exit zen</span>
        </div>
      </div>
    </>
  );
  return createPortal(portalContent, portalTarget);
}

export const ZenOverlays = memo(ZenOverlaysInner);

// IDENTITY_SEAL: ZenOverlays | role=zen-mode-corners-and-toast | inputs=active+language+chapter+session+today+words | outputs=UI(corners+toast)
