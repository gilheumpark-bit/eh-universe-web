// ============================================================
// AI Providers — Barrel Export
// ============================================================
// Re-exports all public API from sub-modules.
// Consumers continue to import from '@/lib/ai-providers' unchanged.

export {
  // Types
  type ProviderId,
  type ProviderCapabilities,
  type ProviderDef,
  type ChatMsg,
  type StreamOptions,
  // Provider data
  PROVIDERS,
  PROVIDER_LIST,
  PROVIDER_LIST_UI,
  // Helpers
  getCapabilities,
  supportsStructuredOutput,
  isPreviewModel,
  getModelWarning,
  normalizeProviderId,
} from './types';

export {
  // Crypto
  encryptKey,
  decryptKey,
  // Provider selection
  migrateProviderStorage,
  getActiveProvider,
  setActiveProvider,
  activeSupportsStructured,
  // Key management
  hasStoredApiKey,
  getApiKey,
  getApiKeyAsync,
  setApiKey,
  setApiKeyAsync,
  getKeyAge,
  isKeyExpiringSoon,
  hydrateAllApiKeys,
  // Model selection
  getActiveModel,
  getPreferredModel,
  setActiveModel,
} from './key-management';

export {
  // Streaming
  streamChat,
  testApiKey,
} from './streaming';
