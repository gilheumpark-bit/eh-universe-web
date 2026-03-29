// ============================================================
// Code Studio — Project Sharing
// ============================================================
// 공유 링크 생성, 프로젝트를 base64 인코딩, 공유 링크에서 임포트.

import type { FileNode } from './code-studio-types';

export interface SharedProject {
  version: 1;
  name: string;
  files: FileNode[];
  createdAt: number;
  author?: string;
}

/** Encode project files as a shareable base64 string */
export function encodeProject(name: string, files: FileNode[], author?: string): string {
  const data: SharedProject = {
    version: 1,
    name,
    files: stripContentForSharing(files),
    createdAt: Date.now(),
    author,
  };

  const json = JSON.stringify(data);
  // Use TextEncoder for proper Unicode handling
  const bytes = new TextEncoder().encode(json);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}

/** Decode a shared project string */
export function decodeProject(encoded: string): SharedProject | null {
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as SharedProject;

    if (data.version !== 1 || !data.name || !Array.isArray(data.files)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Generate a shareable URL */
export function generateShareUrl(name: string, files: FileNode[]): string {
  const encoded = encodeProject(name, files);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/code-studio?share=${encoded}`;
}

/** Import from a share URL parameter */
export function importFromShareUrl(url: string): SharedProject | null {
  try {
    const urlObj = new URL(url);
    const encoded = urlObj.searchParams.get('share');
    if (!encoded) return null;
    return decodeProject(encoded);
  } catch {
    return null;
  }
}

/** Strip large file contents for sharing (limit per file) */
function stripContentForSharing(nodes: FileNode[], maxContentSize = 100_000): FileNode[] {
  return nodes.map(node => {
    if (node.type === 'file') {
      const content = node.content ?? '';
      return {
        ...node,
        content: content.length > maxContentSize
          ? content.slice(0, maxContentSize) + '\n// [truncated for sharing]'
          : content,
      };
    }
    if (node.children) {
      return { ...node, children: stripContentForSharing(node.children, maxContentSize) };
    }
    return node;
  });
}

/** Estimate shared project size in bytes */
export function estimateShareSize(files: FileNode[]): number {
  const encoded = encodeProject('test', files);
  return encoded.length;
}

// IDENTITY_SEAL: role=Share | inputs=name,files | outputs=string,SharedProject
