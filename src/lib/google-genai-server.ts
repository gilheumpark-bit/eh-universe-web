import { GoogleGenAI, type GoogleGenAIOptions } from '@google/genai';

type ServiceAccountCredentials = {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  token_uri?: string;
};

const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const GEMINI_ALLOCATION_ERROR_PATTERN = /(?:429|resource[_\s-]?exhausted|quota|rate.?limit|too many requests|usage limit)/i;

export function isVertexAiEnabled(): boolean {
  return process.env.USE_VERTEX_AI === 'true';
}

export function getVertexProjectId(): string | undefined {
  return process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
}

export function getVertexLocation(): string {
  return process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
}

function parseVertexCredentials(): ServiceAccountCredentials | undefined {
  const raw = process.env.VERTEX_AI_CREDENTIALS?.trim();
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as ServiceAccountCredentials;
  } catch {
    throw new Error('Invalid VERTEX_AI_CREDENTIALS JSON');
  }
}

export function hasVertexAiServerCredentials(): boolean {
  const project = getVertexProjectId();
  return Boolean(
    isVertexAiEnabled()
    && project
    && (
      process.env.VERTEX_AI_CREDENTIALS?.trim()
      || process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
    ),
  );
}

export function hasGeminiServerCredentials(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim() || hasVertexAiServerCredentials());
}

export function normalizeUserApiKey(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isGeminiAllocationExhaustedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return GEMINI_ALLOCATION_ERROR_PATTERN.test(message);
}

export type GeminiExecutionMode = 'hosted' | 'byok';

export async function executeGeminiHostedFirst<T>(
  clientApiKey: unknown,
  operation: (apiKey: string, mode: GeminiExecutionMode) => Promise<T>,
): Promise<{ result: T; mode: GeminiExecutionMode }> {
  const userApiKey = normalizeUserApiKey(clientApiKey);
  const hostedEnabled = hasGeminiServerCredentials();

  if (!hostedEnabled && !userApiKey) {
    throw new Error('Gemini server credentials are not configured');
  }

  if (!hostedEnabled) {
    return { result: await operation(userApiKey, 'byok'), mode: 'byok' };
  }

  try {
    return { result: await operation('', 'hosted'), mode: 'hosted' };
  } catch (error) {
    if (userApiKey && isGeminiAllocationExhaustedError(error)) {
      return { result: await operation(userApiKey, 'byok'), mode: 'byok' };
    }
    throw error;
  }
}

export function createServerGeminiClient(apiKey?: string): GoogleGenAI {
  const explicitApiKey = apiKey?.trim();
  if (explicitApiKey) {
    return new GoogleGenAI({ apiKey: explicitApiKey });
  }

  if (hasVertexAiServerCredentials()) {
    const project = getVertexProjectId();
    const credentials = parseVertexCredentials();
    const options: GoogleGenAIOptions = {
      vertexai: true,
      project,
      location: getVertexLocation(),
      apiVersion: 'v1',
    };

    if (credentials) {
      options.googleAuthOptions = {
        credentials,
        projectId: credentials.project_id || project,
        scopes: [CLOUD_PLATFORM_SCOPE],
      };
    }

    return new GoogleGenAI(options);
  }

  const envApiKey = process.env.GEMINI_API_KEY?.trim();
  if (envApiKey) {
    return new GoogleGenAI({ apiKey: envApiKey });
  }

  throw new Error('Gemini server credentials are not configured');
}
