import {
  firestoreCreateDocument,
  firestoreGetDocument,
  firestorePatchDocument,
  type FirestoreFieldValue,
} from "@/lib/firestore-service-rest";
import {
  normalizeLoreguardPlanId,
  type LoreguardPlanId,
} from "@/lib/billing/loreguard-plans";

export const SUBSCRIPTION_ENTITLEMENT_COLLECTION = "subscriptions";

export type SubscriptionEntitlementStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "unknown";

export interface SubscriptionEntitlementSnapshot {
  uid: string;
  planId: LoreguardPlanId;
  status: SubscriptionEntitlementStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  sourceEventId: string | null;
  updatedAt: string;
}

export interface SubscriptionEntitlementStore {
  load(uid: string): Promise<
    | { ok: true; snapshot: SubscriptionEntitlementSnapshot }
    | { ok: false; error: string }
  >;
  upsert(snapshot: SubscriptionEntitlementSnapshot): Promise<
    | { ok: true }
    | { ok: false; error: string }
  >;
}

function resolveFirebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID?.trim()
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
    || null;
}

function docPath(uid: string): string {
  return `${SUBSCRIPTION_ENTITLEMENT_COLLECTION}/${encodeURIComponent(uid)}`;
}

function fieldString(fields: Record<string, unknown>, key: string): string {
  const field = fields[key] as { stringValue?: string } | undefined;
  return field?.stringValue ?? "";
}

function buildFields(snapshot: SubscriptionEntitlementSnapshot): Record<string, FirestoreFieldValue> {
  return {
    uid: { stringValue: snapshot.uid },
    planId: { stringValue: snapshot.planId },
    status: { stringValue: snapshot.status },
    stripeCustomerId: snapshot.stripeCustomerId ? { stringValue: snapshot.stripeCustomerId } : { nullValue: "NULL_VALUE" },
    stripeSubscriptionId: snapshot.stripeSubscriptionId ? { stringValue: snapshot.stripeSubscriptionId } : { nullValue: "NULL_VALUE" },
    sourceEventId: snapshot.sourceEventId ? { stringValue: snapshot.sourceEventId } : { nullValue: "NULL_VALUE" },
    updatedAt: { stringValue: snapshot.updatedAt },
  };
}

function parseSnapshot(uid: string, fields: Record<string, unknown>): SubscriptionEntitlementSnapshot | null {
  const planId = normalizeLoreguardPlanId(fieldString(fields, "planId"));
  if (!planId) return null;
  const status = normalizeStripeSubscriptionStatus(fieldString(fields, "status"));
  return {
    uid,
    planId,
    status,
    stripeCustomerId: fieldString(fields, "stripeCustomerId") || null,
    stripeSubscriptionId: fieldString(fields, "stripeSubscriptionId") || null,
    sourceEventId: fieldString(fields, "sourceEventId") || null,
    updatedAt: fieldString(fields, "updatedAt") || new Date(0).toISOString(),
  };
}

export function normalizeStripeSubscriptionStatus(value: unknown): SubscriptionEntitlementStatus {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (normalized === "paid") return "active";
  if (normalized === "active") return "active";
  if (normalized === "trialing") return "trialing";
  if (normalized === "past_due") return "past_due";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  if (normalized === "incomplete") return "incomplete";
  if (normalized === "unpaid") return "unpaid";
  return "unknown";
}

export function isPaidSubscriptionStatus(status: SubscriptionEntitlementStatus): boolean {
  return status === "active" || status === "trialing";
}

export function resolvePlanIdFromStripeMetadata(metadata: unknown): LoreguardPlanId | null {
  const record = metadata && typeof metadata === "object"
    ? metadata as Record<string, unknown>
    : {};
  const direct = normalizeLoreguardPlanId(record.loreguardPlanId);
  if (direct) return direct;
  return normalizeLoreguardPlanId(record.planId);
}

const firestoreSubscriptionEntitlementStore: SubscriptionEntitlementStore = {
  async load(uid) {
    const projectId = resolveFirebaseProjectId();
    if (!projectId) return { ok: false, error: "service_misconfigured" };
    const loaded = await firestoreGetDocument(projectId, docPath(uid), { timeoutMs: 4_000 });
    if (!loaded.ok) return { ok: false, error: loaded.error };
    const snapshot = parseSnapshot(uid, loaded.fields);
    if (!snapshot) return { ok: false, error: "invalid_payload" };
    return { ok: true, snapshot };
  },

  async upsert(snapshot) {
    const projectId = resolveFirebaseProjectId();
    if (!projectId) return { ok: false, error: "service_misconfigured" };
    const fields = buildFields(snapshot);
    const created = await firestoreCreateDocument(
      projectId,
      SUBSCRIPTION_ENTITLEMENT_COLLECTION,
      fields,
      { documentId: snapshot.uid },
    );
    if (created.ok) return { ok: true };
    if (created.error !== "http_409") return { ok: false, error: created.error };
    const patched = await firestorePatchDocument(
      projectId,
      docPath(snapshot.uid),
      fields,
      { updateMask: Object.keys(fields), timeoutMs: 4_000 },
    );
    return patched.ok ? { ok: true } : { ok: false, error: patched.error };
  },
};

let testStore: SubscriptionEntitlementStore | null = null;

export function setSubscriptionEntitlementStoreForTest(store: SubscriptionEntitlementStore | null): void {
  testStore = store;
}

export function getSubscriptionEntitlementStore(): SubscriptionEntitlementStore {
  return testStore ?? firestoreSubscriptionEntitlementStore;
}
