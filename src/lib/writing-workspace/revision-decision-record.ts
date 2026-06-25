// ============================================================
// revision-decision-record — 퇴고 보고서 발견 항목 승인/보류 영수증 키 빌더
// React/DOM/storage 의존 0. 저장은 work-receipt-journal 호출자가 담당한다.
// ============================================================

import type { ReceiptDecision } from '@/lib/creative/work-receipt-journal';

export interface RevisionDecisionFinding {
  type: string;
  severity: string;
  location?: string;
  diagnosis?: string;
  suggestion?: string;
}

export interface RevisionFindingKeyInput {
  sessionId: string | null | undefined;
  episode: number | null | undefined;
  index: number;
  finding: RevisionDecisionFinding;
}

export interface RevisionDecisionRecordInput extends RevisionFindingKeyInput {
  decision: ReceiptDecision;
}

export interface RevisionDecisionRecordFromKeyInput {
  decisionKey: string;
  finding: RevisionDecisionFinding;
  decision: ReceiptDecision;
}

export interface RevisionDecisionRecord {
  id: string;
  fixId: string;
  reason: string;
  scoreDelta: null;
}

const MAX_REASON_CHARS = 700;

function safeToken(value: string | number | null | undefined, fallback: string): string {
  const raw = String(value ?? fallback).trim();
  const normalized = raw.replace(/[^a-zA-Z0-9가-힣._-]+/g, '-').replace(/-+/g, '-');
  return normalized.replace(/^-|-$/g, '').slice(0, 64) || fallback;
}

function safeText(value: string | null | undefined, maxChars: number): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}

function hashText(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).padStart(7, '0').slice(-7);
}

function findingSignature(input: RevisionFindingKeyInput): string {
  const f = input.finding;
  return [
    safeToken(f.type, 'finding'),
    safeToken(f.severity, 'level'),
    safeText(f.location, 120),
    safeText(f.diagnosis, 220),
    safeText(f.suggestion, 220),
  ].join('|');
}

export function buildRevisionFindingKey(input: RevisionFindingKeyInput): string {
  const session = safeToken(input.sessionId, 'session-unknown');
  const episode = Number.isFinite(input.episode) ? Math.max(0, Math.round(Number(input.episode))) : 0;
  const index = Number.isFinite(input.index) ? Math.max(0, Math.round(input.index)) : 0;
  const type = safeToken(input.finding.type, 'finding');
  const hash = hashText(findingSignature(input));
  return `revision:${session}:ep${episode}:f${index}:${type}:${hash}`;
}

function buildDecisionReason(finding: RevisionDecisionFinding, decision: ReceiptDecision): string {
  const decisionLabel = decision === 'approved' ? '승인' : '보류';
  const type = safeText(finding.type, 48) || 'finding';
  const severity = safeText(finding.severity, 48) || 'level';
  const location = safeText(finding.location, 120);
  const diagnosis = safeText(finding.diagnosis, 220) || '(진단 없음)';
  const suggestion = safeText(finding.suggestion, 180);
  const detail = [
    `퇴고 보고서 ${decisionLabel}`,
    `${type}/${severity}`,
    location ? `위치: ${location}` : '',
    `진단: ${diagnosis}`,
    suggestion ? `제안 방향: ${suggestion}` : '',
  ].filter(Boolean).join(' — ');
  return safeText(detail, MAX_REASON_CHARS) || `퇴고 보고서 ${decisionLabel}`;
}

export function buildRevisionDecisionRecord(input: RevisionDecisionRecordInput): RevisionDecisionRecord {
  const key = buildRevisionFindingKey(input);

  return {
    id: `${key}:${input.decision}`,
    fixId: key,
    reason: buildDecisionReason(input.finding, input.decision),
    scoreDelta: null,
  };
}

export function buildRevisionDecisionRecordFromKey(
  input: RevisionDecisionRecordFromKeyInput,
): RevisionDecisionRecord {
  const key = safeText(input.decisionKey, 240) || 'revision:session-unknown:ep0:f0:finding';
  return {
    id: `${key}:${input.decision}`,
    fixId: key,
    reason: buildDecisionReason(input.finding, input.decision),
    scoreDelta: null,
  };
}
