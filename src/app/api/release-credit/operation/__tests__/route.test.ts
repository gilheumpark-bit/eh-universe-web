class ReleaseCreditOperationFakeRequest {
  headers: Headers;
  private readonly requestBody: string | null;

  constructor(init?: { headers?: Record<string, string>; body?: string }) {
    this.headers = new Headers(init?.headers ?? {});
    this.requestBody = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this.requestBody ?? "{}");
  }
}

class ReleaseCreditOperationFakeResponse {
  private readonly responseBody: unknown;
  private readonly responseStatus: number;

  get status() {
    return this.responseStatus;
  }

  constructor(body: unknown, status: number) {
    this.responseBody = body;
    this.responseStatus = status;
  }

  async json() {
    return this.responseBody;
  }

  static json(body: unknown, options?: { status?: number }) {
    return new ReleaseCreditOperationFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock("next/server", () => ({
  NextRequest: ReleaseCreditOperationFakeRequest,
  NextResponse: ReleaseCreditOperationFakeResponse,
}));

const mockVerifyFirebaseIdToken = jest.fn();
jest.mock("@/lib/firebase-id-token", () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => mockVerifyFirebaseIdToken(...args),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "203.0.113.12",
}));

import {
  applyReleaseCreditLedgerOperation,
  createReleaseCreditLedgerSnapshot,
  type ReleaseCreditLedgerSnapshot,
} from "@/lib/billing/release-credit-ledger";
import {
  setReleaseCreditLedgerStoreForTest,
  type ReleaseCreditLedgerStore,
} from "@/lib/billing/release-credit-ledger-store";
import {
  setSubscriptionEntitlementStoreForTest,
  type SubscriptionEntitlementStore,
} from "@/lib/billing/subscription-entitlement-store";

type OperationRequest = Parameters<(typeof import("../route"))["POST"]>[0];

function makeRequest(init?: {
  token?: string;
  adminSecret?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}): OperationRequest {
  const headers: Record<string, string> = {
    origin: "https://app.example",
    host: "app.example",
    ...init?.headers,
  };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  if (init?.adminSecret) headers["x-loreguard-admin-secret"] = init.adminSecret;
  return new ReleaseCreditOperationFakeRequest({
    headers,
    body: JSON.stringify(init?.body ?? {}),
  }) as unknown as OperationRequest;
}

function makeBody(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    kind: "purchase-grant",
    projectId: "project-alpha",
    periodKey: "2026-06",
    idempotencyKey: "release-credit-purchase:stripe:evt_alpha",
    creditAmount: 3,
    packageProfileId: "public-reader",
    productId: "episode-basic",
    certificateId: "CERT-ALPHA-001",
    reasonKo: "과정기록 카드 별도 구매 반영",
    ...overrides,
  };
}

function makeSnapshot(planId: "free" | "starter" | "studio" | "pro" = "studio"): ReleaseCreditLedgerSnapshot {
  return createReleaseCreditLedgerSnapshot({
    userId: "uid-release",
    planId,
    periodKey: "2026-06",
    projectId: "project-alpha",
    createdAt: "2026-06-15T00:00:00.000Z",
  });
}

function makeStore(loadResult: Awaited<ReturnType<ReleaseCreditLedgerStore["load"]>>): {
  store: ReleaseCreditLedgerStore;
  load: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
} {
  const load = jest.fn().mockResolvedValue(loadResult);
  const create = jest.fn().mockResolvedValue({ ok: true, documentPath: "release_credit_ledgers/ledger_test" });
  const save = jest.fn().mockResolvedValue({ ok: true, documentPath: "release_credit_ledgers/ledger_test" });
  const store: ReleaseCreditLedgerStore = { load, create, save };
  return { store, load, create, save };
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, RELEASE_CREDIT_ADMIN_SECRET: "admin-secret" };
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mockVerifyFirebaseIdToken.mockResolvedValue({ uid: "uid-release", tier: "pro" });
  setReleaseCreditLedgerStoreForTest(null);
  setSubscriptionEntitlementStoreForTest(null);
});

afterEach(() => {
  process.env = originalEnv;
  setReleaseCreditLedgerStoreForTest(null);
  setSubscriptionEntitlementStoreForTest(null);
});

describe("/api/release-credit/operation", () => {
  it("rejects cross-origin operation attempts before ledger work", async () => {
    const fake = makeStore({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/missing" });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      adminSecret: "admin-secret",
      headers: { origin: "https://evil.example", host: "app.example" },
      body: makeBody(),
    })) as unknown as ReleaseCreditOperationFakeResponse;

    expect(response.status).toBe(403);
    expect(fake.load).not.toHaveBeenCalled();
  });

  it("requires authentication before ledger work", async () => {
    const fake = makeStore({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/missing" });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      adminSecret: "admin-secret",
      body: makeBody(),
    })) as unknown as ReleaseCreditOperationFakeResponse;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "authentication_required" });
    expect(fake.load).not.toHaveBeenCalled();
  });

  it("blocks purchase/refund operations without the internal admin secret", async () => {
    const fake = makeStore({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/missing" });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody(),
    })) as unknown as ReleaseCreditOperationFakeResponse;

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "internal_authorization_required" });
    expect(fake.load).not.toHaveBeenCalled();
  });

  it("creates a free project ledger for a verified separate purchase and grants credits", async () => {
    const freeSnapshot = makeSnapshot("free");
    const load = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/free" })
      .mockResolvedValueOnce({
        ok: true,
        snapshot: freeSnapshot,
        documentPath: "release_credit_ledgers/free",
        updateTime: "2026-06-15T00:00:01.000Z",
      });
    const create = jest.fn().mockResolvedValue({ ok: true, documentPath: "release_credit_ledgers/free" });
    const save = jest.fn().mockResolvedValue({ ok: true, documentPath: "release_credit_ledgers/free" });
    setReleaseCreditLedgerStoreForTest({ load, create, save });
    setSubscriptionEntitlementStoreForTest({
      load: jest.fn().mockResolvedValue({ ok: false, error: "not_found" }),
      upsert: jest.fn(),
    } as SubscriptionEntitlementStore);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      adminSecret: "admin-secret",
      body: makeBody({ fallbackPlanId: "free" }),
    })) as unknown as ReleaseCreditOperationFakeResponse;
    const body = await response.json() as { initialized: boolean; balance: number };

    expect(response.status).toBe(200);
    expect(body.initialized).toBe(true);
    expect(body.balance).toBe(3);
    expect(create).toHaveBeenCalledWith({
      uid: "uid-release",
      periodKey: "2026-06",
      projectId: "project-alpha",
      planId: "free",
    });
    expect(save).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ balance: 3, planId: "free" }),
      expectedUpdateTime: "2026-06-15T00:00:01.000Z",
    });
  });

  it("restores credits with a refund-credit operation", async () => {
    const base = makeSnapshot("starter");
    const debited = applyReleaseCreditLedgerOperation(base, {
      kind: "issue-debit",
      idempotencyKey: "release-credit-debit:project-alpha:cert-alpha",
      creditAmount: 1,
      projectId: base.projectId,
      planId: "starter",
      packageProfileId: "public-reader",
      productId: "episode-basic",
      certificateId: "CERT-ALPHA-001",
      reasonKo: "과정기록 카드 발급 차감",
      createdAt: "2026-06-15T00:00:01.000Z",
    });
    const fake = makeStore({
      ok: true,
      snapshot: debited.snapshot,
      documentPath: "release_credit_ledgers/starter",
      updateTime: "2026-06-15T00:00:02.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      adminSecret: "admin-secret",
      body: makeBody({
        kind: "refund-credit",
        idempotencyKey: "release-credit-refund:project-alpha:cert-alpha",
        creditAmount: 1,
        reasonKo: "과정기록 카드 환불/복구 반영",
      }),
    })) as unknown as ReleaseCreditOperationFakeResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "applied", balance: 3 });
    expect(fake.save).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ balance: 3 }),
      expectedUpdateTime: "2026-06-15T00:00:02.000Z",
    });
  });

  it("allows reissue-note without admin secret and does not change balance", async () => {
    const snapshot = makeSnapshot("studio");
    const fake = makeStore({
      ok: true,
      snapshot,
      documentPath: "release_credit_ledgers/studio",
      updateTime: "2026-06-15T00:00:00.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody({
        kind: "reissue-note",
        idempotencyKey: "release-credit-reissue:project-alpha:cert-alpha",
        creditAmount: 0,
        reasonKo: "공개 카드 재발급 기록",
      }),
    })) as unknown as ReleaseCreditOperationFakeResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "applied", balance: 10 });
    expect(fake.save).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ balance: 10 }),
      expectedUpdateTime: "2026-06-15T00:00:00.000Z",
    });
  });

  it("returns duplicate without saving when idempotency key already exists", async () => {
    const base = makeSnapshot("studio");
    const credited = applyReleaseCreditLedgerOperation(base, {
      kind: "purchase-grant",
      idempotencyKey: "release-credit-purchase:stripe:evt_alpha",
      creditAmount: 3,
      projectId: base.projectId,
      planId: "studio",
      packageProfileId: "public-reader",
      productId: "episode-basic",
      certificateId: "CERT-ALPHA-001",
      reasonKo: "과정기록 카드 별도 구매 반영",
      createdAt: "2026-06-15T00:00:01.000Z",
    });
    const fake = makeStore({
      ok: true,
      snapshot: credited.snapshot,
      documentPath: "release_credit_ledgers/studio",
      updateTime: "2026-06-15T00:00:02.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      adminSecret: "admin-secret",
      body: makeBody(),
    })) as unknown as ReleaseCreditOperationFakeResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "duplicate", balance: 13 });
    expect(fake.save).not.toHaveBeenCalled();
  });
});

export {};
