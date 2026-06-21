/**
 * T1 external registry replay — route-level register -> lookup -> verify.
 *
 * This test keeps Firestore mocked but exercises the actual API route boundary:
 * /api/cp/register writes the registry document shape, then /api/cp/verify/[id]
 * reads that same external-registry document for GET lookup and POST cross-check.
 */

// ============================================================
// PART 1 — Next.js stand-ins and shared Firestore mock
// ============================================================

class CpFakeRequest {
  url: string;
  headers: Headers;
  private readonly requestBody: string | null;

  constructor(init?: { url?: string; headers?: Record<string, string>; body?: string }) {
    this.url = init?.url ?? 'http://localhost/api/cp/register';
    this.headers = new Headers(init?.headers ?? {});
    this.requestBody = init?.body ?? null;
  }

  async json() {
    return JSON.parse(this.requestBody ?? '{}');
  }
}

class CpFakeResponse {
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
    return new CpFakeResponse(body, options?.status ?? 200);
  }
}

jest.mock('next/server', () => ({
  NextRequest: CpFakeRequest,
  NextResponse: CpFakeResponse,
}));

type FirestoreDoc = {
  name: string;
  fields: Record<string, { stringValue?: string; timestampValue?: string }>;
};

const mockRegistryDocs: FirestoreDoc[] = [];
const mockCreateDocument = jest.fn();
const mockListDocuments = jest.fn();

jest.mock('@/lib/firestore-service-rest', () => ({
  firestoreCreateDocument: (...args: unknown[]) => mockCreateDocument(...args),
  firestoreListDocuments: (...args: unknown[]) => mockListDocuments(...args),
}));

const mockVerifyFirebaseIdToken = jest.fn();
jest.mock('@/lib/firebase-id-token', () => ({
  verifyFirebaseIdToken: (...args: unknown[]) => mockVerifyFirebaseIdToken(...args),
}));

const mockCheckRateLimit = jest.fn();
jest.mock('@/lib/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  checkRateLimitAsync: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: () => '203.0.113.44',
  RATE_LIMITS: {
    default: { windowMs: 60_000, maxRequests: 60 },
  },
}));

jest.mock('@/lib/api-logger', () => ({
  apiLog: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// ============================================================
// PART 2 — Fixtures
// ============================================================

import { CP_REGISTRY_COLLECTION, computeCertHash } from '@/lib/creative-process/registry-contract';
import type { ProcessCertificate } from '@/lib/creative-process/types';

const CERT_ID = '01HZXK3V9T2M4N5P6Q7R8S9T0A';
const CHAIN_TIP_HASH = 'd'.repeat(64);
const GITHUB_COMMIT_SHA = 'a'.repeat(40);

const cert: Partial<ProcessCertificate> = {
  id: CERT_ID,
  projectId: 'project-registry-replay',
  manuscriptHash: '1'.repeat(64),
  generatedAt: '2026-06-12T00:00:00.000Z',
  generatedBy: 'loreguard@2.3.0-preview',
  reportVersion: '2.0',
  visibility: 'public',
  includedSections: ['overview', 'external-import'],
  summaryStats: {
    totalEpisodes: 1,
    totalUnits: 3500,
    unitLabel: 'chars',
    aiAssistUsed: true,
    externalImportCount: 1,
    humanRevisionCount: 3,
    externalStatus: '확인 가능',
  },
  timelineHash: '2'.repeat(64),
  sourceSummaryHash: '3'.repeat(64),
  limitationTextVersion: 'v1',
  chainTipHash: CHAIN_TIP_HASH,
  issuer: { type: 'self', verified: false },
};

type RegisterRequest = Parameters<(typeof import('../register/route'))['POST']>[0];
type VerifyGetRequest = Parameters<(typeof import('../verify/[id]/route'))['GET']>[0];
type VerifyPostRequest = Parameters<(typeof import('../verify/[id]/route'))['POST']>[0];
type VerifyContext = Parameters<(typeof import('../verify/[id]/route'))['GET']>[1];

function makeRegisterRequest(body: Record<string, unknown>): RegisterRequest {
  return new CpFakeRequest({
    headers: { authorization: 'Bearer registry-replay-token' },
    body: JSON.stringify(body),
  }) as unknown as RegisterRequest;
}

function makeVerifyRequest(url: string, body?: unknown): VerifyGetRequest & VerifyPostRequest {
  return new CpFakeRequest({
    url,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as VerifyGetRequest & VerifyPostRequest;
}

function makeVerifyContext(id: string = CERT_ID): VerifyContext {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// PART 3 — Lifecycle
// ============================================================

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = {
    ...originalEnv,
    CP_REGISTRY_HMAC_SECRET: 'registry-replay-secret',
    FIREBASE_PROJECT_ID: 'registry-replay-project',
  };
  mockRegistryDocs.length = 0;
  jest.clearAllMocks();
  mockCheckRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  mockVerifyFirebaseIdToken.mockResolvedValue({ uid: 'uid-registry-replay', tier: 'pro' });
  mockCreateDocument.mockImplementation(
    async (
      projectId: string,
      collectionId: string,
      fields: FirestoreDoc['fields'],
      options?: { documentId?: string },
    ) => {
      const documentId = options?.documentId ?? `doc-${mockRegistryDocs.length + 1}`;
      const doc = {
        name: `projects/${projectId}/databases/(default)/documents/${collectionId}/${documentId}`,
        fields,
      };
      mockRegistryDocs.push(doc);
      return { ok: true, name: doc.name };
    },
  );
  mockListDocuments.mockResolvedValue({ ok: true, documents: mockRegistryDocs });
});

afterAll(() => {
  process.env = originalEnv;
});

// ============================================================
// PART 4 — Route replay
// ============================================================

describe('T1 external registry replay — CP register/verify API routes', () => {
  it('register POST -> Firestore document -> verify GET lookup -> verify POST match', async () => {
    const certHash = await computeCertHash(cert);
    const { POST: registerPost } = await import('../register/route');

    const registerResponse = await registerPost(makeRegisterRequest({
      certId: CERT_ID,
      projectId: cert.projectId,
      certHash,
      chainTipHash: CHAIN_TIP_HASH,
      visibility: 'public',
      issuerType: 'self',
      githubCommitSha: GITHUB_COMMIT_SHA,
    })) as unknown as CpFakeResponse;

    expect(registerResponse.status).toBe(201);
    const registerJson = await registerResponse.json() as {
      ok: boolean;
      certId: string;
      registrySignature: string;
      stored_fields: string[];
      privacy_note_ko: string;
    };
    expect(registerJson.ok).toBe(true);
    expect(registerJson.certId).toBe(CERT_ID);
    expect(registerJson.registrySignature).toMatch(/^[a-f0-9]{64}$/);
    expect(registerJson.privacy_note_ko).toContain('원고 본문 0byte');
    expect(mockCreateDocument).toHaveBeenCalledWith(
      'registry-replay-project',
      CP_REGISTRY_COLLECTION,
      expect.objectContaining({
        certId: { stringValue: CERT_ID },
        certHash: { stringValue: certHash },
        authorUid: { stringValue: 'uid-registry-replay' },
        hmac: { stringValue: registerJson.registrySignature },
      }),
      { documentId: CERT_ID },
    );
    expect(mockRegistryDocs).toHaveLength(1);
    expect(mockRegistryDocs[0].fields).not.toHaveProperty('manuscript');
    expect(mockRegistryDocs[0].fields).not.toHaveProperty('content');

    const { GET: verifyGet, POST: verifyPost } = await import('../verify/[id]/route');
    const lookupResponse = await verifyGet(
      makeVerifyRequest(`http://localhost/api/cp/verify/${CERT_ID}?lookup=true`),
      makeVerifyContext(),
    ) as unknown as CpFakeResponse;
    expect(lookupResponse.status).toBe(200);
    const lookupJson = await lookupResponse.json() as {
      registered: boolean;
      cert_id: string;
      cert_hash: string;
      chain_tip_hash: string;
      privacy_note: string;
      public_card: {
        kind: string;
        certificateId: string;
        projectId: string | null;
        display: {
          shortManuscriptHash: string | null;
          shortRecordHash: string | null;
          verificationUrl: string | null;
        };
        publicPolicy: {
          noManuscriptText: true;
          noPromptText: true;
          noSourceBodyText: true;
          noWorkReceiptText: true;
        };
      };
    };
    expect(lookupJson.registered).toBe(true);
    expect(lookupJson.cert_id).toBe(CERT_ID);
    expect(lookupJson.cert_hash).toBe(certHash);
    expect(lookupJson.chain_tip_hash).toBe(CHAIN_TIP_HASH);
    expect(lookupJson.privacy_note).toContain('no manuscript content');
    expect(lookupJson.public_card).toEqual(expect.objectContaining({
      kind: 'loreguard.public-certificate-card.v1',
      certificateId: CERT_ID,
      projectId: null,
    }));
    expect(lookupJson.public_card.display.shortManuscriptHash).toBeNull();
    expect(lookupJson.public_card.display.shortRecordHash).toBe(`${certHash.slice(0, 16)}...`);
    expect(lookupJson.public_card.display.verificationUrl).toBe(`http://localhost/verify/${CERT_ID}`);
    expect(lookupJson.public_card.publicPolicy.noManuscriptText).toBe(true);
    expect(JSON.stringify(lookupJson.public_card)).not.toContain(cert.manuscriptHash);

    const verifyResponse = await verifyPost(
      makeVerifyRequest(`http://localhost/api/cp/verify/${CERT_ID}`, cert),
      makeVerifyContext(),
    ) as unknown as CpFakeResponse;
    expect(verifyResponse.status).toBe(200);
    const verifyJson = await verifyResponse.json() as {
      valid: boolean;
      issues: string[];
      registry: { status: string; hmac: string; registered_at?: string };
    };
    expect(verifyJson.valid).toBe(true);
    expect(verifyJson.issues).toEqual([]);
    expect(verifyJson.registry.status).toBe('match');
    expect(verifyJson.registry.hmac).toBe('pass');
    expect(verifyJson.registry.registered_at).toBeTruthy();
  });

  it('verify GET lookup returns cert_not_registered when registry has no matching document', async () => {
    const { GET: verifyGet } = await import('../verify/[id]/route');
    const response = await verifyGet(
      makeVerifyRequest(`http://localhost/api/cp/verify/${CERT_ID}?lookup=true`),
      makeVerifyContext(),
    ) as unknown as CpFakeResponse;

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(expect.objectContaining({
      registered: false,
      error: 'cert_not_registered',
    }));
  });
});

export {};
