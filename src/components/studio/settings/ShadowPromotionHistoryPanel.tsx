"use client";

// ============================================================
// ShadowPromotionHistoryPanel — (M1.5.4) 승격/다운그레이드 이력 패널
// ============================================================
//
// 목적:
//   ShadowDiffDashboard 의 PART 3.6 블록을 별도 모듈로 분리.
//   800줄 size gate (scripts/check-file-size.mjs) 를 유지하기 위한 추출.
//
// 역할:
//   - PromotionEvent[] 목록 렌더링 (최근순)
//   - 빈 상태 fallback + trigger 배지 + from/to 경로 색상
//   - 4언어(ko/en/ja/zh) 헤더와 빈 메시지
//
// 호출자: ShadowDiffDashboard
// 의존: promotion-audit 의 PromotionEvent 타입만 사용 (추가 서비스 없음 — 순수 표시 컴포넌트)
// ============================================================

import React from 'react';
import { History } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import type { PromotionEvent } from '@/lib/save-engine/promotion-audit';

// ============================================================
// PART 1 — Props
// ============================================================

export interface PromotionHistoryPanelProps {
  language: AppLanguage;
  history: PromotionEvent[];
}

// ============================================================
// PART 2 — Component
// ============================================================

export function PromotionHistoryPanel({
  language,
  history,
}: PromotionHistoryPanelProps): React.ReactElement {
  const title = L4(language, {
    ko: '승격/다운그레이드 이력',
    en: 'Promotion / Downgrade History',
    ja: '昇格・ダウングレード履歴',
    zh: '晋升 / 回退历史',
  });
  const empty = L4(language, {
    ko: '기록 없음',
    en: 'No history yet',
    ja: '履歴なし',
    zh: '暂无记录',
  });

  return (
    <div className="rounded-2xl border border-border bg-bg-secondary/20 p-4 space-y-2">
      <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
        <History className="w-3.5 h-3.5 text-accent-blue" />
        {title}
      </h4>
      {history.length === 0 ? (
        <p className="text-[12px] text-text-tertiary px-2 py-3 rounded-lg bg-bg-secondary/30">
          {empty}
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto">
          {history.map((ev) => {
            const ts = new Date(ev.ts).toLocaleString();
            const arrow =
              ev.to === 'on' ? '→ on'
              : ev.to === 'shadow' ? '→ shadow'
              : '→ off';
            const color =
              ev.trigger === 'downgrade' ? 'text-accent-amber'
              : ev.to === 'on' ? 'text-accent-green'
              : 'text-text-primary';
            return (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-bg-secondary/30 text-[11px] tabular-nums"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-text-tertiary shrink-0">{ts}</span>
                  <span className={`font-black shrink-0 ${color}`}>
                    {ev.from} {arrow}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary shrink-0"
                    aria-label={`trigger-${ev.trigger}`}
                  >
                    {ev.trigger}
                  </span>
                  <span className="text-text-tertiary truncate">{ev.reason}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PromotionHistoryPanel;
