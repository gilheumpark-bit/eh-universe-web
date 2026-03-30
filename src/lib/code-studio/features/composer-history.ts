// ============================================================
// Code Studio — Composer Session History
// ============================================================

const STORAGE_KEY = 'eh_composer_history';
const MAX_SESSIONS = 50;

/* ── Types ── */

export interface ComposerFileEdit {
  path: string;
  beforeContent: string;
  afterContent: string;
}

export interface ComposerSession {
  id: string;
  name: string;
  prompt: string;
  edits: ComposerFileEdit[];
  createdAt: number;
  updatedAt: number;
}

/* ── Storage ── */

function loadSessions(): ComposerSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ComposerSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ComposerSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
}

/* ── Public API ── */

export function createSession(name: string, prompt: string): ComposerSession {
  const session: ComposerSession = {
    id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    prompt,
    edits: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

export function addEdit(sessionId: string, edit: ComposerFileEdit): void {
  const sessions = loadSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.edits.push(edit);
    session.updatedAt = Date.now();
    saveSessions(sessions);
  }
}

export function getSessions(): ComposerSession[] {
  return loadSessions();
}

export function getSession(id: string): ComposerSession | undefined {
  return loadSessions().find((s) => s.id === id);
}

export function deleteSession(id: string): void {
  saveSessions(loadSessions().filter((s) => s.id !== id));
}

export function replaySession(session: ComposerSession): ComposerFileEdit[] {
  return [...session.edits];
}

// IDENTITY_SEAL: role=ComposerHistory | inputs=session data | outputs=ComposerSession[]
