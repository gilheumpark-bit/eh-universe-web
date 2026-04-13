"use strict";
// ============================================================
// CS Quill 🦔 — Constants (Magic Number 제거)
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.IP_COPYLEFT_WEIGHT = exports.IP_WARNING_WEIGHT = exports.IP_CRITICAL_WEIGHT = exports.MAX_FILENAME_LENGTH = exports.TABLE_COLUMN_WIDTH = exports.PROGRESS_BAR_WIDTH = exports.COST_RETENTION_DAYS = exports.CACHE_TTL_MS = exports.MAX_SESSION_RECEIPTS = exports.MAX_SESSION_FILES = exports.MAX_FIX_PATTERNS = exports.WATCH_DEBOUNCE_MS = exports.SANDBOX_TIMEOUT_MS = exports.API_TIMEOUT_MS = exports.DEBOUNCE_MS = exports.MAX_REFERENCE_LENGTH = exports.MAX_PROMPT_CONTEXT = exports.MAX_CODE_SLICE = exports.TOKENS_PER_LINE = exports.MAX_CONCURRENT_WORKERS = exports.MAX_FINDINGS_DISPLAY = exports.MAX_FILES_SAMPLE = exports.NO_PROGRESS_DELTA = exports.MAX_VERIFICATION_ROUNDS_STRICT = exports.MAX_VERIFICATION_ROUNDS = exports.WARN_THRESHOLD = exports.STRICT_THRESHOLD = exports.PASS_THRESHOLD = void 0;
// ── Scoring ──
exports.PASS_THRESHOLD = 77;
exports.STRICT_THRESHOLD = 85;
exports.WARN_THRESHOLD = 60;
// ── Pipeline ──
exports.MAX_VERIFICATION_ROUNDS = 3;
exports.MAX_VERIFICATION_ROUNDS_STRICT = 5;
exports.NO_PROGRESS_DELTA = 2;
// ── Limits ──
exports.MAX_FILES_SAMPLE = 30;
exports.MAX_FINDINGS_DISPLAY = 50;
exports.MAX_CONCURRENT_WORKERS = 8;
// ── Cost ──
exports.TOKENS_PER_LINE = 15;
exports.MAX_CODE_SLICE = 6000;
exports.MAX_PROMPT_CONTEXT = 4000;
exports.MAX_REFERENCE_LENGTH = 1500;
// ── Time ──
exports.DEBOUNCE_MS = 500;
exports.API_TIMEOUT_MS = 30000;
exports.SANDBOX_TIMEOUT_MS = 5000;
exports.WATCH_DEBOUNCE_MS = 500;
// ── Storage ──
exports.MAX_FIX_PATTERNS = 500;
exports.MAX_SESSION_FILES = 20;
exports.MAX_SESSION_RECEIPTS = 50;
exports.CACHE_TTL_MS = 24 * 60 * 60 * 1000;
exports.COST_RETENTION_DAYS = 30;
// ── UI ──
exports.PROGRESS_BAR_WIDTH = 20;
exports.TABLE_COLUMN_WIDTH = 14;
exports.MAX_FILENAME_LENGTH = 40;
// ── Scoring Weights ──
exports.IP_CRITICAL_WEIGHT = 25;
exports.IP_WARNING_WEIGHT = 10;
exports.IP_COPYLEFT_WEIGHT = 15;
// IDENTITY_SEAL: role=constants | inputs=none | outputs=all-constants
