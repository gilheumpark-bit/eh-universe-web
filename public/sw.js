// ============================================================
// Service Worker — Offline manuscript caching
// Caches studio page shell + localStorage-based manuscript data
// ============================================================
// [P9 루프3 — 2026-06-08] PWA offline fallback 보강:
//   - CACHE_NAME 버전업 (v1 → v2) → 기존 캐시 자동 invalidate
//   - SHELL_URLS 에 핵심 라우트 + /offline 추가
//   - 네트워크 실패 시 /offline 페이지 반환 (page navigation 한정)
// ============================================================

const CACHE_NAME = 'noa-studio-v3';
const OFFLINE_URL = '/offline';
const SHELL_URLS = [
  '/',
  '/studio',
  '/translation-studio',
  OFFLINE_URL,
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // [P9 루프3] addAll 은 1개라도 실패 시 전체 reject — 핵심 페이지 prefetch 실패가
      // SW install 자체를 막지 않도록 개별 add 로 graceful 처리.
      Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch((err) => {

            console.warn('[sw] precache failed:', url, err?.message ?? err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET, API calls, and external requests
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/__/auth/')) return;
  if (url.origin !== self.location.origin) return;

  // Static assets (JS, CSS, images): cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
      )
    );
    return;
  }

  // [P9 루프3] Pages: network-first with cache fallback → /offline.
  // navigation request (HTML) 인 경우만 /offline fallback.
  const isNavigation = event.request.mode === 'navigate'
    || (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'));

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (isNavigation) {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        // 마지막 폴백 — 최소한의 HTML.
        return new Response(
          '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>Offline</h1><p>Network unavailable. Please reconnect.</p></body>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
  );
});
