// ============================================================
// /api/github/callback — GitHub OAuth code → token exchange
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * GET /api/github/callback?code=xxx&state=xxx
 *
 * Exchanges the OAuth authorization code for an access token,
 * then redirects to /studio with the token in the URL hash
 * (hash fragment is never sent to the server — safer than query params).
 *
 * CSRF protection: the `state` query param must match the `gh_oauth_state`
 * httpOnly cookie set by the client before redirecting to GitHub.
 * See SettingsView.tsx handleOAuthLogin for the client-side setup.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  // --- CSRF protection: verify state matches cookie ---
  const expectedState = req.cookies.get('gh_oauth_state')?.value;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json(
      { error: 'Invalid OAuth state — possible CSRF attack' },
      { status: 403 },
    );
  }

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

    // Set token in httpOnly cookie instead of URL hash to avoid browser history exposure
    const response = NextResponse.redirect(new URL('/studio', req.url));
    response.cookies.set('gh_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    // Clear the one-time state cookie after successful verification
    response.cookies.delete('gh_oauth_state');

    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to exchange code' }, { status: 502 });
  }
}

// IDENTITY_SEAL: PART-1 | role=github-oauth-callback | inputs=code,state | outputs=redirect+token
