// ============================================================
// Studio Error Code System
// ============================================================

export enum StudioErrorCode {
  // API Key
  KEY_MISSING = 'key_missing',
  KEY_INVALID = 'key_invalid',
  KEY_EXPIRED = 'key_expired',

  // Model / Provider
  MODEL_UNAVAILABLE = 'model_unavailable',
  PROVIDER_ERROR = 'provider_error',
  PROVIDER_FALLBACK = 'provider_fallback',

  // Rate Limit
  RATE_LIMIT = 'rate_limit',
  FREE_TIER_LIMIT = 'free_tier_limit',

  // Schema / Parse
  SCHEMA_INVALID = 'schema_invalid',
  PARSE_FAILED = 'parse_failed',

  // Network
  NETWORK_OFFLINE = 'network_offline',
  NETWORK_TIMEOUT = 'network_timeout',
  SERVER_ERROR = 'server_error',

  // Storage
  STORAGE_FULL = 'storage_full',
  SYNC_FAILED = 'sync_failed',

  // Content
  CONTENT_EMPTY = 'content_empty',
  CONTENT_TOO_LARGE = 'content_too_large',

  // Unknown
  UNKNOWN = 'unknown',
}

export interface ErrorMeta {
  retryable: boolean;
  httpStatus?: number;
}

export const ERROR_META: Record<StudioErrorCode, ErrorMeta> = {
  [StudioErrorCode.KEY_MISSING]:       { retryable: false },
  [StudioErrorCode.KEY_INVALID]:       { retryable: false, httpStatus: 401 },
  [StudioErrorCode.KEY_EXPIRED]:       { retryable: false, httpStatus: 401 },
  [StudioErrorCode.MODEL_UNAVAILABLE]: { retryable: false, httpStatus: 400 },
  [StudioErrorCode.PROVIDER_ERROR]:    { retryable: true,  httpStatus: 502 },
  [StudioErrorCode.PROVIDER_FALLBACK]: { retryable: true },
  [StudioErrorCode.RATE_LIMIT]:        { retryable: true,  httpStatus: 429 },
  [StudioErrorCode.FREE_TIER_LIMIT]:   { retryable: false },
  [StudioErrorCode.SCHEMA_INVALID]:    { retryable: false, httpStatus: 400 },
  [StudioErrorCode.PARSE_FAILED]:      { retryable: false },
  [StudioErrorCode.NETWORK_OFFLINE]:   { retryable: true },
  [StudioErrorCode.NETWORK_TIMEOUT]:   { retryable: true },
  [StudioErrorCode.SERVER_ERROR]:      { retryable: true,  httpStatus: 500 },
  [StudioErrorCode.STORAGE_FULL]:      { retryable: false },
  [StudioErrorCode.SYNC_FAILED]:       { retryable: true },
  [StudioErrorCode.CONTENT_EMPTY]:     { retryable: false, httpStatus: 400 },
  [StudioErrorCode.CONTENT_TOO_LARGE]: { retryable: false, httpStatus: 413 },
  [StudioErrorCode.UNKNOWN]:           { retryable: false },
};
