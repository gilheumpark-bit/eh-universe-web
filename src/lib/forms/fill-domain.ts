// ============================================================
// 도메인 폼 FILL — chat 브레인스토밍 → 도메인 양식 채움 (Phase 1)
// "각 탭: 사용자 채팅 → AI가 양식 채움". localFill(키 없이 동작) / buildPrompt(실 AI).
// provenance origin: ENGINE_DRAFT(AI 초안) → USER(작가 확정). M4 정합.
// ============================================================

import { getDomainForm } from './domain-forms';

export type FormOrigin = 'ENGINE_DRAFT' | 'ENGINE_SUGGEST' | 'USER';

export interface FilledForm {
  domainId: string;
  values: Record<string, string>;
  origin: FormOrigin;
  createdAt: number;
  /** 원본 brainstorm 보존 */
  source: string;
}

// ============================================================
// PART 1 — 유틸
// ============================================================

export function firstSentence(text: string): string {
  const t = text.trim();
  if (!t) return '';
  return (t.split(/(?<=[.!?。])\s|\n/)[0] || t).trim().slice(0, 200);
}

const PENDING = '[확인 필요 — 인터뷰 추가]';

// ============================================================
// PART 2 — 로컬 결정론 채움 (키 없이 흐름 시연)
// ============================================================

/**
 * chat → 도메인 폼 초안(ENGINE_DRAFT). 첫 필드 = 첫 문장, 나머지 = PENDING.
 * 실 AI(generateJsonViaSpark/streamSparkAI) 연결 시 buildDomainFillPrompt + parse 로 교체.
 */
export function localFillDomainForm(domainId: string, chatText: string, now = Date.now()): FilledForm | null {
  const form = getDomainForm(domainId);
  if (!form) return null;
  const first = firstSentence(chatText) || '[확인 필요]';
  const values: Record<string, string> = {};
  form.fields.forEach((f, i) => {
    values[f.key] = i === 0 ? first : PENDING;
  });
  return { domainId, values, origin: 'ENGINE_DRAFT', createdAt: now, source: chatText.trim() };
}

// ============================================================
// PART 3 — 실 AI 프롬프트 + 응답 파싱
// ============================================================

export function buildDomainFillPrompt(domainId: string, chatText: string): string {
  const form = getDomainForm(domainId);
  if (!form) return '';
  const fieldList = form.fields.map((f) => `${f.key}(${f.label})`).join(', ');
  return [
    `너는 한국 웹소설 ${form.label} 설계 보조다. 아래 작가 브레인스토밍을 읽고 ${form.label} 양식을 JSON 으로 채워라.`,
    `필드: ${fieldList}.`,
    `규칙: 추측 금지 — 근거 없는 필드는 빈 문자열. voice/말투 등 작가 craft 영역은 "제안"까지만.`,
    ``,
    `[브레인스토밍]`,
    chatText.trim(),
  ].join('\n');
}

/** AI JSON 응답 → FilledForm (ENGINE_DRAFT). 정의된 필드만 흡수. 실패 시 null. */
export function parseDomainFill(domainId: string, raw: string, chatText: string, now = Date.now()): FilledForm | null {
  const form = getDomainForm(domainId);
  if (!form) return null;
  try {
    const s = raw.indexOf('{');
    const e = raw.lastIndexOf('}');
    if (s < 0 || e < 0) return null;
    const obj = JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>;
    const values: Record<string, string> = {};
    for (const f of form.fields) {
      const v = obj[f.key];
      values[f.key] = typeof v === 'string' ? v : Array.isArray(v) ? v.map(String).join(', ') : '';
    }
    return { domainId, values, origin: 'ENGINE_DRAFT', createdAt: now, source: chatText.trim() };
  } catch {
    return null;
  }
}

// ============================================================
// PART 4 — 사람 확정 + 제목
// ============================================================

/** 작가 확정 → origin USER (canon). */
export function commitFormAsUser(form: FilledForm, now = Date.now()): FilledForm {
  return { ...form, origin: 'USER', createdAt: form.createdAt || now };
}

/** 컨텍스트 표시용 제목 = 첫 필드 값. */
export function formTitle(form: FilledForm): string {
  const def = getDomainForm(form.domainId);
  const firstKey = def?.fields[0]?.key;
  const v = firstKey ? form.values[firstKey] : '';
  return (v && v !== '[확인 필요]') ? v : (def?.label ?? form.domainId);
}
