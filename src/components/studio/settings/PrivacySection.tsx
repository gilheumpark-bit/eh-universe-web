"use client";

// ============================================================
// PART 1 — Imports + Types
// ============================================================
//
// PrivacySection — GDPR Art.15/17/20 + K-PIPA §35/36 DSAR UI
// 2026-05-12 audit Round 6: DSAR API (/api/csrf + /api/user/export + /api/user/delete)
// 가 frontend 0 callers 였던 silent failure 해소.
//
// 흐름:
//   1) "내 데이터 내보내기" → GET /api/csrf → cookie + token 수령
//   2) POST /api/user/export with Authorization: Bearer + X-CSRF-Token
//   3) 응답 JSON 다운로드 (data-export-YYYYMMDD.json)
//
//   "계정 삭제" 도 동일 패턴, body { reason } 옵션 + 확인 modal.
//
// 보안: CSRF token cookie 동봉, Firebase ID token Bearer, double-submit 검증.
// 빈도 제한: export 3/일, delete 3/일 (server enforced).

import React, { useState } from 'react';
import { Shield, Download, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { AppLanguage } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

interface PrivacySectionProps {
  language: AppLanguage;
}

type ActionStatus = 'idle' | 'working' | 'success' | 'error';

// ============================================================
// PART 2 — 4-language labels
// ============================================================

const LABELS: Record<AppLanguage, {
  title: string;
  description: string;
  exportTitle: string;
  exportDesc: string;
  exportButton: string;
  deleteTitle: string;
  deleteDesc: string;
  deleteButton: string;
  confirmDelete: string;
  confirmDeleteWarning: string;
  cancel: string;
  proceedDelete: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  loginRequired: string;
  workingExport: string;
  workingDelete: string;
  successExport: string;
  successDelete: string;
  legalNote: string;
}> = {
  KO: {
    title: '개인정보 / DSAR',
    description: 'GDPR Art.15 (열람권) · Art.17 (삭제권) · Art.20 (이동권) + K-PIPA §35 (열람) · §36 (삭제) 행사. 최대 30일 내 추가 데이터 메일 제공.',
    exportTitle: '내 데이터 내보내기',
    exportDesc: '계정 프로필 + 최근 활동을 JSON 파일로 다운로드합니다. 추가 데이터 (게시글·작품·번역 등)는 30일 내 등록 이메일로 발송됩니다.',
    exportButton: '내보내기 요청',
    deleteTitle: '계정 영구 삭제',
    deleteDesc: '계정과 관련된 모든 데이터를 영구 삭제합니다. 삭제 요청 후 30일 유예 기간이 있으며, 그 후 복구 불가능.',
    deleteButton: '계정 삭제 요청',
    confirmDelete: '정말로 계정을 삭제하시겠습니까?',
    confirmDeleteWarning: '⚠️ 이 작업은 30일 유예 후 영구적입니다. 모든 작품·번역·아카이브가 삭제됩니다.',
    cancel: '취소',
    proceedDelete: '삭제 진행',
    reasonLabel: '삭제 사유 (선택, 500자 이내)',
    reasonPlaceholder: '예: 서비스 미사용, 다른 도구 이용 등',
    loginRequired: '로그인이 필요합니다.',
    workingExport: '데이터 준비 중...',
    workingDelete: '삭제 요청 접수 중...',
    successExport: '내보내기 완료. JSON 파일이 다운로드됩니다.',
    successDelete: '삭제 요청 접수. 30일 후 영구 삭제됩니다.',
    legalNote: '본 기능은 GDPR / K-PIPA 의무를 충족합니다. 빈도 제한 3회/일.',
  },
  EN: {
    title: 'Privacy / DSAR',
    description: 'Exercise GDPR Art.15/17/20 + K-PIPA §35/36 rights. Additional data delivered to registered email within 30 days.',
    exportTitle: 'Export My Data',
    exportDesc: 'Download account profile + recent activity as JSON. Additional data (posts, works, translations) sent to registered email within 30 days.',
    exportButton: 'Request Export',
    deleteTitle: 'Permanent Account Deletion',
    deleteDesc: 'Permanently delete all account data. 30-day grace period applies; irreversible after that.',
    deleteButton: 'Request Deletion',
    confirmDelete: 'Are you sure you want to delete your account?',
    confirmDeleteWarning: '⚠️ This is permanent after 30 days. All works, translations, and archives will be deleted.',
    cancel: 'Cancel',
    proceedDelete: 'Proceed',
    reasonLabel: 'Reason (optional, max 500 chars)',
    reasonPlaceholder: 'e.g., No longer using, switching to another tool',
    loginRequired: 'Sign in required.',
    workingExport: 'Preparing data...',
    workingDelete: 'Submitting deletion request...',
    successExport: 'Export complete. JSON file downloaded.',
    successDelete: 'Deletion scheduled. Account will be permanently deleted in 30 days.',
    legalNote: 'This feature fulfills GDPR / K-PIPA obligations. Rate limit 3/day.',
  },
  JP: {
    title: 'プライバシー / DSAR',
    description: 'GDPR第15/17/20条 + K-PIPA §35/36 の権利行使。追加データは30日以内に登録メールで提供。',
    exportTitle: 'データのエクスポート',
    exportDesc: 'アカウントプロファイル + 最近の活動を JSON ファイルでダウンロードします。',
    exportButton: 'エクスポート要求',
    deleteTitle: 'アカウントの完全削除',
    deleteDesc: 'すべてのアカウントデータを完全削除します。30日の猶予期間後は復元不可。',
    deleteButton: '削除要求',
    confirmDelete: '本当にアカウントを削除しますか?',
    confirmDeleteWarning: '⚠️ 30日後は永久的です。すべての作品・翻訳・アーカイブが削除されます。',
    cancel: 'キャンセル',
    proceedDelete: '進行',
    reasonLabel: '理由 (任意、500字以内)',
    reasonPlaceholder: '例: 利用停止、他ツール移行',
    loginRequired: 'ログインが必要です。',
    workingExport: 'データ準備中...',
    workingDelete: '削除要求送信中...',
    successExport: 'エクスポート完了。JSONファイルがダウンロードされます。',
    successDelete: '削除要求受付。30日後に完全削除されます。',
    legalNote: '本機能は GDPR / K-PIPA の義務を充足。レート制限 3回/日。',
  },
  CN: {
    title: '隐私 / DSAR',
    description: '行使 GDPR 第15/17/20条 + 韩国 PIPA §35/36 权利。其他数据30日内邮件提供。',
    exportTitle: '导出我的数据',
    exportDesc: '将账户资料 + 最近活动以 JSON 文件下载。',
    exportButton: '请求导出',
    deleteTitle: '永久删除账户',
    deleteDesc: '永久删除所有账户数据。30天宽限期后不可恢复。',
    deleteButton: '请求删除',
    confirmDelete: '确定要删除您的账户吗?',
    confirmDeleteWarning: '⚠️ 30天后永久删除。所有作品、翻译、归档将被删除。',
    cancel: '取消',
    proceedDelete: '继续',
    reasonLabel: '原因 (可选,最多500字)',
    reasonPlaceholder: '例: 不再使用、切换其他工具',
    loginRequired: '需要登录。',
    workingExport: '准备数据中...',
    workingDelete: '提交删除请求中...',
    successExport: '导出完成。已下载 JSON 文件。',
    successDelete: '已接受删除请求。30天后永久删除。',
    legalNote: '本功能满足 GDPR / K-PIPA 义务。频率限制 3次/日。',
  },
};

// ============================================================
// PART 3 — CSRF + DSAR API helpers
// ============================================================

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/csrf', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.token === 'string' ? data.token : null;
  } catch (err) {
    logger.warn('PrivacySection', 'csrf fetch failed', err);
    return null;
  }
}

interface DsarResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

async function callDsarEndpoint(
  endpoint: '/api/user/export' | '/api/user/delete',
  idToken: string,
  csrfToken: string,
  body?: Record<string, unknown>,
): Promise<DsarResult> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: typeof data?.error === 'string' ? data.error : `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    logger.warn('PrivacySection', `${endpoint} call failed`, err);
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

function triggerJsonDownload(filename: string, payload: unknown): void {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (err) {
    logger.warn('PrivacySection', 'download trigger failed', err);
  }
}

// ============================================================
// PART 4 — Component
// ============================================================

const PrivacySection: React.FC<PrivacySectionProps> = ({ language }) => {
  const t = LABELS[language] ?? LABELS.KO;
  const { user, getIdToken } = useAuth();

  const [exportStatus, setExportStatus] = useState<ActionStatus>('idle');
  const [exportMsg, setExportMsg] = useState<string>('');

  const [deleteStatus, setDeleteStatus] = useState<ActionStatus>('idle');
  const [deleteMsg, setDeleteMsg] = useState<string>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');

  const isAuthed = !!user;

  const handleExport = async () => {
    if (!isAuthed) {
      setExportStatus('error');
      setExportMsg(t.loginRequired);
      return;
    }
    setExportStatus('working');
    setExportMsg(t.workingExport);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error(t.loginRequired);
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) throw new Error('CSRF token unavailable');
      const result = await callDsarEndpoint('/api/user/export', idToken, csrfToken);
      if (!result.ok) throw new Error(result.error || 'export failed');
      const filename = `loreguard-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      triggerJsonDownload(filename, result.data);
      setExportStatus('success');
      setExportMsg(t.successExport);
    } catch (err) {
      setExportStatus('error');
      setExportMsg(err instanceof Error ? err.message.slice(0, 120) : 'unknown error');
    }
  };

  const handleDeleteRequest = () => {
    if (!isAuthed) {
      setDeleteStatus('error');
      setDeleteMsg(t.loginRequired);
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    setDeleteStatus('working');
    setDeleteMsg(t.workingDelete);
    try {
      const idToken = await getIdToken();
      if (!idToken) throw new Error(t.loginRequired);
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) throw new Error('CSRF token unavailable');
      const body = reason.trim() ? { reason: reason.trim().slice(0, 500) } : {};
      const result = await callDsarEndpoint('/api/user/delete', idToken, csrfToken, body);
      if (!result.ok) throw new Error(result.error || 'delete request failed');
      setDeleteStatus('success');
      setDeleteMsg(t.successDelete);
    } catch (err) {
      setDeleteStatus('error');
      setDeleteMsg(err instanceof Error ? err.message.slice(0, 120) : 'unknown error');
    }
  };

  const renderStatusIcon = (status: ActionStatus, kind: 'export' | 'delete') => {
    if (status === 'working') return <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />;
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />;
    if (status === 'error') return <AlertTriangle className="w-4 h-4 text-red-600" aria-hidden="true" />;
    return kind === 'export'
      ? <Download className="w-4 h-4" aria-hidden="true" />
      : <AlertTriangle className="w-4 h-4" aria-hidden="true" />;
  };

  return (
    <details className="ds-accordion">
      <summary className="ds-accordion-summary">
        <Shield className="w-4 h-4" aria-hidden="true" />
        <span>{t.title}</span>
      </summary>
      <div className="ds-accordion-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.description}</p>

        {/* Export section */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>{t.exportTitle}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.exportDesc}</p>
          <button
            type="button"
            onClick={handleExport}
            disabled={!isAuthed || exportStatus === 'working'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '6px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              fontSize: '13px', cursor: isAuthed ? 'pointer' : 'not-allowed',
              opacity: isAuthed ? 1 : 0.5,
            }}
            aria-label={t.exportButton}
          >
            {renderStatusIcon(exportStatus, 'export')}
            <span>{t.exportButton}</span>
          </button>
          {exportMsg && (
            <p style={{
              fontSize: '12px', marginTop: '6px',
              color: exportStatus === 'error' ? 'var(--color-danger, #dc2626)' : 'var(--text-secondary)',
            }}>
              {exportMsg}
            </p>
          )}
        </div>

        {/* Delete section */}
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-danger, #dc2626)' }}>{t.deleteTitle}</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t.deleteDesc}</p>
          <button
            type="button"
            onClick={handleDeleteRequest}
            disabled={!isAuthed || deleteStatus === 'working' || deleteStatus === 'success'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '6px',
              background: 'transparent', border: '1px solid var(--color-danger, #dc2626)',
              color: 'var(--color-danger, #dc2626)',
              fontSize: '13px', cursor: isAuthed ? 'pointer' : 'not-allowed',
              opacity: isAuthed ? 1 : 0.5,
            }}
            aria-label={t.deleteButton}
          >
            {renderStatusIcon(deleteStatus, 'delete')}
            <span>{t.deleteButton}</span>
          </button>
          {deleteMsg && (
            <p style={{
              fontSize: '12px', marginTop: '6px',
              color: deleteStatus === 'error' ? 'var(--color-danger, #dc2626)' : 'var(--text-secondary)',
            }}>
              {deleteMsg}
            </p>
          )}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          {t.legalNote}
        </p>

        {/* Confirm modal */}
        {confirmOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-confirm-title"
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(17, 16, 14, 0.55)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{
              background: 'var(--bg-primary, white)', borderRadius: '12px', padding: '24px',
              maxWidth: '480px', width: '90%', boxShadow: '0 24px 48px rgba(0,0,0,0.18)',
            }}>
              <h3 id="privacy-confirm-title" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                {t.confirmDelete}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-danger, #dc2626)', marginBottom: '12px' }}>
                {t.confirmDeleteWarning}
              </p>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>{t.reasonLabel}</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value.slice(0, 500))}
                placeholder={t.reasonPlaceholder}
                rows={3}
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px',
                  border: '1px solid var(--border)', fontSize: '13px', marginBottom: '12px',
                  fontFamily: 'inherit', resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  style={{
                    padding: '8px 14px', borderRadius: '6px',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  style={{
                    padding: '8px 14px', borderRadius: '6px',
                    background: 'var(--color-danger, #dc2626)', color: 'white', border: 'none',
                    fontSize: '13px', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {t.proceedDelete}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </details>
  );
};

export default PrivacySection;

// IDENTITY_SEAL: PrivacySection | role=dsar-ui | inputs=user+csrf | outputs=export-json|delete-request
