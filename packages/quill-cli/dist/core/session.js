"use strict";
// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Session Manager
// ============================================================
// 작업 상태 저장 / 복원. CLI 세션 관리.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.loadSession = loadSession;
exports.updateSession = updateSession;
exports.deleteSession = deleteSession;
exports.listSessions = listSessions;
exports.getCurrentSession = getCurrentSession;
exports.ensureSession = ensureSession;
exports.recordCommand = recordCommand;
exports.recordFile = recordFile;
exports.recordReceipt = recordReceipt;
exports.recordScore = recordScore;
exports.getSessionSummary = getSessionSummary;
const fs_1 = require("fs");
const path_1 = require("path");
const config_1 = require("./config");
// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=Session
// ============================================================
// PART 2 — Storage
// ============================================================
function getSessionDir() {
    return (0, path_1.join)((0, config_1.getGlobalConfigDir)(), 'sessions');
}
function getSessionPath(id) {
    return (0, path_1.join)(getSessionDir(), `${id}.json`);
}
function generateSessionId() {
    return `session-${Date.now().toString(36)}`;
}
// IDENTITY_SEAL: PART-2 | role=storage | inputs=none | outputs=paths
// ============================================================
// PART 3 — CRUD
// ============================================================
function createSession(projectPath) {
    const session = {
        id: generateSessionId(),
        projectPath,
        projectName: projectPath.split(/[/\\]/).pop() ?? 'unknown',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastCommand: 'init',
        openFiles: [],
        receipts: [],
    };
    (0, fs_1.mkdirSync)(getSessionDir(), { recursive: true });
    (0, fs_1.writeFileSync)(getSessionPath(session.id), JSON.stringify(session, null, 2));
    return session;
}
function loadSession(id) {
    const path = getSessionPath(id);
    if (!(0, fs_1.existsSync)(path))
        return null;
    try {
        return JSON.parse((0, fs_1.readFileSync)(path, 'utf-8'));
    }
    catch {
        return null;
    }
}
function updateSession(id, updates) {
    const session = loadSession(id);
    if (!session)
        return;
    Object.assign(session, updates, { updatedAt: Date.now() });
    (0, fs_1.writeFileSync)(getSessionPath(id), JSON.stringify(session, null, 2));
}
function deleteSession(id) {
    const path = getSessionPath(id);
    if (!(0, fs_1.existsSync)(path))
        return false;
    (0, fs_1.unlinkSync)(path);
    return true;
}
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30일
function listSessions() {
    const dir = getSessionDir();
    if (!(0, fs_1.existsSync)(dir))
        return [];
    const now = Date.now();
    const sessions = (0, fs_1.readdirSync)(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
        try {
            return { session: JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(dir, f), 'utf-8')), file: f };
        }
        catch {
            return null;
        }
    })
        .filter((s) => s !== null);
    // 만료 세션 자동 정리
    const active = [];
    for (const { session, file } of sessions) {
        if (now - session.updatedAt > SESSION_TTL) {
            try {
                (0, fs_1.unlinkSync)((0, path_1.join)(dir, file));
            }
            catch { /* skip */ }
        }
        else {
            active.push(session);
        }
    }
    return active.sort((a, b) => b.updatedAt - a.updatedAt);
}
// IDENTITY_SEAL: PART-3 | role=crud | inputs=Session | outputs=Session
// ============================================================
// PART 4 — Auto Session (현재 프로젝트)
// ============================================================
let _currentSessionId = null;
function getCurrentSession() {
    if (_currentSessionId)
        return loadSession(_currentSessionId);
    const projectPath = process.cwd();
    const sessions = listSessions();
    const existing = sessions.find(s => s.projectPath === projectPath);
    if (existing) {
        _currentSessionId = existing.id;
        return existing;
    }
    return null;
}
function ensureSession() {
    const current = getCurrentSession();
    if (current)
        return current;
    const session = createSession(process.cwd());
    _currentSessionId = session.id;
    return session;
}
function recordCommand(command) {
    const session = ensureSession();
    updateSession(session.id, { lastCommand: command });
}
function recordFile(filePath) {
    const session = ensureSession();
    const files = new Set(session.openFiles);
    files.add(filePath);
    // Keep last 20
    const arr = [...files].slice(-20);
    updateSession(session.id, { openFiles: arr });
}
function recordReceipt(receiptId) {
    const session = ensureSession();
    const receipts = [...session.receipts, receiptId].slice(-50);
    updateSession(session.id, { receipts });
}
function recordScore(type, score) {
    const session = ensureSession();
    if (type === 'verify')
        updateSession(session.id, { lastVerifyScore: score });
    else
        updateSession(session.id, { lastPlaygroundScore: score });
}
// IDENTITY_SEAL: PART-4 | role=auto-session | inputs=command | outputs=Session
// ============================================================
// PART 5 — Session Summary
// ============================================================
function getSessionSummary(id) {
    const session = id ? loadSession(id) : getCurrentSession();
    if (!session)
        return '  세션 없음\n';
    const age = Date.now() - session.createdAt;
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    const hours = Math.floor((age % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((age % (60 * 60 * 1000)) / (60 * 1000));
    const lines = [
        `  📂 ${session.projectName}`,
        `  ID: ${session.id}`,
        `  기간: ${days > 0 ? days + '일 ' : ''}${hours > 0 ? hours + '시간 ' : ''}${minutes}분`,
        `  마지막: ${session.lastCommand}`,
        `  파일: ${session.openFiles.length}개`,
        `  영수증: ${session.receipts.length}개`,
    ];
    if (session.lastVerifyScore !== undefined) {
        lines.push(`  검증: ${session.lastVerifyScore}/100`);
    }
    if (session.lastPlaygroundScore !== undefined) {
        lines.push(`  벤치: ${session.lastPlaygroundScore}/100`);
    }
    return lines.join('\n');
}
// IDENTITY_SEAL: PART-5 | role=summary | inputs=id | outputs=string
