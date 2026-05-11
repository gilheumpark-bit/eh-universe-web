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

  // 글자 수 포맷팅 — 한국어 locale 천 단위 콤마.
  const wordsLabel = typeof words === 'number'
    ? words.toLocaleString('ko-KR')
    : '';

  return (
    <>
      {/* ZenToast — Zen 진입 시 2.2s 상단 중앙. inline opacity로 specificity 우회. */}
      <div
        className={`zen-toast${showToast ? ' show' : ''}`}
        role="status"
        aria-live="polite"
        aria-hidden={!showToast}
        style={{
          opacity: showToast ? 1 : 0,
          transform: showToast ? 'translate(-50%, 4px)' : 'translateX(-50%)',
        }}
      >
        <span className="k">Zen</span>
        <span>
          {L4(language, {
            ko: '다른 패널은 ⌘B / ⌘J 로 부르세요',
            en: 'Recall panels with ⌘B / ⌘J',
            ja: 'パネルは ⌘B / ⌘J で呼び出し',
            zh: '使用 ⌘B / ⌘J 唤出面板',
          })}
        </span>
      </div>

      {/* 4 모서리 잔향 — Doc 5 spec. Zen 활성 시만 .5 opacity (inline style override
          to ensure specificity wins regardless of Tailwind @layer ordering). */}
      <div className="zen-corner tl" aria-hidden="true" style={{ opacity: active ? 0.5 : 0 }}>
        <div className="row">
          <span className="k">
            {L4(language, { ko: 'chapter', en: 'chapter', ja: 'chapter', zh: 'chapter' })}
          </span>
          <span className="v">{chapter ?? 'Loreguard'}</span>
        </div>
      </div>

      <div className="zen-corner tr" aria-hidden="true" style={{ opacity: active ? 0.5 : 0 }}>
        {session && (
          <div className="row">
            <span className="k">session</span>
            <span className="v">{session}</span>
          </div>
        )}
        {today && (
          <div className="row">
            <span className="k">today</span>
            <span className="v">{today}</span>
          </div>
        )}
      </div>

      <div className="zen-corner bl" aria-hidden="true" style={{ opacity: active ? 0.5 : 0 }}>
        <div className="row">
          <span className="k">⌘B</span>
          <span className="v">sidebar</span>
        </div>
        <div className="row">
          <span className="k">⌘J</span>
          <span className="v">inspector</span>
        </div>
      </div>

      <div className="zen-corner br" aria-hidden="true" style={{ opacity: active ? 0.5 : 0 }}>
        {wordsLabel && (
          <div className="row">
            <span className="v">{wordsLabel}</span>
            <span className="k">words</span>
          </div>
        )}
        <div className="row">
          <span className="k">esc</span>
          <span className="v">exit zen</span>
        </div>
      </div>
    </>
  );
}

export const ZenOverlays = memo(ZenOverlaysInner);

// IDENTITY_SEAL: ZenOverlays | role=zen-mode-corners-and-toast | inputs=active+language+chapter+session+today+words | outputs=UI(corners+toast)
