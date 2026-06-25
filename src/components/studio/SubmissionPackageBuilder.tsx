'use client';

import React, { useCallback, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Download, ScrollText } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  buildSubmissionPackage,
  DISTRIBUTION_PROFILES,
  type DistributionProfileId,
  type SubmissionPackage,
  type ArtifactDescriptor,
} from '@/lib/creative-process/submission-package';
import {
  buildSubmissionPackageZipBlob,
  buildSubmissionPackageZipFilename,
} from '@/lib/creative-process/submission-package-zip';
import { LIMITATION_TEXT_4LANG } from '@/lib/creative-process/limitation-text';
import type {
  LoreguardPlanId,
  ReleaseEntitlementPlan,
} from '@/lib/billing/loreguard-plans';
import type { AppLanguage } from '@/lib/studio-types';
import {
  defaultDistributionProfileForPackage,
  defaultPackageProfileForDistribution,
  LABELS,
  readProjectFromStorage,
  toCertLang,
  triggerDownloadBlob,
} from './SubmissionPackageBuilder.helpers';
import { ArtifactChecklist, CoverPreview } from './SubmissionPackageBuilder.sections';

// ============================================================
// PART 1 — Props
// ============================================================

export interface SubmissionPackageBuilderProps {
  /** AppLanguage (Studio) — 내부에서 CertificateLanguage 로 변환 */
  language: AppLanguage;
  /** 외부에서 강제 주입 가능 (test/preview). 미지정 시 localStorage read */
  projectIdOverride?: string | null;
  /** 출고 탭에서 선택한 패키지 종류. 미지정 시 제출 용도에서 보수적으로 추론 */
  packageProfileId?: ReleaseEntitlementPlan['packageProfileId'];
  /** 결제 실행이 아니라 출고 크레딧 미리보기 산출물에만 사용 */
  planId?: LoreguardPlanId;
  availableCreditsOverride?: number | null;
  /** 출고 탭에서 권한 상태에 맞춘 검토용 버튼 라벨을 주입 */
  issueButtonLabelKo?: string;
  /** 출고 탭에서 권한·크레딧 상태를 버튼 앞에 설명 */
  issueGateNoteKo?: string;
  className?: string;
}

type IssueStatus = 'idle' | 'working' | 'success' | 'error';

// ============================================================
// PART 7 — Main component
// ============================================================

const SubmissionPackageBuilder: React.FC<SubmissionPackageBuilderProps> = ({
  language,
  projectIdOverride,
  packageProfileId,
  planId,
  availableCreditsOverride,
  issueButtonLabelKo,
  issueGateNoteKo,
  className = '',
}) => {
  const certLang = toCertLang(language);
  const t = LABELS[certLang];

  // [C] react-hooks/set-state-in-effect 회피 — useState lazy initializer 로 localStorage 1회 read,
  // override 와 derive 패턴으로 useEffect 제거. cascading render 0.
  const [localProjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = window.localStorage?.getItem('noa_studio_currentProjectId');
      return stored && stored.length > 0 ? stored : null;
    } catch {
      return null;
    }
  });
  const projectId = projectIdOverride !== undefined ? projectIdOverride : localProjectId;

  const [profileId, setProfileId] = useState<DistributionProfileId>(() =>
    defaultDistributionProfileForPackage(packageProfileId),
  );
  const [recipient, setRecipient] = useState<string>('');
  const [format, setFormat] = useState<'html' | 'md'>('html');
  const [status, setStatus] = useState<IssueStatus>('idle');
  const [pkg, setPkg] = useState<SubmissionPackage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const handleIssue = useCallback(async () => {
    if (!projectId) {
      setError(t.notReady);
      setStatus('error');
      return;
    }
    setStatus('working');
    setError(null);
    setDownloadMessage(null);
    try {
      const proj = readProjectFromStorage(projectId);
      const releasePackageProfileId = packageProfileId ?? defaultPackageProfileForDistribution(profileId);
      const result = await buildSubmissionPackage({
        projectId,
        language: certLang,
        profileId,
        recipientLabel: recipient.trim() || undefined,
        certificateFormat: format,
        projectMeta: { name: proj.projectName, authorName: proj.authorName },
        episodes: proj.episodes,
        worldSummary: proj.worldSummary,
        characters: proj.characters,
        importFileReports: proj.importFileReports,
        ipPack: proj.ipPack,
        coreCopyrightPackage: proj.coreCopyrightPackage,
        jurisdictionPackId: proj.jurisdictionPackId,
        releaseCredit: {
          planId: planId ?? proj.recommendedPlanId ?? 'free',
          packageProfileId: releasePackageProfileId,
          availableCreditsOverride,
        },
        generatedBy: 'loreguard@certificate-service',
      });
      setPkg(result);
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('SubmissionPackageBuilder', 'handleIssue failed', err);
      setError(msg.slice(0, 160));
      setStatus('error');
    }
  }, [availableCreditsOverride, certLang, format, packageProfileId, planId, profileId, projectId, recipient, t.notReady]);

  const handleDownloadOne = useCallback((a: ArtifactDescriptor) => {
    triggerDownloadBlob(a.filename, a.content, a.mimeType);
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!pkg) return;
    setDownloadMessage(null);
    try {
      const zipBlob = await buildSubmissionPackageZipBlob(pkg);
      if (!zipBlob) {
        pkg.artifacts.forEach((artifact, idx) => {
          setTimeout(() => {
            triggerDownloadBlob(artifact.filename, artifact.content, artifact.mimeType);
          }, idx * 100);
        });
        setDownloadMessage(t.zipFallback);
        return;
      }

      const zipFilename = buildSubmissionPackageZipFilename(pkg);
      const url = URL.createObjectURL(zipBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = zipFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloadMessage(t.zipReady);
    } catch (err) {
      logger.warn('SubmissionPackageBuilder', 'handleDownloadAll failed', err);
      setDownloadMessage(t.downloadFailed);
    }
  }, [pkg, t.downloadFailed, t.zipFallback, t.zipReady]);

  const primaryActionLabel = status === 'working'
    ? t.issuing
    : status === 'success'
      ? t.success
      : (issueButtonLabelKo ?? t.issue);

  const actionBlock = (
    <div className="submission-package-action-strip">
      <div className="submission-package-actions">
        <button
          type="button"
          aria-label={primaryActionLabel}
          className="submission-package-primary-action"
          onClick={handleIssue}
          disabled={status === 'working' || !projectId}
        >
          {status === 'working' ? (
            <>
              <Loader2 size={14} className="submission-package-spinner" aria-hidden="true" />
              {t.issuing}
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle2 size={14} aria-hidden="true" />
              {t.success}
            </>
          ) : (
            <>
              <ScrollText size={14} aria-hidden="true" />
              {issueButtonLabelKo ?? t.issue}
            </>
          )}
        </button>

        {pkg && (
          <button
            type="button"
            aria-label={t.downloadAll}
            className="submission-package-secondary-action"
            onClick={handleDownloadAll}
          >
            <Download size={14} aria-hidden="true" />
            {t.downloadAll}
          </button>
        )}
      </div>

      {error && status === 'error' && (
        <div
          role="alert"
          className="submission-package-error"
        >
          <AlertCircle size={14} aria-hidden="true" />
          {t.error}: {error}
        </div>
      )}

      {downloadMessage && (
        <p
          role="status"
          className="submission-package-download-message"
        >
          {downloadMessage}
        </p>
      )}
    </div>
  );

  // ============================================================
  // PART 8 — Render
  // ============================================================

  return (
    <section
      aria-label={t.title}
      className={`submission-package-builder ${className}`.trim()}
    >
      {/* Disclaimer first line */}
      <p
        className="submission-package-disclaimer"
      >
        {LIMITATION_TEXT_4LANG[certLang]}
      </p>

      {/* Header */}
      <header className="submission-package-header">
        <h2
          className="submission-package-title"
        >
          {t.title}
        </h2>
        <p className="submission-package-subtitle">{t.subtitle}</p>
      </header>

      {actionBlock}

      <div className="submission-package-builder-grid">
        {/* Left column — controls */}
        <div>
          {/* Profile selector */}
          <fieldset className="submission-package-fieldset">
            <legend
              className="submission-package-legend"
            >
              {t.profileHeader}
            </legend>
            <div className="submission-package-profile-grid">
              {(Object.keys(DISTRIBUTION_PROFILES) as DistributionProfileId[]).map((pid) => {
                const p = DISTRIBUTION_PROFILES[pid];
                const checked = pid === profileId;
                return (
                  <label
                    key={pid}
                    className={`submission-package-profile-option${checked ? ' is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="distribution-profile"
                      value={pid}
                      checked={checked}
                      onChange={() => setProfileId(pid)}
                      className="submission-package-radio"
                    />
                    <div className="submission-package-profile-body">
                      <div className="submission-package-profile-title">
                        {p.label[certLang]}
                      </div>
                      <div
                        className="submission-package-profile-meta"
                      >
                        {t.retentionYears}: {p.recommendedRetentionYears}{t.years}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Recipient */}
          <div className="submission-package-field">
            <label
              htmlFor="submission-recipient"
              className="submission-package-legend"
            >
              {t.recipientHeader}
            </label>
            <input
              id="submission-recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={t.recipientPlaceholder}
              className="submission-package-input"
            />
          </div>

          {/* Format toggle */}
          <fieldset className="submission-package-fieldset">
            <legend
              className="submission-package-legend"
            >
              {t.formatHeader}
            </legend>
            <div className="submission-package-format-options">
              {(['html', 'md'] as const).map((f) => (
                <label key={f} className="submission-package-format-option">
                  <input
                    type="radio"
                    name="cert-format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    className="submission-package-radio"
                  />
                  {f === 'html' ? t.formatHtml : t.formatMd}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Artifacts */}
          <h3
            className="submission-package-section-label"
          >
            {t.artifactsHeader}
          </h3>
          <ArtifactChecklist
            artifacts={pkg?.artifacts ?? []}
            language={certLang}
            onDownload={handleDownloadOne}
          />

          {issueGateNoteKo ? (
            <div
              aria-label="제출 묶음 생성 전 조건"
              className="submission-package-gate-note"
            >
              {issueGateNoteKo}
            </div>
          ) : null}

        </div>

        {/* Right column — Cover Preview */}
        <div>
          <h3
            className="submission-package-cover-label"
          >
            {t.coverPreview}
          </h3>
          <CoverPreview pkg={pkg} language={certLang} />
        </div>
      </div>
    </section>
  );
};

export default SubmissionPackageBuilder;
