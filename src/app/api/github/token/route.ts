// ============================================================
// /api/github/token — Read GitHub access token from httpOnly cookie
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * GET /api/github/token
 *
 * Returns the GitHub access token stored in the httpOnly cookie.
 * This avoids exposing the token in URL hash or browser history.
 * The cookie is set by /api/github/callback after OAuth exchange.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get('gh_access_token')?.value;
  if (!token) {
    return NextResponse.json({ token: null }, { status: 200 });
  }
  return NextResponse.json({ token });
}

// IDENTITY_SEAL: PART-1 | role=github-token-reader | inputs=cookie | outputs=token-json
