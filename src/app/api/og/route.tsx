import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get('title') || '로어가드 · Loreguard';
  const genre = searchParams.get('genre') || '';
  const status = searchParams.get('status') || '';
  const tags = (searchParams.get('tags') || '').split(',').filter(Boolean).slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', color: '#ca9f5c', letterSpacing: '4px', textTransform: 'uppercase' as const, fontWeight: 900 }}>
            EH UNIVERSE
          </span>
          {genre && (
            <span style={{ fontSize: '12px', color: '#888', border: '1px solid #333', borderRadius: '8px', padding: '4px 12px' }}>
              {genre}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1 style={{ fontSize: '52px', fontWeight: 900, lineHeight: 1.1, margin: 0, maxWidth: '900px' }}>
            {title}
          </h1>
          {status && (
            <span style={{ fontSize: '16px', color: '#5c8fd6' }}>
              ● {status}
            </span>
          )}
        </div>

        {/* Tags + Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {tags.map((tag) => (
              <span key={tag} style={{ fontSize: '13px', color: '#aaa', border: '1px solid #333', borderRadius: '12px', padding: '6px 14px' }}>
                {tag}
              </span>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: '#555' }}>
            eh-universe-web.vercel.app
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
