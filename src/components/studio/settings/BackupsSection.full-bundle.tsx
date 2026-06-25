"use client";

import React, { useCallback, useRef, useState } from 'react';
import { Archive, Download, Upload } from 'lucide-react';
import { showAlert } from '@/lib/show-alert';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { AppLanguage } from '@/lib/studio-types';
import {
  downloadBundle,
  downloadZipBundle,
  exportFullBundle,
  exportFullBundleAsZip,
  importFullBundle,
  rollbackFromPreRestoreBackup,
  suggestZipFilename,
} from '@/lib/full-backup';

function FullBundleSection({ language }: { language: AppLanguage }) {
  const [busy, setBusy] = useState<'json' | 'zip' | 'restore' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resolveProjectId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const last = localStorage.getItem('noa_last_project_id');
      if (last) return last;
    } catch (err) {
      logger.warn('BackupsSection', 'read noa_last_project_id failed', err);
    }
    try {
      const raw = localStorage.getItem('noa_projects_v2');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed[0]?.id) return String(parsed[0].id);
    } catch (err) {
      logger.warn('BackupsSection', 'fallback project read failed', err);
    }
    return null;
  }, []);

  const handleExportJson = useCallback(async () => {
    const pid = resolveProjectId();
    if (!pid) {
      showAlert(L4(language, {
        ko: '백업할 프로젝트가 없습니다.',
        en: 'No project to back up.',
        ja: 'バックアップするプロジェクトがありません。',
        zh: '没有可备份的项目。',
      }), 'warning');
      return;
    }
    setBusy('json');
    try {
      const bundle = await exportFullBundle(pid);
      downloadBundle(bundle);
      showAlert(L4(language, {
        ko: '전체 백업(.json) 다운로드 완료',
        en: 'Full backup (.json) downloaded',
        ja: '全体バックアップ(.json)のダウンロード完了',
        zh: '全量备份(.json)下载完成',
      }), 'info');
    } catch (err) {
      logger.error('BackupsSection', 'exportFullBundle failed', err);
      showAlert(L4(language, {
        ko: '백업 생성 실패. 콘솔 확인.',
        en: 'Backup failed. Check console.',
        ja: 'バックアップ作成失敗。コンソール確認。',
        zh: '备份失败,请查看控制台。',
      }), 'error');
    } finally {
      setBusy(null);
    }
  }, [language, resolveProjectId]);

  const handleExportZip = useCallback(async () => {
    const pid = resolveProjectId();
    if (!pid) {
      showAlert(L4(language, {
        ko: '백업할 프로젝트가 없습니다.',
        en: 'No project to back up.',
        ja: 'バックアップするプロジェクトがありません。',
        zh: '没有可备份的项目。',
      }), 'warning');
      return;
    }
    setBusy('zip');
    try {
      const blob = await exportFullBundleAsZip(pid);
      if (!blob) {
        showAlert(L4(language, {
          ko: 'ZIP 생성 실패. JSON 백업을 이용하세요.',
          en: 'ZIP failed. Use JSON backup instead.',
          ja: 'ZIP失敗。JSONバックアップを使用。',
          zh: 'ZIP 失败,请改用 JSON 备份。',
        }), 'warning');
        return;
      }
      const bundle = await exportFullBundle(pid);
      downloadZipBundle(blob, suggestZipFilename(bundle));
      showAlert(L4(language, {
        ko: '전체 백업(.zip) 다운로드 완료',
        en: 'Full backup (.zip) downloaded',
        ja: '全体バックアップ(.zip)のダウンロード完了',
        zh: '全量备份(.zip)下载完成',
      }), 'info');
    } catch (err) {
      logger.error('BackupsSection', 'exportFullBundleAsZip failed', err);
      showAlert(L4(language, {
        ko: 'ZIP 백업 생성 실패.',
        en: 'ZIP backup failed.',
        ja: 'ZIPバックアップ失敗。',
        zh: 'ZIP 备份失败。',
      }), 'error');
    } finally {
      setBusy(null);
    }
  }, [language, resolveProjectId]);

  const handleRestore = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    const confirmed = window.confirm(L4(language, {
      ko: '현재 데이터를 덮어쓰고 백업을 복원합니다. 복원 전 현재 상태가 자동 저장됩니다. 계속할까요?',
      en: 'Current data will be overwritten. The current state is auto-saved before restore. Continue?',
      ja: '現在のデータを上書きしてバックアップを復元します。復元前に現在の状態を自動保存します。続けますか?',
      zh: '将覆盖当前数据并恢复备份。恢复前会自动保存当前状态。继续吗?',
    }));
    if (!confirmed) return;
    setBusy('restore');
    try {
      const result = await importFullBundle(file);
      if (!result.success) {
        if (result.preRestoreBackup) {
          rollbackFromPreRestoreBackup(result.preRestoreBackup);
        }
        showAlert(L4(language, {
          ko: `복원 실패: ${result.warnings.join(', ')}`,
          en: `Restore failed: ${result.warnings.join(', ')}`,
          ja: `復元失敗: ${result.warnings.join(', ')}`,
          zh: `恢复失败: ${result.warnings.join(', ')}`,
        }), 'error');
        return;
      }
      const msg = L4(language, {
        ko: `복원 완료 (프로젝트 ${result.restoredProjects}개). 페이지를 새로고침합니다.`,
        en: `Restored ${result.restoredProjects} project(s). Reloading page.`,
        ja: `復元完了 (プロジェクト${result.restoredProjects}件)。ページを再読み込みします。`,
        zh: `恢复完成 (项目 ${result.restoredProjects} 个)。正在刷新页面。`,
      });
      showAlert(msg, 'info');
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.reload();
      }, 2000);
    } catch (err) {
      logger.error('BackupsSection', 'importFullBundle failed', err);
      showAlert(L4(language, {
        ko: '복원하지 못했습니다. 파일이 올바른지 확인해 주세요.',
        en: 'Restore error. Check the file is valid.',
        ja: '復元エラー。ファイルを確認してください。',
        zh: '恢复出错。请检查文件是否有效。',
      }), 'error');
    } finally {
      setBusy(null);
    }
  }, [language]);

  return (
    <div className="md:col-span-2 ds-card-lg">
      <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
        <Archive className="w-4 h-4 text-accent-blue" />
        {L4(language, {
          ko: '전체 백업 · 복원',
          en: 'Full Backup · Restore',
          ja: '全体バックアップ・復元',
          zh: '全量备份・恢复',
        })}
      </h3>
      <p className="text-xs text-text-tertiary mb-4 leading-relaxed">
        {L4(language, {
          ko: '원고 + 설정 + 번역 메모리까지 한 번에 백업하고 복원하세요. Loreguard를 떠날 때도 데이터는 당신 것입니다.',
          en: 'Back up and restore everything — manuscripts, settings, translation memory. Your data stays yours, even if you leave Loreguard.',
          ja: '原稿+設定+翻訳メモリを一括バックアップ・復元。Loreguardを離れてもデータはあなたのものです。',
          zh: '一次性备份和恢复稿件+设置+翻译记忆。即使离开洛尔加德,数据仍归您所有。',
        })}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleExportJson}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Download className="w-4 h-4" />
          {busy === 'json'
            ? L4(language, { ko: '생성 중...', en: 'Creating...', ja: '作成中...', zh: '生成中...' })
            : L4(language, {
                ko: '전체 백업 (.json)',
                en: 'Full Backup (.json)',
                ja: '全体バックアップ (.json)',
                zh: '全量备份 (.json)',
              })}
        </button>
        <button
          type="button"
          onClick={handleExportZip}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue/10 border border-accent-blue/30 rounded-xl text-xs font-bold text-accent-blue hover:bg-accent-blue/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue"
        >
          <Archive className="w-4 h-4" />
          {busy === 'zip'
            ? L4(language, { ko: '생성 중...', en: 'Creating...', ja: '作成中...', zh: '生成中...' })
            : L4(language, {
                ko: '전체 백업 (.zip) · 권장',
                en: 'Full Backup (.zip) · Recommended',
                ja: '全体バックアップ (.zip) · 推奨',
                zh: '全量备份 (.zip) · 推荐',
              })}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-xs font-bold text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-accent-blue">
          <Upload className="w-4 h-4" />
          {busy === 'restore'
            ? L4(language, { ko: '복원 중...', en: 'Restoring...', ja: '復元中...', zh: '恢复中...' })
            : L4(language, {
                ko: '백업 파일에서 복원 (.json / .zip)',
                en: 'Restore from Backup (.json / .zip)',
                ja: 'バックアップから復元 (.json / .zip)',
                zh: '从备份恢复 (.json / .zip)',
              })}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,.zip,application/zip"
            onChange={handleRestore}
            disabled={busy !== null}
            className="hidden"
            aria-label={L4(language, {
              ko: '백업 파일 선택',
              en: 'Select backup file',
              ja: 'バックアップファイルを選択',
              zh: '选择备份文件',
            })}
          />
        </label>
        <p className="text-[10px] text-text-tertiary mt-2 px-1 leading-relaxed">
          {L4(language, {
            ko: '복원 전 현재 상태가 자동 저장됩니다. 실패 시 자동으로 원래 상태로 되돌립니다.',
            en: 'Current state is auto-saved before restore. Auto-rollback on failure.',
            ja: '復元前に現在の状態を自動保存します。失敗時は自動で元に戻します。',
            zh: '恢复前会自动保存当前状态,失败时自动回滚。',
          })}
        </p>
      </div>
    </div>
  );
}

export default FullBundleSection;
