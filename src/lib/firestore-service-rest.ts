import { JWT } from "google-auth-library";
import { logger } from "@/lib/logger";

function parseServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.VERTEX_AI_CREDENTIALS?.trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!j.client_email || !j.private_key) return null;
    return { client_email: j.client_email, private_key: j.private_key };
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  const creds = parseServiceAccount();
  if (!creds) return null;
  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  const t = await client.getAccessToken();
  return typeof t === "string" ? t : t?.token ?? null;
}

/** Firestore REST v1 — list documents (GET). */
export async function firestoreListDocuments(
  projectId: string,
  collectionId: string,
  query: { pageSize?: number; orderBy?: string },
): Promise<{ ok: true; documents: unknown[] } | { ok: false; error: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "no_service_account" };

  const params = new URLSearchParams({ pageSize: String(query.pageSize ?? 10) });
  if (query.orderBy) params.set("orderBy", query.orderBy);

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}?${params}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn("firestore-service-rest/list", { status: res.status, detail: text.slice(0, 200) });
    return { ok: false, error: `http_${res.status}` };
  }
  const data = (await res.json()) as { documents?: unknown[] };
  return { ok: true, documents: data.documents ?? [] };
}

/** Firestore REST v1 — create document with auto id under collection. */
export async function firestoreCreateDocument(
  projectId: string,
  collectionId: string,
  fields: Record<string, { stringValue?: string; integerValue?: string; timestampValue?: string }>,
): Promise<{ ok: true; name?: string } | { ok: false; error: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "no_service_account" };

  const parent = `projects/${projectId}/databases/(default)/documents/${collectionId}`;
  const url = `https://firestore.googleapis.com/v1/${parent}?documentId=${encodeURIComponent(`daily_${Date.now()}`)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.warn("firestore-service-rest/create", { status: res.status, detail: text.slice(0, 200) });
    return { ok: false, error: `http_${res.status}` };
  }
  const data = (await res.json()) as { name?: string };
  return { ok: true, name: data.name };
}
