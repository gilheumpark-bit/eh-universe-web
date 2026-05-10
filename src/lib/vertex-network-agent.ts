// ============================================================
// Network & Universe 통합 Agent Builder 엔진 (142만 원 크레딧 전용)
// ============================================================
// 단일 거대 데이터스토어를 사용하여 모든 유저의 데이터(행성, 포스트, 소설)를 관리하되,
// 'userId'와 'planetId' 메타데이터를 이용해 철저하게 검색 권한을 격리합니다.
// ============================================================

import { SearchServiceClient, DocumentServiceClient } from '@google-cloud/discoveryengine';
import { logger } from '@/lib/logger';
// [I-02 — 2026-05-10 — Network 마이그레이션] preamble 을 레지스트리 단일 소스로 통합.
import { buildAgentSystemPrompt } from '@/lib/ai/writing-agent-registry';

function getProjectId() { return process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'eh-universe'; }
function getLocation() { return process.env.AGENT_BUILDER_LOCATION || 'global'; }
function getEngineId() { return process.env.AGENT_BUILDER_NETWORK_ID?.trim(); }
function getDataStoreId() { return process.env.AGENT_BUILDER_NETWORK_ID?.trim(); }

type CreateDocumentRequest = Parameters<DocumentServiceClient["createDocument"]>[0];
type UpdateDocumentRequest = Parameters<DocumentServiceClient["updateDocument"]>[0];
type SearchRequest = Parameters<SearchServiceClient["search"]>[0];

export function isNetworkAgentConfigured(): boolean {
  return Boolean(getEngineId());
}

function parseCredentials() {
  const raw = process.env.VERTEX_AI_CREDENTIALS?.trim();
  if (!raw) return undefined;
  try { return JSON.parse(raw) as { client_email: string; private_key: string }; } catch { return undefined; }
}

let _searchClient: SearchServiceClient | null = null;
let _docClient: DocumentServiceClient | null = null;

function getSearch() {
  if (!_searchClient) {
    const creds = parseCredentials();
    _searchClient = new SearchServiceClient(creds ? { credentials: creds, projectId: getProjectId() } : { projectId: getProjectId() });
  }
  return _searchClient;
}

function getDocs() {
  if (!_docClient) {
    const creds = parseCredentials();
    _docClient = new DocumentServiceClient(creds ? { credentials: creds, projectId: getProjectId() } : { projectId: getProjectId() });
  }
  return _docClient;
}

// ── 1. 데이터 밀어넣기 (Ingestion) ──
// 유저가 행성을 만들거나 설정/글을 쓸 때마다 구글에 전송
export type NetworkDocumentType = 'universe' | 'translation';

export async function ingestNetworkDocument(data: {
  documentId: string; // 포스트 ID 또는 행성 ID
  title: string;
  content: string;
  userId: string;
  planetId?: string;
  isPublic?: boolean;
  /** 기본 universe. translation이면 translationProjectId 권장 */
  documentType?: NetworkDocumentType;
  translationProjectId?: string;
}) {
  const dsId = getDataStoreId();
  if (!dsId) throw new Error('Agent Builder Data Store ID not configured.');

  const client = getDocs();
  // 구글 클라우드 공식 DataStore Document 경로 (branch 0이 기본)
  const branchName = `projects/${getProjectId()}/locations/${getLocation()}/collections/default_collection/dataStores/${dsId}/branches/0`;

  // Discovery Engine의 Document 양식 (구조화 데이터)
  // Discovery Engine protobuf `structData` is `google.protobuf.Struct`; the client accepts
  // plain fields at runtime — narrow types require an assertion (see TS structData vs IStruct).
  const docType: NetworkDocumentType = data.documentType ?? 'universe';
  const structData: Record<string, string> = {
    title: data.title,
    content: data.content,
    userId: data.userId,
    planetId: data.planetId || 'global',
    isPublic: data.isPublic ? 'true' : 'false',
    documentType: docType,
  };
  if (docType === 'translation' && data.translationProjectId?.trim()) {
    structData.translationProjectId = data.translationProjectId.trim();
  }

  const document = {
    name: `${branchName}/documents/${data.documentId}`,
    id: data.documentId,
    structData,
    // protobuf Struct uses `fields`; runtime accepts plain maps — double-assert for TS.
  } as unknown as CreateDocumentRequest['document'];

  try {
    // 문서 생성 또는 덮어쓰기
    const request: CreateDocumentRequest = {
      parent: branchName,
      document,
      documentId: data.documentId,
    };
    await client.createDocument(request).catch(async (e: unknown) => {
      const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: unknown }).code : undefined;
      if (code === 6) { // ALREADY_EXISTS
        const updateReq: UpdateDocumentRequest = { document };
        await client.updateDocument(updateReq);
      } else {
        throw e;
      }
    });
    return true;
  } catch (error) {
    logger.error('vertex-network-agent/ingest', error);
    return false;
  }
}

// ── 2. 멀티 테넌트 검색 (Filtered Search RAG) ──
export async function searchNetworkAgent(
  query: string,
  filters: {
    userId?: string;  // 유저 본인의 데이터만 검색
    planetId?: string; // 특정 행성 내부 데이터만 검색
    onlyPublic?: boolean; // 다른 사람의 공개 데이터만 검색
    /** 내 데이터만 볼 때 universe / 번역 프로젝트만 / 필터 없음(전체 내 문서) */
    narrowDocumentType?: NetworkDocumentType;
    translationProjectId?: string;
  },
  pageSize = 5
) {
  const engineId = getEngineId();
  if (!engineId) throw new Error('Agent Builder Engine ID not configured.');

  const client = getSearch();
  const servingConfig = `projects/${getProjectId()}/locations/${getLocation()}/collections/default_collection/engines/${engineId}/servingConfigs/default_search`;

  // ── 마법의 '필터 문자열' 생성 (핵심) ──
  const filterParts: string[] = [];

  if (filters.onlyPublic) {
    // 집단 지성 모드: 공개된(isPublic="true") 문서 중 검색
    filterParts.push('isPublic: "true"');
  } else if (filters.userId) {
    // 유저 전용 모드: 내 데이터만 검색
    filterParts.push(`userId: "${filters.userId}"`);
  }

  if (filters.planetId) {
    // 특정 행성 내부 검색
    filterParts.push(`planetId: "${filters.planetId}"`);
  }

  if (filters.narrowDocumentType === 'translation') {
    filterParts.push('documentType: "translation"');
    if (filters.translationProjectId?.trim()) {
      filterParts.push(`translationProjectId: "${filters.translationProjectId.trim()}"`);
    }
  } else if (filters.narrowDocumentType === 'universe') {
    filterParts.push('documentType: "universe"');
  }

  const filterString = filterParts.join(' AND ');

  const requestBody: SearchRequest = {
    servingConfig,
    query,
    pageSize,
    filter: filterString, // 필터 적용! 남의 데이터 절대 안 섞임.
    contentSearchSpec: {
      summarySpec: {
        summaryResultCount: Math.min(pageSize, 5),
        includeCitations: true,
        modelPromptSpec: {
          // [I-02 — 2026-05-10] writing-agent-registry 단일 소스로 통합.
          // role + duty + archive-search-grounded(5 응답 규칙) + hse-4rights(4대 권리) 자동 조립.
          // [autoTrim — 2026-05-10] critical 시 contextBlock 절삭 (현재 contextBlocks 비어있어 무해).
          preamble: buildAgentSystemPrompt('network-agent-archive', {}, { autoTrim: true }),
        },
      },
      snippetSpec: { returnSnippet: true },
    },
  };

  const [response] = await client.search(requestBody);

  let summary = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (response && 'summary' in response) summary = (response.summary as any)?.summaryText || '';

  const results = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawResults = (response as any).results || [];
  for (const r of rawResults) {
    const doc = r.document?.structData || {};
    results.push({
      id: r.document?.id || '',
      title: doc.title || '',
      snippet: r.document?.derivedStructData?.snippets?.[0]?.snippet || '',
      userId: doc.userId,
      planetId: doc.planetId,
      documentType: doc.documentType,
      translationProjectId: doc.translationProjectId,
    });
  }

  return { summary, results, filterApplied: filterString };
}
