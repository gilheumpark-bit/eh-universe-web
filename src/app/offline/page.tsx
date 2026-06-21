// ============================================================
// /offline — PWA offline fallback page (precached by sw.js)
// ============================================================
// [P9 루프3 — 2026-06-08] 연결 단절 시 SW 가 이 페이지를 반환.
// 4언어 정적 페이지. JS/외부 호출 0 — 진짜 offline 환경에서도 동작.
// ============================================================

export const dynamic = 'force-static';

export default function OfflinePage(): React.JSX.Element {
  return (
    <main
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        background: '#1c1a17',
        color: '#FAFAF8',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '32rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Offline · 오프라인 · オフライン · 离线
        </h1>
        <p style={{ fontSize: '1rem', color: '#a8a39a', marginBottom: '1.5rem' }}>
          Connection unavailable. The app will resume when connection is restored.<br />
          연결 상태를 확인할 수 없습니다. 연결되면 자동으로 이어집니다.<br />
          ネットワークに接続できません。再接続後に再開します。<br />
          网络不可用。连接恢复后将继续。
        </p>
        <p style={{ fontSize: '0.85rem', color: '#a8a39a' }}>
          Cached Studio and Docs pages may still work.
        </p>
      </div>
    </main>
  );
}
