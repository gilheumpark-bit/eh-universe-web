import React from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { ATTESTATION_LABELS } from '@/lib/creative-process/attestation-text';
import {
  ARTIFACT_LABELS,
  type ArtifactDescriptor,
  type SubmissionPackage,
} from '@/lib/creative-process/submission-package';
import { buildWitnessSealSVG } from '@/lib/creative-process/seal-issuer';
import type { CertificateLanguage } from '@/lib/creative-process/types';
import { formatBytes, LABELS } from './SubmissionPackageBuilder.helpers';

export interface CoverPreviewProps {
  pkg: SubmissionPackage | null;
  language: CertificateLanguage;
}

export const CoverPreview: React.FC<CoverPreviewProps> = ({ pkg, language }) => {
  const labels = ATTESTATION_LABELS[language];
  const sealSvg = buildWitnessSealSVG();

  return (
    <div
      className="submission-cover-preview"
      aria-label={LABELS[language].coverPreview}
    >
      <div
        // [C] inline SVG — 외부 link 0건 보장
        dangerouslySetInnerHTML={{ __html: sealSvg }}
        className="submission-cover-seal"
      />
      <p className="submission-cover-eyebrow">
        {labels.headerLabel}
      </p>
      {pkg ? (
        <>
          <h2 className="submission-cover-title">
            {pkg.profile.label[language]}
          </h2>
          <p className="submission-cover-serial">
            {labels.serialNo}: {pkg.sealNumber || '—'}
          </p>
          {pkg.verificationQrDataUrl ? (
            <div className="submission-cover-qr">
              {/* eslint-disable-next-line @next/next/no-img-element -- 발급된 QR data URL은 외부 이미지 최적화 대상이 아님 */}
              <img
                src={pkg.verificationQrDataUrl}
                alt={labels.scanForProof}
                width={84}
                height={84}
                className="submission-cover-qr-img"
              />
              <span className="submission-cover-qr-label">
                {labels.scanForProof}
              </span>
            </div>
          ) : null}
          <p className="submission-cover-recipient">
            {pkg.recipientLabel}
          </p>
        </>
      ) : (
        <p className="submission-cover-not-ready">{LABELS[language].notReady}</p>
      )}
    </div>
  );
};

export const ArtifactChecklist: React.FC<{
  artifacts: ArtifactDescriptor[];
  language: CertificateLanguage;
  onDownload: (artifact: ArtifactDescriptor) => void;
}> = ({ artifacts, language, onDownload }) => {
  if (artifacts.length === 0) {
    return (
      <p className="submission-artifact-empty">—</p>
    );
  }
  return (
    <ul className="submission-artifact-list">
      {artifacts.map((artifact) => (
        <li
          key={artifact.id}
          className="submission-artifact-row"
        >
          <CheckCircle2 size={16} className="submission-artifact-icon" aria-hidden="true" />
          <div className="submission-artifact-main">
            <div className="submission-artifact-title">
              {ARTIFACT_LABELS[artifact.id][language]}
            </div>
            <div className="submission-artifact-meta">
              {artifact.filename} · {formatBytes(artifact.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDownload(artifact)}
            aria-label={`Download ${artifact.filename}`}
            className="submission-artifact-download"
          >
            <Download size={12} className="submission-artifact-download-icon" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
};
