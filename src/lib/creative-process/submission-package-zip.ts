// ============================================================
// Submission Package ZIP — 출고 아티팩트 단일 묶음 생성
// ============================================================
//
// 역할:
//   - SubmissionPackage.artifacts 를 사용자가 한 번에 내려받을 수 있는 ZIP으로 묶는다.
//   - ZIP 내부에는 원본 artifact 파일과 별도 manifest.json / README.txt 를 포함한다.
//   - 압축 라이브러리는 기존 full-backup 과 동일하게 JSZip 동적 import 를 사용한다.
// ============================================================

import type { ArtifactDescriptor, ArtifactId, SubmissionPackage } from './submission-package';

interface JSZipFileOptions {
  compression?: 'DEFLATE' | 'STORE';
}

interface JSZipLike {
  file(name: string, data: string, options?: JSZipFileOptions): JSZipLike;
  folder(name: string): JSZipLike | null;
  generateAsync(options: {
    type: 'blob';
    compression?: 'DEFLATE' | 'STORE';
    mimeType?: string;
  }): Promise<Blob>;
}

type JSZipCtor = new () => JSZipLike;

export interface SubmissionPackageZipManifestItem {
  id: ArtifactId;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
}

export type SubmissionPackageZipSectionId =
  | 'manuscript'
  | 'process-record'
  | 'rights-ip'
  | 'ledger'
  | 'private-evidence';

export interface SubmissionPackageZipManifestSection {
  id: SubmissionPackageZipSectionId;
  labelKo: string;
  artifactIds: ArtifactId[];
  noteKo: string;
  checklistKo: string[];
}

export interface SubmissionPackageZipProjectScope {
  projectId: string;
  isolated: boolean;
  noteKo: string;
}

export interface SubmissionPackageZipManifest {
  kind: 'loreguard.submission-package-zip.v1';
  packageId: string;
  projectId: string;
  projectName: string;
  certificateId: string;
  profileId: string;
  view: string;
  generatedAt: string;
  artifactCount: number;
  artifacts: SubmissionPackageZipManifestItem[];
  sections: SubmissionPackageZipManifestSection[];
  projectScope: SubmissionPackageZipProjectScope;
  disclosureBoundary: SubmissionPackageZipDisclosureBoundary;
  limitation: string;
}

export interface SubmissionPackageZipDisclosureBoundary {
  publicCard: {
    labelKo: string;
    allowedArtifactIds: ArtifactId[];
    excludedArtifactIds: ArtifactId[];
    excludedPayloadKo: string[];
    noteKo: string;
  };
  submissionPackage: {
    labelKo: string;
    includedArtifactIds: ArtifactId[];
    privateEvidenceArtifactIds: ArtifactId[];
    noteKo: string;
  };
}

interface ZipSectionDefinition {
  id: SubmissionPackageZipSectionId;
  labelKo: string;
  artifactIds: readonly ArtifactId[];
  noteKo: string;
  checklistKo: readonly string[];
}

const ZIP_SECTION_DEFINITIONS = [
  {
    id: 'manuscript',
    labelKo: '제출 원고',
    artifactIds: [
      'manuscript-final-clean-md',
      'manuscript-final-md',
      'manuscript-md',
      'final-clean-audit',
    ],
    noteKo: '수신자에게 전달할 원고와 제출 전 기계 점검 자료입니다.',
    checklistKo: ['제출용 정리 원고', '최종 정리 점검', '원고 해시'],
  },
  {
    id: 'process-record',
    labelKo: '과정기록',
    artifactIds: [
      'public-certificate-card',
      'process-certificate',
      'digital-signature',
      'c2pa-ready-manifest',
      'c2pa-preparation-note',
    ],
    noteKo: '작가 결정, 해시, 공개 검증 연결을 확인하는 자료입니다.',
    checklistKo: ['창작 과정 확인서', '디지털 서명', '공개 검증 연결', 'C2PA 준비 자료'],
  },
  {
    id: 'rights-ip',
    labelKo: '권리/IP 자산화',
    artifactIds: [
      'core-copyright-package',
      'ip-pack-manifest',
      'jurisdiction-form-pack',
      'regulatory-readiness',
      'import-file-report',
    ],
    noteKo: '외부 제시 자료, 권리 메모, 국가·플랫폼별 제출 준비 상태를 묶은 자료입니다.',
    checklistKo: ['외부 제시 자료 4군집', '매체별 작성 양식', '국가·플랫폼별 양식', '권리/IP 점검', '불러오기 기록'],
  },
  {
    id: 'ledger',
    labelKo: '원장 처리',
    artifactIds: ['release-credit-preview', 'package-issuance-receipt'],
    noteKo: '발급 처리와 차감 근거를 프로젝트 단위로 추적하는 자료입니다.',
    checklistKo: ['패키지 조건 미리보기', '프로젝트별 발급 기록', '차감·원장 근거', '재발급 추적'],
  },
  {
    id: 'private-evidence',
    labelKo: '내부 근거',
    artifactIds: ['source-bundle', 'work-receipt-journal'],
    noteKo: '공개하지 않는 출처 요약과 작업 판단 기록입니다.',
    checklistKo: ['출처 요약', '작업 영수증', '비공개 근거'],
  },
] as const satisfies readonly ZipSectionDefinition[];

const PUBLIC_CARD_ALLOWED_ARTIFACT_IDS: readonly ArtifactId[] = [
  'public-certificate-card',
  'digital-signature',
];

const PUBLIC_CARD_EXCLUDED_ARTIFACT_IDS: readonly ArtifactId[] = [
  'manuscript-md',
  'manuscript-final-md',
  'manuscript-final-clean-md',
  'process-certificate',
  'source-bundle',
  'work-receipt-journal',
  'import-file-report',
  'final-clean-audit',
  'jurisdiction-form-pack',
  'core-copyright-package',
  'release-credit-preview',
  'package-issuance-receipt',
  'ip-pack-manifest',
];

const PRIVATE_EVIDENCE_ARTIFACT_IDS: readonly ArtifactId[] = [
  'source-bundle',
  'work-receipt-journal',
  'manuscript-final-md',
  'import-file-report',
];

function sanitizePathSegment(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\.+/g, '.')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
  if (!cleaned || cleaned === '.' || cleaned === '..') return fallback;
  return cleaned;
}

function appendSuffix(filename: string, suffix: number): string {
  const dot = filename.lastIndexOf('.');
  if (dot > 0 && dot < filename.length - 1) {
    return `${filename.slice(0, dot)}-${suffix}${filename.slice(dot)}`;
  }
  return `${filename}-${suffix}`;
}

function uniqueArtifactPath(
  artifact: ArtifactDescriptor,
  used: Set<string>,
): string {
  const fallback = `${artifact.id}.txt`;
  const filename = sanitizePathSegment(artifact.filename || fallback, fallback);
  let candidate = `artifacts/${filename}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `artifacts/${appendSuffix(filename, suffix)}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function shortId(id: string): string {
  const safe = sanitizePathSegment(id || 'package', 'package');
  return safe.slice(-32) || 'package';
}

function buildFilenameSlug(value: string | null | undefined): string {
  const cleaned = (value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  if (!cleaned || cleaned === '.' || cleaned === '..') return '';
  return cleaned;
}

function buildZipSections(artifacts: readonly ArtifactDescriptor[]): SubmissionPackageZipManifestSection[] {
  const ids = new Set(artifacts.map((artifact) => artifact.id));
  return ZIP_SECTION_DEFINITIONS.map((section) => ({
    id: section.id,
    labelKo: section.labelKo,
    artifactIds: section.artifactIds.filter((artifactId) => ids.has(artifactId)),
    noteKo: section.noteKo,
    checklistKo: [...section.checklistKo],
  })).filter((section) => section.artifactIds.length > 0);
}

function buildProjectScope(projectId: string): SubmissionPackageZipProjectScope {
  const normalizedProjectId = projectId.trim() || 'project-draft';
  const isolated = Boolean(projectId.trim());
  return {
    projectId: normalizedProjectId,
    isolated,
    noteKo: isolated
      ? `프로젝트 ${normalizedProjectId} 기준으로 산출물, 과정기록, 원장 처리를 분리합니다.`
      : '프로젝트가 확정되기 전에는 산출물과 원장 처리를 대기 상태로 둡니다.',
  };
}

function intersectArtifactIds(ids: readonly ArtifactId[], available: ReadonlySet<ArtifactId>): ArtifactId[] {
  return ids.filter((id) => available.has(id));
}

function buildDisclosureBoundary(
  artifacts: readonly ArtifactDescriptor[],
): SubmissionPackageZipDisclosureBoundary {
  const available = new Set(artifacts.map((artifact) => artifact.id));
  return {
    publicCard: {
      labelKo: '공개용 과정기록 카드',
      allowedArtifactIds: intersectArtifactIds(PUBLIC_CARD_ALLOWED_ARTIFACT_IDS, available),
      excludedArtifactIds: intersectArtifactIds(PUBLIC_CARD_EXCLUDED_ARTIFACT_IDS, available),
      excludedPayloadKo: [
        '원고 본문',
        '제출용 정리 원고',
        '출처 원문',
        '작업 영수증 원문',
        '비공개 작업노트',
        '권리 원장 상세 메모',
      ],
      noteKo: '공개용 카드는 조회 링크와 축약 메타만 보여주며 ZIP 안의 제출 자료를 공개 카드 자료 범위로 재사용하지 않습니다.',
    },
    submissionPackage: {
      labelKo: '제출용 출고 패키지',
      includedArtifactIds: artifacts.map((artifact) => artifact.id),
      privateEvidenceArtifactIds: intersectArtifactIds(PRIVATE_EVIDENCE_ARTIFACT_IDS, available),
      noteKo: '제출용 패키지는 수신자 검토 범위에 맞춘 별도 묶음이며 공개 카드와 자료 범위를 분리합니다.',
    },
  };
}

export function buildSubmissionPackageZipFilename(pkg: Pick<SubmissionPackage, 'id' | 'certificateId' | 'projectName'>): string {
  const titleSlug = buildFilenameSlug(pkg.projectName);
  const idSlug = shortId(pkg.certificateId || pkg.id);
  return `loreguard-package-${titleSlug ? `${titleSlug}-` : ''}${idSlug}.zip`;
}

export function buildSubmissionPackageZipManifest(
  pkg: SubmissionPackage,
  artifactPaths: ReadonlyMap<ArtifactId, string>,
): SubmissionPackageZipManifest {
  return {
    kind: 'loreguard.submission-package-zip.v1',
    packageId: pkg.id,
    projectId: pkg.projectId,
    projectName: pkg.projectName?.trim() || pkg.projectId,
    certificateId: pkg.certificateId,
    profileId: pkg.profile.id,
    view: pkg.view,
    generatedAt: pkg.generatedAt,
    artifactCount: pkg.artifacts.length,
    artifacts: pkg.artifacts.map((artifact) => ({
      id: artifact.id,
      filename: artifact.filename,
      path: artifactPaths.get(artifact.id) ?? `artifacts/${artifact.filename}`,
      mimeType: artifact.mimeType,
      size: artifact.size,
    })),
    sections: buildZipSections(pkg.artifacts),
    projectScope: buildProjectScope(pkg.projectId),
    disclosureBoundary: buildDisclosureBoundary(pkg.artifacts),
    limitation:
      '이 manifest는 ZIP 안 파일, 경로, 목차, 프로젝트 격리 범위만 기록합니다. 권리 귀속, 작가성, 독창성, 법률 검토의 최종 판단은 별도 검토 단계로 남겨 둡니다.',
  };
}

function buildReadme(pkg: SubmissionPackage): string {
  const sections = buildZipSections(pkg.artifacts);
  const projectScope = buildProjectScope(pkg.projectId);
  return [
    'Loreguard 출고 패키지',
    '',
    `패키지 식별자: ${pkg.id}`,
    `프로젝트 식별자: ${projectScope.projectId}`,
    `확인서 식별자: ${pkg.certificateId}`,
    `제출 유형: ${pkg.profile.id}`,
    `생성 일시: ${pkg.generatedAt}`,
    '',
    '프로젝트 격리',
    `- ${projectScope.noteKo}`,
    '',
    '목차',
    ...sections.flatMap((section) => [
      `- ${section.labelKo}: ${section.artifactIds.join(', ')}`,
      `  ${section.noteKo}`,
      `  확인 항목: ${section.checklistKo.join(', ')}`,
    ]),
    '',
    '파일 위치',
    '- 실제 파일은 artifacts 폴더에 들어 있습니다.',
    '- manifest.json에서 파일 식별자, 파일명, 경로, 형식, 크기, 목차를 확인할 수 있습니다.',
    '',
    '검토 경계',
    '- 이 ZIP은 과정기록과 출고 준비 자료를 묶은 패키지입니다.',
    '- 저작권 소유, 작가성, 독창성, 법률 검토의 최종 판단은 별도 검토 단계로 남겨 둡니다.',
    '- 공개용 과정기록 카드는 이 ZIP의 원고·출처·작업 영수증을 그대로 노출하지 않습니다.',
    '- 제출용 출고 패키지는 수신자 검토 범위에 맞춰 공개 카드와 별도 자료 범위를 유지합니다.',
    '',
  ].join('\n');
}

export async function buildSubmissionPackageZipBlob(pkg: SubmissionPackage): Promise<Blob | null> {
  if (typeof Blob === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZipModule = await import('jszip' as any);
    const JSZip = (JSZipModule.default ?? JSZipModule) as JSZipCtor;
    const zip = new JSZip();
    const artifactPaths = new Map<ArtifactId, string>();
    const used = new Set<string>();

    for (const artifact of pkg.artifacts) {
      const path = uniqueArtifactPath(artifact, used);
      artifactPaths.set(artifact.id, path);
      zip.file(path, artifact.content, { compression: 'DEFLATE' });
    }

    zip.file('manifest.json', JSON.stringify(buildSubmissionPackageZipManifest(pkg, artifactPaths), null, 2), {
      compression: 'DEFLATE',
    });
    zip.file('README.txt', buildReadme(pkg), { compression: 'DEFLATE' });

    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      mimeType: 'application/zip',
    });
  } catch {
    return null;
  }
}
