"use client";

// ============================================================
// PART 1 — Imports + Props
// ============================================================
//
// "지금 백업" 버튼. 사용자가 명시적으로 누르는 액션.
// - ZIP 다운로드 (file-tier.backupNow)
// - Notification permission 자동 요청 (사용자 액션이라 OK)
// - 진행 중 spinner + 성공/실패 토스트
// - 4언어 (KO/EN/JA/ZH)

import React, { useCallback, useState } from 'react';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';
import { showAlert } from '@/lib/show-alert';
import { backupNow as runBackupNow } from '@/lib/save-engine/file-tier';
import { logger } from '@/lib/logger';

interface BackupNowButtonProps {
  language: AppLanguage;
  /** 백업 대상 projectId */
  projectId: string | null;
  /** 컴팩트(아이콘만) 모드 — StatusBar용 */
  compact?: boolean;
  /** 추가 스타일 */
  className?: string;
}

type ButtonState = 'idle' | 'busy' | 'success' | 'error';

// ============================================================
// PART 2 — Translations
// ============================================================

const TXT = {
  label:    { ko: '지금 백업',         en: 'Backup now',     ja: '今すぐバックアップ', zh: '立即备份' },
  busy:     { ko: '백업 중…',          en: 'Backing up…',    ja: 'バックアップ中…',    zh: '备份中…' },
  success:  { ko: '백업 완료',          en: 'Backup complete', ja: 'バックアップ完了',  zh: '备份完成' },
  errorTtl: { ko: '백업 실패',          en: 'Backup failed',  ja: 'バックアップ失敗',  zh: '备份失败' },
  noProj:   { ko: '프로젝트 없음',       en: 'No project',     ja: 'プロジェクトなし', zh: '无项目' },
  busyMsg:  { ko: '이미 백업 진행 중',   en: 'Backup already running', ja: 'バックアップ進行中', zh: '备份已在进行' },
} as const;

// ============================================================
// PART 3 — Component
// ============================================================

const BackupNowButton: React.FC<BackupNowButtonProps> = ({
  language,
  projectId,
  compact = false,
  className,
}) => {
  const [state, setState] = useState<ButtonState>('idle');
  const [lastFilename, setLastFilename] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (state === 'busy') {
      showAlert(L4(language, TXT.busyMsg), 'info');
      return;
    }
    if (!projectId) {
      showAlert(L4(language, TXT.noProj), 'warning');
      return;
    }

    setState('busy');
    try {
      const result = await runBackupNow(projectId);
      if (result.success && result.downloaded) {
        setState('success');
        setLastFilename(result.filename);
        showAlert(`${L4(language, TXT.success)}: ${result.filename}`, 'info');
        // 2초 후 idle 복귀
        window.setTimeout(() => { setState('idle'); }, 2000);
      } else {
        setState('error');
        const errMsg = result.error ?? 'unknown';
        showAlert(`${L4(language, TXT.errorTtl)}: ${errMsg}`, 'error');
        window.setTimeout(() => { setState('idle'); }, 3000);
      }
    } catch (err) {
      setState('error');
      logger.warn('BackupNowButton', 'backupNow threw', err);
      const message = err instanceof Error ? err.message : 'unknown';
      showAlert(`${L4(language, TXT.errorTtl)}: ${message}`, 'error');
      window.setTimeout(() => { setState('idle'); }, 3000);
    }
  }, [state, projectId, language]);

  // ============================================================
  // PART 4 — Visual states
  // ============================================================

  const labelText =
    state === 'busy' ? L4(language, TXT.busy) :
    state === 'success' ? L4(language, TXT.success) :
    state === 'error' ? L4(language, TXT.errorTtl) :
    L4(language, TXT.label);

  const Icon =
    state === 'busy' ? Loader2 :
    state === 'success' ? Check :
    state === 'error' ? AlertCircle :
    Download;

  const iconClasses =
    state === 'busy' ? 'animate-spin text-accent-blue' :
    state === 'success' ? 'text-green-500' :
    state === 'error' ? 'text-red-500' :
    'text-text-secondary';

  const baseClasses = compact
    ? 'inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-bg-secondary/40 focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors'
    : 'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold bg-bg-secondary/40 hover:bg-bg-secondary/60 border border-border focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors min-h-[44px]';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'busy'}
      className={`${baseClasses}${className ? ' ' + className : ''}`}
      aria-label={`${L4(language, TXT.label)}${lastFilename ? ` — ${lastFilename}` : ''}`}
      aria-busy={state === 'busy'}
      data-testid="backup-now-button"
      title={labelText}
    >
      <Icon className={`w-4 h-4 ${iconClasses}`} aria-hidden="true" />
      {!compact && <span className="text-text-primary">{labelText}</span>}
    </button>
  );
};

export default BackupNowButton;
