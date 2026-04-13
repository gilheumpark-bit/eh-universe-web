"use strict";
// ============================================================
// CS Quill 🦔 — cs serve command
// ============================================================
// 로컬 API 서버. 웹/IDE에서 HTTP로 검증 파이프라인 호출.
Object.defineProperty(exports, "__esModule", { value: true });
exports.runServe = runServe;
const http_1 = require("http");
// ============================================================
// PART 1 — Route Handlers
// ============================================================
async function handleVerify(body) {
    const { code, language } = JSON.parse(body);
    const { runStaticPipeline } = require('../core/pipeline-bridge');
    return await runStaticPipeline(code ?? '', language ?? 'typescript');
}
async function handleHollow(body) {
    const { code, fileName } = JSON.parse(body);
    const { scanForHollowCode } = require('../core/pipeline-bridge');
    return { findings: scanForHollowCode(code ?? '', fileName ?? 'unknown') };
}
async function handleDeadCode(body) {
    const { code, language } = JSON.parse(body);
    const { scanDeadCode } = require('../core/pipeline-bridge');
    return { findings: scanDeadCode(code ?? '', language ?? 'typescript') };
}
async function handleDesignLint(body) {
    const { code } = JSON.parse(body);
    const { runDesignLint } = require('../core/pipeline-bridge');
    return runDesignLint(code ?? '');
}
async function handleCognitiveLoad(body) {
    const { code } = JSON.parse(body);
    const { analyzeCognitiveLoad } = require('../core/pipeline-bridge');
    return analyzeCognitiveLoad(code ?? '');
}
async function handleBugfinder(body) {
    const { code } = JSON.parse(body);
    const { findBugsStatic } = require('../core/pipeline-bridge');
    return { bugs: findBugsStatic(code ?? '') };
}
async function handleIPScan(body) {
    const { files } = JSON.parse(body);
    const { scanProject } = require('../core/pipeline-bridge');
    return scanProject(files ?? []);
}
async function handleHealth() {
    const { loadMergedConfig } = require('../core/config');
    const config = loadMergedConfig();
    return {
        status: 'ok',
        version: '0.1.0',
        engine: 'CS Quill 🦔',
        language: config.language,
        level: config.level,
        keys: config.keys.length,
        uptime: Math.round(process.uptime()),
    };
}
// IDENTITY_SEAL: PART-1 | role=route-handlers | inputs=body | outputs=object
// ============================================================
// PART 2 — Auth, Cache & Rate Limiting Middleware
// ============================================================
// API key validation — set CS_QUILL_API_KEY env var to enable
function validateApiKey(req) {
    const requiredKey = process.env.CS_QUILL_API_KEY;
    if (!requiredKey)
        return true; // no key configured = open access
    const provided = req.headers['x-api-key'];
    return provided === requiredKey;
}
// In-memory response cache (keyed by route + body hash)
const responseCache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute
function getCacheKey(route, body) {
    // Simple hash: sum of char codes, good enough for local cache
    let hash = 0;
    for (let i = 0; i < body.length; i++) {
        hash = ((hash << 5) - hash + body.charCodeAt(i)) | 0;
    }
    return `${route}:${hash}`;
}
function getCached(key) {
    const entry = responseCache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
        responseCache.delete(key);
        return null;
    }
    return entry.result;
}
function setCache(key, result) {
    // Evict oldest entries if cache grows too large
    if (responseCache.size > 200) {
        const oldestKey = responseCache.keys().next().value;
        if (oldestKey)
            responseCache.delete(oldestKey);
    }
    responseCache.set(key, { result, timestamp: Date.now() });
}
// Rate limiter — max 100 requests per minute per IP
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;
function checkRateLimit(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket.remoteAddress
        || 'unknown';
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        entry = { count: 0, windowStart: now };
        rateLimitMap.set(ip, entry);
    }
    entry.count++;
    const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
    return { allowed: entry.count <= RATE_LIMIT_MAX, remaining };
}
// IDENTITY_SEAL: PART-2 | role=middleware | inputs=req | outputs=auth,cache,ratelimit
// ============================================================
// PART 3 — Server
// ============================================================
async function runServe(port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.log(`  ❌ 유효하지 않은 포트: ${port} (1-65535)`);
        return;
    }
    const ROUTES = {
        '/health': async () => handleHealth(),
        '/verify': handleVerify,
        '/hollow': handleHollow,
        '/dead-code': handleDeadCode,
        '/design-lint': handleDesignLint,
        '/cognitive-load': handleCognitiveLoad,
        '/bugfinder': handleBugfinder,
        '/ip-scan': handleIPScan,
    };
    const server = (0, http_1.createServer)(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        // ── Rate Limiting ──
        const rateResult = checkRateLimit(req);
        res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
        res.setHeader('X-RateLimit-Remaining', String(rateResult.remaining));
        if (!rateResult.allowed) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Rate limit exceeded (100 req/min). Retry later.' }));
            return;
        }
        // ── API Key Auth ──
        if (!validateApiKey(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid or missing API key. Set X-API-Key header.' }));
            return;
        }
        const url = req.url ?? '/';
        const handler = ROUTES[url];
        if (!handler) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found', routes: Object.keys(ROUTES) }));
            return;
        }
        try {
            let body = '';
            if (req.method === 'POST') {
                body = await new Promise((resolve) => {
                    const chunks = [];
                    req.on('data', (c) => chunks.push(c));
                    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
                    setTimeout(() => resolve('{}'), 10000); // 10s timeout
                });
            }
            const parsed = body || '{}';
            try {
                JSON.parse(parsed);
            }
            catch {
                body = '{}';
            }
            // ── Cache Check ──
            const cacheKey = getCacheKey(url, parsed);
            const cached = getCached(cacheKey);
            if (cached) {
                res.setHeader('X-Cache', 'HIT');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(cached));
                return;
            }
            const result = await handler(parsed);
            // ── Cache Store (skip /health since it changes) ──
            if (url !== '/health') {
                setCache(cacheKey, result);
            }
            res.setHeader('X-Cache', 'MISS');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        }
        catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
        }
    });
    server.listen(portNum, () => {
        console.log(`🦔 CS Quill Serve — http://localhost:${portNum}\n`);
        console.log('  Endpoints:');
        for (const route of Object.keys(ROUTES)) {
            console.log(`    POST http://localhost:${portNum}${route}`);
        }
        const authMode = process.env.CS_QUILL_API_KEY ? '🔒 API Key 인증 활성' : '🔓 인증 없음 (CS_QUILL_API_KEY 미설정)';
        console.log(`\n  ${authMode}`);
        console.log('  📦 응답 캐시: 1분 TTL');
        console.log('  🚦 Rate limit: 100 req/min per IP');
        console.log('\n  Ctrl+C 로 종료\n');
    });
}
// IDENTITY_SEAL: PART-3 | role=server | inputs=port | outputs=http-server
