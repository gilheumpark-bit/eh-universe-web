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

// Stripe SDK mock — constructEvent를 제어 가능하게. (+ refund 역추적용 retrieve)
const mockConstructEvent = jest.fn();
const mockInvoiceRetrieve = jest.fn();
const mockSubRetrieve = jest.fn();
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    invoices: { retrieve: mockInvoiceRetrieve },
    subscriptions: { retrieve: mockSubRetrieve },
  }));
});

// [H1 stripe-ready] Firestore dedupe mock — processed_events create 제어.
const mockCreateDoc = jest.fn();
const mockPatchDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockGetDocWithMeta = jest.fn();
jest.mock('@/lib/firestore-service-rest', () => ({
  firestoreCreateDocument: (...a: unknown[]) => mockCreateDoc(...a),
  firestorePatchDocument: (...a: unknown[]) => mockPatchDoc(...a),
  firestoreGetDocument: (...a: unknown[]) => mockGetDoc(...a),
  firestoreGetDocumentWithMeta: (...a: unknown[]) => mockGetDocWithMeta(...a),
}));

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

import { createReleaseCreditLedgerSnapshot } from '@/lib/billing/release-credit-ledger';

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
    mockCreateDoc.mockResolvedValue({ ok: true });
  });
  afterEach(() => { process.env = originalEnv; });

  it('checkout.session.completed + client_reference_id → setStripeRoleClaim(uid)', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_co', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-123', payment_status: 'paid', status: 'complete' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockSetClaim).toHaveBeenCalledWith('uid-123');
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_claim_synced' }),
    );
  });

  it('checkout.session.completed metadata.loreguardPlanId → subscription entitlement sync', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-proj';
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_co_plan', created: 1, livemode: false,
      data: {
        object: {
          client_reference_id: 'uid-plan',
          payment_status: 'paid',
          status: 'complete',
          customer: 'cus_plan',
          subscription: 'sub_plan',
          metadata: { loreguardPlanId: 'studio' },
        },
      },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));

    expect(res.status).toBe(200);
    expect(mockCreateDoc).toHaveBeenCalledWith(
      'test-proj',
      'subscriptions',
      expect.objectContaining({
        uid: { stringValue: 'uid-plan' },
        planId: { stringValue: 'studio' },
        status: { stringValue: 'active' },
        stripeCustomerId: { stringValue: 'cus_plan' },
        stripeSubscriptionId: { stringValue: 'sub_plan' },
      }),
      { documentId: 'uid-plan' },
    );
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_subscription_entitlement_synced' }),
    );
  });

  it('checkout.session.completed release_credit_purchase → ledger purchase grant sync', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-proj';
    const freeLedger = createReleaseCreditLedgerSnapshot({
      userId: 'uid-buy',
      planId: 'free',
      periodKey: '2026-06',
      projectId: 'project-alpha',
      createdAt: '2026-06-15T00:00:00.000Z',
    });
    mockGetDoc.mockResolvedValue({ ok: false, error: 'not_found' });
    mockGetDocWithMeta
      .mockResolvedValueOnce({ ok: false, error: 'not_found' })
      .mockResolvedValueOnce({
        ok: true,
        fields: { payloadJson: { stringValue: JSON.stringify(freeLedger) } },
        updateTime: '2026-06-15T00:00:01.000Z',
      });
    mockPatchDoc.mockResolvedValue({ ok: true, updateTime: '2026-06-15T00:00:02.000Z' });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      id: 'evt_release_credit_buy',
      created: 1,
      livemode: false,
      data: {
        object: {
          client_reference_id: 'uid-buy',
          payment_status: 'paid',
          status: 'complete',
          metadata: {
            firebaseUid: 'uid-buy',
            loreguardCheckoutKind: 'release_credit_purchase',
            loreguardProductId: 'episode-c2pa',
            loreguardPackageProfileId: 'public-reader',
            releaseCreditAmount: '2',
            projectId: 'project-alpha',
            periodKey: '2026-06',
            certificateId: 'CERT-BUY-001',
          },
        },
      },
    });

    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));

    expect(res.status).toBe(200);
    expect(mockSetClaim).not.toHaveBeenCalled();
    expect(mockCreateDoc).toHaveBeenCalledWith(
      'test-proj',
      'release_credit_ledgers',
      expect.any(Object),
      expect.objectContaining({ documentId: expect.stringMatching(/^ledger_/) }),
    );
    const ledgerPatch = mockPatchDoc.mock.calls.find((call) =>
      typeof call[1] === 'string' && call[1].startsWith('release_credit_ledgers/'),
    );
    expect(ledgerPatch).toBeTruthy();
    const payloadJson = (ledgerPatch?.[2] as { payloadJson?: { stringValue?: string } }).payloadJson?.stringValue ?? '{}';
    const payload = JSON.parse(payloadJson) as { balance: number; entries: Array<{ kind: string; creditAmount: number; idempotencyKey: string }> };
    expect(payload.balance).toBe(2);
    expect(payload.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'purchase-grant',
          creditAmount: 2,
          idempotencyKey: 'release-credit-purchase:stripe:evt_release_credit_buy',
        }),
      ]),
    );
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_release_credit_purchase_synced' }),
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

  // [#13 fix] unpaid/pending 세션은 client_reference_id 가 있어도 pro 미부여.
  it('checkout.session.completed payment_status=unpaid → claim 미부여 + skip 로그', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_unpaid', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-unpaid', payment_status: 'unpaid', status: 'complete' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockSetClaim).not.toHaveBeenCalled();
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_checkout_unpaid_skipped' }),
    );
  });

  it('checkout.session.completed no_payment_required → claim 미부여', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_npr', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-npr', payment_status: 'no_payment_required', status: 'complete' } },
    });
    const { POST } = await import('../route');
    await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(mockSetClaim).not.toHaveBeenCalled();
  });

  it('checkout.session.completed paid 인데 status!=complete → claim 미부여', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_incomplete', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-inc', payment_status: 'paid', status: 'open' } },
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

  it('subscription.updated active + plan metadata → subscription entitlement sync', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-proj';
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated', id: 'evt_up_plan', created: 1, livemode: false,
      data: {
        object: {
          id: 'sub_up_plan',
          status: 'active',
          customer: 'cus_up_plan',
          metadata: { firebaseUid: 'uid-up-plan', loreguardPlanId: 'pro' },
        },
      },
    });
    const { POST } = await import('../route');
    await POST(makeRequest({ body: '{}', signature: 'good-sig' }));

    expect(mockCreateDoc).toHaveBeenCalledWith(
      'test-proj',
      'subscriptions',
      expect.objectContaining({
        uid: { stringValue: 'uid-up-plan' },
        planId: { stringValue: 'pro' },
        status: { stringValue: 'active' },
        stripeCustomerId: { stringValue: 'cus_up_plan' },
        stripeSubscriptionId: { stringValue: 'sub_up_plan' },
      }),
      { documentId: 'uid-up-plan' },
    );
    expect(mockSetClaim).toHaveBeenCalledWith('uid-up-plan');
  });

  it('claim setter 실패해도 webhook 200 (fail-safe)', async () => {
    mockSetClaim.mockResolvedValue({ ok: false, error: 'no_service_account' });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_fs', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-x', payment_status: 'paid', status: 'complete' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_claim_sync_failed' }),
    );
  });
});

// ============================================================
// [H1 stripe-ready] idempotency (processed_events) + refund downgrade
// ============================================================

describe('/api/stripe/webhook POST — idempotency (event.id dedupe)', () => {
  let originalEnv: typeof process.env;
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-proj';
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
    mockSetClaim.mockResolvedValue({ ok: true });
    mockClearClaim.mockResolvedValue({ ok: true });
  });
  afterEach(() => { process.env = originalEnv; });

  it('첫 이벤트 → processed_events 문서 생성 (documentId=event.id) + claim 진행', async () => {
    mockCreateDoc.mockResolvedValue({ ok: true });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_idem_1', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-i1', payment_status: 'paid', status: 'complete' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockCreateDoc).toHaveBeenCalledWith(
      'test-proj',
      'stripe_processed_events',
      expect.objectContaining({ eventId: { stringValue: 'evt_idem_1' } }),
      { documentId: 'evt_idem_1' },
    );
    expect(mockSetClaim).toHaveBeenCalledWith('uid-i1');
  });

  it('중복 이벤트 (409 ALREADY_EXISTS) → claim 미호출 + duplicate:true + 200', async () => {
    mockCreateDoc.mockResolvedValue({ ok: false, error: 'http_409' });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_idem_dup', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-i2' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    const json = await res.json() as { received?: boolean; duplicate?: boolean };
    expect(json.received).toBe(true);
    expect(json.duplicate).toBe(true);
    expect(mockSetClaim).not.toHaveBeenCalled();
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_event_duplicate_skipped' }),
    );
  });

  it('dedupe 저장 불가 (SA 미설정 등) → fail-open: claim 진행 + warn 로그', async () => {
    mockCreateDoc.mockResolvedValue({ ok: false, error: 'no_service_account' });
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed', id: 'evt_idem_open', created: 1, livemode: false,
      data: { object: { client_reference_id: 'uid-i3', payment_status: 'paid', status: 'complete' } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockSetClaim).toHaveBeenCalledWith('uid-i3');
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_event_dedupe_unavailable' }),
    );
  });

  it('로그-only 이벤트 (invoice.paid) 는 dedupe 쓰기 안 함', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'invoice.paid', id: 'evt_log_only', created: 1, livemode: false,
      data: { object: {} },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockCreateDoc).not.toHaveBeenCalled();
  });
});

describe('/api/stripe/webhook POST — charge.refunded → 구독 다운그레이드', () => {
  let originalEnv: typeof process.env;
  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.STRIPE_SECRET_KEY = 'sk_test_valid_key';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_valid';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-proj';
    jest.clearAllMocks();
    mockConstructEvent.mockReset();
    mockSetClaim.mockResolvedValue({ ok: true });
    mockClearClaim.mockResolvedValue({ ok: true });
    mockCreateDoc.mockResolvedValue({ ok: true });
  });
  afterEach(() => { process.env = originalEnv; });

  it('charge.invoice → invoice.subscription → metadata.firebaseUid → clearStripeRoleClaim', async () => {
    mockInvoiceRetrieve.mockResolvedValue({ subscription: 'sub_ref_1' });
    mockSubRetrieve.mockResolvedValue({ metadata: { firebaseUid: 'uid-refund' } });
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_refund', created: 1, livemode: false,
      data: { object: { invoice: 'in_ref_1', amount: 1000, amount_refunded: 1000 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockInvoiceRetrieve).toHaveBeenCalledWith('in_ref_1');
    expect(mockSubRetrieve).toHaveBeenCalledWith('sub_ref_1');
    expect(mockClearClaim).toHaveBeenCalledWith('uid-refund');
  });

  it('basil API shape (invoice.parent.subscription_details) 도 역추적', async () => {
    mockInvoiceRetrieve.mockResolvedValue({
      parent: { subscription_details: { subscription: 'sub_ref_2' } },
    });
    mockSubRetrieve.mockResolvedValue({ metadata: { firebaseUid: 'uid-refund-2' } });
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_refund_2', created: 1, livemode: false,
      data: { object: { invoice: 'in_ref_2', amount: 1000, amount_refunded: 1000 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockClearClaim).toHaveBeenCalledWith('uid-refund-2');
  });

  // [#14 fix] 부분 환불은 강등하지 않음 — 권한 유지 + 로그만.
  it('부분 환불 (amount_refunded < amount) → clearClaim 미호출 + 권한 유지 + 200', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_partial', created: 1, livemode: false,
      data: { object: { invoice: 'in_partial', amount: 1000, amount_refunded: 300 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockClearClaim).not.toHaveBeenCalled();
    // 부분 환불은 uid 역추적조차 하지 않음 (불필요한 Stripe API 호출 회피).
    expect(mockInvoiceRetrieve).not.toHaveBeenCalled();
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_partial_refund_no_downgrade' }),
    );
  });

  it('amount 비정상 (0) → 강등 보류 (fail-secure, 권한 유지)', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_zero', created: 1, livemode: false,
      data: { object: { invoice: 'in_zero', amount: 0, amount_refunded: 0 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockClearClaim).not.toHaveBeenCalled();
  });

  it('전액 환불 (amount_refunded == amount) → clearClaim 호출 (다운그레이드)', async () => {
    mockInvoiceRetrieve.mockResolvedValue({ subscription: 'sub_full' });
    mockSubRetrieve.mockResolvedValue({ metadata: { firebaseUid: 'uid-full' } });
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_full', created: 1, livemode: false,
      data: { object: { invoice: 'in_full', amount: 1000, amount_refunded: 1000 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockClearClaim).toHaveBeenCalledWith('uid-full');
  });

  it('uid 역추적 실패 (invoice 없음) → claim 미호출 + warn 로그 + 200 유지', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_refund_nouid', created: 1, livemode: false,
      data: { object: { amount: 1000, amount_refunded: 1000 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockClearClaim).not.toHaveBeenCalled();
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_refund_uid_unresolved' }),
    );
  });

  it('retrieve throw 해도 webhook 200 (fail-safe)', async () => {
    mockInvoiceRetrieve.mockRejectedValue(new Error('stripe api down'));
    mockConstructEvent.mockReturnValue({
      type: 'charge.refunded', id: 'evt_refund_err', created: 1, livemode: false,
      data: { object: { invoice: 'in_err', amount: 1000, amount_refunded: 1000 } },
    });
    const { POST } = await import('../route');
    const res = await POST(makeRequest({ body: '{}', signature: 'good-sig' }));
    expect(res.status).toBe(200);
    expect(mockApiLog).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'stripe_claim_sync_threw' }),
    );
  });
});
