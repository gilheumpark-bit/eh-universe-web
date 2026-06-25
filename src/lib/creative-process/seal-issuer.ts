// ============================================================
// Seal Issuer — Witness Seal 일련번호 발급
// ============================================================
//
// 형식: LG-{YY}{MM}-{serial}-{hash4}
//   LG  : Lore Guard prefix
//   YY  : 발급 연도 끝 2자리 (UTC)
//   MM  : 발급 월 (UTC, 01~12)
//   serial : 4자리 일련번호 (월별 1부터)
//   hash4  : manuscript SHA-256 의 처음 4자 (대문자)
//
// 예: LG-2605-0042-A8F5
//   2026년 5월, 42번째 발급, manuscript hash A8F5...
//
// [C] 안전성 (race 방지 — #16):
//   getNextMonthlySerial 은 read(getAll)→max→+1 의 비원자 연산이라,
//   동시 발급 시 두 호출이 같은 max 를 읽어 동일 serial 을 낼 수 있다
//   (IDB 에 sealNumber unique 인덱스 없음 — keyPath='id' 뿐).
//   → 발급 전체를 *직렬화 큐(serialQueue)* 로 묶어 read→compute→reserve 구간을
//     한 번에 하나만 실행. 추가로 *세션 내 reservedSerials* 로 cert 가 아직
//     IDB 에 persist 되기 전(같은 tick 연속 발급)도 중복 serial 을 막는다.
//   ⚠ 본 직렬화는 *동일 탭(프로세스) 내* 보장. 다중 탭/다중 디바이스 전역 유일성은
//     서버측 레지스트리(/api/cp/register 의 write-once documentId=certId)가 담당한다.
// [G] 성능: 월별 getAll 1회 (큐로 인해 동시성 1) — 발급은 드문 행위라 수용 가능.
// [K] 간결성: 단일 진입 함수 + 큐 helper.
// ============================================================

import { openCreativeProcessDB, STORE_CERTIFICATES, promisifyRequest } from './idb-store';

// ============================================================
// PART 1 — 일련번호 발급 (직렬화 큐로 race 차단)
// ============================================================

/**
 * 발급 직렬화 큐 — 한 번에 하나의 issueWitnessSeal 만 read→compute→reserve 를 돈다.
 * 동시 호출이 같은 max serial 을 읽는 race (#16) 를 원천 차단.
 */
let serialQueue: Promise<unknown> = Promise.resolve();

/**
 * 세션 내 이미 발급(예약)한 (yyMm → max serial) — cert 가 IDB 에 persist 되기 전
 * 같은 tick 연속 발급도 중복 없이 증가시키기 위함. IDB 의 기존 max 와 함께 max 를 취한다.
 */
const reservedSerials = new Map<string, number>();

/**
 * Witness Seal 일련번호 발급. 직렬화 큐를 통해 race-free 보장 (동일 탭 내).
 * @param input.generatedAt ISO UTC 시각
 * @param input.manuscriptHash SHA-256 hex 64자
 * @returns "LG-{YY}{MM}-{serial}-{hash4}"
 */
export async function issueWitnessSeal(input: {
  generatedAt: string;
  manuscriptHash: string;
}): Promise<string> {
  const date = new Date(input.generatedAt);
  if (Number.isNaN(date.getTime())) {
    throw new Error('issueWitnessSeal: invalid generatedAt');
  }
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyMm = `${yy}${mm}`;
  const hash4 = (input.manuscriptHash || '').slice(0, 4).toUpperCase().padEnd(4, '0');

  // 큐에 직렬 연결 — 앞선 발급의 reserve 가 끝난 뒤에만 다음 발급이 serial 을 읽는다.
  // 한 발급의 throw 가 큐 전체를 막지 않도록 분리한 promise 로 체이닝한다.
  const run = serialQueue.then(
    () => reserveNextMonthlySerial(yyMm),
    () => reserveNextMonthlySerial(yyMm),
  );
  serialQueue = run.catch(() => undefined);
  const serial = await run;

  return `LG-${yyMm}-${formatSealSerial(serial)}-${hash4}`;
}

/**
 * 월별 일련번호 → 인장번호 문자열.
 * [#74→무결성] serial > 9999 일 때 wrap(10000→0001)은 인장번호 *중복 발급*을 유발한다
 * (저작권 증명물 — 동일 번호가 두 원고에 발급되면 외부 배포 후 복구 불가). 형식 미관보다
 * 고유성을 우선: 9999 이하는 4자리 zero-pad, 초과는 자리수를 그대로 늘려 충돌 없이 표현.
 * (LG-{YY}{MM}-10000-… — 파서는 '-' 분할이라 5자리 이상도 안전.)
 */
export function formatSealSerial(serial: number): string {
  return serial <= 9999 ? String(serial).padStart(4, '0') : String(serial);
}

// ============================================================
// PART 2 — 월별 카운터 (IDB + 세션 예약, 큐 내부에서만 호출)
// ============================================================

/**
 * 해당 yyMm prefix 의 다음 시리얼 번호 산출 + 세션 예약.
 * 기존 certificates 의 sealNumber 중 같은 yyMm prefix 의 max serial 과
 * 세션 reserved max 중 더 큰 값 + 1. reserve 후 reservedSerials 갱신.
 *
 * ⚠ serialQueue 직렬화 안에서만 호출 — 단독 호출 시 race 보장 없음.
 * IDB 미지원 환경 (SSR 등) 에서는 timestamp 기반 fallback (큐 내 단조 증가 보강).
 */
async function reserveNextMonthlySerial(yyMm: string): Promise<number> {
  const reserved = reservedSerials.get(yyMm) ?? 0;

  if (typeof indexedDB === 'undefined') {
    // SSR / 미지원 환경 — timestamp 기반이되 세션 reserved 보다 항상 +1 큰 값 보장.
    // 4자리 유지를 위해 1..9999 로 wrap (9999 다음은 1 로 순환 — fallback 한정).
    const base = Math.max(Date.now() % 10000, reserved);
    const next = (base % 9999) + 1;
    reservedSerials.set(yyMm, next);
    return next;
  }

  let idbMax = 0;
  try {
    const db = await openCreativeProcessDB();
    const tx = db.transaction(STORE_CERTIFICATES, 'readonly');
    const store = tx.objectStore(STORE_CERTIFICATES);
    const all = await promisifyRequest(store.getAll());
    const prefix = `LG-${yyMm}-`;
    for (const cert of all as Array<{ sealNumber?: string }>) {
      if (!cert.sealNumber || !cert.sealNumber.startsWith(prefix)) continue;
      const parts = cert.sealNumber.split('-');
      if (parts.length < 3) continue;
      const serial = parseInt(parts[2], 10);
      if (!Number.isNaN(serial) && serial > idbMax) {
        idbMax = serial;
      }
    }
  } catch {
    // IDB 실패 — idbMax 0 유지, 세션 reserved 로 단조 증가만 보장.
    idbMax = 0;
  }

  const next = Math.max(idbMax, reserved) + 1;
  reservedSerials.set(yyMm, next);
  return next;
}

/**
 * 테스트 전용 — 세션 예약 상태 초기화 (직렬 큐는 마이크로태스크라 자연 비움).
 */
export function _resetSerialReservations(): void {
  reservedSerials.clear();
  serialQueue = Promise.resolve();
}

// ============================================================
// PART 3 — Witness Seal SVG (inline, 외부 link 0)
// ============================================================

/**
 * Witness Seal 봉인 SVG.
 * 120×120 viewBox, 외부 ring + 내부 shield + 체크 + 텍스트 ring.
 */
export function buildWitnessSealSVG(): string {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="witness-seal-svg" role="img" aria-label="Witness Seal">
  <defs>
    <path id="seal-arc" d="M 60 60 m -42 0 a 42 42 0 1 1 84 0 a 42 42 0 1 1 -84 0"/>
  </defs>
  <circle cx="60" cy="60" r="56" fill="none" stroke="#D4AF37" stroke-width="1"/>
  <circle cx="60" cy="60" r="50" fill="none" stroke="#D4AF37" stroke-width="2"/>
  <path d="M60 30 L80 40 L80 65 Q80 80 60 90 Q40 80 40 65 L40 40 Z"
        fill="#D4AF37" fill-opacity="0.1"
        stroke="#D4AF37" stroke-width="1.5"/>
  <path d="M50 60 L57 67 L72 52" fill="none" stroke="#D4AF37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text font-family="'Inter', sans-serif" font-size="8" font-weight="700" letter-spacing="2" fill="#D4AF37">
    <textPath href="#seal-arc" startOffset="20">VERIFIED BY LORE GUARD SYSTEMS</textPath>
  </text>
</svg>`;
}

// ============================================================
// PART 4 — Origin Summary 도넛 SVG (75/20/5 도넛)
// ============================================================

/**
 * 3 카테고리 (Author Input / Refinement / NOA Suggestion) 도넛 SVG.
 * 입력 % 합 100 가정. 합 ≠ 100 시 그대로 (시각만 영향).
 */
export function buildOriginDonutSVG(humanPct: number, refinePct: number, aiPct: number): string {
  const r = 50, c = 60, sw = 16;
  const circ = 2 * Math.PI * r;
  const seg = (pct: number): number => (pct / 100) * circ;
  const segments: string[] = [];
  let offset = 0;
  const data = [
    { pct: humanPct, color: '#1A1A1A' },
    { pct: refinePct, color: '#D4AF37' },
    { pct: aiPct, color: '#C4C7C7' },
  ];
  for (const s of data) {
    const dasharray = `${seg(s.pct)} ${circ - seg(s.pct)}`;
    segments.push(
      `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${dasharray}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${c} ${c})"/>`,
    );
    offset += seg(s.pct);
  }
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" class="donut-svg" role="img" aria-label="Origin Summary Donut">${segments.join('')}</svg>`;
}
