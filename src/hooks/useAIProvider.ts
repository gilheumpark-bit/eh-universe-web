// ============================================================
// useAIProvider — Hook bridge for ai-providers lib
// ============================================================
// Components should import from this hook instead of directly
// from '@/lib/ai-providers' to maintain the layer boundary:
//   components/ -> hooks/ -> lib/
// ============================================================

// --- Re-export types ---
export type { ProviderId, ChatMsg, StreamOptions, ProviderDef, ProviderCapabilities } from '@/lib/ai-providers';

// --- Re-export values & functions ---
export {
  // Constants
  PROVIDERS,
  PROVIDER_LIST_UI,

  // Active provider/model getters & setters
  getActiveProvider,
  setActiveProvider,
  getActiveModel,
  setActiveModel,

  // API key management
  getApiKey,
  setApiKey,
  hydrateAllApiKeys,
  testApiKey,
  getKeyAge,
  isKeyExpiringSoon,

  // Model utilities
  isPreviewModel,
  getModelWarning,

  // Capability checks
  activeSupportsStructured,

  // Streaming
  streamChat,
} from '@/lib/ai-providers';

// IDENTITY_SEAL: PART-1 | role=hook-bridge | inputs=@/lib/ai-providers | outputs=re-exports for components
