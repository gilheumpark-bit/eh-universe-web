'use client';

// ============================================================
// SubmissionPackageBuilder — `_1` Certificate Vault Submission UI
// ============================================================
//
// stitch_lore_guard `_1` 화면 — 4 artifact bundle 발급 위저드.
//
// 사상 정합 (Visual Charter v1.0):
//   - Sharp 0px corners — Witness Seal · 도넛만 50%
//   - Newsreader serif 헤드 + Public Sans 본문 + Inter mono 데이터
//   - Gold #D4AF37 Witness Seal accent
//   - Royal Blue #4169E1 verified status
//   - 외부 link 0건
//
// 격리 §1 준수: studio-types.ts / save-engine 의존 0.
// localStorage `noa_projects_v2` read 만 (write 0).
//
// [C] 안전성: 빈 프로젝트 / 빈 episodes 발급 차단, status 4단계
// [G] 성능: package memo + format toggle 시 다시 build (사용자 명시 액션 only)
// [K] 간결성: helper 4개 + main 1개
// ============================================================

import React, { useCallback, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Download, ScrollText } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  buildSubmissionPackage,
  DISTRIBUTION_PROFILES,
  ARTIFACT_LABELS,
  type DistributionProfileId,
  type SubmissionPackage,
  type ArtifactDescriptor,
} from '@/lib/creative-process/submission-package';
import { VISUAL_TOKENS } from '@/lib/creative-process/visual-tokens';
import { LIMITATION_TEXT_4LANG } from '@/lib/creative-process/limitation-text';
import { ATTESTATION_LABELS } from '@/lib/creative-process/attestation-text';
import { buildWitnessSealSVG } from '@/lib/creative-process/seal-issuer';
import type { CertificateLanguage } from '@/lib/creative-process/types';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — Props
// ============================================================

export interface SubmissionPackageBuilderProps {
  /** AppLanguage (Studio) — 내부에서 CertificateLanguage 로 변환 */
  language: AppLanguage;
  /** 외부에서 강제 주입 가능 (test/preview). 미지정 시 localStorage read */
  projectIdOverride?: string | null;
  className?: string;
}

type IssueStatus = 'idle' | 'working' | 'success' | 'error';

// ============================================================
// PART 2 — i18n
// ============================================================

const LABELS = {
  ko: {
    title: '제출 묶음 생성',
    subtitle: '4개 artifact 를 한 번에 다운로드',
    artifactsHeader: '포함될 artifact',
    profileHeader: 'Distribution Profile',
    recipientHeader: '받는 곳 (선택)',
    recipientPlaceholder: '예: 한국문학번역원 / 출판사 / 플랫폼',
    formatHeader: '확인서 형식',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: '묶음 생성',
    issuing: '생성 중...',
    success: '묶음 생성 완료',
    error: '오류',
    downloadAll: '전체 다운로드',
    artifactSize: '크기',
    coverPreview: '표지 미리보기',
    sealNo: '발급 번호',
    notReady: '프로젝트가 선택되지 않았습니다.',
    retentionYears: '권장 보관 기간',
    years: '년',
  },
  en: {
    title: 'Submission Package',
    subtitle: 'Download all 4 artifacts at once',
    artifactsHeader: 'Artifacts Included',
    profileHeader: 'Distribution Profile',
    recipientHeader: 'Recipient (optional)',
    recipientPlaceholder: 'e.g. Library of Congress / Publisher / Platform',
    formatHeader: 'Certificate Format',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: 'Generate Package',
    issuing: 'Generating...',
    success: 'Package generated',
    error: 'Error',
    downloadAll: 'Download all',
    artifactSize: 'Size',
    coverPreview: 'Cover Preview',
    sealNo: 'Serial No.',
    notReady: 'No project selected.',
    retentionYears: 'Recommended retention',
    years: 'yr',
  },
  ja: {
    title: '提出パッケージ',
    subtitle: '4つのartifactを一括ダウンロード',
    artifactsHeader: '同梱artifact',
    profileHeader: 'Distribution Profile',
    recipientHeader: '送付先 (任意)',
    recipientPlaceholder: '例: 国立国会図書館 / 出版社 / プラットフォーム',
    formatHeader: '確認書形式',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: 'パッケージ生成',
    issuing: '生成中...',
    success: 'パッケージ生成完了',
    error: 'エラー',
    downloadAll: '一括ダウンロード',
    artifactSize: 'サイズ',
    coverPreview: '表紙プレビュー',
    sealNo: '発行番号',
    notReady: 'プロジェクトが選択されていません。',
    retentionYears: '推奨保管期間',
    years: '年',
  },
  zh: {
    title: '提交包',
    subtitle: '一次性下载4个artifact',
    artifactsHeader: '包含的artifact',
    profileHeader: 'Distribution Profile',
    recipientHeader: '接收方 (选填)',
    recipientPlaceholder: '例: 国家图书馆 / 出版社 / 平台',
    formatHeader: '确认书格式',
    formatHtml: 'HTML',
    formatMd: 'Markdown',
    issue: '生成包',
    issuing: '生成中...',
    success: '包生成完成',
    error: '错误',
    downloadAll: '全部下载',
    artifactSize: '大小',
    coverPreview: '封面预览',
    sealNo: '发行编号',
    notReady: '尚未选择项目。',
    retentionYears: '建议保管期限',
    years: '年',
  },
} as const;

function toCertLang(lang: AppLanguage): CertificateLanguage {
  switch (lang) {
    case 'KO': return 'ko';
    case 'EN': return 'en';
    case 'JP': return 'ja';
    case 'CN': return 'zh';
    default: return 'ko';
  }
}

// ============================================================
// PART 3 — Download helpers
// ============================================================

function triggerDownloadBlob(filename: string, content: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    logger.warn('SubmissionPackageBuilder', 'triggerDownloadBlob failed', err);
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================
// PART 4 — Project read helper (격리: localStorage only)
// ============================================================

interface ProjectReadResult {
  projectName: string;
  authorName?: string;
  episodes: Array<{ episode: number; content: string }>;
  worldSummary?: { genre?: string; era?: string; ruleCount?: number };
  characters?: Array<{ id: string; name: string }>;
}

function readProjectFromStorage(projectId: string): ProjectReadResult {
  const fallback: ProjectReadResult = { projectName: projectId, episodes: [] };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage?.getItem('noa_projects_v2');
    if (!raw) return fallback;
    const projects = JSON.parse(raw) as Array<{
      id: string;
      name?: string;
      sessions?: Array<{
        config?: {
          manuscripts?: Array<{ episode: number; content: string }>;
          world?: { genre?: string; era?: string; rules?: unknown[] };
          worldSimData?: { genre?: string };
          characters?: Array<{ id: string; name: string }>;
        };
      }>;
    }>;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return fallback;
    const allMs: Array<{ episode: number; content: string }> = [];
    const charsMap = new Map<string, { id: string; name: string }>();
    let worldGenre: string | undefined;
    let ruleCount = 0;
    for (const sess of proj.sessions ?? []) {
      for (const m of sess.config?.manuscripts ?? []) {
        if (typeof m.content === 'string') {
          allMs.push({ episode: m.episode, content: m.content });
        }
      }
      for (const c of sess.config?.characters ?? []) {
        if (c?.id) charsMap.set(c.id, { id: c.id, name: c.name || c.id });
      }
      if (!worldGenre) worldGenre = sess.config?.world?.genre || sess.config?.worldSimData?.genre;
      if (Array.isArray(sess.config?.world?.rules)) ruleCount += sess.config!.world!.rules!.length;
    }
    return {
      projectName: proj.name || projectId,
      episodes: allMs,
      characters: Array.from(charsMap.values()),
      worldSummary: worldGenre || ruleCount > 0 ? { genre: worldGenre, ruleCount } : undefined,
    };
  } catch (err) {
    logger.warn('SubmissionPackageBuilder', 'readProjectFromStorage failed', err);
    return fallback;
  }
}

// ============================================================
// PART 5 — Cover Preview block (Witness Seal + 메타)
// ============================================================

interface CoverPreviewProps {
  pkg: SubmissionPackage | null;
  language: CertificateLanguage;
}

const CoverPreview: React.FC<CoverPreviewProps> = ({ pkg, language }) => {
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

// ============================================================
// PART 6 — Artifact 체크리스트
// ============================================================

const ArtifactChecklist: React.FC<{
  artifacts: ArtifactDescriptor[];
  language: CertificateLanguage;
  onDownload: (a: ArtifactDescriptor) => void;
}> = ({ artifacts, language, onDownload }) => {
  if (artifacts.length === 0) {
    return (
      <p style={{ color: '#9CA3AF', fontSize: 12, padding: '12px 0' }}>—</p>
    );
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {artifacts.map((a) => (
        <li
          key={a.id}
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
              {ARTIFACT_LABELS[a.id][language]}
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
              {a.filename} · {formatBytes(a.size)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDownload(a)}
            aria-label={`Download ${a.filename}`}
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

// ============================================================
// PART 7 — Main component
// ============================================================

const SubmissionPackageBuilder: React.FC<SubmissionPackageBuilderProps> = ({
  language,
  projectIdOverride,
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

  const [profileId, setProfileId] = useState<DistributionProfileId>('publisher');
  const [recipient, setRecipient] = useState<string>('');
  const [format, setFormat] = useState<'html' | 'md'>('html');
  const [status, setStatus] = useState<IssueStatus>('idle');
  const [pkg, setPkg] = useState<SubmissionPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleIssue = useCallback(async () => {
    if (!projectId) {
      setError(t.notReady);
      setStatus('error');
      return;
    }
    setStatus('working');
    setError(null);
    try {
      const proj = readProjectFromStorage(projectId);
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
        generatedBy: 'loreguard@2.2.0-alpha.1',
      });
      setPkg(result);
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('SubmissionPackageBuilder', 'handleIssue failed', err);
      setError(msg.slice(0, 160));
      setStatus('error');
    }
  }, [projectId, certLang, profileId, recipient, format, t.notReady]);

  const handleDownloadOne = useCallback((a: ArtifactDescriptor) => {
    triggerDownloadBlob(a.filename, a.content, a.mimeType);
  }, []);

  const handleDownloadAll = useCallback(() => {
    if (!pkg) return;
    // [C] Chrome/Safari 다중 다운로드 차단 우회 — 100ms stagger.
    // ZIP 묶음 export 는 Phase 4 백로그 (handbook.md §24).
    pkg.artifacts.forEach((a, idx) => {
      setTimeout(() => {
        triggerDownloadBlob(a.filename, a.content, a.mimeType);
      }, idx * 100);
    });
  }, [pkg]);

  // ============================================================
  // PART 8 — Render
  // ============================================================

  return (
    <section
      aria-label={t.title}
      className={className}
      style={{
        background: '#FFFFFF',
        border: VISUAL_TOKENS.border.hairline,
        padding: 32,
        fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
        color: '#1A1A1A',
      }}
    >
      {/* Disclaimer first line */}
      <p
        style={{
          fontSize: 11,
          color: '#9CA3AF',
          borderBottom: VISUAL_TOKENS.border.hairline,
          paddingBottom: 12,
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        {LIMITATION_TEXT_4LANG[certLang]}
      </p>

      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: VISUAL_TOKENS.typography.headlineMd.family,
            fontSize: 28,
            fontWeight: 500,
            margin: '0 0 8px 0',
            color: '#1A1A1A',
          }}
        >
          {t.title}
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{t.subtitle}</p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        {/* Left column — controls */}
        <div>
          {/* Profile selector */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 24px 0' }}>
            <legend
              style={{
                fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B7280',
                marginBottom: 8,
              }}
            >
              {t.profileHeader}
            </legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {(Object.keys(DISTRIBUTION_PROFILES) as DistributionProfileId[]).map((pid) => {
                const p = DISTRIBUTION_PROFILES[pid];
                const checked = pid === profileId;
                return (
                  <label
                    key={pid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 14px',
                      border: checked
                        ? `2px solid ${VISUAL_TOKENS.color.deepCharcoal}`
                        : VISUAL_TOKENS.border.hairline,
                      cursor: 'pointer',
                      background: checked ? '#F9F9F9' : '#FFFFFF',
                    }}
                  >
                    <input
                      type="radio"
                      name="distribution-profile"
                      value={pid}
                      checked={checked}
                      onChange={() => setProfileId(pid)}
                      style={{ accentColor: VISUAL_TOKENS.color.deepCharcoal }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>
                        {p.label[certLang]}
                      </div>
                      <div
                        style={{
                          fontFamily: VISUAL_TOKENS.typography.dataMono.family,
                          fontSize: 10,
                          color: '#9CA3AF',
                          marginTop: 2,
                        }}
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
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="submission-recipient"
              style={{
                display: 'block',
                fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B7280',
                marginBottom: 8,
              }}
            >
              {t.recipientHeader}
            </label>
            <input
              id="submission-recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={t.recipientPlaceholder}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontFamily: VISUAL_TOKENS.typography.bodyMd.family,
                fontSize: 13,
                border: VISUAL_TOKENS.border.hairline,
                background: '#FFFFFF',
                color: '#1A1A1A',
                borderRadius: 0, // Sharp 0px
              }}
            />
          </div>

          {/* Format toggle */}
          <fieldset style={{ border: 'none', padding: 0, margin: '0 0 24px 0' }}>
            <legend
              style={{
                fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B7280',
                marginBottom: 8,
              }}
            >
              {t.formatHeader}
            </legend>
            <div style={{ display: 'flex', gap: 16 }}>
              {(['html', 'md'] as const).map((f) => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="cert-format"
                    value={f}
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    style={{ accentColor: VISUAL_TOKENS.color.deepCharcoal }}
                  />
                  {f === 'html' ? t.formatHtml : t.formatMd}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Artifacts */}
          <h3
            style={{
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6B7280',
              margin: '0 0 4px 0',
            }}
          >
            {t.artifactsHeader}
          </h3>
          <ArtifactChecklist
            artifacts={pkg?.artifacts ?? []}
            language={certLang}
            onDownload={handleDownloadOne}
          />

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={handleIssue}
              disabled={status === 'working' || !projectId}
              style={{
                background: '#1A1A1A',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 20px',
                fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: status === 'working' || !projectId ? 'not-allowed' : 'pointer',
                opacity: status === 'working' || !projectId ? 0.5 : 1,
                borderRadius: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {status === 'working' ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
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
                  {t.issue}
                </>
              )}
            </button>

            {pkg && (
              <button
                type="button"
                onClick={handleDownloadAll}
                style={{
                  background: 'transparent',
                  color: '#1A1A1A',
                  border: VISUAL_TOKENS.border.structural,
                  padding: '12px 20px',
                  fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Download size={14} aria-hidden="true" />
                {t.downloadAll}
              </button>
            )}
          </div>

          {/* Error */}
          {error && status === 'error' && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 0,
              }}
            >
              <AlertCircle size={14} aria-hidden="true" />
              {t.error}: {error}
            </div>
          )}
        </div>

        {/* Right column — Cover Preview */}
        <div>
          <h3
            style={{
              fontFamily: VISUAL_TOKENS.typography.labelCaps.family,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6B7280',
              margin: '0 0 12px 0',
            }}
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
