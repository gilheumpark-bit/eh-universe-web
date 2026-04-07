// ============================================================
// StudioError — Typed error class for consistent error handling
// ============================================================

import { StudioErrorCode, ERROR_META } from './error-codes';

export class StudioError extends Error {
  readonly code: StudioErrorCode;
  readonly retryable: boolean;
  readonly httpStatus?: number;
  readonly provider?: string;

  constructor(
    code: StudioErrorCode,
    message: string,
    opts?: {
      httpStatus?: number;
      provider?: string;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'StudioError';
    this.code = code;
    this.retryable = ERROR_META[code]?.retryable ?? false;
    this.httpStatus = opts?.httpStatus ?? ERROR_META[code]?.httpStatus;
    this.provider = opts?.provider;
    if (opts?.cause) this.cause = opts.cause;
  }
}

/** Classify a raw error into StudioError */
export function classifyAsStudioError(err: unknown, provider?: string): StudioError {
  if (err instanceof StudioError) return err;

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // API Key
  if (/api.?key|not configured|unauthorized/i.test(msg)) {
    return new StudioError(StudioErrorCode.KEY_MISSING, msg, { provider });
  }
  if (/401|invalid.*key|forbidden/i.test(msg)) {
    return new StudioError(StudioErrorCode.KEY_INVALID, msg, { httpStatus: 401, provider });
  }

  // Rate Limit
  if (/429|rate.?limit|too many/i.test(msg)) {
    return new StudioError(StudioErrorCode.RATE_LIMIT, msg, { httpStatus: 429, provider });
  }
  if (/free.?tier|limit.?reached/i.test(msg)) {
    return new StudioError(StudioErrorCode.FREE_TIER_LIMIT, msg, { provider });
  }

  // Network
  if (/fetch|network|offline|err_internet/i.test(lower)) {
    return new StudioError(StudioErrorCode.NETWORK_OFFLINE, msg);
  }
  if (/timeout|deadline|timed?.?out/i.test(lower)) {
    return new StudioError(StudioErrorCode.NETWORK_TIMEOUT, msg, { provider });
  }

  // Server
  if (/500|502|503|504|internal/i.test(msg)) {
    return new StudioError(StudioErrorCode.SERVER_ERROR, msg, { provider });
  }

  // Size
  if (/413|too large|request.?size/i.test(msg)) {
    return new StudioError(StudioErrorCode.CONTENT_TOO_LARGE, msg, { httpStatus: 413 });
  }

  // Parse
  if (/json|parse|syntax/i.test(lower)) {
    return new StudioError(StudioErrorCode.PARSE_FAILED, msg);
  }

  // Storage
  if (/storage|quota|localstorage/i.test(lower)) {
    return new StudioError(StudioErrorCode.STORAGE_FULL, msg);
  }

  return new StudioError(StudioErrorCode.UNKNOWN, msg, { provider, cause: err });
}
