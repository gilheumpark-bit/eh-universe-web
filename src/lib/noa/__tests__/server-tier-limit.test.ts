describe('server-tier-limit — payment-live enforcement', () => {
  const originalPaymentLive = process.env.NEXT_PUBLIC_PAYMENT_LIVE;
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_PAYMENT_LIVE = 'true';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    jest.dontMock('@/lib/firebase-id-token');
    if (originalPaymentLive === undefined) delete process.env.NEXT_PUBLIC_PAYMENT_LIVE;
    else process.env.NEXT_PUBLIC_PAYMENT_LIVE = originalPaymentLive;
    if (originalUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    if (originalUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
  });

  async function loadGate(user: { uid: string; tier?: 'free' | 'pro' } | null) {
    jest.doMock('next/server', () => ({
      NextResponse: {
        json: (body: unknown, init?: ResponseInit) => ({
          status: init?.status ?? 200,
          headers: init?.headers ?? {},
          json: async () => body,
        }),
      },
    }));
    jest.doMock('@/lib/firebase-id-token', () => ({
      verifyFirebaseIdToken: jest.fn(async () => user),
    }));
    return import('@/lib/server-tier-limit');
  }

  it('requires login or BYOK for hosted model usage', async () => {
    const { enforceServerTierLimit } = await loadGate(null);
    const result = await enforceServerTierLimit({
      headers: new Headers(),
      ip: '127.0.0.1',
      route: '/api/structured-generate',
      feature: 'structured-generate',
      hasByok: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      const body = await result.response.json();
      expect(body.error).toBe('login_or_byok_required');
      expect(body.message).toContain('로그인하거나 연결 키');
      expect(body.paywall?.unlocksWith).toContain('연결 키 등록');
      expect(body.paywall?.pricingUrl).toBe('/pricing');
    }
  });

  it('does not count BYOK usage against hosted plan limits', async () => {
    const { enforceServerTierLimit } = await loadGate(null);
    const result = await enforceServerTierLimit({
      headers: new Headers(),
      ip: '127.0.0.1',
      route: '/api/complete',
      feature: 'inline-completion',
      hasByok: true,
    });

    expect(result).toMatchObject({ ok: true, mode: 'byok' });
  });

  it('blocks a Free user after the daily hosted generation allowance', async () => {
    const { enforceServerTierLimit } = await loadGate({ uid: 'free-user', tier: 'free' });
    const headers = new Headers({ authorization: 'Bearer AI-TEST-INPUT' });

    for (let i = 0; i < 5; i++) {
      const allowed = await enforceServerTierLimit({
        headers,
        ip: '127.0.0.1',
        route: '/api/structured-generate',
        feature: 'structured-generate',
        hasByok: false,
      });
      expect(allowed.ok).toBe(true);
    }

    const blocked = await enforceServerTierLimit({
      headers,
      ip: '127.0.0.1',
      route: '/api/structured-generate',
      feature: 'structured-generate',
      hasByok: false,
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(402);
      const body = await blocked.response.json();
      expect(body.error).toBe('plan_limit_reached');
      expect(body.paywall?.requiredTier).toBe('pro');
      expect(body.paywall?.reset).toBe('daily');
      expect(body.paywall?.limit).toBe(5);
      expect(body.paywall?.remaining).toBe(0);
      expect(body.paywall?.unlocksWith).toContain('연결 키 등록');
    }
  });

  it('does not block a Pro user on the Free daily allowance', async () => {
    const { enforceServerTierLimit } = await loadGate({ uid: 'pro-user', tier: 'pro' });
    const headers = new Headers({ authorization: 'Bearer AI-TEST-INPUT' });

    for (let i = 0; i < 8; i++) {
      const result = await enforceServerTierLimit({
        headers,
        ip: '127.0.0.1',
        route: '/api/structured-generate',
        feature: 'structured-generate',
        hasByok: false,
      });
      expect(result.ok).toBe(true);
    }
  });

  it('uses product-facing labels for image hosted limits', async () => {
    const { enforceServerTierLimit } = await loadGate(null);

    const imageBlocked = await enforceServerTierLimit({
      headers: new Headers(),
      ip: '127.0.0.1',
      route: '/api/image-gen',
      feature: 'image-generation',
      hasByok: false,
    });

    expect(imageBlocked.ok).toBe(false);
    if (!imageBlocked.ok) {
      expect((await imageBlocked.response.json()).paywall?.feature).toBe('시각 자료 생성');
    }
  });
});
