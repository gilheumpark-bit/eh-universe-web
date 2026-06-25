import { getStore, promisifyRequest, promisifyTransaction, STORE_CERTIFICATES } from './idb-store';
import type { ProcessCertificate } from './types';

export async function saveProcessCertificate(cert: ProcessCertificate): Promise<void> {
  const store = await getStore(STORE_CERTIFICATES, 'readwrite');
  store.put(cert);
  await promisifyTransaction(store.transaction);
}

export async function listProcessCertificates(input: {
  projectId?: string;
  limit?: number;
} = {}): Promise<ProcessCertificate[]> {
  const store = await getStore(STORE_CERTIFICATES, 'readonly');
  const rows = input.projectId
    ? await promisifyRequest<ProcessCertificate[]>(
        store.index('by_projectId').getAll(IDBKeyRange.only(input.projectId)),
      )
    : await promisifyRequest<ProcessCertificate[]>(store.getAll());

  const sorted = [...rows].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  return typeof input.limit === 'number' && input.limit > 0 ? sorted.slice(0, input.limit) : sorted;
}

export async function getLatestProcessCertificate(projectId: string): Promise<ProcessCertificate | null> {
  const [latest] = await listProcessCertificates({ projectId, limit: 1 });
  return latest ?? null;
}
