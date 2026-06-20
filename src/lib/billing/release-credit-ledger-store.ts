import {
  firestoreCreateDocument,
  firestoreGetDocumentWithMeta,
  firestorePatchDocument,
  type FirestoreFieldValue,
} from "@/lib/firestore-service-rest";
import {
  compactReleaseCreditScopeKey,
  createReleaseCreditLedgerSnapshot,
  type ReleaseCreditLedgerSnapshot,
} from "@/lib/billing/release-credit-ledger";
import {
  normalizeLoreguardPlanId,
  type LoreguardPlanId,
} from "@/lib/billing/loreguard-plans";

export const RELEASE_CREDIT_LEDGER_COLLECTION = "release_credit_ledgers";

export interface ReleaseCreditLedgerLookup {
  uid: string;
  periodKey: string;
  projectId: string;
}

export interface ReleaseCreditLedgerCreateInput extends ReleaseCreditLedgerLookup {
  planId: LoreguardPlanId;
  createdAt?: string;
}

export interface ReleaseCreditLedgerLoadOk {
  ok: true;
  snapshot: ReleaseCreditLedgerSnapshot;
  documentPath: string;
  updateTime?: string;
}

export interface ReleaseCreditLedgerStoreWriteOk {
  ok: true;
  documentPath: string;
  updateTime?: string;
}

export type ReleaseCreditLedgerLoadResult =
  | ReleaseCreditLedgerLoadOk
  | { ok: false; error: string; documentPath: string };

export type ReleaseCreditLedgerStoreWriteResult =
  | ReleaseCreditLedgerStoreWriteOk
  | { ok: false; error: string; documentPath: string };

export interface ReleaseCreditLedgerStore {
  load(input: ReleaseCreditLedgerLookup): Promise<ReleaseCreditLedgerLoadResult>;
  create(input: ReleaseCreditLedgerCreateInput): Promise<ReleaseCreditLedgerStoreWriteResult>;
  save(input: {
    snapshot: ReleaseCreditLedgerSnapshot;
    expectedUpdateTime?: string;
  }): Promise<ReleaseCreditLedgerStoreWriteResult>;
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function compactLedgerPart(value: string, fallback: string): string {
  return compactReleaseCreditScopeKey(value, fallback);
}

function resolveFirebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID?.trim()
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
    || null;
}

export function buildReleaseCreditLedgerDocumentId(input: ReleaseCreditLedgerLookup): string {
  const scope = [
    compactLedgerPart(input.uid, "uid"),
    compactLedgerPart(input.periodKey, "period"),
    compactLedgerPart(input.projectId, "project"),
  ].join(":");
  return `ledger_${stableHash(scope)}`;
}

export function buildReleaseCreditLedgerDocumentPath(input: ReleaseCreditLedgerLookup): string {
  return `${RELEASE_CREDIT_LEDGER_COLLECTION}/${buildReleaseCreditLedgerDocumentId(input)}`;
}

function buildLedgerFields(snapshot: ReleaseCreditLedgerSnapshot): Record<string, FirestoreFieldValue> {
  return {
    payloadJson: { stringValue: JSON.stringify(snapshot) },
    userId: { stringValue: snapshot.userId },
    periodKey: { stringValue: snapshot.periodKey },
    projectId: { stringValue: snapshot.projectId },
    planId: { stringValue: snapshot.planId },
    updatedAt: { stringValue: snapshot.updatedAt },
  };
}

function parsePayloadJson(fields: Record<string, unknown>): ReleaseCreditLedgerSnapshot | null {
  const payloadField = fields.payloadJson as { stringValue?: string } | undefined;
  const payloadJson = payloadField?.stringValue;
  if (!payloadJson) return null;
  try {
    const parsed = JSON.parse(payloadJson) as Partial<ReleaseCreditLedgerSnapshot>;
    if (parsed.kind !== "loreguard.release-credit-ledger.v1") return null;
    const planId = normalizeLoreguardPlanId(parsed.planId);
    if (!planId) return null;
    if (typeof parsed.userId !== "string") return null;
    if (typeof parsed.periodKey !== "string") return null;
    if (typeof parsed.projectId !== "string") return null;
    if (typeof parsed.updatedAt !== "string") return null;
    if (!Array.isArray(parsed.entries)) return null;
    return {
      kind: "loreguard.release-credit-ledger.v1",
      userId: parsed.userId,
      planId,
      periodKey: parsed.periodKey,
      projectId: parsed.projectId,
      unlimited: Boolean(parsed.unlimited),
      balance: typeof parsed.balance === "number" ? parsed.balance : null,
      entries: parsed.entries,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function normalizeStoreError(error: string): string {
  if (error === "http_409" || error === "http_412") return "conflict";
  return error;
}

const firestoreReleaseCreditLedgerStore: ReleaseCreditLedgerStore = {
  async load(input) {
    const projectId = resolveFirebaseProjectId();
    const documentPath = buildReleaseCreditLedgerDocumentPath(input);
    if (!projectId) return { ok: false, error: "service_misconfigured", documentPath };
    const loaded = await firestoreGetDocumentWithMeta(projectId, documentPath, { timeoutMs: 4_000 });
    if (!loaded.ok) return { ok: false, error: loaded.error, documentPath };
    const snapshot = parsePayloadJson(loaded.fields);
    if (!snapshot) return { ok: false, error: "invalid_payload", documentPath };
    if (snapshot.userId !== input.uid || snapshot.periodKey !== input.periodKey) {
      return { ok: false, error: "scope_mismatch", documentPath };
    }
    if (snapshot.projectId !== compactLedgerPart(input.projectId, "project")) {
      return { ok: false, error: "project_mismatch", documentPath };
    }
    return { ok: true, snapshot, documentPath, updateTime: loaded.updateTime };
  },

  async create(input) {
    const projectId = resolveFirebaseProjectId();
    const documentPath = buildReleaseCreditLedgerDocumentPath(input);
    if (!projectId) return { ok: false, error: "service_misconfigured", documentPath };
    const snapshot = createReleaseCreditLedgerSnapshot({
      userId: input.uid,
      planId: input.planId,
      periodKey: input.periodKey,
      projectId: input.projectId,
      createdAt: input.createdAt,
    });
    const created = await firestoreCreateDocument(
      projectId,
      RELEASE_CREDIT_LEDGER_COLLECTION,
      buildLedgerFields(snapshot),
      { documentId: buildReleaseCreditLedgerDocumentId(input) },
    );
    if (!created.ok) return { ok: false, error: normalizeStoreError(created.error), documentPath };
    return { ok: true, documentPath };
  },

  async save(input) {
    const projectId = resolveFirebaseProjectId();
    const lookup = {
      uid: input.snapshot.userId,
      periodKey: input.snapshot.periodKey,
      projectId: input.snapshot.projectId,
    };
    const documentPath = buildReleaseCreditLedgerDocumentPath(lookup);
    if (!projectId) return { ok: false, error: "service_misconfigured", documentPath };
    const saved = await firestorePatchDocument(
      projectId,
      documentPath,
      buildLedgerFields(input.snapshot),
      {
        currentUpdateTime: input.expectedUpdateTime,
        updateMask: ["payloadJson", "userId", "periodKey", "projectId", "planId", "updatedAt"],
        timeoutMs: 4_000,
      },
    );
    if (!saved.ok) return { ok: false, error: normalizeStoreError(saved.error), documentPath };
    return { ok: true, documentPath, updateTime: saved.updateTime };
  },
};

let testStore: ReleaseCreditLedgerStore | null = null;

export function setReleaseCreditLedgerStoreForTest(store: ReleaseCreditLedgerStore | null): void {
  testStore = store;
}

export function getReleaseCreditLedgerStore(): ReleaseCreditLedgerStore {
  return testStore ?? firestoreReleaseCreditLedgerStore;
}
