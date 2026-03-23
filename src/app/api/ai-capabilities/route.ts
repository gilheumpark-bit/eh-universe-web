import { NextResponse } from 'next/server';
import { getFirstHostedProvider, getHostedProviderAvailability } from '@/lib/server-ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hosted = getHostedProviderAvailability();
  return NextResponse.json({
    hosted,
    anyHosted: Object.values(hosted).some(Boolean),
    defaultHostedProvider: getFirstHostedProvider(),
    quickStartReady: hosted.gemini,
  });
}
