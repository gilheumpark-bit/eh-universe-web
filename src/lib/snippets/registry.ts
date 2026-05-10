// ============================================================
// registry.ts — 빌트인 + 사용자 스니펫 통합 registry.
// 사용자 스니펫은 localStorage 저장.
// ============================================================

import type { Snippet, SnippetCategory } from './types';
import { BUILTIN_SNIPPETS } from './builtin-snippets';

const USER_STORAGE_KEY = 'loreguard_user_snippets';

function loadUserSnippets(): Snippet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s: unknown): s is Snippet => {
      const o = s as Snippet;
      return Boolean(o && typeof o.id === 'string' && typeof o.prefix === 'string');
    });
  } catch {
    return [];
  }
}

function saveUserSnippets(snippets: Snippet[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(snippets));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// API
// ============================================================

export function getAllSnippets(): Snippet[] {
  return [...BUILTIN_SNIPPETS, ...loadUserSnippets()];
}

export function getSnippetsByCategory(category: SnippetCategory): Snippet[] {
  return getAllSnippets().filter((s) => s.category === category);
}

export function findSnippetByPrefix(prefix: string): Snippet | undefined {
  return getAllSnippets().find((s) => s.prefix === prefix);
}

export function searchSnippets(query: string, language: 'ko' | 'en' | 'ja' | 'zh' = 'ko'): Snippet[] {
  const q = query.trim().toLowerCase();
  if (!q) return getAllSnippets();
  return getAllSnippets().filter((s) => {
    if (s.prefix.toLowerCase().includes(q)) return true;
    const name = s.name[language] ?? s.name.ko;
    return name.toLowerCase().includes(q);
  });
}

export function addUserSnippet(snippet: Omit<Snippet, 'scope'>): boolean {
  const userSnippets = loadUserSnippets();
  const newSnippet: Snippet = { ...snippet, scope: 'user' };
  if (userSnippets.find((s) => s.id === snippet.id)) return false; // 중복
  return saveUserSnippets([...userSnippets, newSnippet]);
}

export function removeUserSnippet(id: string): boolean {
  const userSnippets = loadUserSnippets();
  return saveUserSnippets(userSnippets.filter((s) => s.id !== id));
}

/** 본문에 삽입할 텍스트 — placeholder 를 첫 placeholder 텍스트로 변환 */
export function expandSnippet(snippet: Snippet): string {
  // ${1:placeholder} → placeholder
  return snippet.body.replace(/\$\{\d+:([^}]+)\}/g, '$1');
}
