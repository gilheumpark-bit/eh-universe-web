// ============================================================
// /api/github/callback — GitHub OAuth code → token exchange
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * GET /api/github/callback?code=xxx
 *
 * Exchanges the OAuth authorization code for an access token,
 * then redirects to /studio with the token in the URL hash
 * (hash fragment is never sent to the server — safer than query params).
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'GitHub OAuth not configured on server' },
      { status: 500 },
    );
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenData.access_token) {
      const errMsg = tokenData.error_description ?? tokenData.error ?? 'Token exchange failed';
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    // Redirect to /studio with token in hash (not exposed to server logs)
    const redirectUrl = new URL('/studio', req.nextUrl.origin);
    return NextResponse.redirect(
      `${redirectUrl.toString()}#github_token=${tokenData.access_token}`,
      { status: 302 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to exchange code' }, { status: 502 });
  }
}

// IDENTITY_SEAL: PART-1 | role=github-oauth-callback | inputs=code | outputs=redirect+token
