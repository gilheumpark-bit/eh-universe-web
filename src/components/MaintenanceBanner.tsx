"use client";

// ============================================================
// PART 1 — Imports + Types
// ============================================================
//
// MaintenanceBanner — 홈 메인 점검중 안내 배너 (2026-05-16 신설)
//
// 표시 조건:
//   기본: ON (운영 정비 시각 시그널)
//   OFF: `process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'false'`
//
// 4언어 (ko/en/ja/zh) + dismissible (sessionStorage).
// 본심 위원이 봐도 자연스러운 톤: "active development" 시그널.

import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/LangContext';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';

// ============================================================
// PART 2 — 4-language labels
// ============================================================

const COPY = {
  title: {
    ko: '점검·작업 중',
    en: 'Active development',
    ja: 'メンテナンス中',
    zh: '维护中',
  },
  body: {
    ko: '운영 정비가 진행 중입니다. 일부 화면이 일시적으로 다르게 보일 수 있습니다.',
    en: 'Operational tuning is in progress. Some screens may temporarily behave differently.',
    ja: '運用調整を進めています。一部画面が一時的に異なる場合があります。',
    zh: '正在进行运营调整。部分页面可能暂时不同。',
  },
  schedule: {
    ko: '6월 중순 정식 오픈 예정',
    en: 'Public release planned mid-June',
    ja: '6月中旬の正式オープン予定',
    zh: '6 月中旬正式开放',
  },
  dismiss: {
    ko: '닫기',
    en: 'Dismiss',
    ja: '閉じる',
    zh: '关闭',
  },
} as const;

const DISMISS_KEY = 'loreguard_maintenance_banner_dismissed';

// ============================================================
// PART 3 — Component
// ============================================================

export default function MaintenanceBanner() {
  const { lang } = useLang();
  // [QA fix 2026-05-16] SSR/hydration mismatch 회피 — 첫 mount 시 visible=true 로 시작
  // dismissed 사용자만 useEffect에서 false로 전환. 첫 paint에 즉시 노출됨.
  const [visible, setVisible] = useState(true);

  // SSR-safe mount + env flag + sessionStorage check
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      // [C] env flag — 'false' 명시 시에만 차단. 기본 ON
      if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'false') {
        setVisible(false);
        return;
      }
      try {
        const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
        setVisible(!dismissed);
      } catch (err) {
        logger.warn('MaintenanceBanner', 'sessionStorage read failed', err);
        setVisible(true); // fallback: show
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch (err) {
      logger.warn('MaintenanceBanner', 'sessionStorage write failed', err);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, oklch(0.965 0.04 80 / 0.95), oklch(0.95 0.05 75 / 0.95))',
        borderBottom: '1px solid oklch(0.84 0.06 75)',
        padding: '12px 16px',
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 auto', minWidth: 0 }}>
          {/* mono uppercase tag — DESIGN.md tag pattern */}
          <span
            style={{
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'oklch(0.32 0.08 60)',
              background: 'oklch(0.99 0.02 80)',
              border: '1px solid oklch(0.84 0.06 75)',
              borderRadius: '999px',
              padding: '3px 9px',
              whiteSpace: 'nowrap',
            }}
          >
            {L4(lang, COPY.title)}
          </span>
          <span style={{ fontSize: '13px', color: 'oklch(0.28 0.012 60)', lineHeight: 1.5 }}>
            {L4(lang, COPY.body)}
            <span
              style={{
                marginLeft: '8px',
                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                fontSize: '11px',
                color: 'oklch(0.42 0.08 60)',
              }}
            >
              · {L4(lang, COPY.schedule)}
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={L4(lang, COPY.dismiss)}
          style={{
            flex: '0 0 auto',
            background: 'transparent',
            border: '1px solid oklch(0.84 0.06 75)',
            color: 'oklch(0.32 0.012 60)',
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          }}
        >
          {L4(lang, COPY.dismiss)}
        </button>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: MaintenanceBanner | role=status-banner | inputs=lang+env-flag+sessionStorage | outputs=visible-or-null
