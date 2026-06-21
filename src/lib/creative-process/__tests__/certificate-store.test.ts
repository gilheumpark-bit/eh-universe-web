if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

import 'fake-indexeddb/auto';
import { _resetCachedDB } from '../idb-store';
import { getLatestProcessCertificate, listProcessCertificates, saveProcessCertificate } from '../certificate-store';
import type { ProcessCertificate } from '../types';

function makeCertificate(id: string, generatedAt: string, projectId = 'project-cert-store'): ProcessCertificate {
  return {
    id,
    projectId,
    manuscriptHash: 'a'.repeat(64),
    generatedAt,
    generatedBy: 'loreguard@certificate-service',
    reportVersion: '1.1.0',
    visibility: 'publisher',
    includedSections: [],
    summaryStats: {
      totalEpisodes: 1,
      totalUnits: 1200,
      unitLabel: 'chars',
      aiAssistUsed: false,
      externalImportCount: 0,
      humanRevisionCount: 1,
      externalStatus: '확인 가능',
    },
    timelineHash: 'b'.repeat(64),
    sourceSummaryHash: 'c'.repeat(64),
    limitationTextVersion: 'test',
    verificationUrl: `https://example.test/api/cp/verify/${id}`,
    sealNumber: `LG-2606-${id.replace('cert-', '').toUpperCase()}-TEST`,
  };
}

describe('certificate-store', () => {
  beforeEach(() => {
    _resetCachedDB();
    (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  });

  it('프로젝트별 발급본을 저장하고 최신 발급본을 조회한다', async () => {
    await saveProcessCertificate(makeCertificate('cert-old', '2026-06-13T01:00:00.000Z'));
    await saveProcessCertificate(makeCertificate('cert-new', '2026-06-14T01:00:00.000Z'));
    await saveProcessCertificate(makeCertificate('cert-other', '2026-06-15T01:00:00.000Z', 'project-other'));

    const list = await listProcessCertificates({ projectId: 'project-cert-store' });
    expect(list.map((cert) => cert.id)).toEqual(['cert-new', 'cert-old']);

    const latest = await getLatestProcessCertificate('project-cert-store');
    expect(latest?.id).toBe('cert-new');
    expect(latest?.verificationUrl).toBe('https://example.test/api/cp/verify/cert-new');
    expect(latest?.sealNumber).toBe('LG-2606-NEW-TEST');
  });
});
