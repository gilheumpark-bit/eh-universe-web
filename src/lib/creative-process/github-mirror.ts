// ============================================================
// GitHub Mirror — 확인서/이벤트 GitHub 미러 (D2-github-mirror)
// ============================================================
//
// 재사용 (신규 구현 최소화):
//   - putFile/getFile        → @/lib/github-sync (Octokit CRUD)
//   - 30s 디바운스 패턴       → useGitHubAutoSync.ts PART 4 차용
//   - 재시도 의미론           → github-cache.ts PART 4 차용 (429/503 + backoff cap 8s)
//
// 옵트인 게이트 (전부 충족 시에만 네트워크 호출):
//   ① localStorage 'noa-github-config' meta 유효 (owner/repo —
//      D1-pat-security 이후 token 필드는 직렬화 자체가 없음·옵트인 신호 아님)
//   ② feature flag GITHUB_SYNC 활성
//   ③ github-token-vault 복호화 토큰 확보 (legacy 평문 잔존 시 fallback)
//
// 경로 레이아웃 (append-only):
//   cp-events/{projectId}/{stage}/{eventId}.json   — per-event 1파일·불변
//   cp-certs/{certId}.json                          — 확인서 1장 1파일
//
// 운영 신뢰성:
//   - 모든 GitHub 호출 단일 큐 직렬화 (rate limit — 병렬 0)
//   - flush 당 배치 상한 (MAX_EVENTS_PER_FLUSH) — 대량 초기 미러도 분할
//   - 실패 비침묵 — noa:alert 1회/60s throttle (스팸 차단·침묵 차단 둘 다)
//
// 보안:
//   - token 은 github-token-vault (AES-GCM) 복호화로 주입해 Octokit 헤더로만 전달.
//     미러 파일 내용·commit message·alert 메시지 어디에도 기록하지 않음.
//
// 정직 표기 (확인서/verify 표면 의무 문구):
//   작성자가 직접 썼는지 자체는 증명 불가 — 앵커 시점 이후 무변조·존재만 증명.
// ============================================================

import type { GitHubSyncConfig } from '@/lib/github-sync';
import { getFile, putFile } from '@/lib/github-sync';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { loadToken } from '@/lib/github-token-vault';
import type { CreativeEvent, ProcessCertificate } from './types';
import { listCreativeEvents } from './event-recorder';

// ============================================================
// PART 1 — 상수 & 옵트인 게이트
// ============================================================

/** useGitHubSync.ts STORAGE_KEY_CONFIG 와 동일 키 (hook 은 "use client" + react 의존 — import 불가, 리터럴 동기화) */
const STORAGE_KEY_CONFIG = 'noa-github-config';
/** projectId → 마지막 미러 완료 eventId (ULID watermark) */
const STORAGE_KEY_MIRROR_STATE = 'noa-cp-mirror-state';

export const CP_EVENTS_ROOT = 'cp-events';
export const CP_CERTS_ROOT = 'cp-certs';

/** useGitHubAutoSync DEFAULT_DEBOUNCE_MS 와 동일 — GitHub rate limit 5000/h 여유 */
export const CP_MIRROR_DEBOUNCE_MS = 30_000;
/** flush 1회 당 이벤트 상한 — 초기 대량 미러 시 rate limit 보호 (잔여분 다음 주기) */
const MAX_EVENTS_PER_FLUSH = 20;

/**
 * 정직 표기 의무 문구 — 미러 파일·발급 UI 표면 공통.
 * GitHub commit 은 "앵커 시점 이후 무변조·그 시점에 존재했음"만 증명한다.
 */
export const ANCHOR_HONESTY_NOTICE = {
  ko: '작성자가 직접 썼는지 자체는 증명 불가 — 앵커 시점 이후 무변조·존재만 증명',
  en: 'Direct authorship itself cannot be proven — this anchor only proves existence at, and integrity since, the anchored time',
} as const;

/**
 * 옵트인 설정 로드 + 정식 게이트.
 * GITHUB_SYNC 플래그 OFF / meta(owner·repo) 미존재·불완전 / 토큰 미확보 →
 * null (네트워크 호출 0).
 *
 * [D1-pat-security 회귀 수정] noa-github-config 에는 메타(owner/repo/branch)만
 * 직렬화된다 (useGitHubSync StoredConfigMeta — token 필드 구조적 제거).
 * 따라서 옵트인 신호 = owner/repo 존재 + GITHUB_SYNC 플래그이며, 토큰은
 * github-token-vault loadToken() (AES-GCM 복호화)으로 주입한다.
 * (기존 parsed.token 게이트는 production 에서 영구 false → 미러 사일런트 중단 회귀.)
 * 구버전 평문 token 필드가 아직 잔존하면 (useGitHubSync 마이그레이션이 돌기 전
 * 창구) fallback 으로 사용 — 마이그레이션 시점까지 미러가 멈추지 않게 한다.
 */
async function getMirrorConfig(): Promise<GitHubSyncConfig | null> {
  if (typeof window === 'undefined') return null;
  if (!isFeatureEnabled('GITHUB_SYNC')) return null;

  let parsed: Partial<GitHubSyncConfig>;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return null;
    parsed = JSON.parse(raw) as Partial<GitHubSyncConfig>;
  } catch {
    return null; // parse 실패 / storage 차단 — 옵트인 아님으로 간주
  }
  if (typeof parsed.owner !== 'string' || parsed.owner.length === 0) return null;
  if (typeof parsed.repo !== 'string' || parsed.repo.length === 0) return null;

  // vault 우선 (storeToken 이 매 저장마다 갱신) → 없으면 legacy 평문 잔존분
  const vaultToken = await loadToken();
  const legacyToken =
    typeof parsed.token === 'string' && parsed.token.length > 0 ? parsed.token : null;
  const token = vaultToken ?? legacyToken;
  if (!token) return null; // 토큰 없으면 인증 불능 — 게이트 닫힘 (네트워크 0)

  return {
    token,
    owner: parsed.owner,
    repo: parsed.repo,
    ...(typeof parsed.branch === 'string' && parsed.branch ? { branch: parsed.branch } : {}),
  };
}

/** 미러 활성 여부 (호출부 사전 게이트용 — 내부 함수들도 재검증). vault 복호화 포함 — async. */
export async function isCpMirrorEnabled(): Promise<boolean> {
  return (await getMirrorConfig()) !== null;
}

/** GitHub path segment 안전화 (projectId 등 외부 유래 문자열) */
function sanitizeSegment(seg: string): string {
  const out = seg.replace(/[^A-Za-z0-9._-]/g, '_');
  return out.length > 0 ? out : '_';
}

// ============================================================
// PART 2 — 실패 비침묵 (noa:alert 1회/60s)
// ============================================================

const ALERT_THROTTLE_MS = 60_000;
let _lastAlertAt = 0;

function alertMirrorFailure(scope: string, err: unknown): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - _lastAlertAt < ALERT_THROTTLE_MS) return;
  _lastAlertAt = now;
  // [보안] token·config 는 메시지에 절대 포함하지 않음 — err.message 만 (Octokit 은 auth 헤더 비노출)
  const msg = err instanceof Error ? err.message : String(err);
  try {
    window.dispatchEvent(
      new CustomEvent('noa:alert', {
        detail: {
          variant: 'warning',
          title: 'GitHub 미러 실패',
          message: `${scope}: ${msg.slice(0, 160)} — 로컬 기록은 보존됨, 다음 주기 재시도`,
        },
      }),
    );
  } catch { /* noop */ }
}

// ============================================================
// PART 3 — 재시도 (github-cache.ts PART 4 의미론 차용 — Octokit 호출용)
// ============================================================
//
// cachedFetch 의 fetchWithRetry 는 fetch(url) 전용 내부 함수 — Octokit promise 에
// 동일 의미론 (MAX 3·429/503·network error·exp backoff cap 8s + jitter) 재적용.

const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 503]);

function getErrStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    return typeof s === 'number' ? s : undefined;
  }
  return undefined;
}

function calculateBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 500;
}

async function withRetry<T>(task: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await task();
    } catch (err) {
      lastErr = err;
      const status = getErrStatus(err);
      // status undefined = network-level 오류 (github-cache 와 동일하게 재시도 대상)
      const retryable = status === undefined || RETRYABLE_STATUS.has(status);
      if (!retryable || attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, calculateBackoff(attempt)));
    }
  }
  throw lastErr;
}

// ============================================================
// PART 4 — 직렬화 큐 (rate limit — 모든 GitHub 쓰기 순차)
// ============================================================
//
// event-recorder.ts enqueuePerProject 패턴 — 단, 미러는 repo 가 1개이므로 전역 1큐.

let _queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = _queue.catch(() => undefined).then(task);
  _queue = next;
  return next;
}

// ============================================================
// PART 5 — watermark (append-only 진행 상태)
// ============================================================
//
// projectId → 마지막 미러 완료 eventId. ULID lexicographic = 시간순이므로
// "id > watermark" 만 잔여분. 이벤트 불변 (append-only) — 재미러 불필요.

type MirrorState = Record<string, string>;

function loadMirrorState(): MirrorState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MIRROR_STATE);
    return raw ? (JSON.parse(raw) as MirrorState) : {};
  } catch {
    return {};
  }
}

function saveWatermark(projectId: string, eventId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const state = loadMirrorState();
    state[projectId] = eventId;
    localStorage.setItem(STORAGE_KEY_MIRROR_STATE, JSON.stringify(state));
  } catch { /* quota / private — 다음 flush 에서 422-존재확인 경로로 수렴 */ }
}

// ============================================================
// PART 6 — 미러 파일 envelope (외부 검증자용 스키마)
// ============================================================

export interface MirroredEventFile {
  schema: 'cp-mirror/event@1';
  mirroredAt: string;
  /** 정직 표기 — 앵커 한계 명시 */
  notice: typeof ANCHOR_HONESTY_NOTICE;
  /** 원본 이벤트 그대로 (eventHash 재계산 검증 가능) */
  event: CreativeEvent;
}

export interface MirroredCertFile {
  schema: 'cp-mirror/cert@1';
  mirroredAt: string;
  notice: typeof ANCHOR_HONESTY_NOTICE;
  /**
   * 발급 확인서 그대로. 단 githubCommitSha 필드는 본 파일에 없음 —
   * 이 커밋이 파일 생성 자체이므로 자기 참조 불가 (커밋 후 로컬 cert 에만 보존).
   */
  certificate: ProcessCertificate;
}

function buildEventPath(event: CreativeEvent): string {
  const stage = sanitizeSegment(event.stage ?? 'unstaged');
  return `${CP_EVENTS_ROOT}/${sanitizeSegment(event.projectId)}/${stage}/${sanitizeSegment(event.id)}.json`;
}

// ============================================================
// PART 7 — mirrorEvents (per-event append-only 배치 flush)
// ============================================================

export interface MirrorEventsResult {
  /** 이번 flush 에서 신규 커밋된 이벤트 수 */
  pushed: number;
  /** 원격에 이미 존재 (422 → getFile 확인) — watermark 만 전진 */
  skipped: number;
  /** 배치 상한 초과 또는 실패로 다음 주기로 넘긴 잔여 수 */
  remaining: number;
}

/**
 * 체인 append 잔여분을 GitHub 에 per-event 파일로 미러 (즉시 flush).
 * 게이트 미충족 시 null (네트워크 호출 0). 스케줄링은 scheduleEventMirror 사용.
 *
 * [G] 순차 await — rate limit 안정성 (useGitHubAutoSync pushManuscripts 와 동일 방침)
 * [C] 한 이벤트 실패 → 그 지점에서 중단 (watermark 는 성공분까지만 전진 — 누락 0 보장)
 */
export async function mirrorEvents(projectId: string): Promise<MirrorEventsResult | null> {
  const config = await getMirrorConfig();
  if (!config) return null;

  return enqueue(async (): Promise<MirrorEventsResult> => {
    const all = await listCreativeEvents({ projectId });
    // ULID 정렬 = 체인 append 순서 (event-recorder PART 1 monotonic)
    const sorted = [...all].sort((a, b) => a.id.localeCompare(b.id));
    const watermark = loadMirrorState()[projectId];
    const pending = watermark ? sorted.filter((e) => e.id > watermark) : sorted;
    const batch = pending.slice(0, MAX_EVENTS_PER_FLUSH);

    let pushed = 0;
    let skipped = 0;

    for (const event of batch) {
      const path = buildEventPath(event);
      const file: MirroredEventFile = {
        schema: 'cp-mirror/event@1',
        mirroredAt: new Date().toISOString(),
        notice: ANCHOR_HONESTY_NOTICE,
        event,
      };
      try {
        // append-only: sha 없이 create — 이미 존재하면 GitHub 가 409/422 반환
        await withRetry(() =>
          putFile(config, path, JSON.stringify(file, null, 2), undefined, `[cp-mirror] event ${event.id}`),
        );
        pushed++;
        saveWatermark(projectId, event.id);
      } catch (err) {
        const status = getErrStatus(err);
        if (status === 409 || status === 422) {
          // 이미 미러됨 (watermark 유실·이전 세션 등) — 존재 확인 후 전진
          const existing = await getFile(config, path).catch(() => null);
          if (existing) {
            skipped++;
            saveWatermark(projectId, event.id);
            continue;
          }
        }
        // 실패 비침묵 (1회/60s) + 중단 — 성공분까지 watermark 보존, 잔여는 다음 주기
        alertMirrorFailure(`이벤트 미러 (${event.id})`, err);
        return { pushed, skipped, remaining: pending.length - pushed - skipped };
      }
    }

    const remaining = pending.length - batch.length;
    if (remaining > 0) scheduleEventMirror(projectId); // 잔여분 다음 디바운스 주기
    return { pushed, skipped, remaining };
  });
}

// ============================================================
// PART 8 — scheduleEventMirror (30s 디바운스 — useGitHubAutoSync PART 4 패턴)
// ============================================================

const _timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * 체인 append 시 호출 — 마지막 호출 후 debounceMs 뒤 1회 flush.
 * 연속 집필 중 매 이벤트가 커밋 1개씩 만드는 것 방지 (배치).
 */
export function scheduleEventMirror(projectId: string, debounceMs: number = CP_MIRROR_DEBOUNCE_MS): void {
  if (typeof window === 'undefined') return;
  const existing = _timers.get(projectId);
  if (existing) clearTimeout(existing);
  _timers.set(
    projectId,
    setTimeout(() => {
      _timers.delete(projectId);
      void mirrorEvents(projectId).catch((err) => alertMirrorFailure('이벤트 미러 flush', err));
    }, debounceMs),
  );
}

// ============================================================
// PART 9 — mirrorCertificate (발급 시 1회 — commitSha 반환·cert 에 보존)
// ============================================================

/**
 * 확인서 1장을 cp-certs/{certId}.json 으로 미러.
 *
 * 성공 시 GitHub commit SHA 를 반환하고, 전달받은 cert 객체에
 * additive 필드 githubCommitSha 로 보존한다 (스펙 D2-b — 외부 타임스탬프 앵커).
 *
 * @returns 게이트 미충족 또는 실패(이미 noa:alert 표면화) 시 null.
 */
export async function mirrorCertificate(
  cert: ProcessCertificate,
): Promise<{ commitSha: string | null } | null> {
  const config = await getMirrorConfig();
  if (!config) return null;

  const path = `${CP_CERTS_ROOT}/${sanitizeSegment(cert.id)}.json`;
  const file: MirroredCertFile = {
    schema: 'cp-mirror/cert@1',
    mirroredAt: new Date().toISOString(),
    notice: ANCHOR_HONESTY_NOTICE,
    certificate: cert,
  };
  const content = JSON.stringify(file, null, 2);

  try {
    const res = await enqueue(async () => {
      try {
        return await withRetry(() =>
          putFile(config, path, content, undefined, `[cp-mirror] certificate ${cert.id}`),
        );
      } catch (err) {
        const status = getErrStatus(err);
        if (status === 409 || status === 422) {
          // certId ULID 충돌은 사실상 0 — 재발급/재시도 잔존 파일이면 sha 로 갱신 (멱등)
          const existing = await getFile(config, path);
          if (existing) {
            return withRetry(() =>
              putFile(config, path, content, existing.sha, `[cp-mirror] certificate ${cert.id} (reissue)`),
            );
          }
        }
        throw err;
      }
    });

    const commitSha = res.commitSha ?? null;
    if (commitSha) cert.githubCommitSha = commitSha; // additive 보존 — 미러 파일 본문엔 없음 (자기참조 불가)
    return { commitSha };
  } catch (err) {
    alertMirrorFailure(`확인서 미러 (${cert.id})`, err);
    return null;
  }
}

// ============================================================
// PART 10 — 테스트 훅
// ============================================================

/** 테스트 전용 — 모듈 상태 초기화 (alert throttle·디바운스 타이머) */
export function _resetMirrorModuleForTests(): void {
  _lastAlertAt = 0;
  _timers.forEach((t) => clearTimeout(t));
  _timers.clear();
  _queue = Promise.resolve();
}

// IDENTITY_SEAL: github-mirror | role=cp-event+cert-github-mirror | inputs=CreativeEvent,ProcessCertificate | outputs=append-only repo files+commitSha
