/**
 * /api/stripe/webhook route.test.ts (2026-05-12 — Doc 3 ⑦ T-05 / F-test)
 *
 * Payment integrity 핵심 — Stripe webhook signature 검증 + event dispatch.
 * Stripe SDK 부분 mock + next/server StripeWhFakeResponse (gate-checks.test.ts 패턴).
 */

// ============================================================
// PART 1 — next/server fake classes (gate-checks.test.ts와 동일 패턴)
// ============================================================
class StripeWhFakeRequest {
  headers: Headers;
  private _body: string | null;
  constructor(init?: { headers?: Record<string, string>; body?: string }) {
    this.headers = new Headers(init?.headers ?? {});
    this._body = init?.body ?? null;
  }
  async text() { return this._body ?? ''; }
  async json() { return JSON.parse(this._body ?? '{}'); }
}
class StripeWhFakeResponse {
  _body: unknown;
  _status: number;
  get status() { return this._status; }
  constructor(body: unknown, status: number) {
    this._body = body;
    this._status = status;
  }
  async json() { return this._body; }
  static json(body: unknown, opts?: { status?: number; headers?: Record<string, string> }) {
    return new StripeWhFakeResponse(body, opts?.status ?? 200);
  }
}
jest.mock('next/server', () => ({
  NextRequest: StripeWhFakeRequest,
  NextResponse: StripeWhFakeResponse,
}));

// Stripe SDK mock — constructEvent를 제어 가능하게.
const mockConstructEvent = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
  }));
});

// apiLog 캡처 — 호출 검증용.
const mockApiLog = jest.fn();
jest.mock('@/lib/api-logger', () => ({
  apiLog: (...args: unknown[]) => mockApiLog(...args),
}));

// [revenue path] claim setter mock — 결제 상태 → stripeRole 동기화 검증용.
const mockSetClaim = jest.fn();
const mockClearClaim = jest.fn();
jest.mock('@/lib/firebase-auth-admin-rest', () => ({
  setStripeRoleClaim: (...a: unknown[]) => mockSetClaim(...a),
  clearStripeRoleClaim: (...a: unknown[]) => mockClearClaim(...a),
}));

// Helper — minimal NextRequest stub.
// next/server를 jest.mock으로 대체했으므로 런타임 NextRequest는 StripeWhFakeRequest.
// TS는 별도 — 'unknown as NextRequest' cast로 우회 (jest mock과 type system 분리).
type AnyNextRequest = Parameters<(typeof import('../route'))['POST']>[0];
function makeRequest(opts: {
  body?: string;
  signature?: string | null;
}): AnyNextRequest {
  return new StripeWhFakeRequest({
    headers: opts.signature ? { 'stripe-signature': opts.signature } : undefined,
    body: opts.body ?? '',
  }) as unknown as AnyNextRequest;
}

describe('/api/stripe/webhook POST — env gate', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('STRIPE_SECRET_KEY 미설정 → 503', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }) as unknown as Parameters<typeof POST>[0]) as unknown as { status: number; json(): Promise<{ error?: string; received?: boolean; eventId?: string }>; };
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/not configured/i);
    // 운영 로그 발생
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_webhook_misconfigured' }),
    );
  });

  it('STRIPE_WEBHOOK_SECRET 미설정 → 503', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }) as unknown as Parameters<typeof POST>[0]) as unknown as { status: number; json(): Promise<{ error?: string; received?: boolean; eventId?: string }>; };
    expect(res.status).toBe(503);
  });

  it('빈 문자열 env → 503 (trim 검증)', async () => {
    process.env.STRIPE_SECRET_KEY = '   ';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }) as unknown as Parameters<typeof POST>[0]) as unknown as { status: number; json(): Promise<{ error?: string; received?: boolean; eventId?: string }>; };
    expect(res.status).toBe(503);
  });
});

describe('/api/stripe/webhook POST — signature validation', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid';
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('stripe-signature header 누락 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: null }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing.*signature/i);
  });

  it('signature 검증 실패 (constructEvent throw) → 400', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{"id":"evt"}', signature: 'bad-sig' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid signature/i);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_webhook_invalid_signature' }),
    );
  });
});

describe('/api/stripe/webhook POST — event dispatch', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid';
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('checkout.session.completed → 200 + 구조 로그', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_test_123',
      created: 1234567890,
      livemode: false,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.eventId).toBe('evt_test_123');
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        event: 'stripe_checkout_session_completed',
      }),
    );
  });

  it('invoice.payment_failed → warn level 로그', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      id: 'evt_test_fail',
      created: 1234567890,
      livemode: false,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        event: 'stripe_invoice_payment_failed',
      }),
    );
  });

  it('customer.subscription.* 이벤트 처리', async () => {
    const events = [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ];
    for (const type of events) {
      jest.clearAllMocks();
      mockConstructEvent.mockReturnValue({
        type,
        id: `evt_${type}`,
        created: 1234567890,
        livemode: false,
        data: { object: {} },
      });
      const { POST } = await import('../route');
      const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.received).toBe(true);
    }
  });

  it('알 수 없는 event 타입 → unhandled 로깅, 200 응답', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'unknown.future.event',
      id: 'evt_unknown',
      created: 1234567890,
      livemode: false,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_unhandled_event' }),
    );
  });

  it('livemode true 이벤트 — meta.livemode 보존', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.paid',
      id: 'evt_live',
      created: 1234567890,
      livemode: true,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'stripe_invoice_paid',
        meta: expect.objectContaining({ livemode: true }),
      }),
    );
  });
});

describe('/api/stripe/webhook POST — contract guarantees', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid';
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('valid signature → 항상 200 (Stripe retry 방지)', async () => {
    // [C] Stripe는 non-2xx 시 재전송. 모든 valid 이벤트는 200 응답해야.
    mockConstructEvent.mockReturnValue({
      type: 'invoice.paid',
      id: 'evt_test',
      created: 1234567890,
      livemode: false,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'sig' }) as unknown as Parameters<typeof POST>[0]) as unknown as { status: number; json(): Promise<{ error?: string; received?: boolean; eventId?: string }>; };
    expect(res.status).toBe(200);
  });

  it('rawBody = req.text() 사용 (req.json X) — signature 검증 무결성', async () => {
    // constructEvent 호출 시 첫 인자가 raw string인지 확인
    mockConstructEvent.mockImplementation((rawBody: string) => {
      expect(typeof rawBody).toBe('string');
      // 정확히 입력 그대로 (parse 안 함)
      expect(rawBody).toBe('{"id":"raw-payload"}');
      return {
        type: 'invoice.paid',
        id: 'evt_raw',
        created: 0,
        livemode: false,
        data: { object: {} },
      };
    });
    const { POST } = await import('../route');
    await POST(makeRequest({ body: '{"id":"raw-payload"}', signature: 'sig' }));
    expect(mockConstructEvent).toHaveBeenCalled();
  });
});

describe('/api/stripe/webhook POST — revenue path claim sync', () => {
  let originalEnv: typeof process.env;
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid';
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
    mockSetClaim.mockResolvedValue({ ok: true });
    mockClearClaim.mockResolvedValue({ ok: true });
  });
  afterEach(() => { process.env = originalEnv; });

  it('checkout.session.completed + client_reference_id → setStripeRoleClaim(uid)', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_co', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-123' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockSetClaim).toHaveBeenCalledWith('uid-123');
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_claim_synced' }),
    );
  });

  it('client_reference_id 없으면 claim 미호출', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_co2', created: 1, livemode: false,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(mockSetClaim).not.toHaveBeenCalled();
  });

  it('subscription.deleted + metadata.firebaseUid → clearStripeRoleClaim(uid)', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted', id: 'evt_del', created: 1, livemode: false,
      data: { object: { status: 'canceled', metadata: { firebaseUid: 'uid-9' } } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockClearClaim).toHaveBeenCalledWith('uid-9');
  });

  it('subscription.updated active → setStripeRoleClaim', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated', id: 'evt_up', created: 1, livemode: false,
      data: { object: { status: 'active', metadata: { firebaseUid: 'uid-a' } } },
    });
    const { POST } = await import('../route');
    await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(mockSetClaim).toHaveBeenCalledWith('uid-a');
  });

  it('claim setter 실패해도 webhook 200 (fail-safe)', async () => {
    mockSetClaim.mockResolvedValue({ ok: false, error: 'no_service_account' });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_fs', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-x' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_claim_sync_failed' }),
    );
  });
});
