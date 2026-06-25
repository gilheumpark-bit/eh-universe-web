"use client";

// ============================================================
// PART 1 — Imports, Types, and Section Shell
// ============================================================

import { showAlert } from '@/lib/show-alert';
import React from 'react';
import { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import {
  Shield, ChevronDown,
  GitBranch,
} from 'lucide-react';
import { isFeatureEnabled } from '@/lib/feature-flags';
import FullBundleSection from './BackupsSection.full-bundle';
import GoogleDriveSection from './BackupsSection.drive';
import GitHubSyncSection from './BackupsSection.github';
import BackupTiersIntegration from '@/components/studio/settings/BackupTiersIntegration';

export interface VersionedBackup {
  timestamp: number;
  label: string;
}
interface BackupsSectionProps {
  language: AppLanguage;
  versionedBackups?: VersionedBackup[];
  onRestoreBackup?: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}

const BackupsSection: React.FC<BackupsSectionProps> = ({
  language,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
}) => {
  return (
    <details className="ds-accordion rounded-2xl bg-bg-secondary/20 border border-border overflow-hidden group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-3 px-5 py-4 hover:bg-bg-secondary/40 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue">
        <GitBranch className="w-4 h-4 text-green-500 shrink-0" />
        <span className="text-sm font-black text-text-primary flex-1">
          {L4(language, { ko: 'GitHub / 백업', en: 'GitHub / Backup', ja: 'GitHub / バックアップ', zh: 'GitHub / 备份' })}
        </span>
        <ChevronDown className="w-4 h-4 text-text-tertiary transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {versionedBackups && onRestoreBackup && (
          <VersionedBackupList
            language={language}
            versionedBackups={versionedBackups}
            onRestoreBackup={onRestoreBackup}
            onRefreshBackups={onRefreshBackups}
          />
        )}
        <div className="md:col-span-2">
          <BackupTiersIntegration language={language} />
        </div>
        <FullBundleSection language={language} />
        {isFeatureEnabled('GOOGLE_DRIVE_BACKUP') && <GoogleDriveSection language={language} />}
        <GitHubSyncSection language={language} />
      </div>
    </details>
  );
};

export default BackupsSection;

// ============================================================
// PART 2 — Versioned Backup List (auto-snapshots)
// ============================================================

function VersionedBackupList({
  language,
  versionedBackups,
  onRestoreBackup,
  onRefreshBackups,
}: {
  language: AppLanguage;
  versionedBackups: VersionedBackup[];
  onRestoreBackup: (timestamp: number) => Promise<boolean>;
  onRefreshBackups?: () => void;
}) {
  return (
    <div className="md:col-span-2 ds-card-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-500" /> {L4(language, { ko: '자동 백업 (10분 간격)', en: 'Auto Backup (every 10 min)', ja: 'Auto Backup (every 10 min)', zh: 'Auto Backup (every 10 min)' })}
        </h3>
        {onRefreshBackups && (
          <button onClick={onRefreshBackups} className="text-[10px] text-text-tertiary hover:text-text-primary font-mono uppercase tracking-wider transition-colors" title={L4(language, { ko: '목록 새로고침', en: 'Refresh list', ja: '一覧 更新', zh: '列表 刷新' })}>
            {L4(language, { ko: '새로고침', en: 'Refresh', ja: '更新', zh: '刷新' })}
          </button>
        )}
      </div>
      {versionedBackups.length === 0 ? (
        <div className="text-sm text-text-tertiary py-4 text-center">
          {L4(language, { ko: '저장된 백업이 없습니다. 10분 후 자동 백업됩니다.', en: 'No backups yet. Auto-backup runs every 10 minutes.', ja: '保存されたバックアップがありません。10分後に自動バックアップが実行されます。', zh: '暂无已保存的备份。10 分钟后将自动备份。' })}
        </div>
      ) : (
        <div className="space-y-2">
          {versionedBackups.map((b) => (
            <div key={b.timestamp} className="flex items-center justify-between p-4 bg-bg-secondary rounded-xl border border-border">
              <div>
                <div className="text-xs font-bold text-text-primary">{new Date(b.timestamp).toLocaleString()}</div>
                <div className="text-[10px] text-text-tertiary font-mono">
                  {L4(language, { ko: '자동 백업', en: 'Auto backup', ja: 'Auto backup', zh: 'Auto backup' })}
                </div>
              </div>
              <button
                onClick={async () => {
                  const ok = await onRestoreBackup(b.timestamp);
                  if (ok) {
                    showAlert(L4(language, { ko: '백업에서 복원되었습니다.', en: 'Restored from backup.', ja: 'Restored from backup.', zh: 'Restored from backup.' }));
                  } else {
                    showAlert(L4(language, { ko: '복원에 실패했습니다.', en: 'Restore failed.', ja: 'Restore failed.', zh: 'Restore failed.' }));
                  }
                }}
                className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent-blue hover:text-accent-blue transition-colors px-3 py-1.5 border border-accent-blue/30 rounded-lg hover:bg-accent-blue/10"
                title={L4(language, { ko: '이 백업으로 복원', en: 'Restore from this backup', ja: 'Restore from this backup', zh: 'Restore from this backup' })}
              >
                {L4(language, { ko: '복원', en: 'Restore', ja: 'Restore', zh: 'Restore' })}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
