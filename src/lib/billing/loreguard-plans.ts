// ============================================================
// PART 1 — Billing Product Types
// ============================================================

export type LoreguardPlanId = 'free' | 'starter' | 'studio' | 'pro' | 'publisher';
export type LegacyLoreguardPlanId = 'indie' | 'mid';
export type CertificateProductId =
  | 'episode-basic'
  | 'episode-c2pa'
  | 'complete-basic'
  | 'complete-pro'
  | 'publisher-package';

export interface LoreguardPlan {
  id: LoreguardPlanId;
  label: string;
  monthlyPriceKrw: number | null;
  annualMonthlyPriceKrw: number | null;
  includedEpisodes: number | null;
  hostedNoa: boolean;
  byokAllowed: boolean;
  translationIncluded: boolean;
  debugIncluded: boolean;
  certificateEpisodeAllowance: number;
  certificateTier: 'none' | 'basic' | 'c2pa' | 'ip-pack' | 'publisher';
  overageEpisodeKrw: number | null;
  checkoutEligible: boolean;
  targetKo: string;
}

export interface CertificateProduct {
  id: CertificateProductId;
  labelKo: string;
  priceKrw: number;
  includes: string[];
}

export interface CheckoutPriceResolution {
  planId: LoreguardPlanId | null;
  priceId: string;
  source: string;
  checkoutEligible: boolean;
}

export interface CertificateProductPriceResolution {
  productId: CertificateProductId | null;
  priceId: string;
  source: string;
  checkoutEligible: boolean;
}

export interface BillingEntitlementSnapshot {
  planId: LoreguardPlanId;
  planLabel: string;
  includedEpisodes: number | null;
  hostedNoa: boolean;
  byokAllowed: boolean;
  translationIncluded: boolean;
  debugIncluded: boolean;
  certificateEpisodeAllowance: number;
  certificateTier: LoreguardPlan['certificateTier'];
  ipPackIncluded: boolean;
  publisherSlaIncluded: boolean;
  overageEpisodeKrw: number | null;
}

export type BillingSyncStatus = 'ready' | 'waiting-webhook' | 'waiting-token-refresh' | 'stale' | 'failed';

export interface BillingSyncInput {
  checkoutCompleted: boolean;
  webhookSynced: boolean;
  tokenRefreshed: boolean;
  lastSyncedAtMs?: number | null;
  nowMs?: number;
  failed?: boolean;
}

export type ReleaseEntitlementStatus = 'included' | 'upgrade' | 'separate-purchase';

export interface ReleaseEntitlementPlan {
  packageProfileId: 'public-reader' | 'external-submission' | 'ip-sale' | 'internal-archive';
  planId: LoreguardPlanId;
  status: ReleaseEntitlementStatus;
  requiredTier: LoreguardPlan['certificateTier'];
  requiredCredits: number;
  includedCredits: number;
  productId: CertificateProductId;
  productLabelKo: string;
  productPriceKrw: number;
  summaryKo: string;
  actionKo: string;
}

export interface ReleaseProductRequirement {
  productId: CertificateProductId;
  packageProfileId: ReleaseEntitlementPlan['packageProfileId'];
  requiredTier: LoreguardPlan['certificateTier'];
  requiredCredits: number | null;
  unitKo: string;
  outputScopeKo: string;
  approvalPolicyKo: string;
}

export interface ReleaseProductLineupItem {
  productId: CertificateProductId;
  labelKo: string;
  priceKrw: number;
  includes: string[];
  packageProfileId: ReleaseEntitlementPlan['packageProfileId'];
  requiredTier: LoreguardPlan['certificateTier'];
  requiredCredits: number | null;
  requiredCreditsKo: string;
  unitKo: string;
  outputScopeKo: string;
  approvalPolicyKo: string;
  status: ReleaseEntitlementStatus;
  availabilityKo: string;
  currentProduct: boolean;
}

// ============================================================
// PART 2 — Product Registry
// ============================================================

export const LOREGUARD_PLANS: Record<LoreguardPlanId, LoreguardPlan> = {
  free: {
    id: 'free',
    label: 'Free',
    monthlyPriceKrw: 0,
    annualMonthlyPriceKrw: null,
    includedEpisodes: 0,
    hostedNoa: false,
    byokAllowed: true,
    translationIncluded: false,
    debugIncluded: false,
    certificateEpisodeAllowance: 0,
    certificateTier: 'none',
    overageEpisodeKrw: null,
    checkoutEligible: false,
    targetKo: '체험·연결 키 사용자',
  },
  starter: {
    id: 'starter',
    label: 'Starter',
    monthlyPriceKrw: 39_000,
    annualMonthlyPriceKrw: 29_000,
    includedEpisodes: 15,
    hostedNoa: true,
    byokAllowed: true,
    translationIncluded: false,
    debugIncluded: false,
    certificateEpisodeAllowance: 3,
    certificateTier: 'basic',
    overageEpisodeKrw: 2_000,
    checkoutEligible: true,
    targetKo: '주 2~3회 연재 작가',
  },
  studio: {
    id: 'studio',
    label: 'Studio',
    monthlyPriceKrw: 69_000,
    annualMonthlyPriceKrw: 55_000,
    includedEpisodes: 30,
    hostedNoa: true,
    byokAllowed: true,
    translationIncluded: true,
    debugIncluded: false,
    certificateEpisodeAllowance: 10,
    certificateTier: 'c2pa',
    overageEpisodeKrw: 1_500,
    checkoutEligible: true,
    targetKo: '정기 연재·번역 병행 작가',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    monthlyPriceKrw: 99_000,
    annualMonthlyPriceKrw: 79_000,
    includedEpisodes: 50,
    hostedNoa: true,
    byokAllowed: true,
    translationIncluded: true,
    debugIncluded: true,
    certificateEpisodeAllowance: 25,
    certificateTier: 'ip-pack',
    overageEpisodeKrw: 1_000,
    checkoutEligible: true,
    targetKo: '전업·상업 출고 작가',
  },
  publisher: {
    id: 'publisher',
    label: 'Publisher',
    monthlyPriceKrw: null,
    annualMonthlyPriceKrw: null,
    includedEpisodes: null,
    hostedNoa: true,
    byokAllowed: true,
    translationIncluded: true,
    debugIncluded: true,
    certificateEpisodeAllowance: -1,
    certificateTier: 'publisher',
    overageEpisodeKrw: null,
    checkoutEligible: false,
    targetKo: '출판사·매니지먼트·그룹 운영',
  },
};

export const CERTIFICATE_PRODUCTS: Record<CertificateProductId, CertificateProduct> = {
  'episode-basic': {
    id: 'episode-basic',
    labelKo: '과정기록 카드',
    priceKrw: 3_000,
    includes: ['회차 과정기록', '디지털 서명', 'QR 대조'],
  },
  'episode-c2pa': {
    id: 'episode-c2pa',
    labelKo: 'C2PA 회차 패키지',
    priceKrw: 5_000,
    includes: ['회차 과정기록', '디지털 서명', 'QR 대조', 'C2PA 준비 구성표', '소스 번들'],
  },
  'complete-basic': {
    id: 'complete-basic',
    labelKo: '완결 과정기록',
    priceKrw: 30_000,
    includes: ['전체 과정 요약', '과정기록 충실도 요약', '해시체인'],
  },
  'complete-pro': {
    id: 'complete-pro',
    labelKo: '완결 출고 패키지 Pro',
    priceKrw: 50_000,
    includes: ['전체 과정 요약', '과정기록 충실도 요약', '해시체인', 'C2PA 준비 구성표', '권리/IP 묶음', '출고 기준 점검'],
  },
  'publisher-package': {
    id: 'publisher-package',
    labelKo: 'Publisher 제출 패키지',
    priceKrw: 100_000,
    includes: ['전체 출고 패키지', '보관 범위 메모', '제출용 요약', '권리/IP 점검'],
  },
};

export const RELEASE_PRODUCT_REQUIREMENTS: Record<CertificateProductId, ReleaseProductRequirement> = {
  'episode-basic': {
    productId: 'episode-basic',
    packageProfileId: 'public-reader',
    requiredTier: 'basic',
    requiredCredits: 1,
    unitKo: '회차',
    outputScopeKo: '독자에게 보여줄 공개 과정기록 카드',
    approvalPolicyKo: '발급 전 작가 승인 필요',
  },
  'episode-c2pa': {
    productId: 'episode-c2pa',
    packageProfileId: 'public-reader',
    requiredTier: 'c2pa',
    requiredCredits: 2,
    unitKo: '회차',
    outputScopeKo: '회차 과정기록과 C2PA 준비 묶음',
    approvalPolicyKo: '발급 전 작가 승인 필요',
  },
  'complete-basic': {
    productId: 'complete-basic',
    packageProfileId: 'external-submission',
    requiredTier: 'c2pa',
    requiredCredits: 10,
    unitKo: '작품',
    outputScopeKo: '완결 과정기록과 제출용 요약',
    approvalPolicyKo: '발급 전 작가 승인 필요',
  },
  'complete-pro': {
    productId: 'complete-pro',
    packageProfileId: 'ip-sale',
    requiredTier: 'ip-pack',
    requiredCredits: 20,
    unitKo: '작품/IP',
    outputScopeKo: '완결 출고 패키지와 권리/IP 묶음',
    approvalPolicyKo: '발급 전 작가 승인 필요',
  },
  'publisher-package': {
    productId: 'publisher-package',
    packageProfileId: 'external-submission',
    requiredTier: 'publisher',
    requiredCredits: null,
    unitKo: '조직 제출',
    outputScopeKo: '출판사·스튜디오 제출용 패키지',
    approvalPolicyKo: '조직 승인과 프로젝트 권한 확인 필요',
  },
};

// ============================================================
// PART 3 — Resolvers
// ============================================================

export function normalizeLoreguardPlanId(value: unknown): LoreguardPlanId | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'indie') return 'starter';
  if (normalized === 'mid') return 'studio';
  if (normalized in LOREGUARD_PLANS) return normalized as LoreguardPlanId;
  return null;
}

export function getLoreguardPlan(planId: LoreguardPlanId): LoreguardPlan {
  return LOREGUARD_PLANS[planId];
}

export function getCertificateProduct(productId: CertificateProductId): CertificateProduct {
  return CERTIFICATE_PRODUCTS[productId];
}

export function resolveCheckoutPriceId(
  rawPlanId: unknown,
  env: Record<string, string | undefined>,
): CheckoutPriceResolution {
  const planId = normalizeLoreguardPlanId(rawPlanId);
  const legacyFallback = env.NEXT_PUBLIC_STRIPE_PRICE_ID?.trim() ?? '';

  if (!planId) {
    return {
      planId: null,
      priceId: legacyFallback,
      source: legacyFallback ? 'NEXT_PUBLIC_STRIPE_PRICE_ID' : '',
      checkoutEligible: Boolean(legacyFallback),
    };
  }

  const plan = getLoreguardPlan(planId);
  if (!plan.checkoutEligible) {
    return { planId, priceId: '', source: '', checkoutEligible: false };
  }

  const primaryEnvByPlan: Partial<Record<LoreguardPlanId, string[]>> = {
    starter: ['STRIPE_PRICE_ID_STARTER'],
    studio: ['STRIPE_PRICE_ID_STUDIO', 'STRIPE_PRICE_ID_MID'],
    pro: ['STRIPE_PRICE_ID_PRO'],
  };
  const primaryEnvKeys = primaryEnvByPlan[planId] ?? [];
  const primaryEnvKey = primaryEnvKeys.find((key) => Boolean(env[key]?.trim())) ?? '';
  const primaryPrice = primaryEnvKey ? env[primaryEnvKey]?.trim() : '';
  const legacyIndie = planId === 'starter' ? env.STRIPE_PRICE_ID_INDIE?.trim() : '';
  const priceId = primaryPrice || legacyIndie || legacyFallback;
  const source = primaryPrice
    ? primaryEnvKey ?? ''
    : legacyIndie
      ? 'STRIPE_PRICE_ID_INDIE'
      : legacyFallback
        ? 'NEXT_PUBLIC_STRIPE_PRICE_ID'
        : '';

  return { planId, priceId: priceId ?? '', source, checkoutEligible: true };
}

export function resolveCertificateProductPriceId(
  rawProductId: unknown,
  env: Record<string, string | undefined>,
): CertificateProductPriceResolution {
  if (typeof rawProductId !== 'string') {
    return { productId: null, priceId: '', source: '', checkoutEligible: false };
  }
  const productId = rawProductId.trim() as CertificateProductId;
  if (!(productId in CERTIFICATE_PRODUCTS)) {
    return { productId: null, priceId: '', source: '', checkoutEligible: false };
  }

  const envByProduct: Record<CertificateProductId, string> = {
    'episode-basic': 'STRIPE_PRICE_ID_CERT_EPISODE_BASIC',
    'episode-c2pa': 'STRIPE_PRICE_ID_CERT_EPISODE_C2PA',
    'complete-basic': 'STRIPE_PRICE_ID_CERT_COMPLETE_BASIC',
    'complete-pro': 'STRIPE_PRICE_ID_CERT_COMPLETE_PRO',
    'publisher-package': 'STRIPE_PRICE_ID_CERT_PUBLISHER_PACKAGE',
  };
  const source = envByProduct[productId];
  const priceId = env[source]?.trim() ?? '';
  return { productId, priceId, source: priceId ? source : '', checkoutEligible: Boolean(priceId) };
}

export function buildBillingEntitlementSnapshot(planId: LoreguardPlanId): BillingEntitlementSnapshot {
  const plan = getLoreguardPlan(planId);
  return {
    planId: plan.id,
    planLabel: plan.label,
    includedEpisodes: plan.includedEpisodes,
    hostedNoa: plan.hostedNoa,
    byokAllowed: plan.byokAllowed,
    translationIncluded: plan.translationIncluded,
    debugIncluded: plan.debugIncluded,
    certificateEpisodeAllowance: plan.certificateEpisodeAllowance,
    certificateTier: plan.certificateTier,
    ipPackIncluded: plan.certificateTier === 'ip-pack' || plan.certificateTier === 'publisher',
    publisherSlaIncluded: plan.certificateTier === 'publisher',
    overageEpisodeKrw: plan.overageEpisodeKrw,
  };
}

export function calculateEpisodeOverageKrw(planId: LoreguardPlanId, usedEpisodes: number): number {
  const plan = getLoreguardPlan(planId);
  if (plan.includedEpisodes === null || plan.overageEpisodeKrw === null) return 0;
  const overageCount = Math.max(0, Math.floor(usedEpisodes) - plan.includedEpisodes);
  return overageCount * plan.overageEpisodeKrw;
}

export function resolveBillingSyncStatus(input: BillingSyncInput): BillingSyncStatus {
  if (input.failed) return 'failed';
  if (!input.checkoutCompleted) return 'waiting-webhook';
  if (!input.webhookSynced) return 'waiting-webhook';
  if (!input.tokenRefreshed) return 'waiting-token-refresh';

  const nowMs = input.nowMs ?? Date.now();
  const lastSyncedAtMs = input.lastSyncedAtMs ?? null;
  if (lastSyncedAtMs !== null && nowMs - lastSyncedAtMs > 10 * 60 * 1000) {
    return 'stale';
  }
  return 'ready';
}

const CERTIFICATE_TIER_RANK: Record<LoreguardPlan['certificateTier'], number> = {
  none: 0,
  basic: 1,
  c2pa: 2,
  'ip-pack': 3,
  publisher: 4,
};

const RELEASE_PACKAGE_REQUIREMENTS: Record<ReleaseEntitlementPlan['packageProfileId'], {
  requiredTier: LoreguardPlan['certificateTier'];
  requiredCredits: number;
  productId: CertificateProductId;
}> = {
  'public-reader': {
    requiredTier: 'basic',
    requiredCredits: 1,
    productId: 'episode-basic',
  },
  'external-submission': {
    requiredTier: 'c2pa',
    requiredCredits: 10,
    productId: 'complete-basic',
  },
  'ip-sale': {
    requiredTier: 'ip-pack',
    requiredCredits: 20,
    productId: 'complete-pro',
  },
  'internal-archive': {
    requiredTier: 'ip-pack',
    requiredCredits: 20,
    productId: 'complete-pro',
  },
};

function hasEnoughCertificateTier(
  planTier: LoreguardPlan['certificateTier'],
  requiredTier: LoreguardPlan['certificateTier'],
): boolean {
  return CERTIFICATE_TIER_RANK[planTier] >= CERTIFICATE_TIER_RANK[requiredTier];
}

function hasEnoughReleaseCredits(plan: LoreguardPlan, requiredCredits: number): boolean {
  return plan.certificateEpisodeAllowance < 0 || plan.certificateEpisodeAllowance >= requiredCredits;
}

function requiredTierLabelKo(requiredTier: LoreguardPlan['certificateTier']): string {
  if (requiredTier === 'basic') return 'Starter';
  if (requiredTier === 'c2pa') return 'Studio';
  if (requiredTier === 'ip-pack') return 'Pro';
  if (requiredTier === 'publisher') return 'Publisher';
  return 'Free';
}

function formatRequiredCreditsKo(requiredCredits: number | null): string {
  return requiredCredits === null ? '협의' : `${requiredCredits}개`;
}

function resolveReleaseProductStatus(
  plan: LoreguardPlan,
  requirement: ReleaseProductRequirement,
): ReleaseEntitlementStatus {
  const tierOk = hasEnoughCertificateTier(plan.certificateTier, requirement.requiredTier);
  if (!tierOk) return 'upgrade';
  if (requirement.requiredCredits === null) {
    return plan.certificateTier === 'publisher' ? 'included' : 'upgrade';
  }
  return hasEnoughReleaseCredits(plan, requirement.requiredCredits) ? 'included' : 'separate-purchase';
}

function releaseProductAvailabilityKo(
  plan: LoreguardPlan,
  requirement: ReleaseProductRequirement,
  status: ReleaseEntitlementStatus,
): string {
  if (status === 'included') {
    return requirement.requiredCredits === null
      ? `${plan.label} 계약 조건으로 협의`
      : `${plan.label} 포함 크레딧으로 준비 가능`;
  }
  if (status === 'separate-purchase') {
    return `${plan.label} 포함 크레딧 부족, 별도 구매 필요`;
  }
  return `${requiredTierLabelKo(requirement.requiredTier)} 이상에서 자연스럽습니다.`;
}

export function buildReleaseProductLineup(input: {
  planId: LoreguardPlanId;
  currentProductId?: CertificateProductId | null;
}): ReleaseProductLineupItem[] {
  const plan = getLoreguardPlan(input.planId);

  return (Object.keys(CERTIFICATE_PRODUCTS) as CertificateProductId[]).map((productId) => {
    const product = getCertificateProduct(productId);
    const requirement = RELEASE_PRODUCT_REQUIREMENTS[productId];
    const status = resolveReleaseProductStatus(plan, requirement);

    return {
      productId,
      labelKo: product.labelKo,
      priceKrw: product.priceKrw,
      includes: product.includes,
      packageProfileId: requirement.packageProfileId,
      requiredTier: requirement.requiredTier,
      requiredCredits: requirement.requiredCredits,
      requiredCreditsKo: formatRequiredCreditsKo(requirement.requiredCredits),
      unitKo: requirement.unitKo,
      outputScopeKo: requirement.outputScopeKo,
      approvalPolicyKo: requirement.approvalPolicyKo,
      status,
      availabilityKo: releaseProductAvailabilityKo(plan, requirement, status),
      currentProduct: input.currentProductId === product.id,
    };
  });
}

export function buildReleaseEntitlementPlan(input: {
  planId: LoreguardPlanId;
  packageProfileId: ReleaseEntitlementPlan['packageProfileId'];
}): ReleaseEntitlementPlan {
  const plan = getLoreguardPlan(input.planId);
  const requirement = RELEASE_PACKAGE_REQUIREMENTS[input.packageProfileId];
  const product = getCertificateProduct(requirement.productId);
  const tierOk = hasEnoughCertificateTier(plan.certificateTier, requirement.requiredTier);
  const creditsOk = hasEnoughReleaseCredits(plan, requirement.requiredCredits);
  const includedCredits = plan.certificateEpisodeAllowance;
  const status: ReleaseEntitlementStatus =
    tierOk && creditsOk
      ? 'included'
      : tierOk
        ? 'separate-purchase'
        : 'upgrade';

  const creditLabel = requirement.requiredCredits === 1 ? '1개' : `${requirement.requiredCredits}개`;
  const allowanceLabel = includedCredits < 0 ? '무제한' : `${includedCredits}개`;

  return {
    packageProfileId: input.packageProfileId,
    planId: plan.id,
    status,
    requiredTier: requirement.requiredTier,
    requiredCredits: requirement.requiredCredits,
    includedCredits,
    productId: product.id,
    productLabelKo: product.labelKo,
    productPriceKrw: product.priceKrw,
    summaryKo:
      status === 'included'
        ? `${plan.label} 기준 출고 크레딧 ${creditLabel}로 포함됩니다.`
        : status === 'separate-purchase'
          ? `${plan.label} 기준 포함 크레딧은 ${allowanceLabel}이며, ${product.labelKo} 별도 구매가 필요합니다.`
          : `${product.labelKo}는 ${requiredTierLabelKo(requirement.requiredTier)} 이상에서 자연스럽습니다.`,
    actionKo:
      status === 'included'
        ? '현재 권장 플랜에서 준비 가능'
        : status === 'separate-purchase'
          ? '별도 구매 또는 크레딧 충전 필요'
          : '상위 권한 검토 권장',
  };
}
