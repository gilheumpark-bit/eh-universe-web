import type { Message } from '@/lib/studio-types';

// ============================================================
// PART 1 — 타입 정의
// ============================================================

export interface NoaContinuationContextInput {
  tabKey: string;
  projectId?: string | null;
  sessionMessages?: readonly Pick<Message, 'role' | 'content' | 'timestamp'>[] | null;
  workJournalText?: string | null;
  maxMessages?: number;
}

export interface NoaContinuationContext {
  block: string;
  sourceCount: number;
  hasStoredBasis: boolean;
}

// ============================================================
// PART 2 — helpers
// ============================================================

function compactText(input: string, max = 220): string {
  const value = input.replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
}

function roleKo(role: string): string {
  if (role === 'user') return '사용자';
  if (role === 'assistant') return '노아';
  return '시스템';
}

function readStoredMessages(
  messages: readonly Pick<Message, 'role' | 'content' | 'timestamp'>[],
  maxMessages: number,
): string[] {
  return messages
    .filter((message) => typeof message.content === 'string' && message.content.trim().length > 0)
    .slice(-Math.max(0, maxMessages))
    .map((message) => `- ${roleKo(message.role)}: ${compactText(message.content)}`);
}

// ============================================================
// PART 3 — main builder
// ============================================================

export function buildNoaContinuationContext(
  input: NoaContinuationContextInput,
): NoaContinuationContext {
  const maxMessages = input.maxMessages ?? 6;
  const storedMessages = readStoredMessages(input.sessionMessages ?? [], maxMessages);
  const workJournalText = input.workJournalText?.trim() ?? '';
  const lines: string[] = [];

  if (workJournalText) {
    lines.push(`- 작업노트: ${compactText(workJournalText, 180)}`);
  }
  if (storedMessages.length > 0) {
    lines.push('- 저장된 대화 노트:', ...storedMessages);
  }

  if (lines.length === 0) {
    return { block: '', sourceCount: 0, hasStoredBasis: false };
  }

  const projectLine = input.projectId ? `프로젝트 ${input.projectId}` : '프로젝트 미지정';
  return {
    block: [
      '[저장된 작업노트 기반 이어가기]',
      `- 범위: ${projectLine} · ${input.tabKey}`,
      ...lines,
      '- 원칙: 위 기록에 없는 내용은 기억으로 단정하지 말고 사용자에게 확인한다.',
    ].join('\n'),
    sourceCount: lines.length,
    hasStoredBasis: true,
  };
}
