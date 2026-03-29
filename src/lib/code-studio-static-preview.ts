// ============================================================
// Code Studio — Static Preview (iframe-based, no server)
// ============================================================

import type { FileNode } from './code-studio-types';

/* ── Types ── */

export interface PreviewConfig {
  width: number;
  height: number;
  scale: number;
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshDebounceMs: number;
}

export interface PreviewState {
  html: string;
  blobUrl: string | null;
  error: string | null;
  lastUpdated: number;
}

/* ── Defaults ── */

export const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
  width: 375,
  height: 667,
  scale: 1,
  theme: 'light',
  autoRefresh: true,
  refreshDebounceMs: 500,
};

/* ── Build preview HTML ── */

export function buildPreviewHtml(files: FileNode[]): string {
  const htmlFile = findFile(files, 'index.html');
  const cssFiles = findFilesByExt(files, ['css', 'scss']);
  const jsFiles = findFilesByExt(files, ['js', 'ts', 'jsx', 'tsx']);

  if (htmlFile) {
    let html = htmlFile.content ?? '';
    // Inject CSS inline
    for (const css of cssFiles) {
      if (css.content) {
        html = html.replace('</head>', `<style>${css.content}</style></head>`);
      }
    }
    // Inject JS inline
    for (const js of jsFiles) {
      if (js.content && js.name !== 'main.tsx' && js.name !== 'main.ts') {
        html = html.replace('</body>', `<script>${js.content}<\/script></body>`);
      }
    }
    return html;
  }

  // No HTML file — build from scratch
  const css = cssFiles.map((f) => f.content ?? '').join('\n');
  const js = jsFiles.map((f) => f.content ?? '').join('\n');

  return `<!doctype html>
<html>
<head><meta charset="UTF-8"><style>${css}</style></head>
<body>
<div id="root"></div>
<div id="app"></div>
<script>${js}<\/script>
</body>
</html>`;
}

function findFile(nodes: FileNode[], name: string): FileNode | undefined {
  for (const n of nodes) {
    if (n.type === 'file' && n.name === name) return n;
    if (n.children) {
      const found = findFile(n.children, name);
      if (found) return found;
    }
  }
  return undefined;
}

function findFilesByExt(nodes: FileNode[], exts: string[]): FileNode[] {
  const result: FileNode[] = [];
  for (const n of nodes) {
    if (n.type === 'file') {
      const ext = n.name.split('.').pop()?.toLowerCase() ?? '';
      if (exts.includes(ext)) result.push(n);
    }
    if (n.children) result.push(...findFilesByExt(n.children, exts));
  }
  return result;
}

/* ── Blob URL management ── */

export function createPreviewBlobUrl(html: string): string {
  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

export function revokePreviewBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function createPreviewState(files: FileNode[]): PreviewState {
  try {
    const html = buildPreviewHtml(files);
    const blobUrl = typeof URL !== 'undefined' ? createPreviewBlobUrl(html) : null;
    return { html, blobUrl, error: null, lastUpdated: Date.now() };
  } catch (err) {
    return { html: '', blobUrl: null, error: err instanceof Error ? err.message : String(err), lastUpdated: Date.now() };
  }
}

// IDENTITY_SEAL: role=StaticPreview | inputs=FileNode[] | outputs=PreviewState,html
