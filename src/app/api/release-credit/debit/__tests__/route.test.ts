class ReleaseCreditFakeRequest {
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

class ReleaseCreditFakeResponse {
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
    return new ReleaseCreditFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock("next/server", () => ({
  NextRequest: ReleaseCreditFakeRequest,
  NextResponse: ReleaseCreditFakeResponse,
}));

const mockVerifyFirebaseIdToken = jest.fn();
jest.mock("@/lib/firebase-id-token", () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => mockVerifyFirebaseIdToken(...args),
}));

const mockCheckRateLimit = jest.fn();
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => "203.0.113.11",
}));

import {
  applyReleaseCreditLedgerOperation,
  buildReleaseCreditDebitOperationFromPreview,
  buildReleaseCreditPreview,
  createReleaseCreditLedgerSnapshot,
  type ReleaseCreditLedgerSnapshot,
} from "@/lib/billing/release-credit-ledger";
import {
  buildReleaseCreditLedgerDocumentPath,
  setReleaseCreditLedgerStoreForTest,
  type ReleaseCreditLedgerStore,
} from "@/lib/billing/release-credit-ledger-store";
import {
  setSubscriptionEntitlementStoreForTest,
  type SubscriptionEntitlementStore,
} from "@/lib/billing/subscription-entitlement-store";
import type { ReleaseEntitlementPlan } from "@/lib/billing/loreguard-plans";

type ReleaseCreditRequest = Parameters<(typeof import("../route"))["POST"]>[0];

function makeRequest(init?: {
  token?: string;
  body?: Record<string, unknown>;
}): ReleaseCreditRequest {
  const headers: Record<string, string> = {};
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  return new ReleaseCreditFakeRequest({
    headers,
    body: JSON.stringify(init?.body ?? {}),
  }) as unknown as ReleaseCreditRequest;
}

function makeBody(overrides?: Partial<{
  projectId: string;
  periodKey: string;
  packageProfileId: ReleaseEntitlementPlan["packageProfileId"];
  certificateId: string;
  workTitle: string;
}>): Record<string, unknown> {
  return {
    projectId: "project-alpha",
    periodKey: "2026-06",
    packageProfileId: "public-reader",
    certificateId: "CERT-ALPHA-001",
    workTitle: "QA 출고 작품",
    ...overrides,
  };
}

function makeSnapshot(input?: {
  planId?: "free" | "starter" | "studio" | "pro" | "publisher";
  projectId?: string;
}): ReleaseCreditLedgerSnapshot {
  return createReleaseCreditLedgerSnapshot({
    userId: "uid-release",
    planId: input?.planId ?? "studio",
    periodKey: "2026-06",
    projectId: input?.projectId ?? "project-alpha",
    createdAt: "2026-06-15T00:00:00.000Z",
  });
}

function makeStore(loadResult: Awaited<ReturnType<ReleaseCreditLedgerStore["load"]>>): {
  store: ReleaseCreditLedgerStore;
  save: jest.Mock;
  load: jest.Mock;
} {
  const load = jest.fn().mockResolvedValue(loadResult);
  const save = jest.fn().mockResolvedValue({
    ok: true,
    documentPath: "release_credit_ledgers/ledger_test",
    updateTime: "2026-06-15T00:00:01.000Z",
  });
  const store: ReleaseCreditLedgerStore = {
    load,
    create: jest.fn(),
    save,
  };
  return { store, load, save };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mockVerifyFirebaseIdToken.mockResolvedValue({ uid: "uid-release", tier: "pro" });
  setReleaseCreditLedgerStoreForTest(null);
  setSubscriptionEntitlementStoreForTest(null);
});

afterEach(() => {
  setReleaseCreditLedgerStoreForTest(null);
  setSubscriptionEntitlementStoreForTest(null);
});

describe("/api/release-credit/debit", () => {
  it("requires a bearer token before touching the ledger", async () => {
    const snapshot = makeSnapshot();
    const fake = makeStore({
      ok: true,
      snapshot,
      documentPath: buildReleaseCreditLedgerDocumentPath({
        uid: "uid-release",
        periodKey: "2026-06",
        projectId: "project-alpha",
      }),
      updateTime: "update-time",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({ body: makeBody() })) as unknown as ReleaseCreditFakeResponse;

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "authentication_required" });
    expect(fake.load).not.toHaveBeenCalled();
  });

  it("allows free accounts to spend credits from an existing separate-purchase ledger", async () => {
    mockVerifyFirebaseIdToken.mockResolvedValue({ uid: "uid-release", tier: "free" });
    const base = makeSnapshot({ planId: "free" });
    const purchased = applyReleaseCreditLedgerOperation(base, {
      kind: "purchase-grant",
      idempotencyKey: "release-credit-purchase:stripe:evt_free_buy",
      creditAmount: 1,
      projectId: base.projectId,
      planId: "free",
      packageProfileId: "public-reader",
      productId: "episode-basic",
      certificateId: null,
      reasonKo: "과정기록 카드 별도 구매 반영",
      createdAt: "2026-06-15T00:00:01.000Z",
    });
    const fake = makeStore({
      ok: true,
      snapshot: purchased.snapshot,
      documentPath: "release_credit_ledgers/free_purchase",
      updateTime: "2026-06-15T00:00:02.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "free-token",
      body: makeBody(),
    })) as unknown as ReleaseCreditFakeResponse;
    const body = await response.json() as { status: string; balance: number };

    expect(response.status).toBe(200);
    expect(body.status).toBe("applied");
    expect(body.balance).toBe(0);
    expect(fake.save).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ balance: 0, planId: "free" }),
      expectedUpdateTime: "2026-06-15T00:00:02.000Z",
    });
  });

  it("reports missing project ledger without trusting a client plan", async () => {
    const fake = makeStore({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/missing" });
    setReleaseCreditLedgerStoreForTest(fake.store);
    const subscriptionLoad = jest.fn().mockResolvedValue({ ok: false, error: "not_found" });
    setSubscriptionEntitlementStoreForTest({
      load: subscriptionLoad,
      upsert: jest.fn(),
    } as SubscriptionEntitlementStore);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: { ...makeBody(), planId: "publisher" },
    })) as unknown as ReleaseCreditFakeResponse;

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "ledger_missing" });
    expect(fake.load).toHaveBeenCalledWith({
      uid: "uid-release",
      periodKey: "2026-06",
      projectId: "project-alpha",
    });
    expect(fake.save).not.toHaveBeenCalled();
  });

  it("initializes a project ledger from the server subscription record before first debit", async () => {
    const initializedSnapshot = makeSnapshot({ planId: "pro", projectId: "project-alpha" });
    const load = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/new" })
      .mockResolvedValueOnce({
        ok: true,
        snapshot: initializedSnapshot,
        documentPath: "release_credit_ledgers/new",
        updateTime: "2026-06-15T00:00:00.000Z",
      });
    const create = jest.fn().mockResolvedValue({ ok: true, documentPath: "release_credit_ledgers/new" });
    const save = jest.fn().mockResolvedValue({ ok: true, documentPath: "release_credit_ledgers/new" });
    setReleaseCreditLedgerStoreForTest({ load, create, save });
    const subscriptionLoad = jest.fn().mockResolvedValue({
      ok: true,
      snapshot: {
        uid: "uid-release",
        planId: "pro",
        status: "active",
        stripeCustomerId: "cus_test",
        stripeSubscriptionId: "sub_test",
        sourceEventId: "evt_test",
        updatedAt: "2026-06-15T00:00:00.000Z",
      },
    });
    setSubscriptionEntitlementStoreForTest({
      load: subscriptionLoad,
      upsert: jest.fn(),
    } as SubscriptionEntitlementStore);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody({ packageProfileId: "external-submission" }),
    })) as unknown as ReleaseCreditFakeResponse;
    const body = await response.json() as { initialized: boolean; balance: number };

    expect(response.status).toBe(200);
    expect(body.initialized).toBe(true);
    expect(body.balance).toBe(15);
    expect(create).toHaveBeenCalledWith({
      uid: "uid-release",
      periodKey: "2026-06",
      projectId: "project-alpha",
      planId: "pro",
    });
    expect(save).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ balance: 15, planId: "pro" }),
      expectedUpdateTime: "2026-06-15T00:00:00.000Z",
    });
  });

  it("debits the server ledger once and saves the updated balance", async () => {
    const snapshot = makeSnapshot({ planId: "studio" });
    const fake = makeStore({
      ok: true,
      snapshot,
      documentPath: "release_credit_ledgers/ledger_studio",
      updateTime: "2026-06-15T00:00:00.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody(),
    })) as unknown as ReleaseCreditFakeResponse;
    const body = await response.json() as { balance: number; status: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("applied");
    expect(body.balance).toBe(9);
    expect(fake.save).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({ balance: 9, projectId: "project-alpha" }),
      expectedUpdateTime: "2026-06-15T00:00:00.000Z",
    });
  });

  it("does not save when the request is an idempotent duplicate", async () => {
    const snapshot = makeSnapshot({ planId: "studio" });
    const preview = buildReleaseCreditPreview({
      planId: snapshot.planId,
      packageProfileId: "public-reader",
      projectId: snapshot.projectId,
      certificateId: "CERT-ALPHA-001",
      workTitle: "QA 출고 작품",
      availableCreditsOverride: snapshot.balance,
    });
    const applied = applyReleaseCreditLedgerOperation(
      snapshot,
      buildReleaseCreditDebitOperationFromPreview(preview, {
        createdAt: "2026-06-15T00:00:01.000Z",
      }),
    );
    const fake = makeStore({
      ok: true,
      snapshot: applied.snapshot,
      documentPath: "release_credit_ledgers/ledger_studio",
      updateTime: "2026-06-15T00:00:02.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody(),
    })) as unknown as ReleaseCreditFakeResponse;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: "duplicate", balance: 9 });
    expect(fake.save).not.toHaveBeenCalled();
  });

  it("blocks debit when the project ledger lacks enough credits", async () => {
    const snapshot = makeSnapshot({ planId: "starter" });
    const fake = makeStore({
      ok: true,
      snapshot,
      documentPath: "release_credit_ledgers/ledger_starter",
      updateTime: "2026-06-15T00:00:00.000Z",
    });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody({ packageProfileId: "external-submission" }),
    })) as unknown as ReleaseCreditFakeResponse;

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: "insufficient_release_credits",
      requiredCredits: 10,
      balance: 3,
    });
    expect(fake.save).not.toHaveBeenCalled();
  });

  it("rejects unsupported package profile values", async () => {
    const fake = makeStore({ ok: false, error: "not_found", documentPath: "release_credit_ledgers/missing" });
    setReleaseCreditLedgerStoreForTest(fake.store);

    const { POST } = await import("../route");
    const response = await POST(makeRequest({
      token: "paid-token",
      body: makeBody({ packageProfileId: "unknown-profile" as ReleaseEntitlementPlan["packageProfileId"] }),
    })) as unknown as ReleaseCreditFakeResponse;

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_input" });
    expect(fake.load).not.toHaveBeenCalled();
  });
});

export {};
