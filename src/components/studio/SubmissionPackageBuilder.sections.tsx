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
import { VISUAL_TOKENS } from '@/lib/creative-process/visual-tokens';
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
      style={{
        background: '#FFFFFF',
        border: VISUAL_TOKENS.border.structural,
        padding: 32,
        textAlign: 'center',
        fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
      }}
      aria-label={LABELS[language].coverPreview}
    >
      <div
        // [C] inline SVG — 외부 link 0건 보장
        dangerouslySetInnerHTML={{ __html: sealSvg }}
        style={{ width: 120, height: 120, margin: '0 auto 16px auto' }}
      />
      <p
        style={{
          fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
          fontSize: 10,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: '#9CA3AF',
          margin: '0 0 12px 0',
        }}
      >
        {labels.headerLabel}
      </p>
      {pkg ? (
        <>
          <h2
            style={{
              fontFamily: VISUAL_TOKENS.typography.headlineMd.family,
              fontSize: 24,
              fontWeight: 600,
              margin: '0 0 8px 0',
              color: '#1A1A1A',
            }}
          >
            {pkg.profile.label[language]}
          </h2>
          <p
            style={{
              fontFamily: VISUAL_TOKENS.typography.dataMono.family,
              fontSize: 12,
              color: '#1A1A1A',
              margin: 0,
            }}
          >
            {labels.serialNo}: {pkg.sealNumber || '—'}
          </p>
          <p
            style={{
              fontFamily: VISUAL_TOKENS.typography.dataMono.family,
              fontSize: 11,
              color: '#9CA3AF',
              margin: '4px 0 0 0',
            }}
          >
            {pkg.recipientLabel}
          </p>
        </>
      ) : (
        <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>{LABELS[language].notReady}</p>
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
      <p style={{ color: '#9CA3AF', fontSize: 12, padding: '12px 0' }}>—</p>
    );
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {artifacts.map((artifact) => (
        <li
          key={artifact.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            borderBottom: VISUAL_TOKENS.border.hairline,
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
                fontSize: 13,
                fontWeight: 500,
                color: '#1A1A1A',
              }}
            >
              {ARTIFACT_LABELS[artifact.id][language]}
            </div>
            <div
              style={{
                fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                fontSize: 11,
                color: '#9CA3AF',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {artifact.filename} · {formatBytes(artifact.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDownload(artifact)}
            aria-label={`Download ${artifact.filename}`}
            style={{
              background: 'transparent',
              border: VISUAL_TOKENS.border.structural,
              padding: '4px 8px',
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: 0,
              color: '#1A1A1A',
            }}
          >
            <Download size={12} style={{ verticalAlign: 'middle' }} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
};
