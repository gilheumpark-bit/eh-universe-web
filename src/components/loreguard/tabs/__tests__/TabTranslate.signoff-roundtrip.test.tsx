/**
 * TabTranslate — [W2-translate 2026-06-11] 사인오프 회차 왕복 보존 + 편집 시에만 리셋 회귀.
 *
 * 배경(깊은 버그): persist 는 확정 세그먼트 txt 를 "\n\n" 으로 결합(translatedContent),
 * restore 는 splitIntoSegments 로 재분해했다. splitIntoSegments 왕복은 *비멱등* — multi-
 * sentence 세그먼트("A. B.")가 더 많은 조각으로 재분해되어 위치 1:1 매핑이 깨졌다. 이 비멱등
 * 직렬화를 사인오프 리셋 트리거(contentChanged = prevEntry.translatedContent !== derived)로
 * 쓴 탓에, 순수 네비게이션·저장·복원만으로도 contentChanged 거짓 true → 작가 사인오프
 * (faithful/market/approvedAt)가 조용히 취소되고 본문이 매 사이클 점진 오염됐다.
 *
 * 수리: ① 사인오프 리셋 = 명시적 사용자 편집 플래그(dirty)일 때만(upsertTranslatedEntry).
 *       ② segmentBoundaries(id+len) 영속 → 복원은 길이 슬라이스(mapStoredToSegments)로 멱등.
 *
 * 본 테스트는 컴포넌트 렌더 없이 분리된 순수 코어로 persist→restore→save 왕복을 재현한다.
 */
import {
  splitIntoSegments,
  mapStoredToSegments,
  upsertTranslatedEntry,
  SEG_JOIN,
} from "../TabTranslate";
import type { StoryConfig, TranslatedManuscriptEntry, EpisodeManuscript } from "@/lib/studio-types";

// ── 테스트 픽스처 ───────────────────────────────────────────
// 원문 회차: 세그먼트 3개 — 그 중 가운데가 multi-sentence(번역 결과가 두 문장).
const EPISODE = 7;
const KO_SOURCE = "첫 문장.\n둘째 문단 시작.\n셋째 문장.";

// 번역 결과 — s1 은 두 문장을 담은 multi-sentence 세그먼트(왕복 비멱등 트리거).
const TX: Record<string, string> = {
  "en:s0": "First sentence.",
  "en:s1": "Second one. And more.",
  "en:s2": "Third sentence.",
};

function baseConfig(extra?: Partial<StoryConfig>): StoryConfig {
  const ms: EpisodeManuscript = {
    episode: EPISODE,
    title: "Ep 7",
    content: KO_SOURCE,
    charCount: KO_SOURCE.length,
    lastUpdate: 1000,
  };
  return {
    manuscripts: [ms],
    translatedManuscripts: [],
    ...(extra as object),
  } as unknown as StoryConfig;
}

const SEG_IDS = ["s0", "s1", "s2"];

// persist 코어 호출 — ordered = 확정 세그먼트(원문 순서).
function persist(
  prev: StoryConfig,
  trans: Record<string, string>,
  dirty: boolean,
  now = 5000,
): StoryConfig {
  const ordered = SEG_IDS.map((id) => ({ id, txt: trans["en:" + id] })).filter(
    (x): x is { id: string; txt: string } => !!x.txt,
  );
  const nextTM = upsertTranslatedEntry({
    prev,
    episode: EPISODE,
    title: "Ep 7",
    targetLang: "EN",
    ordered,
    avgScore: 0.9,
    glossary: [],
    dirty,
    now,
  });
  return nextTM === null ? prev : { ...prev, translatedManuscripts: nextTM };
}

// restore 코어 호출 — stored.translatedContent + segmentBoundaries → 세그먼트 버퍼.
function restore(config: StoryConfig): Record<string, string> {
  const stored = (config.translatedManuscripts ?? []).find(
    (e) => e.episode === EPISODE && e.targetLang === "EN",
  );
  if (!stored?.translatedContent) return {};
  const mapped = mapStoredToSegments(stored.translatedContent, stored.segmentBoundaries, SEG_IDS);
  const buf: Record<string, string> = {};
  for (const id of SEG_IDS) if (mapped[id]) buf["en:" + id] = mapped[id];
  return buf;
}

function entryOf(config: StoryConfig): TranslatedManuscriptEntry | undefined {
  return (config.translatedManuscripts ?? []).find(
    (e) => e.episode === EPISODE && e.targetLang === "EN",
  );
}

describe("splitIntoSegments — 왕복 비멱등 재현(버그 전제 증명)", () => {
  it("multi-sentence 세그먼트는 재분해 시 조각 수가 늘어난다(멱등 X)", () => {
    const joined = [TX["en:s0"], TX["en:s1"], TX["en:s2"]].join(SEG_JOIN);
    const pieces = splitIntoSegments(joined);
    // s1 이 "Second one." + "And more." 두 조각으로 쪼개져 총 4 조각 ≠ 원래 3 세그먼트.
    expect(pieces.length).toBeGreaterThan(SEG_IDS.length);
  });
});

describe("W2-translate — 멱등 복원(segmentBoundaries 길이 슬라이스)", () => {
  it("persist→restore 왕복이 multi-sentence 세그먼트를 정확히 보존한다", () => {
    const c1 = persist(baseConfig(), TX, /*dirty*/ true);
    const buf = restore(c1);
    expect(buf).toEqual(TX); // 꼬리 유실/병합 없이 1:1 보존
  });

  it("왕복 후 재-persist 가 translatedContent 를 mutate 하지 않는다(멱등)", () => {
    const c1 = persist(baseConfig(), TX, true, 5000);
    const content1 = entryOf(c1)!.translatedContent;
    const restored = restore(c1);
    // 저장(편집 아님): dirty=false
    const c2 = persist(c1, restored, /*dirty*/ false, 9999);
    expect(entryOf(c2)!.translatedContent).toBe(content1); // 본문 불변
    expect(entryOf(c2)!.segmentBoundaries).toEqual(entryOf(c1)!.segmentBoundaries);
  });
});

describe("W2-translate — 사인오프: 비편집 왕복 보존 / 편집 시에만 리셋", () => {
  // 사인오프 부착 헬퍼 — SignoffPanel(patchChapterAtIndex)이 entry 를 직접 패치하는 흐름 모사.
  function signoff(config: StoryConfig, at = 7777): StoryConfig {
    const list = config.translatedManuscripts ?? [];
    const i = list.findIndex((e) => e.episode === EPISODE && e.targetLang === "EN");
    const next = { ...list[i], faithfulApproved: true, marketApproved: true, approvedAt: at };
    return { ...config, translatedManuscripts: list.map((e, j) => (j === i ? next : e)) };
  }

  it("저장(비편집·dirty=false)은 사인오프를 보존한다 — 핵심 회귀", () => {
    let c = persist(baseConfig(), TX, /*dirty*/ true); // 최초 확정
    c = signoff(c); // 작가 사인오프
    expect(entryOf(c)!.faithfulApproved).toBe(true);

    // 회차 왕복(restore) 후 저장 — 명시적 편집 아님.
    const restored = restore(c);
    const cAfterSave = persist(c, restored, /*dirty*/ false);

    const e = entryOf(cAfterSave)!;
    expect(e.faithfulApproved).toBe(true); // 보존(구버전은 여기서 거짓 리셋)
    expect(e.marketApproved).toBe(true);
    expect(e.approvedAt).toBe(7777);
  });

  it("복원 버퍼로 비편집 재-persist 를 반복해도 사인오프가 살아있다", () => {
    let c = signoff(persist(baseConfig(), TX, true));
    for (let i = 0; i < 5; i++) {
      c = persist(c, restore(c), /*dirty*/ false);
    }
    expect(entryOf(c)!.faithfulApproved).toBe(true);
    expect(entryOf(c)!.approvedAt).toBe(7777);
  });

  it("명시적 편집(dirty=true)은 사인오프를 리셋한다 — 내용 변경 = 재승인 필요", () => {
    let c = signoff(persist(baseConfig(), TX, true));
    expect(entryOf(c)!.faithfulApproved).toBe(true);

    // 한 세그먼트를 실제로 고쳐 다시 확정(편집 액션).
    const edited = { ...TX, "en:s1": "Edited sentence. Plus tail." };
    c = persist(c, edited, /*dirty*/ true);

    const e = entryOf(c)!;
    expect(e.faithfulApproved).toBeUndefined();
    expect(e.marketApproved).toBeUndefined();
    expect(e.approvedAt).toBeUndefined();
    expect(e.translatedContent).toContain("Edited sentence.");
  });

  it("되돌리기(확정 0 + dirty=true)는 엔트리를 제거한다(사인오프 포함)", () => {
    const c = signoff(persist(baseConfig(), TX, true));
    // handleRevert: 모든 확정 폐기 → ordered 0
    const cReverted = persist(c, {}, /*dirty*/ true);
    expect(entryOf(cReverted)).toBeUndefined();
  });
});

describe("W2-translate — 레거시(segmentBoundaries 부재) fallback 안전", () => {
  it("boundaries 없는 저장본도 본문 truncate 없이 복원된다(꼬리 흡수)", () => {
    // 구 엔트리 모사: boundaries 미보유, "\n\n" 결합 본문만.
    const legacyContent = [TX["en:s0"], TX["en:s1"], TX["en:s2"]].join(SEG_JOIN);
    const mapped = mapStoredToSegments(legacyContent, undefined, SEG_IDS);
    // 마지막 세그먼트가 잔여 조각을 흡수 → 전 본문이 어딘가에 보존(유실 0).
    const all = SEG_IDS.map((id) => mapped[id] ?? "").join(" ");
    expect(all).toContain("First sentence.");
    expect(all).toContain("Second one.");
    expect(all).toContain("And more.");
    expect(all).toContain("Third sentence.");
  });

  it("boundaries 불일치(세그먼트 id 변동) 시 fallback 으로 안전 진입", () => {
    const content = [TX["en:s0"], TX["en:s1"]].join(SEG_JOIN);
    // 저장된 boundaries 가 현재 segIds 와 불일치(s9 미존재) → 길이 슬라이스 거부 → fallback.
    const mapped = mapStoredToSegments(
      content,
      [{ id: "s9", len: TX["en:s0"].length }, { id: "s8", len: TX["en:s1"].length }],
      SEG_IDS,
    );
    // fallback 위치 매핑이라도 본문 유실은 없어야 한다.
    const all = SEG_IDS.map((id) => mapped[id] ?? "").join(" ");
    expect(all).toContain("First sentence.");
    expect(all).toContain("Second one.");
  });
});
