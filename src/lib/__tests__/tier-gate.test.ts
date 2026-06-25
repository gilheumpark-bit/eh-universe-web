describe('tier-gate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_PAYMENT_LIVE;
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('keeps open beta active when payment is not live', async () => {
    const tierGate = await import('../tier-gate');

    expect(tierGate.OPEN_BETA).toBe(true);
    expect(tierGate.getTierLimits('free').novel.dailyGenerations).toBe(0);
    expect(tierGate.getRawTierLimits('free').novel.dailyGenerations).toBe(5);
  });

  it('disables open beta when public payment live flag is enabled', async () => {
    process.env.NEXT_PUBLIC_PAYMENT_LIVE = 'true';
    const tierGate = await import('../tier-gate');

    expect(tierGate.OPEN_BETA).toBe(false);
    expect(tierGate.getTierLimits('free').novel.dailyGenerations).toBe(5);
    expect(tierGate.getTierLimits('pro').novel.dailyGenerations).toBe(0);
  });

  it('matches the local payment-live scenario for Free, Pro, and connection-key usage', async () => {
    process.env.NEXT_PUBLIC_PAYMENT_LIVE = 'true';
    const tierGate = await import('../tier-gate');

    expect(tierGate.OPEN_BETA).toBe(false);
    expect(tierGate.getTierLimits('free')).toMatchObject({
      novel: { dailyGenerations: 5, advancedModels: false },
      translation: { dailyChapters: 2, batchTranslation: false },
    });
    expect(tierGate.getTierLimits('pro')).toMatchObject({
      novel: { dailyGenerations: 0, advancedModels: true },
      translation: { dailyChapters: 0, batchTranslation: true },
    });
    expect(tierGate.getByokLimits('free')).toMatchObject({
      novel: { dailyGenerations: 0, advancedModels: false },
      translation: { dailyChapters: 0, batchTranslation: false },
    });
  });

  it('does not disable open beta from Stripe secrets alone', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_12345678901234567890';
    const tierGate = await import('../tier-gate');

    expect(tierGate.OPEN_BETA).toBe(true);
    expect(tierGate.getTierLimits('free').novel.dailyGenerations).toBe(0);
  });

});
