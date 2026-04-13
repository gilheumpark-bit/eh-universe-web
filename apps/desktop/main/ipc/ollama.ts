/**
 * apps/desktop/main/ipc/ollama.ts
 *
 * Ollama local model management IPC.
 * Handles model discovery, health checks, and model pulling.
 */

import { ipcMain, type WebContents } from 'electron';
import { getKey } from './keystore';

// ============================================================
// PART 1 — Ollama API helpers
// ============================================================

async function getBaseUrl(): Promise<string> {
  try {
    const stored = await getKey('ollama');
    if (stored) return stored.replace(/\/+$/, '');
  } catch {
    // keystore may not be ready
  }
  return 'http://localhost:11434';
}

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

async function listModels(baseUrl: string): Promise<OllamaModel[]> {
  const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Ollama list failed: ${res.status}`);
  const data = await res.json() as { models?: OllamaModel[] };
  return data.models ?? [];
}

async function healthCheck(baseUrl: string): Promise<{ ok: boolean; version?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/version`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false };
    const data = await res.json() as { version?: string };
    return { ok: true, version: data.version };
  } catch {
    return { ok: false };
  }
}

async function modelInfo(baseUrl: string, modelName: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${baseUrl}/api/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ============================================================
// PART 2 — Model pull with progress streaming
// ============================================================

interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  percent?: number;
}

async function pullModel(
  sender: WebContents,
  baseUrl: string,
  modelName: string,
  requestId: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: true }),
  });

  if (!res.ok || !res.body) {
    sender.send(`ollama:pull-error:${requestId}`, `Pull failed: ${res.status}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const progress = JSON.parse(line) as PullProgress;
          if (progress.total && progress.completed) {
            progress.percent = Math.round((progress.completed / progress.total) * 100);
          }
          sender.send(`ollama:pull-progress:${requestId}`, progress);
        } catch {
          // Malformed JSON line — skip
        }
      }
    }
    sender.send(`ollama:pull-done:${requestId}`);
  } catch (err) {
    sender.send(`ollama:pull-error:${requestId}`, (err as Error).message);
  }
}

// ============================================================
// PART 3 — IPC registration
// ============================================================

let registered = false;

export function registerOllamaIpc(): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('ollama:health-check', async (_event, baseUrl?: string) => {
    return healthCheck(baseUrl ?? await getBaseUrl());
  });

  ipcMain.handle('ollama:list-models', async (_event, baseUrl?: string) => {
    try {
      return await listModels(baseUrl ?? await getBaseUrl());
    } catch (err) {
      return { error: (err as Error).message, models: [] };
    }
  });

  ipcMain.handle('ollama:model-info', async (_event, modelName: string, baseUrl?: string) => {
    return modelInfo(baseUrl ?? await getBaseUrl(), modelName);
  });

  ipcMain.handle('ollama:pull-model', async (event, baseUrl: string, modelName: string) => {
    const requestId = `pull-${Date.now()}`;
    const url = baseUrl || await getBaseUrl();
    void pullModel(event.sender, url, modelName, requestId);
    return { requestId };
  });
}
