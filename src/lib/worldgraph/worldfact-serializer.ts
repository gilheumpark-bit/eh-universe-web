// ============================================================
// WorldFact .md ↔ WorldFactEntry round-trip serializer (지침 포맷)
// 격리: gray-matter(dep)만 사용. markdown-serializer.ts·project-serializer.ts(절대금지8) import 0.
// Phase 0 게이트: parse → serialize → parse 의미 무손실 (front-matter 필드 + 본문 보존).
// ============================================================

import matter from 'gray-matter';
import type { WorldFactEntry, WorldFactFrontMatter } from './types';

// ============================================================
// PART 1 — parse / serialize
// ============================================================

/** WorldFact .md → 구조화 entry. front-matter(YAML) + 본문 verbatim. */
export function parseWorldFact(md: string): WorldFactEntry {
  const parsed = matter(md);
  return {
    frontMatter: parsed.data as WorldFactFrontMatter,
    bodyRaw: parsed.content,
  };
}

/** WorldFactEntry → WorldFact .md. provenance 는 app-layer라 .md 미포함. */
export function serializeWorldFact(entry: WorldFactEntry): string {
  return matter.stringify(entry.bodyRaw, entry.frontMatter as Record<string, unknown>);
}

// ============================================================
// PART 2 — 의미 무손실 round-trip 자기검증 (Phase 0 합격선)
// ============================================================

/** 키 순서 무관 비교용 안정 직렬화 (재귀 정렬). */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      return Object.keys(obj)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = obj[k];
          return acc;
        }, {});
    }
    return val;
  });
}

/**
 * parse→serialize→parse 가 front-matter(필드·중첩·순서무관) + 본문(trim) 동일이면 true.
 * 공백·정렬·주석 차는 허용(의미 무손실 정의), 내용/참조/구조 손실은 false.
 */
export function roundTripStable(md: string): boolean {
  const a = parseWorldFact(md);
  const b = parseWorldFact(serializeWorldFact(a));
  return (
    stableStringify(a.frontMatter) === stableStringify(b.frontMatter) &&
    a.bodyRaw.trim() === b.bodyRaw.trim()
  );
}
