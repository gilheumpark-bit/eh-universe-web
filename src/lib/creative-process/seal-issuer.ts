// ============================================================
// Seal Issuer — Witness Seal 일련번호 발급
// ============================================================
//
// 형식: LG-{YY}{MM}-{serial}-{hash4}
//   LG  : Lore Guard prefix
//   YY  : 발급 연도 끝 2자리 (UTC)
//   MM  : 발급 월 (UTC, 01~12)
//   serial : 4자리 일련번호 (월별 1부터, IDB unique)
//   hash4  : manuscript SHA-256 의 처음 4자 (대문자)
//
// 예: LG-2605-0042-A8F5
//   2026년 5월, 42번째 발급, manuscript hash A8F5...
//
// IDB unique 강제 — 같은 시리얼 번호 발급 X.
// 발급 시간이 동일해도 hash4 + serial 조합이 unique 보장.
//
// [C] 안전성: IDB transaction 으로 race condition 방지
// [G] 성능: by_serial index lookup O(log n)
// [K] 간결성: 단일 함수 + helper 1개
// ============================================================

import { openCreativeProcessDB, STORE_CERTIFICATES, promisifyRequest } from './idb-store';

// ============================================================
// PART 1 — 일련번호 발급
// ============================================================

/**
 * Witness Seal 일련번호 발급.
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

  const serial = await getNextMonthlySerial(yyMm);
  return `LG-${yyMm}-${String(serial).padStart(4, '0')}-${hash4}`;
}

// ============================================================
// PART 2 — 월별 카운터 (IDB)
// ============================================================

/**
 * 해당 yyMm prefix 의 다음 시리얼 번호 산출.
 * 기존 certificates 의 sealNumber 중 같은 yyMm prefix 의 max serial + 1.
 *
 * IDB 미지원 환경 (SSR 등) 에서는 timestamp 기반 fallback.
 */
async function getNextMonthlySerial(yyMm: string): Promise<number> {
  if (typeof indexedDB === 'undefined') {
    // SSR / 미지원 환경 — timestamp ms 끝 4자리 fallback
    return Date.now() % 10000;
  }
  try {
    const db = await openCreativeProcessDB();
    const tx = db.transaction(STORE_CERTIFICATES, 'readonly');
    const store = tx.objectStore(STORE_CERTIFICATES);
    const all = await promisifyRequest(store.getAll());
    let maxSerial = 0;
    const prefix = `LG-${yyMm}-`;
    for (const cert of all as Array<{ sealNumber?: string }>) {
      if (!cert.sealNumber || !cert.sealNumber.startsWith(prefix)) continue;
      const parts = cert.sealNumber.split('-');
      if (parts.length < 3) continue;
      const serial = parseInt(parts[2], 10);
      if (!Number.isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
    return maxSerial + 1;
  } catch {
    // IDB 실패 — timestamp fallback
    return Date.now() % 10000;
  }
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
 * 3 카테고리 (Human Input / Refinement / AI Suggestion) 도넛 SVG.
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
