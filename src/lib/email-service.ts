// ============================================================
// email-service — 트랜잭션 이메일 발송 (Resend REST)
// ============================================================
// 상용 출시 blocker B1: 결제 영수증 · 결제실패 dunning · 계정삭제 통지.
//
// 설계 원칙:
//   - SDK 의존성 0 — Resend REST API 를 fetch 로 직접 호출 (npm install 불필요).
//   - graceful no-op — RESEND_API_KEY / EMAIL_FROM 미설정 시 던지지 않고 {sent:false}
//     반환 (테스트 · CI · 로컬 · 결제 OFF 환경에서 webhook/route 가 안 깨짐).
//   - 멱등 — Idempotency-Key 헤더(= Stripe event.id 등)로 webhook 재전송 시 중복발송 차단.
//   - timeout — AbortSignal.timeout(8s) 으로 발송 hang 차단 (외부호출 복원력 일관).
//   - fail-safe — 호출처는 await 하되 실패해도 200/주 흐름을 막지 않도록 설계.
// ============================================================

import { apiLog } from '@/lib/api-logger';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** 멱등키 — 동일 키 재전송 시 Resend 가 중복 발송 차단. webhook 은 event.id 사용. */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  sent: boolean;
  reason?: 'no_api_key' | 'no_from' | 'no_recipient' | 'http_error' | 'timeout' | 'exception';
  id?: string;
}

function emailConfigured(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

/** 핵심 발송기. 미설정/실패 시 던지지 않고 결과 객체 반환. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = emailConfigured();
  if (!cfg) {
    // 미설정은 정상 경로(결제 OFF·테스트). warn 1회로 가시화하되 흐름 차단 X.
    apiLog({
      level: 'warn',
      event: 'email_skipped_unconfigured',
      route: 'email-service',
      meta: { reason: process.env.RESEND_API_KEY ? 'no_from' : 'no_api_key', subject: input.subject },
    });
    return { sent: false, reason: process.env.RESEND_API_KEY ? 'no_from' : 'no_api_key' };
  }
  if (!input.to || !input.to.includes('@')) {
    return { sent: false, reason: 'no_recipient' };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    'Content-Type': 'application/json',
  };
  if (input.idempotencyKey) headers['Idempotency-Key'] = input.idempotencyKey;
  const replyTo = process.env.EMAIL_REPLY_TO?.trim();

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: cfg.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      apiLog({
        level: 'error',
        event: 'email_send_http_error',
        route: 'email-service',
        status: res.status,
        meta: { subject: input.subject, detail: detail.slice(0, 200) },
      });
      return { sent: false, reason: 'http_error' };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    apiLog({ level: 'info', event: 'email_sent', route: 'email-service', meta: { subject: input.subject, id: data.id } });
    return { sent: true, id: data.id };
  } catch (err) {
    const name = (err as { name?: string } | null)?.name ?? '';
    const reason = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'exception';
    apiLog({
      level: 'error',
      event: 'email_send_failed',
      route: 'email-service',
      error: err instanceof Error ? err.message : String(err),
      meta: { subject: input.subject, reason },
    });
    return { sent: false, reason };
  }
}

// ── 포맷 helper ──────────────────────────────────────────────
const ZERO_DECIMAL = new Set(['krw', 'jpy', 'vnd', 'clp', 'pyg']);

/** Stripe amount(최소단위 정수) → 표시 문자열. KRW/JPY 등 0-decimal 통화 보정. */
export function formatMoney(amount: number, currency: string): string {
  const cur = (currency || 'krw').toLowerCase();
  const major = ZERO_DECIMAL.has(cur) ? amount : amount / 100;
  try {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: cur.toUpperCase() }).format(major);
  } catch {
    return `${major} ${cur.toUpperCase()}`;
  }
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <h1 style="font-size:18px;margin:0 0 16px">${title}</h1>
    <div style="background:#fff;border-radius:12px;padding:24px;font-size:14px;line-height:1.6">${bodyHtml}</div>
    <p style="font-size:12px;color:#888;margin:20px 4px 0">Loreguard · 본 메일은 발신 전용입니다.</p>
  </div></body></html>`;
}

// ── 결제 영수증 (invoice.paid) ───────────────────────────────
export async function sendReceiptEmail(args: {
  to: string;
  customerName?: string | null;
  amount: number;
  currency: string;
  invoiceNumber?: string | null;
  invoiceUrl?: string | null;
  idempotencyKey: string;
}): Promise<SendEmailResult> {
  const money = formatMoney(args.amount, args.currency);
  const greeting = args.customerName ? `${args.customerName}님, ` : '';
  const link = args.invoiceUrl
    ? `<p style="margin:16px 0 0"><a href="${args.invoiceUrl}" style="color:#2563eb">영수증·청구서 보기 →</a></p>`
    : '';
  const body = `<p>${greeting}결제가 정상 완료되었습니다.</p>
    <table style="width:100%;margin:12px 0;border-collapse:collapse">
      <tr><td style="color:#666;padding:4px 0">결제 금액</td><td style="text-align:right;font-weight:600">${money}</td></tr>
      ${args.invoiceNumber ? `<tr><td style="color:#666;padding:4px 0">청구서 번호</td><td style="text-align:right">${args.invoiceNumber}</td></tr>` : ''}
    </table>${link}`;
  return sendEmail({ to: args.to, subject: `[Loreguard] 결제 영수증 — ${money}`, html: shell('결제가 완료되었습니다', body), idempotencyKey: args.idempotencyKey });
}

// ── 결제 실패 dunning (invoice.payment_failed) ───────────────
export async function sendPaymentFailedEmail(args: {
  to: string;
  customerName?: string | null;
  amount: number;
  currency: string;
  updatePaymentUrl?: string | null;
  idempotencyKey: string;
}): Promise<SendEmailResult> {
  const money = formatMoney(args.amount, args.currency);
  const greeting = args.customerName ? `${args.customerName}님, ` : '';
  const link = args.updatePaymentUrl
    ? `<p style="margin:16px 0 0"><a href="${args.updatePaymentUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">결제 수단 업데이트 →</a></p>`
    : '';
  const body = `<p>${greeting}정기 결제(${money})에 실패했습니다.</p>
    <p style="color:#666">카드 한도·만료를 확인해 주세요. 며칠 내 자동으로 재시도되며, 결제가 완료되지 않으면 구독이 해지될 수 있습니다.</p>${link}`;
  return sendEmail({ to: args.to, subject: '[Loreguard] 결제에 실패했습니다 — 결제 수단을 확인해 주세요', html: shell('결제에 실패했습니다', body), idempotencyKey: args.idempotencyKey });
}

// ── 계정 삭제 접수 통지 (DSAR) ───────────────────────────────
export async function sendAccountDeletionAck(args: {
  to: string;
  ticketId: string;
  idempotencyKey: string;
}): Promise<SendEmailResult> {
  const body = `<p>계정·데이터 삭제 요청이 접수되었습니다.</p>
    <table style="width:100%;margin:12px 0"><tr><td style="color:#666;padding:4px 0">접수 번호</td><td style="text-align:right;font-weight:600">${args.ticketId}</td></tr></table>
    <p style="color:#666">GDPR Art.17 · 개인정보보호법 §36에 따라 30일 이내 처리됩니다. 처리 완료 시 다시 안내드립니다.</p>`;
  return sendEmail({ to: args.to, subject: '[Loreguard] 계정 삭제 요청이 접수되었습니다', html: shell('삭제 요청 접수', body), idempotencyKey: args.idempotencyKey });
}
