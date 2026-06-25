import { JWT } from "google-auth-library";
import { logger } from "@/lib/logger";

export type FirestoreFieldValue =
  | { stringValue: string }
  | { integerValue: string }
  | { timestampValue: string }
  | { booleanValue: boolean }
  | { nullValue: "NULL_VALUE" }
  | { mapValue: { fields?: Record<string, FirestoreFieldValue> } }
  | { arrayValue: { values?: FirestoreFieldValue[] } };

export interface FirestoreDocumentWithMeta {
  fields: Record<string, unknown>;
  name?: string;
  createTime?: string;
  updateTime?: string;
}

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

/**
 * Firestore REST v1 — get a single document by path (GET).
 *
 * fail-safe: service account 미설정 → no_service_account, 404 → not_found,
 * 기타 HTTP/네트워크 오류 → http_xxx / fetch_failed. throw 없음.
 * 호출자(예: stripeRole desync grace 읽기)는 실패를 침묵 폴백 신호로 사용한다.
 */
export async function firestoreGetDocumentWithMeta(
  projectId: string,
  documentPath: string,
  options?: { timeoutMs?: number },
): Promise<{ ok: true } & FirestoreDocumentWithMeta | { ok: false; error: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "no_service_account" };

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(options?.timeoutMs ?? 4_000),
    });
    if (res.status === 404) return { ok: false, error: "not_found" };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("firestore-service-rest/get", { status: res.status, detail: text.slice(0, 200) });
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as FirestoreDocumentWithMeta;
    return {
      ok: true,
      name: data.name,
      fields: data.fields ?? {},
      createTime: data.createTime,
      updateTime: data.updateTime,
    };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? "";
    const error = name === "AbortError" || name === "TimeoutError" ? "timeout" : "fetch_failed";
    logger.warn("firestore-service-rest/get", { err: name || String(err), error });
    return { ok: false, error };
  }
}

export async function firestoreGetDocument(
  projectId: string,
  documentPath: string,
  options?: { timeoutMs?: number },
): Promise<{ ok: true; fields: Record<string, unknown> } | { ok: false; error: string }> {
  const doc = await firestoreGetDocumentWithMeta(projectId, documentPath, options);
  if (!doc.ok) return doc;
  return { ok: true, fields: doc.fields };
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
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("firestore-service-rest/list", { status: res.status, detail: text.slice(0, 200) });
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as { documents?: unknown[] };
    return { ok: true, documents: data.documents ?? [] };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? "";
    const error = name === "AbortError" || name === "TimeoutError" ? "timeout" : "fetch_failed";
    logger.warn("firestore-service-rest/list", { err: name || String(err), error });
    return { ok: false, error };
  }
}

/**
 * Firestore REST v1 — create document under collection.
 *
 * @param options.documentId 명시적 문서 ID (write-once 레지스트리 등 path 고정 필요 시).
 *   생략 시 기존 동작 유지 (`daily_${Date.now()}` — 기존 호출처 무변경).
 *   이미 존재하는 ID 로 create 시 Firestore 가 409 ALREADY_EXISTS → `http_409` 반환
 *   (호출자가 중복 등록으로 매핑 가능).
 */
export async function firestoreCreateDocument(
  projectId: string,
  collectionId: string,
  fields: Record<string, FirestoreFieldValue>,
  options?: { documentId?: string },
): Promise<{ ok: true; name?: string } | { ok: false; error: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "no_service_account" };

  const docId = options?.documentId ?? `daily_${Date.now()}`;
  const parent = `projects/${projectId}/databases/(default)/documents/${collectionId}`;
  const url = `https://firestore.googleapis.com/v1/${parent}?documentId=${encodeURIComponent(docId)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("firestore-service-rest/create", { status: res.status, detail: text.slice(0, 200) });
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as { name?: string };
    return { ok: true, name: data.name };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? "";
    const error = name === "AbortError" || name === "TimeoutError" ? "timeout" : "fetch_failed";
    logger.warn("firestore-service-rest/create", { err: name || String(err), error });
    return { ok: false, error };
  }
}

/**
 * Firestore REST v1 — patch a document with an optional updateTime precondition.
 *
 * `currentUpdateTime`을 넘기면 같은 원장을 동시에 읽은 두 요청 중 늦게 온 저장은
 * precondition 실패로 막힌다. 출고 크레딧 같은 차감형 데이터의 lost update 방지용.
 */
export async function firestorePatchDocument(
  projectId: string,
  documentPath: string,
  fields: Record<string, FirestoreFieldValue>,
  options?: {
    currentUpdateTime?: string;
    updateMask?: string[];
    timeoutMs?: number;
  },
): Promise<{ ok: true; name?: string; updateTime?: string } | { ok: false; error: string }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "no_service_account" };

  const params = new URLSearchParams();
  for (const fieldPath of options?.updateMask ?? Object.keys(fields)) {
    params.append("updateMask.fieldPaths", fieldPath);
  }
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${documentPath}?${params}`;
  const currentDocument = options?.currentUpdateTime
    ? { updateTime: options.currentUpdateTime }
    : { exists: true };

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(options?.timeoutMs ?? 4_000),
      body: JSON.stringify({ fields, currentDocument }),
    });
    if (res.status === 404) return { ok: false, error: "not_found" };
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("firestore-service-rest/patch", { status: res.status, detail: text.slice(0, 200) });
      return { ok: false, error: `http_${res.status}` };
    }
    const data = (await res.json()) as { name?: string; updateTime?: string };
    return { ok: true, name: data.name, updateTime: data.updateTime };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? "";
    const error = name === "AbortError" || name === "TimeoutError" ? "timeout" : "fetch_failed";
    logger.warn("firestore-service-rest/patch", { err: name || String(err), error });
    return { ok: false, error };
  }
}
