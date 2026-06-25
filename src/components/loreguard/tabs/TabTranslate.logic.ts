import type { EpisodeManuscript, StoryConfig, TranslatedManuscriptEntry } from "@/lib/studio-types";
import type { Segment } from "./TabTranslate.shared";

// ============================================================
// PART 1 — 타입 + 상수 (UI 전용 — mock 데이터 제거됨)
// ============================================================

// 문장 단위 분해 — 원문 manuscript.content → Segment[].
// 한국어 종결부호(. ! ? … " ") + 줄바꿈 기준 split. 대사("…") heading(숫자 prefix) 식별.
// export: 회귀 테스트(왕복 비멱등 재현) 전용.
export function splitIntoSegments(content: string): Segment[] {
  if (!content || !content.trim()) return [];
  const out: Segment[] = [];
  // 줄 단위로 먼저 나누고, 각 줄을 문장부호로 재분해
  const lines = content.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let idx = 0;
  for (const line of lines) {
    // 문장 분해: 종결부호 뒤에서 끊되 부호는 유지
    const sentences = line.match(/[^.!?…。！？]+[.!?…。！？]*["”』」]?|[^.!?…。！？]+$/g) || [line];
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s) continue;
      const isDialogue = /^["“『「]/.test(s);
      const isHeading = /^\s*\d{1,3}[.\-:\s]/.test(s) && s.length < 40;
      out.push({
        id: "s" + idx++,
        kind: isHeading ? "heading" : isDialogue ? "dialogue" : undefined,
        ko: s,
        status: "pending",
        terms: [],
      });
    }
  }
  return out;
}

// ── [W2-translate 2026-06-11] 저장 본문 → 세그먼트 버퍼 매핑 (멱등 우선) ──
// stored.translatedContent 는 확정 세그먼트 txt 를 "\n\n" 으로 결합한 값이다.
// segmentBoundaries(결합에 쓴 id+len)가 있으면 길이 기준 정확 슬라이스 → 왕복 멱등
// (splitIntoSegments 비멱등 재분해로 multi-sentence 세그먼트가 더 쪼개지는 오염을 차단).
// boundaries 부재(레거시)·불일치 시 기존 best-effort 위치 매핑 + 꼬리 흡수 fallback.
// segIds = 현재 회차 세그먼트 id 순서. 반환: { [segId]: translatedText } (확정분만).
// export: 회귀 테스트(round-trip 멱등) 전용 — 컴포넌트 렌더 없이 순수 검증.
export const SEG_JOIN = "\n\n";
export function mapStoredToSegments(
  storedContent: string,
  boundaries: { id: string; len: number }[] | undefined,
  segIds: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!storedContent) return out;
  const segIdSet = new Set(segIds);
  // 1) 멱등 경로 — boundaries 가 현재 세그먼트와 정합하면 길이로 정확 복원.
  if (boundaries && boundaries.length > 0) {
    const expectedLen =
      boundaries.reduce((sum, b) => sum + b.len, 0) + SEG_JOIN.length * (boundaries.length - 1);
    const allKnown = boundaries.every((b) => segIdSet.has(b.id));
    if (allKnown && expectedLen === storedContent.length) {
      let cursor = 0;
      for (let i = 0; i < boundaries.length; i++) {
        const b = boundaries[i];
        const txt = storedContent.slice(cursor, cursor + b.len);
        if (txt) out[b.id] = txt;
        cursor += b.len + SEG_JOIN.length; // 다음 조각 앞 구분자 스킵
      }
      return out;
    }
    // boundaries 가 있으나 불일치 — 본문 신뢰 우선으로 fallback 진입 (truncate 방지).
  }
  // 2) Fallback — 위치 기반 splitIntoSegments + 마지막 세그먼트 꼬리 흡수(초과분 보존).
  const pieces = splitIntoSegments(storedContent);
  const lastIdx = segIds.length - 1;
  segIds.forEach((id, i) => {
    const txt =
      i === lastIdx
        ? pieces
            .slice(i)
            .map((p) => p.ko)
            .filter(Boolean)
            .join(" ")
        : pieces[i]?.ko;
    if (txt) out[id] = txt;
  });
  return out;
}

// ── [W2-translate 2026-06-11] 번역 엔트리 upsert 순수 코어 (사인오프 dirty 게이트) ──
// computeTranslatedManuscripts 의 의사결정 본체를 순수 함수로 분리 — 컴포넌트 closure
// (activeManuscript/segments/glossary 등)는 인자로 주입. 사인오프 리셋은 *명시적 편집
// 플래그(dirty)* 로만 발동(구 비멱등 직렬화 비교 제거). 회귀 테스트가 렌더 없이 검증한다.
// 반환 null = 변경 없음(엔트리 미존재 제거 불필요 / 고아 회차). 그 외 = 다음 목록.
export function upsertTranslatedEntry(args: {
  prev: StoryConfig;
  episode: number;
  title: string;
  targetLang: "EN" | "JP" | "CN";
  /** 확정(done) 세그먼트를 원문 순서대로 — { id, txt }. */
  ordered: { id: string; txt: string }[];
  avgScore: number | null;
  glossary: { source: string; target: string; locked?: boolean }[];
  /** 실제 사용자 편집 액션 여부 — true 일 때만 기존 엔트리 사인오프 리셋. */
  dirty: boolean;
  /** lastUpdate 주입(테스트 결정성) — 기본 Date.now(). */
  now?: number;
}): TranslatedManuscriptEntry[] | null {
  const { prev, episode, title, targetLang, ordered, avgScore, glossary, dirty } = args;
  const list = prev.translatedManuscripts ?? [];
  const idx = list.findIndex((e) => e.episode === episode && e.targetLang === targetLang);
  if (ordered.length === 0) {
    // 확정 세그먼트가 없으면(되돌리기 등) 기존 엔트리 제거.
    if (idx < 0) return null;
    return list.filter((_, i) => i !== idx);
  }
  // 고아 번역 차단: 해당 회차의 원고(manuscript)가 실제 존재할 때만 upsert.
  const hasManuscript = (prev.manuscripts ?? []).some((m) => m.episode === episode);
  if (!hasManuscript) return null;
  const translatedContent = ordered.map((x) => x.txt).join(SEG_JOIN);
  const segmentBoundaries = ordered.map((x) => ({ id: x.id, len: x.txt.length }));
  const tc = prev.translationConfig;
  const prevEntry = idx >= 0 ? list[idx] : undefined;
  // [W2-translate·깊은 수정] 사인오프 리셋 = 명시적 편집(dirty)일 때만. 신규 엔트리는
  // 보존할 사인오프가 없어 트리거 무관. 저장·복원·네비게이션(dirty=false)은 항상 보존 —
  // 구 비멱등 직렬화 비교(prevEntry.translatedContent !== translatedContent)가 복원 왕복마다
  // 만들던 사인오프 거짓 리셋 + 본문 점진 오염을 제거.
  const resetSignoff = !prevEntry || dirty === true;
  const now = args.now ?? Date.now();
  const entry: TranslatedManuscriptEntry = {
    episode,
    sourceLang: "KO",
    targetLang,
    mode: tc?.mode ?? "fidelity",
    translatedTitle: title,
    translatedContent,
    charCount: translatedContent.length,
    avgScore: avgScore ?? 0,
    band: tc?.band ?? 0.5,
    glossarySnapshot: (tc?.glossary ?? glossary).map((g) => ({ source: g.source, target: g.target, locked: !!g.locked })),
    segmentBoundaries,
    lastUpdate: resetSignoff ? now : prevEntry!.lastUpdate,
    faithfulApproved: resetSignoff ? undefined : prevEntry!.faithfulApproved,
    marketApproved: resetSignoff ? undefined : prevEntry!.marketApproved,
    approvedAt: resetSignoff ? undefined : prevEntry!.approvedAt,
  };
  return idx >= 0 ? list.map((e, i) => (i === idx ? entry : e)) : [...list, entry];
}

// 활성 manuscript 선택 — config.manuscripts 중 config.episode 우선, 없으면 첫 회차.
export function pickActiveManuscript(config: StoryConfig | null): EpisodeManuscript | null {
  const list = config?.manuscripts;
  if (!list || list.length === 0) return null;
  const byEpisode = list.find((m) => m.episode === config?.episode && m.content?.trim());
  if (byEpisode) return byEpisode;
  return list.find((m) => m.content?.trim()) ?? null;
}

// glossary source 용어가 원문에 등장하는지 — 세그먼트 terms 채움
export function termsInText(text: string, glossarySources: string[]): string[] {
  if (!text || glossarySources.length === 0) return [];
  return glossarySources.filter((src) => src && text.includes(src));
}

