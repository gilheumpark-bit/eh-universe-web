// ============================================================
// CS Quill 🦔 — cs serve command
// ============================================================
// 로컬 API 서버. 웹/IDE에서 HTTP로 검증 파이프라인 호출.

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync } from 'fs';

// ============================================================
// PART 1 — Route Handlers
// ============================================================

async function handleVerify(body: string): Promise<object> {
  const { code, language } = JSON.parse(body);
  const { runStaticPipeline } = await import('@/lib/code-studio/pipeline/pipeline');
  return runStaticPipeline(code ?? '', language ?? 'typescript');
}

async function handleHollow(body: string): Promise<object> {
  const { code, fileName } = JSON.parse(body);
  const { scanForHollowCode } = await import('@/lib/code-studio/pipeline/ast-hollow-scanner');
  return { findings: scanForHollowCode(code ?? '', fileName ?? 'unknown') };
}

async function handleDeadCode(body: string): Promise<object> {
  const { code, language } = JSON.parse(body);
  const { scanDeadCode } = await import('@/lib/code-studio/pipeline/dead-code');
  return { findings: scanDeadCode(code ?? '', language ?? 'typescript') };
}

async function handleDesignLint(body: string): Promise<object> {
  const { code } = JSON.parse(body);
  const { runDesignLint } = await import('@/lib/code-studio/pipeline/design-lint');
  return runDesignLint(code ?? '');
}

async function handleHealth(): Promise<object> {
  return { status: 'ok', version: '0.1.0', engine: 'CS Quill 🦔' };
}

// IDENTITY_SEAL: PART-1 | role=route-handlers | inputs=body | outputs=object

// ============================================================
// PART 2 — Server
// ============================================================

export async function runServe(port: string): Promise<void> {
  const portNum = parseInt(port, 10);

  const ROUTES: Record<string, (body: string) => Promise<object>> = {
    '/health': async () => handleHealth(),
    '/verify': handleVerify,
    '/hollow': handleHollow,
    '/dead-code': handleDeadCode,
    '/design-lint': handleDesignLint,
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
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
        for await (const chunk of req) body += chunk;
      }
      const result = await handler(body || '{}');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });

  server.listen(portNum, () => {
    console.log(`🦔 CS Quill Serve — http://localhost:${portNum}\n`);
    console.log('  Endpoints:');
    for (const route of Object.keys(ROUTES)) {
      console.log(`    POST http://localhost:${portNum}${route}`);
    }
    console.log('\n  Ctrl+C 로 종료\n');
  });
}

// IDENTITY_SEAL: PART-2 | role=server | inputs=port | outputs=http-server
