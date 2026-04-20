"use client";

// ============================================================
// PART 1 — Overview (M1.7 Audit Export Button)
// ============================================================
//
// promotion-audit + shadow-log + local-event-log + primary-write-log
// 이력을 단일 JSON 번들로 다운로드. 사용자 제보 / 내부 감사 시 첨부.
//
// [원칙 1] 해시·메타만. 원문 없음 — local-event-log 가 이미 sanitize.
// [원칙 2] 읽기 전용 — 수집 중 저장 경로 간섭 없음.
// [원칙 3] 4언어 완성 (KO/EN/JA/ZH).
// [원칙 4] a11y — aria-label + focus-visible + 44px 터치 타겟.
// [원칙 5] 실패 격리 — 스트림 하나 실패해도 나머지는 export 계속.
//
// [C] 다운로드 실패 시 토스트 — 사용자에게 알림
// [G] 병렬 Promise.allSettled — 블로킹 최소화
// [K] 1 public component + 순수 helper

import React, { useCallback, useState } from 'react';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { getPromotionHistory } from '@/lib/save-engine/promotion-audit';
import { getShadowLog } from '@/lib/save-engine/shadow-logger';
import { getEventLog } from '@/lib/save-engine/local-event-log';
import { getPrimaryWriteLog } from '@/lib/save-engine/primary-write-logger';

// ============================================================
// PART 2 — Types
// ============================================================

export interface AuditExportBundle {
  schemaVersion: 1;
  exportedAt: number;
  exportedAtIso: string;
  app: { name: 'loreguard'; milestone: 'M1.7-observatory' };
  /** 스트림별 수집 결과. 하나 실패해도 나머지는 정상 수집. */
  streams: {
    promotionAudit: {
      ok: boolean;
      count: number;
      items: unknown[];
      error?: string;
    };
    shadowLog: {
      ok: boolean;
      count: number;
      items: unknown[];
      error?: string;
    };
    localEventLog: {
      ok: boolean;
      count: number;
      items: unknown[];
      error?: string;
    };
    primaryWriteLog: {
      ok: boolean;
      count: number;
      items: unknown[];
      error?: string;
    };
  };
}

export interface AuditExportButtonProps {
  language: AppLanguage;
  /** export 완료 후 콜백 (테스트 / 분석 용). */
  onExported?: (filename: string, bundle: AuditExportBundle) => void;
}

// ============================================================
// PART 3 — Collection helpers
// ============================================================

async function collectStream<T>(
  fetcher: () => Promise<T[]>,
): Promise<{ ok: boolean; count: number; items: T[]; error?: string }> {
  try {
    const items = await fetcher();
    const arr = Array.isArray(items) ? items : [];
    return { ok: true, count: arr.length, items: arr };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, count: 0, items: [], error: msg.slice(0, 200) };
  }
}

/**
 * 4 스트림 병렬 수집 후 단일 번들로 병합.
 * export 는 client-side — 다운로드 blob 은 호출부에서 처리.
 */
export async function buildAuditBundle(): Promise<AuditExportBundle> {
  const [promotion, shadow, local, primary] = await Promise.all([
    collectStream(() => getPromotionHistory({ limit: 200 })),
    collectStream(() => getShadowLog({ limit: 1000 })),
    collectStream(() => getEventLog({ limit: 500 })),
    collectStream(() => getPrimaryWriteLog({ limit: 1000 })),
  ]);

  const ts = Date.now();
  return {
    schemaVersion: 1,
    exportedAt: ts,
    exportedAtIso: new Date(ts).toISOString(),
    app: { name: 'loreguard', milestone: 'M1.7-observatory' },
    streams: {
      promotionAudit: promotion,
      shadowLog: shadow,
      localEventLog: local,
      primaryWriteLog: primary,
    },
  };
}

/** 파일명 — loreguard-audit-<UTC ISO>.json */
export function buildAuditFilename(ts: number = Date.now()): string {
  const iso = new Date(ts).toISOString().replace(/[:.]/g, '-');
  return `loreguard-audit-${iso}.json`;
}

// ============================================================
// PART 4 — Button component
// ============================================================

type ButtonStatus = 'idle' | 'working' | 'success' | 'error';

const AuditExportButton: React.FC<AuditExportButtonProps> = ({ language, onExported }) => {
  const [status, setStatus] = useState<ButtonStatus>('idle');
  const [note, setNote] = useState<string | null>(null);

  const labels = {
    title: L4(language, {
      ko: '감사 이력 내보내기',
      en: 'Export Audit History',
      ja: '監査履歴エクスポート',
      zh: '导出审计历史',
    }),
    description: L4(language, {
      ko: '승격/복구/저장/Shadow 로그를 JSON 파일로 저장 — 원문 없음, 해시만',
      en: 'Saves promotion/recovery/save/shadow logs as a JSON file — hashes only, no plaintext',
      ja: '昇格・復旧・保存・Shadow ログを JSON 保存 — 原文なし、ハッシュのみ',
      zh: '将晋升 / 恢复 / 保存 / Shadow 日志保存为 JSON — 仅哈希，无原文',
    }),
    working: L4(language, {
      ko: '수집 중…',
      en: 'Collecting…',
      ja: '収集中…',
      zh: '收集中…',
    }),
    success: L4(language, {
      ko: '다운로드 완료',
      en: 'Download complete',
      ja: 'ダウンロード完了',
      zh: '下载完成',
    }),
    error: L4(language, {
      ko: '내보내기 실패',
      en: 'Export failed',
      ja: 'エクスポート失敗',
      zh: '导出失败',
    }),
  };

  const handleClick = useCallback(async () => {
    if (status === 'working') return;
    setStatus('working');
    setNote(null);
    try {
      const bundle = await buildAuditBundle();
      const json = JSON.stringify(bundle, null, 2);
      const filename = buildAuditFilename(bundle.exportedAt);
      triggerDownload(filename, json);
      setStatus('success');
      setNote(filename);
      if (onExported) {
        try { onExported(filename, bundle); } catch (err) {
          logger.warn('AuditExportButton', 'onExported threw', err);
        }
      }
    } catch (err) {
      logger.warn('AuditExportButton', 'export failed', err);
      setStatus('error');
      setNote(err instanceof Error ? err.message.slice(0, 120) : 'unknown');
    }
  }, [status, onExported]);

  const statusIcon = status === 'success'
    ? <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
    : status === 'error'
      ? <AlertCircle className="w-3.5 h-3.5" aria-hidden />
      : <Download className="w-3.5 h-3.5" aria-hidden />;

  const statusText = status === 'working'
    ? labels.working
    : status === 'success'
      ? labels.success
      : status === 'error'
        ? labels.error
        : labels.title;

  const statusColor = status === 'success'
    ? 'text-accent-green'
    : status === 'error'
      ? 'text-accent-red'
      : 'text-text-primary';

  return (
    <div
      className="rounded-2xl border border-border bg-bg-secondary/20 p-4 flex items-center justify-between gap-4"
      role="region"
      aria-label={labels.title}
    >
      <div className="min-w-0">
        <h4 className={`text-[12px] font-black uppercase tracking-widest ${statusColor} flex items-center gap-2`}>
          {statusIcon}
          {labels.title}
        </h4>
        <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
          {labels.description}
        </p>
        {note && (
          <p
            className="text-[10px] text-text-tertiary mt-2 break-all"
            aria-live="polite"
          >
            <span className={`font-bold ${statusColor}`}>{statusText}: </span>
            <code>{note}</code>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={status === 'working'}
        className="inline-flex items-center gap-2 min-h-[44px] min-w-[44px] px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors disabled:opacity-50 shrink-0"
        aria-label={labels.title}
        data-testid="audit-export-button"
      >
        <Download className={`w-4 h-4 ${status === 'working' ? 'animate-pulse' : ''}`} />
        {status === 'working' ? labels.working : labels.title}
      </button>
    </div>
  );
};

// ============================================================
// PART 5 — Download helper (test-injectable)
// ============================================================

let downloadFnOverride: ((filename: string, json: string) => void) | null = null;

/**
 * 테스트용 — 실제 Blob 다운로드 대신 mock 함수 주입.
 */
export function setDownloadFnForTests(fn: ((filename: string, json: string) => void) | null): void {
  downloadFnOverride = fn;
}

function triggerDownload(filename: string, json: string): void {
  if (downloadFnOverride) {
    downloadFnOverride(filename, json);
    return;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 다음 tick 에 revoke — 일부 브라우저 즉시 revoke 시 다운로드 중단.
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch { /* noop */ }
    }, 500);
  } catch (err) {
    logger.warn('AuditExportButton', 'triggerDownload threw', err);
    throw err;
  }
}

export default AuditExportButton;
