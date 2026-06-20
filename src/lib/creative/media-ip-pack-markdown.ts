import {
  IP_BIBLE_SECTION_KEYS,
  IP_BIBLE_SECTION_META,
  type IpBibleCluster,
  type IpBibleSectionKey,
} from '@/lib/creative/ip-bible-builder';
import type {
  MediaIpPackFormGroup,
  MediaIpPackFormGroupCompletion,
  MediaIpPackPlan,
  MediaIpPackStatus,
} from '@/lib/creative/media-ip-pack-profile';

export interface MediaIpPackPackageSummary {
  labelKo: string;
  audienceKo: string;
  boundaryKo: string;
  requiredItemsKo: readonly string[];
  recommendedItemsKo: readonly string[];
  privateItemsKo: readonly string[];
  summaryKo: string;
}

export interface MediaIpPackFormRowSummary {
  titleKo: string;
  purposeKo: string;
  requiredPresent: number;
  requiredTotal: number;
}

export interface MediaIpPackJurisdictionSourceRow {
  titleKo: string;
  url: string;
  checkedAt: string;
}

export interface MediaIpPackRightsLedgerRow {
  id?: string;
  categoryKo: string;
  ownerKo: string;
  usageScopeKo: string;
  exclusivityKo?: string;
  termKo?: string;
  regionKo?: string;
  mediaKo?: string;
  evidenceFileKo?: string;
  statusKo: string;
  noteKo: string;
}

export interface MediaIpPackSourceSummaryRow {
  id?: string;
  labelKo: string;
  typeKo: string;
  originKo: string;
  visibilityKo: string;
  licenseKo: string;
  evidenceKo: string;
  noteKo?: string | null;
}

export interface MediaIpPackCertificateOutputSummary {
  labelKo: string;
  purposeKo: string;
  boundaryKo: string;
  visualModeKo: string;
  verificationUrl?: string | null;
  sealNumber?: string | null;
  exposedFieldsKo: readonly string[];
  privateFieldsKo: readonly string[];
  includedArtifactsKo?: readonly string[];
  excludedArtifactsKo?: readonly string[];
  rightsLedgerPolicyKo?: string;
  safetyPolicyKo?: string;
  missingKo: readonly string[];
  summaryKo: string;
}

export interface MediaIpPackMarkdownInput {
  workTitle?: string | null;
  generatedAt?: string | null;
  plan: MediaIpPackPlan;
  packageSummary: MediaIpPackPackageSummary;
  jurisdictionLabelKo: string;
  jurisdictionFormRows: readonly MediaIpPackFormRowSummary[];
  jurisdictionSourceRows?: readonly MediaIpPackJurisdictionSourceRow[];
  rightsLedgerRows?: readonly MediaIpPackRightsLedgerRow[];
  sourceSummaryRows?: readonly MediaIpPackSourceSummaryRow[];
  certificateOutput?: MediaIpPackCertificateOutputSummary;
  formGroupCompletions?: readonly MediaIpPackFormGroupCompletion[];
  productLabelKo: string;
  productPriceKrw: number;
  productPriceLabelKo?: string;
  rightsStatusKo: string;
  rightsNote?: string | null;
}

const STATUS_LABEL_KO: Record<MediaIpPackStatus, string> = {
  ready: '준비',
  review: '검토',
  hold: '보강 필요',
};

const IP_BIBLE_CLUSTER_ORDER: readonly IpBibleCluster[] = Object.freeze([
  'entry',
  'story',
  'setting',
  'business',
]);

const IP_BIBLE_CLUSTER_LABEL_KO: Record<IpBibleCluster, string> = {
  entry: '진입 자료',
  story: '스토리 자료',
  setting: '설정 자료',
  business: '제작·사업 자료',
};

const IP_BIBLE_CLUSTER_DESC_KO: Record<IpBibleCluster, string> = {
  entry: '첫 검토자가 작품 정체와 판매 포인트를 빠르게 잡는 자료입니다.',
  story: '줄거리, 구조, 핵심 장면, 테마를 검토하는 자료입니다.',
  setting: '세계관, 인물, 용어처럼 제작 중 계속 참조할 자료입니다.',
  business: '비주얼, 시장 위치, 회차 구성, 확장 가능성을 판단하는 자료입니다.',
};

function textOrFallback(value: string | number | null | undefined, fallback = '미입력'): string {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : fallback;
}

function sectionLabelKo(key: IpBibleSectionKey): string {
  return IP_BIBLE_SECTION_META[key]?.title ?? '미분류 항목';
}

function joinLabels(values: readonly string[], fallback = '없음'): string {
  const filled = values.map((value) => value.trim()).filter(Boolean);
  return filled.length > 0 ? filled.join(' · ') : fallback;
}

function bulletList(values: readonly string[], fallback = '없음'): string[] {
  const filled = values.map((value) => value.trim()).filter(Boolean);
  return (filled.length > 0 ? filled : [fallback]).map((value) => `- ${value}`);
}

function mediaFormGroupLines(
  groups: readonly MediaIpPackFormGroup[],
  completions?: readonly MediaIpPackFormGroupCompletion[],
): string[] {
  if (groups.length === 0) {
    return ['- 매체별 작성 양식이 아직 없습니다.'];
  }

  const completionByTitle = new Map((completions ?? []).map((item) => [item.titleKo, item]));
  const lines: string[] = [];
  for (const group of groups) {
    const completion = completionByTitle.get(group.titleKo);
    const progressKo = completion
      ? ` · 채움 ${completion.filledCount}/${completion.totalCount}`
      : '';
    const fieldSummary = completion
      ? completion.fields.map((field) => `${field.labelKo}(${field.filled ? '채움' : '대기'})`).join(' · ')
      : joinLabels(group.fieldsKo, '항목 없음');

    lines.push(`- ${textOrFallback(group.titleKo, '양식 묶음')}: ${textOrFallback(group.purposeKo, '목적 미입력')}${progressKo}`);
    lines.push(`  - 작성 항목: ${fieldSummary}`);
  }
  return lines;
}

function sectionList(keys: readonly IpBibleSectionKey[], fallback: string): string[] {
  return keys.length > 0 ? keys.map((key) => `- ${sectionLabelKo(key)}`) : [`- ${fallback}`];
}

function sectionStatusKo(
  key: IpBibleSectionKey,
  filledSet: ReadonlySet<IpBibleSectionKey>,
  missingRequiredSet: ReadonlySet<IpBibleSectionKey>,
  missingRecommendedSet: ReadonlySet<IpBibleSectionKey>,
): string {
  if (filledSet.has(key)) return '채움';
  if (missingRequiredSet.has(key)) return '필수 보강';
  if (missingRecommendedSet.has(key)) return '권장 보강';
  return '대기';
}

function ipBibleClusterLines(plan: MediaIpPackPlan): string[] {
  const filledSet = new Set(plan.filledSections);
  const missingRequiredSet = new Set(plan.missingRequired);
  const missingRecommendedSet = new Set(plan.missingRecommended);
  const lines: string[] = [];

  for (const cluster of IP_BIBLE_CLUSTER_ORDER) {
    const keys = IP_BIBLE_SECTION_KEYS.filter(
      (key) => IP_BIBLE_SECTION_META[key].cluster === cluster,
    );
    const filledCount = keys.filter((key) => filledSet.has(key)).length;
    const sectionStates = keys
      .map(
        (key) =>
          `${sectionLabelKo(key)}(${sectionStatusKo(
            key,
            filledSet,
            missingRequiredSet,
            missingRecommendedSet,
          )})`,
      )
      .join(' · ');

    lines.push(
      `- ${IP_BIBLE_CLUSTER_LABEL_KO[cluster]}: ${filledCount}/${keys.length} · ${IP_BIBLE_CLUSTER_DESC_KO[cluster]}`,
    );
    lines.push(`  - 항목: ${sectionStates}`);
  }

  return lines;
}

function rightsLedgerList(rows: readonly MediaIpPackRightsLedgerRow[] | undefined): string[] {
  if (!rows || rows.length === 0) {
    return ['- 권리 원장 항목이 아직 없습니다.'];
  }

  return rows.map((row) => {
    const category = textOrFallback(row.categoryKo, '미분류');
    const details = [
      `소유/주체 ${textOrFallback(row.ownerKo)}`,
      `사용 범위 ${textOrFallback(row.usageScopeKo)}`,
      `독점 여부 ${textOrFallback(row.exclusivityKo, '미정')}`,
      `기간 ${textOrFallback(row.termKo, '미정')}`,
      `지역 ${textOrFallback(row.regionKo, '미정')}`,
      `매체 ${textOrFallback(row.mediaKo, '미정')}`,
      `근거 파일 ${textOrFallback(row.evidenceFileKo, '미기록')}`,
      `상태 ${textOrFallback(row.statusKo)}`,
      `메모 ${textOrFallback(row.noteKo, '별도 메모 없음')}`,
    ].join(' · ');

    return `- ${category}: ${details}`;
  });
}

function sourceSummaryList(rows: readonly MediaIpPackSourceSummaryRow[] | undefined): string[] {
  if (!rows || rows.length === 0) {
    return ['- 외부 자료·출처 상세 기록이 아직 없습니다.'];
  }

  return rows.map((row) => {
    const label = textOrFallback(row.labelKo, '이름 없는 출처');
    const details = [
      `종류 ${textOrFallback(row.typeKo)}`,
      `원천 ${textOrFallback(row.originKo, '원천 미기록')}`,
      `공개 범위 ${textOrFallback(row.visibilityKo)}`,
      `권리 메모 ${textOrFallback(row.licenseKo, '권리 메모 없음')}`,
      `근거 ${textOrFallback(row.evidenceKo, '근거 없음')}`,
      `메모 ${textOrFallback(row.noteKo, '별도 메모 없음')}`,
    ].join(' · ');

    return `- ${label}: ${details}`;
  });
}

function jurisdictionSourceList(rows: readonly MediaIpPackJurisdictionSourceRow[] | undefined): string[] {
  if (!rows || rows.length === 0) {
    return ['- 근거 출처: 공통 팩은 프로젝트별 제출처 확인을 우선합니다.'];
  }

  return rows.map((row) => {
    const title = textOrFallback(row.titleKo, '출처 제목 없음');
    const checkedAt = textOrFallback(row.checkedAt, '기준일 미기록');
    const url = textOrFallback(row.url, 'URL 미기록');
    return `- ${title}: 기준일 ${checkedAt} · ${url}`;
  });
}

function certificateOutputLines(summary: MediaIpPackCertificateOutputSummary | undefined): string[] {
  if (!summary) {
    return ['- 확인 문서 분기 정보가 아직 없습니다.'];
  }

  return [
    `- 출력 형태: ${textOrFallback(summary.labelKo)} · ${textOrFallback(summary.visualModeKo)}`,
    `- 목적: ${textOrFallback(summary.purposeKo)}`,
    `- 공유 경계: ${textOrFallback(summary.boundaryKo)}`,
    `- 봉인번호: ${textOrFallback(summary.sealNumber, '발급 전')}`,
    `- 조회 링크: ${textOrFallback(summary.verificationUrl, '발급 전')}`,
    `- 노출 항목: ${joinLabels(summary.exposedFieldsKo)}`,
    `- 제외 항목: ${joinLabels(summary.privateFieldsKo)}`,
    `- 첨부 산출물: ${joinLabels(summary.includedArtifactsKo ?? [], '첨부 산출물 없음')}`,
    `- 구조적 제외 산출물: ${joinLabels(summary.excludedArtifactsKo ?? [], '구조적 제외 산출물 없음')}`,
    `- 권리 원장 정책: ${textOrFallback(summary.rightsLedgerPolicyKo, '출력 구성에 따라 요약 또는 상세 첨부를 분리합니다.')}`,
    `- 안전 분리: ${textOrFallback(summary.safetyPolicyKo, '공개 범위와 제출 범위를 분리합니다.')}`,
    `- 발급 전 확인: ${joinLabels(summary.missingKo, '추가 확인 항목 없음')}`,
    `- 요약: ${textOrFallback(summary.summaryKo)}`,
  ];
}

export function formatKoreanKrw(value: number): string {
  return `₩${Math.max(0, value).toLocaleString('ko-KR')}`;
}

export function buildMediaIpPackMarkdown(input: MediaIpPackMarkdownInput): string {
  const { plan, packageSummary } = input;
  const title = textOrFallback(input.workTitle, '제목 미정');
  const generatedAt = textOrFallback(input.generatedAt, '현재 화면 기준');
  const filledLabels = plan.filledSections.map(sectionLabelKo);
  const formRows =
    input.jurisdictionFormRows.length > 0
      ? input.jurisdictionFormRows.map(
          (row) =>
            `- ${row.titleKo}: 필수 ${row.requiredPresent}/${row.requiredTotal} · ${textOrFallback(row.purposeKo, '목적 미입력')}`,
        )
      : ['- 등록된 국가별 양식이 없습니다.'];

  return [
    `# ${title} 권리/IP 자산화 초안`,
    '',
    `작성 시각: ${generatedAt}`,
    '',
    '## 1. 패키지 개요',
    `- 매체 방향: ${plan.profile.labelKo}`,
    `- 출고 구성: ${packageSummary.labelKo}`,
    `- 대상: ${plan.profile.audienceKo}`,
    `- 국가별 양식: ${textOrFallback(input.jurisdictionLabelKo)}`,
    `- 상품 연결: ${input.productLabelKo} · ${textOrFallback(input.productPriceLabelKo, formatKoreanKrw(input.productPriceKrw))}`,
    `- 준비 상태: ${STATUS_LABEL_KO[plan.status]} · ${plan.completionPercent}%`,
    '',
    '## 2. 외부 제시 자료 4군집',
    ...ipBibleClusterLines(plan),
    '',
    '## 3. 작성 상태',
    `- 채운 섹션: ${joinLabels(filledLabels)}`,
    '- 부족한 필수 항목:',
    ...sectionList(plan.missingRequired, '필수 항목 부족 없음'),
    '- 보강하면 좋은 항목:',
    ...sectionList(plan.missingRecommended, '권장 항목 부족 없음'),
    '',
    '## 4. 권리/IP 점검',
    `- 권리 상태: ${textOrFallback(input.rightsStatusKo, '권리 확인 필요')}`,
    `- 권리 메모: ${textOrFallback(input.rightsNote, '별도 메모 없음')}`,
    '- 확인할 항목:',
    ...bulletList(plan.profile.rightsChecklistKo),
    '',
    '## 5. 권리 원장',
    ...rightsLedgerList(input.rightsLedgerRows),
    '',
    '## 6. 출처·외부 자료 요약',
    ...sourceSummaryList(input.sourceSummaryRows),
    '',
    '## 7. 공개용·제출용 확인 문서',
    ...certificateOutputLines(input.certificateOutput),
    '',
    '## 8. 산출물',
    ...bulletList(plan.profile.deliverablesKo),
    '',
    '### 8-1. 매체별 작성 양식',
    ...mediaFormGroupLines(plan.profile.formGroupsKo, input.formGroupCompletions),
    '',
    '## 9. 국가별 양식 진행',
    ...jurisdictionSourceList(input.jurisdictionSourceRows),
    ...formRows,
    '',
    '## 10. 출고 구성 요약',
    `- 필수 산출물: ${joinLabels(packageSummary.requiredItemsKo)}`,
    `- 권장 산출물: ${joinLabels(packageSummary.recommendedItemsKo)}`,
    `- 비공개 보관: ${joinLabels(packageSummary.privateItemsKo)}`,
    `- 공유 경계: ${textOrFallback(packageSummary.boundaryKo)}`,
    `- 요약: ${textOrFallback(packageSummary.summaryKo)}`,
    '',
    '## 11. 비공개 경계',
    '- 본문 전문, 프롬프트 원문, 출처 원문은 이 초안에 넣지 않습니다.',
    '- 거래, 제출, 검토 단계에서 필요한 원고와 출처 자료는 별도 조건에 맞춰 분리 첨부합니다.',
    '- 부족한 항목은 작가가 채택하거나 보강한 뒤 과정기록에 남깁니다.',
    '',
  ].join('\n');
}
