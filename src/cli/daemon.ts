// ============================================================
// CS Quill 🦔 — Daemon Server (WebSocket + HTTP)
// ============================================================
// CLI를 백그라운드 소켓 서버로 진화.
// VS Code ↔ CLI ↔ Web 3단 아키텍처의 심장부.
// 외부 의존성 0: Node.js 내장 http + crypto만 사용.

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { createHash } from 'crypto';
import type { Duplex } from 'stream';

// ============================================================
// PART 1 — Types & Config
// ============================================================

export interface DaemonConfig {
  port: number;
  host: string;
  allowedOrigins: string[];
  maxConnections: number;
  analysisTimeout: number;
}

export interface ClientSession {
  id: string;
  socket: Duplex;
  connectedAt: number;
  lastActivity: number;
  metadata: {
    editor?: string; // 'vscode' | 'web' | 'cli'
    projectPath?: string;
    version?: string;
  };
}

export interface WSMessage {
  type: string;
  id?: string; // request ID for response matching
  payload?: unknown;
}

export interface AnalysisResult {
  requestId: string;
  filePath: string;
  findings: Array<{
    line: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    source: string;
    code?: string;
    fix?: { range: { startLine: number; endLine: number }; newText: string };
  }>;
  score: number;
  duration: number;
}

const DEFAULT_CONFIG: DaemonConfig = {
  port: 8443,
  host: '127.0.0.1',
  allowedOrigins: ['vscode-webview://*', 'http://localhost:*', 'https://localhost:*'],
  maxConnections: 10,
  analysisTimeout: 30000,
};

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=DaemonConfig,ClientSession,WSMessage

// ============================================================
// PART 2 — Session Tracker
// ============================================================

class SessionTracker {
  private sessions: Map<string, ClientSession> = new Map();
  private maxConnections: number;

  constructor(max: number = 10) {
    this.maxConnections = max;
  }

  add(socket: Duplex, metadata?: ClientSession['metadata']): ClientSession {
    const id = `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const session: ClientSession = {
      id,
      socket,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      metadata: metadata ?? {},
    };

    // 최대 연결 초과 시 가장 오래된 세션 종료
    if (this.sessions.size >= this.maxConnections) {
      const oldest = [...this.sessions.values()].sort((a, b) => a.lastActivity - b.lastActivity)[0];
      if (oldest) this.remove(oldest.id);
    }

    this.sessions.set(id, session);
    return session;
  }

  remove(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      try { session.socket.destroy(); } catch { /* already closed */ }
      this.sessions.delete(id);
    }
  }

  get(id: string): ClientSession | undefined {
    return this.sessions.get(id);
  }

  touch(id: string): void {
    const session = this.sessions.get(id);
    if (session) session.lastActivity = Date.now();
  }

  getAll(): ClientSession[] {
    return [...this.sessions.values()];
  }

  count(): number {
    return this.sessions.size;
  }

  // 비활성 세션 정리 (5분 이상 무응답)
  cleanup(ttlMs: number = 300000): number {
    const now = Date.now();
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > ttlMs) {
        this.remove(id);
        removed++;
      }
    }
    return removed;
  }
}

// IDENTITY_SEAL: PART-2 | role=session-tracker | inputs=socket | outputs=ClientSession

// ============================================================
// PART 3 — WebSocket Frame Handler (RFC 6455, 외부 의존성 0)
// ============================================================

function acceptWebSocket(req: IncomingMessage, socket: Duplex): boolean {
  const key = req.headers['sec-websocket-key'];
  if (!key) return false;

  const GUID = '258EAFA5-E914-47DA-95CA-5AB5DC76E98B';
  const accept = createHash('sha1').update(key + GUID).digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n` +
    '\r\n',
  );
  return true;
}

function decodeWSFrame(buffer: Buffer): { payload: string; opcode: number } | null {
  if (buffer.length < 2) return null;
  const opcode = buffer[0] & 0x0f;
  const masked = (buffer[1] & 0x80) !== 0;
  let payloadLength = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskKey: Buffer | null = null;
  if (masked) {
    if (buffer.length < offset + 4) return null;
    maskKey = buffer.subarray(offset, offset + 4);
    offset += 4;
  }

  if (buffer.length < offset + payloadLength) return null;

  const data = buffer.subarray(offset, offset + payloadLength);
  if (maskKey) {
    for (let i = 0; i < data.length; i++) {
      data[i] ^= maskKey[i % 4];
    }
  }

  return { payload: data.toString('utf-8'), opcode };
}

function encodeWSFrame(data: string): Buffer {
  const payload = Buffer.from(data, 'utf-8');
  const length = payload.length;

  let header: Buffer;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text frame
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  return Buffer.concat([header, payload]);
}

function sendWS(socket: Duplex, data: object): void {
  try {
    const frame = encodeWSFrame(JSON.stringify(data));
    socket.write(frame);
  } catch { /* socket closed */ }
}

// IDENTITY_SEAL: PART-3 | role=websocket-frames | inputs=Buffer | outputs=string

// ============================================================
// PART 4 — Message Router
// ============================================================

async function handleMessage(
  msg: WSMessage,
  session: ClientSession,
  tracker: SessionTracker,
): Promise<void> {
  tracker.touch(session.id);
  const requestId = msg.id ?? `req-${Date.now().toString(36)}`;

  switch (msg.type) {
    case 'ping': {
      sendWS(session.socket, { type: 'pong', id: requestId, payload: { ts: Date.now() } });
      break;
    }

    case 'identify': {
      const meta = msg.payload as ClientSession['metadata'];
      session.metadata = { ...session.metadata, ...meta };
      sendWS(session.socket, { type: 'identified', id: requestId, payload: { sessionId: session.id } });
      break;
    }

    case 'analyze_file': {
      const { filePath, content, language } = msg.payload as { filePath: string; content: string; language?: string };
      const start = performance.now();

      try {
        // pipeline-bridge의 8팀 파이프라인 호출
        const { runStaticPipeline } = await import('./core/pipeline-bridge');
        const result = await runStaticPipeline(content, language ?? 'typescript');

        // finding을 VS Code Diagnostic 호환 포맷으로 변환
        const findings: AnalysisResult['findings'] = [];
        for (const team of result.teams) {
          for (const f of team.findings) {
            findings.push({
              line: typeof f === 'object' && 'line' in f ? (f as any).line : 0,
              message: typeof f === 'object' && 'message' in f ? (f as any).message : String(f),
              severity: team.score < 50 ? 'error' : team.score < 80 ? 'warning' : 'info',
              source: `CS Quill (${team.name})`,
            });
          }
        }

        // deep-verify 추가
        try {
          const { runDeepVerify } = await import('./core/deep-verify');
          const deep = await runDeepVerify(content, filePath);
          for (const f of deep.findings) {
            findings.push({
              line: f.line ?? 0,
              message: f.message,
              severity: f.severity === 'P0' ? 'error' : f.severity === 'P1' ? 'warning' : 'info',
              source: `CS Quill (deep-verify)`,
              code: f.category,
              fix: f.fix ? { range: { startLine: f.line ?? 0, endLine: f.line ?? 0 }, newText: f.fix } : undefined,
            });
          }
        } catch { /* deep-verify optional */ }

        const analysisResult: AnalysisResult = {
          requestId,
          filePath,
          findings: findings.slice(0, 100), // 최대 100건
          score: result.score,
          duration: Math.round(performance.now() - start),
        };

        sendWS(session.socket, { type: 'analysis_result', id: requestId, payload: analysisResult });
      } catch (e) {
        sendWS(session.socket, {
          type: 'analysis_error',
          id: requestId,
          payload: { filePath, error: (e as Error).message },
        });
      }
      break;
    }

    case 'get_status': {
      sendWS(session.socket, {
        type: 'status',
        id: requestId,
        payload: {
          connections: tracker.count(),
          uptime: Math.round(process.uptime()),
          memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          version: '0.1.0',
        },
      });
      break;
    }

    default: {
      sendWS(session.socket, {
        type: 'error',
        id: requestId,
        payload: { message: `Unknown message type: ${msg.type}` },
      });
    }
  }
}

// IDENTITY_SEAL: PART-4 | role=router | inputs=WSMessage | outputs=void

// ============================================================
// PART 5 — Daemon Server (HTTP + WebSocket Upgrade)
// ============================================================

export function startDaemon(config: Partial<DaemonConfig> = {}): { stop: () => void } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tracker = new SessionTracker(cfg.maxConnections);

  // HTTP 서버 (헬스체크 + REST fallback)
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        connections: tracker.count(),
        uptime: Math.round(process.uptime()),
        version: '0.1.0',
      }));
      return;
    }

    if (req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        sessions: tracker.getAll().map(s => ({
          id: s.id,
          editor: s.metadata.editor,
          connectedAt: s.connectedAt,
          lastActivity: s.lastActivity,
        })),
      }));
      return;
    }

    // REST fallback: POST /analyze
    if (req.url === '/analyze' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { filePath, content, language } = JSON.parse(body || '{}');
          const { runStaticPipeline } = await import('./core/pipeline-bridge');
          const result = await runStaticPipeline(content ?? '', language ?? 'typescript');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ filePath, score: result.score, teams: result.teams.length, findings: result.teams.flatMap(t => t.findings).length }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: (e as Error).message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', endpoints: ['/health', '/status', '/analyze'] }));
  });

  // WebSocket Upgrade
  server.on('upgrade', (req: IncomingMessage, socket: Duplex) => {
    if (!acceptWebSocket(req, socket)) {
      socket.destroy();
      return;
    }

    const session = tracker.add(socket);
    console.log(`  🔌 연결: ${session.id} (총 ${tracker.count()})`);

    // 환영 메시지
    sendWS(socket, { type: 'welcome', payload: { sessionId: session.id, version: '0.1.0' } });

    // 데이터 수신 버퍼
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length > 0) {
        const frame = decodeWSFrame(buffer);
        if (!frame) break; // 불완전한 프레임 — 다음 chunk 대기

        // 프레임 크기 계산 후 버퍼에서 제거
        const consumed = calculateFrameSize(buffer);
        buffer = buffer.subarray(consumed);

        // Close frame
        if (frame.opcode === 0x08) {
          tracker.remove(session.id);
          console.log(`  🔌 종료: ${session.id} (총 ${tracker.count()})`);
          return;
        }

        // Ping → Pong
        if (frame.opcode === 0x09) {
          const pong = Buffer.alloc(2);
          pong[0] = 0x8a; // FIN + pong
          pong[1] = 0;
          socket.write(pong);
          continue;
        }

        // Text frame → parse JSON → route
        if (frame.opcode === 0x01) {
          try {
            const msg: WSMessage = JSON.parse(frame.payload);
            handleMessage(msg, session, tracker).catch((e) => {
              sendWS(socket, { type: 'error', payload: { message: (e as Error).message } });
            });
          } catch {
            sendWS(socket, { type: 'error', payload: { message: 'Invalid JSON' } });
          }
        }
      }
    });

    socket.on('close', () => {
      tracker.remove(session.id);
      console.log(`  🔌 종료: ${session.id} (총 ${tracker.count()})`);
    });

    socket.on('error', () => {
      tracker.remove(session.id);
    });
  });

  // 비활성 세션 정리 (매 60초)
  const cleanupInterval = setInterval(() => {
    const removed = tracker.cleanup();
    if (removed > 0) console.log(`  🧹 비활성 세션 ${removed}개 정리`);
  }, 60000);

  server.listen(cfg.port, cfg.host, () => {
    console.log(`\n  🦔 CS Quill Daemon — ws://${cfg.host}:${cfg.port}`);
    console.log(`  HTTP: http://${cfg.host}:${cfg.port}/health`);
    console.log(`  WebSocket: ws://${cfg.host}:${cfg.port}`);
    console.log(`  REST: POST http://${cfg.host}:${cfg.port}/analyze`);
    console.log(`\n  Ctrl+C 로 종료\n`);
  });

  return {
    stop: () => {
      clearInterval(cleanupInterval);
      for (const s of tracker.getAll()) tracker.remove(s.id);
      server.close();
    },
  };
}

// 프레임 크기 계산 헬퍼
function calculateFrameSize(buffer: Buffer): number {
  if (buffer.length < 2) return 0;
  const masked = (buffer[1] & 0x80) !== 0;
  let payloadLength = buffer[1] & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return 0;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return 0;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  if (masked) offset += 4;
  return offset + payloadLength;
}

// IDENTITY_SEAL: PART-5 | role=daemon-server | inputs=DaemonConfig | outputs={stop}
