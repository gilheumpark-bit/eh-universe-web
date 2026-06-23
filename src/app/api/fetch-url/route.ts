import '@/lib/server-ai-init';
import { NextRequest, NextResponse } from 'next/server';
import {
  assertResolvedHostAllowedForFetch,
  assertUrlAllowedForFetch,
  resolveRedirectUrl,
  validatePostFetchUrl,
} from '@/lib/fetch-url-guard';
import { checkRateLimitAsync, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';

const MAX_REDIRECT_HOPS = 5;
const FETCH_TIMEOUT_MS = 15_000;
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (compatible; EH-Translator/3.1; +https://github.com/gilheumpark-bit/eh-translator)',
  Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko,en;q=0.9',
};
type FetchUrlError = { error: string; status: number };

async function requireFetchUrlAccess(req: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== 'production') return null;
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '로그인 후 URL 불러오기를 사용할 수 있습니다.' }, { status: 401 });
  }
  const token = authHeader.slice(7).trim();
  const decoded = await verifyFirebaseIdToken(token);
  if (!decoded) {
    return NextResponse.json({ error: '로그인 정보가 확인되지 않았습니다.' }, { status: 401 });
  }
  return null;
}

function isFetchUrlError(result: Response | FetchUrlError): result is FetchUrlError {
  return 'error' in result;
}

async function fetchWithValidatedRedirects(startUrl: string): Promise<Response | FetchUrlError> {
  let currentUrl = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const response = await fetch(currentUrl, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'manual',
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      validatePostFetchUrl(response.url || currentUrl);
      const finalResolved = await assertResolvedHostAllowedForFetch(response.url || currentUrl);
      if (!finalResolved.ok) {
        return { error: finalResolved.reason, status: 403 };
      }
      return response;
    }

    const next = resolveRedirectUrl(currentUrl, response.headers.get('location'));
    if (!next.ok) {
      return { error: next.reason, status: 403 };
    }

    const resolved = await assertResolvedHostAllowedForFetch(next.href);
    if (!resolved.ok) {
      return { error: resolved.reason, status: 403 };
    }
    currentUrl = next.href;
  }

  return { error: '리다이렉트가 너무 많습니다.', status: 508 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // [S2-XFF 방어] x-vercel-forwarded-for 우선 사용 (Vercel 엣지만 생성 — 클라이언트 위조 불가)
  const clientKey = getClientIp(req.headers);

  const rl = await checkRateLimitAsync(clientKey, '/api/fetch-url', RATE_LIMITS.fetchUrl);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${Math.ceil(rl.retryAfterMs / 1000)}초 후 다시 시도하세요.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000) || 1) } }
    );
  }

  const authBlock = await requireFetchUrlAccess(req);
  if (authBlock) return authBlock;

  const allowed = assertUrlAllowedForFetch(url);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.reason }, { status: 400 });
  }

  const resolved = await assertResolvedHostAllowedForFetch(allowed.href);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.reason }, { status: 403 });
  }

  try {
    const response = await fetchWithValidatedRedirects(allowed.href);
    if (isFetchUrlError(response)) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status },
      );
    }

    if (!response.ok) {
      return NextResponse.json({ error: `외부 사이트 응답 오류 (${response.status})` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';
    let rawText = '';

    if (contentType.includes('text/plain')) {
      rawText = await response.text();
    } else {
      const html = await response.text();

      let cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '');

      cleaned = cleaned
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/tr>/gi, '\n');

      cleaned = cleaned.replace(/<[^>]+>/g, '');

      cleaned = cleaned
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&hellip;/g, '…');

      rawText = cleaned
        .split('\n')
        .map((line) => line.trim())
        .filter((line, i, arr) => line || (arr[i - 1] && arr[i - 1] !== ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    if (!rawText) {
      return NextResponse.json({ error: '본문 텍스트를 추출할 수 없습니다.' }, { status: 422 });
    }

    const MAX_CHARS = 50000;
    const isTruncated = rawText.length > MAX_CHARS;
    const text = isTruncated ? rawText.slice(0, MAX_CHARS) + '\n\n[... 내용이 너무 길어 잘렸습니다 ...]' : rawText;

    return NextResponse.json({
      text,
      charCount: text.length,
      truncated: isTruncated,
      sourceUrl: response.url || allowed.href,
    });
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e.name === 'TimeoutError') {
      return NextResponse.json({ error: '요청 시간 초과 (15초). 해당 사이트가 응답하지 않습니다.' }, { status: 504 });
    }
    logger.error('fetch-url', 'proxy fetch failed', err);
    return NextResponse.json({ error: 'URL 본문을 읽는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
