import {
  buildBillingEntitlementSnapshot,
  buildReleaseEntitlementPlan,
  buildReleaseProductLineup,
  calculateEpisodeOverageKrw,
  CERTIFICATE_PRODUCTS,
  getLoreguardPlan,
  normalizeLoreguardPlanId,
  RELEASE_PRODUCT_REQUIREMENTS,
  resolveBillingSyncStatus,
  resolveCertificateProductPriceId,
  resolveCheckoutPriceId,
} from '../loreguard-plans';

describe('Loreguard billing plan registry', () => {
  it('keeps the first paid plan accessible through the legacy indie alias', () => {
    expect(normalizeLoreguardPlanId('indie')).toBe('starter');
    expect(normalizeLoreguardPlanId('Starter')).toBe('starter');
    expect(normalizeLoreguardPlanId('studio')).toBe('studio');
    expect(normalizeLoreguardPlanId('mid')).toBe('studio');
    expect(normalizeLoreguardPlanId('publisher')).toBe('publisher');
    expect(normalizeLoreguardPlanId('unknown')).toBeNull();
  });

  it('defines the planned subscription ladder', () => {
    expect(getLoreguardPlan('free')).toMatchObject({
      monthlyPriceKrw: 0,
      hostedNoa: false,
      byokAllowed: true,
      certificateEpisodeAllowance: 0,
    });
    expect(getLoreguardPlan('starter')).toMatchObject({
      monthlyPriceKrw: 39_000,
      annualMonthlyPriceKrw: 29_000,
      includedEpisodes: 15,
      certificateEpisodeAllowance: 3,
      overageEpisodeKrw: 2_000,
    });
    expect(getLoreguardPlan('studio')).toMatchObject({
      id: 'studio',
      label: 'Studio',
      monthlyPriceKrw: 69_000,
      annualMonthlyPriceKrw: 55_000,
      includedEpisodes: 30,
      translationIncluded: true,
      certificateTier: 'c2pa',
    });
    expect(getLoreguardPlan('pro')).toMatchObject({
      monthlyPriceKrw: 99_000,
      includedEpisodes: 50,
      debugIncluded: true,
      certificateTier: 'ip-pack',
    });
    expect(getLoreguardPlan('publisher')).toMatchObject({
      monthlyPriceKrw: null,
      includedEpisodes: null,
      checkoutEligible: false,
      certificateTier: 'publisher',
    });
  });

  it('resolves checkout price IDs without trusting client supplied prices', () => {
    const env = {
      STRIPE_PRICE_ID_STARTER: 'price_starter',
      STRIPE_PRICE_ID_STUDIO: 'price_studio',
      STRIPE_PRICE_ID_MID: 'price_mid_legacy',
      STRIPE_PRICE_ID_PRO: 'price_pro',
      STRIPE_PRICE_ID_INDIE: 'price_indie_legacy',
      NEXT_PUBLIC_STRIPE_PRICE_ID: 'price_fallback',
    };

    expect(resolveCheckoutPriceId('starter', env)).toMatchObject({
      planId: 'starter',
      priceId: 'price_starter',
      source: 'STRIPE_PRICE_ID_STARTER',
      checkoutEligible: true,
    });
    expect(resolveCheckoutPriceId('mid', env)).toMatchObject({
      planId: 'studio',
      priceId: 'price_studio',
      source: 'STRIPE_PRICE_ID_STUDIO',
    });
    expect(resolveCheckoutPriceId('studio', env).priceId).toBe('price_studio');
    expect(resolveCheckoutPriceId('pro', env).priceId).toBe('price_pro');
    expect(resolveCheckoutPriceId('publisher', env)).toMatchObject({
      planId: 'publisher',
      priceId: '',
      checkoutEligible: false,
    });
    expect(resolveCheckoutPriceId('weird-client-plan', env)).toMatchObject({
      planId: null,
      priceId: 'price_fallback',
      source: 'NEXT_PUBLIC_STRIPE_PRICE_ID',
    });
  });

  it('falls back from starter to the old indie env key during migration', () => {
    const result = resolveCheckoutPriceId('starter', {
      STRIPE_PRICE_ID_INDIE: 'price_indie_legacy',
      NEXT_PUBLIC_STRIPE_PRICE_ID: 'price_fallback',
    });

    expect(result.priceId).toBe('price_indie_legacy');
    expect(result.source).toBe('STRIPE_PRICE_ID_INDIE');
  });

  it('falls back from the Studio env key to the old mid env key during migration', () => {
    const result = resolveCheckoutPriceId('studio', {
      STRIPE_PRICE_ID_MID: 'price_mid_legacy',
      NEXT_PUBLIC_STRIPE_PRICE_ID: 'price_fallback',
    });

    expect(result.planId).toBe('studio');
    expect(result.priceId).toBe('price_mid_legacy');
    expect(result.source).toBe('STRIPE_PRICE_ID_MID');
  });

  it('keeps checkout eligibility separate from missing Stripe price env', () => {
    const result = resolveCheckoutPriceId('pro', {});

    expect(result.planId).toBe('pro');
    expect(result.checkoutEligible).toBe(true);
    expect(result.priceId).toBe('');
  });

  it('resolves separate release product prices without enabling Publisher subscription checkout', () => {
    const env = {
      STRIPE_PRICE_ID_CERT_EPISODE_BASIC: 'price_cert_basic',
      STRIPE_PRICE_ID_CERT_EPISODE_C2PA: 'price_cert_c2pa',
      STRIPE_PRICE_ID_CERT_COMPLETE_BASIC: 'price_cert_complete_basic',
      STRIPE_PRICE_ID_CERT_COMPLETE_PRO: 'price_cert_complete_pro',
      STRIPE_PRICE_ID_CERT_PUBLISHER_PACKAGE: 'price_cert_publisher',
      STRIPE_PRICE_ID_PUBLISHER: 'price_publisher_subscription',
    };

    expect(resolveCertificateProductPriceId('complete-pro', env)).toMatchObject({
      productId: 'complete-pro',
      priceId: 'price_cert_complete_pro',
      source: 'STRIPE_PRICE_ID_CERT_COMPLETE_PRO',
      checkoutEligible: true,
    });
    expect(resolveCertificateProductPriceId('publisher-package', env)).toMatchObject({
      productId: 'publisher-package',
      priceId: 'price_cert_publisher',
      source: 'STRIPE_PRICE_ID_CERT_PUBLISHER_PACKAGE',
      checkoutEligible: true,
    });
    expect(resolveCheckoutPriceId('publisher', env)).toMatchObject({
      planId: 'publisher',
      priceId: '',
      checkoutEligible: false,
    });
  });

  it('builds entitlement snapshots for feature gates', () => {
    expect(buildBillingEntitlementSnapshot('studio')).toMatchObject({
      planId: 'studio',
      translationIncluded: true,
      ipPackIncluded: false,
      publisherSlaIncluded: false,
    });
    expect(buildBillingEntitlementSnapshot('pro')).toMatchObject({
      planId: 'pro',
      ipPackIncluded: true,
      publisherSlaIncluded: false,
    });
    expect(buildBillingEntitlementSnapshot('publisher')).toMatchObject({
      planId: 'publisher',
      certificateEpisodeAllowance: -1,
      publisherSlaIncluded: true,
    });
  });

  it('calculates episode overage only for metered paid plans', () => {
    expect(calculateEpisodeOverageKrw('starter', 17)).toBe(4_000);
    expect(calculateEpisodeOverageKrw('studio', 35)).toBe(7_500);
    expect(calculateEpisodeOverageKrw('pro', 49)).toBe(0);
    expect(calculateEpisodeOverageKrw('publisher', 300)).toBe(0);
  });

  it('keeps certificate products as the separate paid catalog', () => {
    expect(CERTIFICATE_PRODUCTS['episode-basic'].priceKrw).toBe(3_000);
    expect(CERTIFICATE_PRODUCTS['episode-basic'].labelKo).toBe('과정기록 카드');
    expect(CERTIFICATE_PRODUCTS['episode-c2pa'].includes).toContain('C2PA 준비 구성표');
    expect(CERTIFICATE_PRODUCTS['complete-pro'].priceKrw).toBe(50_000);
    expect(CERTIFICATE_PRODUCTS['complete-pro'].includes).toContain('권리/IP 묶음');
    expect(CERTIFICATE_PRODUCTS['complete-pro'].includes).not.toContain('IP Pack');
    expect(CERTIFICATE_PRODUCTS['publisher-package'].includes).toContain('제출용 요약');
    expect(CERTIFICATE_PRODUCTS['publisher-package'].includes).not.toContain('법적 보관 메모');
  });

  it('maps paid release products to credits, output scope, and approval policy', () => {
    expect(RELEASE_PRODUCT_REQUIREMENTS['episode-basic']).toMatchObject({
      packageProfileId: 'public-reader',
      requiredCredits: 1,
      outputScopeKo: '독자에게 보여줄 공개 과정기록 카드',
      approvalPolicyKo: '발급 전 작가 승인 필요',
    });
    expect(RELEASE_PRODUCT_REQUIREMENTS['publisher-package']).toMatchObject({
      requiredTier: 'publisher',
      requiredCredits: null,
      approvalPolicyKo: '조직 승인과 프로젝트 권한 확인 필요',
    });
  });

  it('builds the release product lineup for the selected plan', () => {
    const lineup = buildReleaseProductLineup({
      planId: 'studio',
      currentProductId: 'complete-basic',
    });

    expect(lineup.map((item) => item.productId)).toEqual([
      'episode-basic',
      'episode-c2pa',
      'complete-basic',
      'complete-pro',
      'publisher-package',
    ]);
    expect(lineup.find((item) => item.productId === 'episode-c2pa')).toMatchObject({
      status: 'included',
      requiredCreditsKo: '2개',
      availabilityKo: 'Studio 포함 크레딧으로 준비 가능',
    });
    expect(lineup.find((item) => item.productId === 'complete-basic')).toMatchObject({
      currentProduct: true,
      status: 'included',
      requiredCreditsKo: '10개',
      outputScopeKo: '완결 과정기록과 제출용 요약',
    });
    expect(lineup.find((item) => item.productId === 'complete-pro')).toMatchObject({
      status: 'upgrade',
      availabilityKo: 'Pro 이상에서 자연스럽습니다.',
    });
    expect(lineup.find((item) => item.productId === 'publisher-package')).toMatchObject({
      status: 'upgrade',
      requiredCreditsKo: '협의',
    });
  });

  it('models checkout to entitlement propagation delay', () => {
    expect(resolveBillingSyncStatus({
      checkoutCompleted: false,
      webhookSynced: false,
      tokenRefreshed: false,
    })).toBe('waiting-webhook');
    expect(resolveBillingSyncStatus({
      checkoutCompleted: true,
      webhookSynced: true,
      tokenRefreshed: false,
    })).toBe('waiting-token-refresh');
    expect(resolveBillingSyncStatus({
      checkoutCompleted: true,
      webhookSynced: true,
      tokenRefreshed: true,
      lastSyncedAtMs: 0,
      nowMs: 11 * 60 * 1000,
    })).toBe('stale');
    expect(resolveBillingSyncStatus({
      checkoutCompleted: true,
      webhookSynced: true,
      tokenRefreshed: true,
      lastSyncedAtMs: 1_000,
      nowMs: 2_000,
    })).toBe('ready');
    expect(resolveBillingSyncStatus({
      checkoutCompleted: true,
      webhookSynced: false,
      tokenRefreshed: false,
      failed: true,
    })).toBe('failed');
  });

  it('maps release package outputs to plan credits and separate products', () => {
    expect(buildReleaseEntitlementPlan({
      planId: 'starter',
      packageProfileId: 'public-reader',
    })).toMatchObject({
      status: 'included',
      requiredCredits: 1,
      productId: 'episode-basic',
      productLabelKo: '과정기록 카드',
    });

    expect(buildReleaseEntitlementPlan({
      planId: 'starter',
      packageProfileId: 'external-submission',
    })).toMatchObject({
      status: 'upgrade',
      requiredCredits: 10,
      productId: 'complete-basic',
    });

    expect(buildReleaseEntitlementPlan({
      planId: 'studio',
      packageProfileId: 'external-submission',
    })).toMatchObject({
      status: 'included',
      includedCredits: 10,
    });

    expect(buildReleaseEntitlementPlan({
      planId: 'studio',
      packageProfileId: 'ip-sale',
    })).toMatchObject({
      status: 'upgrade',
      productId: 'complete-pro',
    });

    expect(buildReleaseEntitlementPlan({
      planId: 'pro',
      packageProfileId: 'ip-sale',
    })).toMatchObject({
      status: 'included',
      requiredCredits: 20,
      productLabelKo: '완결 출고 패키지 Pro',
    });
  });
});
