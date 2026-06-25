"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Layers } from "lucide-react";
import {
  CHECKLISTS,
  checklistCompleteness,
  evaluateChecklist,
  type ChecklistItem,
  type Domain,
} from "@/lib/creative/quality-checklist";
import {
  isExperienceScore,
  isFidelityScore,
  type ChunkScoreDetail,
} from "@/engine/translation";
import type { PublishAuditFinding } from "@/lib/translation/publish-audit";
import type { SupportedLang } from "@/lib/translation/source-integrity";

export type AuditIssue = {
  id: string;
  type: "warning" | "style" | "info";
  text: string;
  severity: "high" | "medium" | "low";
};

export type AxisRow = { label: string; value: number; hint?: string };

export interface ChecklistContext {
  source: string;
  result: string;
  worldContext: string;
  characterProfiles: string;
  storySummary: string;
  glossary: Record<string, string>;
  chaptersCount: number;
  completedChapters: number;
}

export const CATEGORY_LABEL: Record<PublishAuditFinding["category"], string> = {
  punctuation: "문장부호",
  spacing: "띄어쓰기",
  spelling: "맞춤법",
  structure: "구조",
  consistency: "일관성",
  completeness: "완성도",
};

export function buildAuditIssues(
  source: string,
  result: string,
  chapters: { name: string; content: string; result: string; isDone: boolean }[],
  glossaryText: string,
  glossary: Record<string, string>,
): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const sourceText = source.trim();
  const resultText = result.trim();

  if (sourceText.length > 0 && resultText.length === 0) {
    issues.push({ id: "empty-result", type: "warning", text: "현재 편집 중인 회차에 원문은 있으나 번역문이 비어 있습니다.", severity: "medium" });
  }

  if (sourceText.length > 400 && resultText.length > 0 && resultText.length < sourceText.length * 0.12) {
    issues.push({ id: "short-result", type: "warning", text: "번역문 길이가 원문에 비해 매우 짧습니다. 누락이나 요약 번역 여부를 확인해 보세요.", severity: "medium" });
  }

  const pending = chapters.filter(chapter => (chapter.content || "").trim() && !(chapter.result || "").trim() && !chapter.isDone);
  if (pending.length > 0) {
    issues.push({
      id: "pending-chapters",
      type: "info",
      text: `미번역 회차가 ${pending.length}개 있습니다. (${pending.slice(0, 3).map(chapter => chapter.name).join(", ")}${pending.length > 3 ? "…" : ""})`,
      severity: "low",
    });
  }

  const glossaryLines = glossaryText.split(/\r?\n/).map(line => line.trim()).filter(Boolean).length;
  const dictCount = Object.keys(glossary || {}).length;
  if (glossaryLines >= 3 && dictCount === 0) {
    issues.push({ id: "glossary-orphan", type: "style", text: "용어집(텍스트)에 줄이 있으나 용어 사전 항목이 비어 있습니다. 패널에서 용어를 추가하면 번역 일관성에 도움이 됩니다.", severity: "low" });
  }

  const openJa = (source.match(/「|『|【/g) || []).length;
  const closeJa = (source.match(/」|』|】/g) || []).length;
  if (openJa !== closeJa && openJa + closeJa > 0) {
    issues.push({ id: "bracket-balance", type: "style", text: `원문에 여닫는 괄호/인용부호 개수가 맞지 않을 수 있습니다. (「」류 ${openJa}/${closeJa})`, severity: "low" });
  }

  if (sourceText.length > 100 && resultText.length > 0) {
    const ratio = resultText.length / sourceText.length;
    if (ratio < 0.5) issues.push({ id: "length-too-short", type: "warning", text: `번역문이 원문 대비 ${Math.round(ratio * 100)}% — 심각한 누락 가능`, severity: "high" });
    else if (ratio > 2.5) issues.push({ id: "length-too-long", type: "warning", text: `번역문이 원문 대비 ${Math.round(ratio * 100)}% — 과잉 번역 가능`, severity: "medium" });
  }

  if (resultText.length > 0 && glossary) {
    for (const [src, target] of Object.entries(glossary)) {
      if (sourceText.includes(src) && !resultText.includes(target)) {
        issues.push({ id: `glossary-miss-${src}`, type: "warning", text: `용어 "${src}" → "${target}" 이(가) 번역문에 없습니다.`, severity: "medium" });
      }
    }
  }

  if (resultText.length > 50) {
    const stiffPhrasing = ["것으로 보인다", "하는 것이 가능하다", "에 대하여", "측면에서"];
    for (const pattern of stiffPhrasing) {
      if (resultText.includes(pattern)) {
        issues.push({ id: `translationese-${pattern}`, type: "style", text: `어색한 표현 후보: "${pattern}"`, severity: "low" });
        break;
      }
    }
  }

  if (sourceText.length > 20 && resultText.length > 20) {
    const srcLines = sourceText.split(/\r?\n/).filter(line => line.trim().length > 5);
    const resLines = resultText.split(/\r?\n/).filter(line => line.trim().length > 5);
    let untranslated = 0;
    const checkLen = Math.min(srcLines.length, resLines.length);
    for (let index = 0; index < checkLen; index++) {
      if (srcLines[index].trim() === resLines[index].trim()) untranslated++;
    }
    if (untranslated > 0 && checkLen > 0) {
      const pct = Math.round((untranslated / checkLen) * 100);
      if (pct > 10) {
        issues.push({ id: "untranslated-segments", type: "warning", text: `미번역 세그먼트 ${untranslated}개 감지 (${pct}%) — 원문과 동일한 줄이 있습니다.`, severity: pct > 50 ? "high" : "medium" });
      }
    }
  }

  if (sourceText.length > 10 && resultText.length > 10) {
    const srcNums = (sourceText.match(/\d+/g) ?? []).sort();
    const resNums = (resultText.match(/\d+/g) ?? []).sort();
    const srcSet = new Set(srcNums);
    const resSet = new Set(resNums);
    const missing = srcNums.filter(number => !resSet.has(number));
    const extra = resNums.filter(number => !srcSet.has(number));
    if (missing.length > 0 || extra.length > 0) {
      const parts: string[] = [];
      if (missing.length > 0) parts.push(`누락: ${missing.slice(0, 5).join(", ")}`);
      if (extra.length > 0) parts.push(`추가: ${extra.slice(0, 5).join(", ")}`);
      issues.push({ id: "number-consistency", type: "warning", text: `숫자 불일치 — ${parts.join(" / ")}`, severity: missing.length > 3 ? "high" : "medium" });
    }
  }

  return issues;
}

export function scoreColor(value: number): string {
  if (value >= 80) return "text-accent-green";
  if (value >= 60) return "text-accent-amber";
  return "text-accent-red";
}

export function scoreBarColor(value: number): string {
  if (value >= 80) return "bg-accent-green";
  if (value >= 60) return "bg-accent-amber";
  return "bg-accent-red";
}

export function AxisBar({ row }: { row: AxisRow }) {
  const pct = Math.max(0, Math.min(100, Math.round(row.value)));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-text-secondary">{row.label}</span>
        <span className={`text-[12px] font-mono font-bold ${scoreColor(pct)}`}>{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${scoreBarColor(pct)} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {row.hint ? <span className="text-[9px] text-text-tertiary">{row.hint}</span> : null}
    </div>
  );
}

export function buildAxesFromScore(score: ChunkScoreDetail): AxisRow[] {
  if (isFidelityScore(score)) {
    return [
      { label: "정확성", value: score.fidelity, hint: "원문 충실도" },
      { label: "자연스러움", value: score.naturalness, hint: "타겟어 자연도" },
      { label: "완성도 (자연스러움)", value: 100 - score.translationese, hint: "어색한 표현이 적을수록 좋음" },
      { label: "포맷·일관성", value: score.consistency, hint: "용어·스타일 통일" },
    ];
  }
  if (isExperienceScore(score)) {
    return [
      { label: "몰입도", value: score.immersion },
      { label: "감정 재현", value: score.emotionResonance },
      { label: "문화 적합", value: score.culturalFit },
      { label: "일관성", value: score.consistency },
      { label: "원문 근거", value: score.groundedness },
      { label: "번역자 개입감", value: score.voiceInvisibility },
    ];
  }
  return [];
}

export function SeverityBadge({ severity }: { severity: PublishAuditFinding["severity"] }) {
  const map: Record<PublishAuditFinding["severity"], string> = {
    high: "bg-accent-red/10 border-accent-red/30 text-accent-red",
    medium: "bg-accent-amber/10 border-accent-amber/30 text-accent-amber",
    low: "bg-accent-indigo/10 border-accent-indigo/30 text-accent-indigo",
    info: "bg-white/5 border-white/10 text-text-tertiary",
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase ${map[severity]}`}>
      {severity}
    </span>
  );
}

function hasAny(text: string, keywords: ReadonlyArray<string>): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some(keyword => keyword && lower.includes(keyword.toLowerCase()));
}

function inferPresentIds(ctx: ChecklistContext): Readonly<Record<Domain, string[]>> {
  const world = ctx.worldContext ?? "";
  const chars = ctx.characterProfiles ?? "";
  const story = ctx.storySummary ?? "";
  const source = ctx.source ?? "";
  const result = ctx.result ?? "";
  const glossaryCount = Object.keys(ctx.glossary ?? {}).length;

  const worldIds: string[] = [];
  if (world.trim().length >= 40 || story.trim().length >= 40) worldIds.push("world-premise");
  if (hasAny(world, ["규칙", "제약", "rule", "system", "시스템", "법칙", "능력", "마법", "권능"])) worldIds.push("world-rules");
  if (hasAny(world, ["지도", "지리", "대륙", "왕국", "제국", "세력", "kingdom", "empire", "map", "region"])) worldIds.push("world-geography");
  if (hasAny(world, ["역사", "연대기", "왕조", "전쟁", "건국", "history", "chronicle", "era"])) worldIds.push("world-history");
  if (hasAny(world, ["톤", "분위기", "느낌", "tone", "mood", "atmosphere"]) || world.trim().length >= 200) worldIds.push("world-tone");

  const charIds: string[] = [];
  if (hasAny(chars, ["목표", "욕망", "원하", "goal", "want", "desire", "motivation"])) charIds.push("char-goal");
  if (hasAny(chars, ["결함", "약점", "한계", "flaw", "weakness", "fear"])) charIds.push("char-flaw");
  if (hasAny(chars, ["성장", "변화", "아크", "arc", "growth", "change"])) charIds.push("char-arc");
  if (hasAny(chars, ["말투", "목소리", "어조", "voice", "speech", "tone"])) charIds.push("char-voice");
  if (hasAny(chars, ["관계", "친구", "적", "연인", "relation", "friend", "enemy", "rival"]) || chars.split(/\n/).filter(line => line.trim()).length >= 2) charIds.push("char-relations");

  const sceneIds: string[] = [];
  if (hasAny(story, ["목표", "얻", "goal", "achieve"]) || hasAny(source, ["목표", "결심", "얻으"])) sceneIds.push("scene-goal");
  if (hasAny(story, ["갈등", "대립", "장애", "conflict", "obstacle", "fight"]) || hasAny(source, ["갈등", "맞서", "싸"])) sceneIds.push("scene-conflict");
  if (hasAny(story, ["전환", "반전", "turn", "twist", "reveal"]) || hasAny(source, ["그러나", "하지만", "갑자기"])) sceneIds.push("scene-turn");
  if (hasAny(story, ["배경", "장소", "시간", "setting", "place", "where"]) || hasAny(source, ["에서", "에는"])) sceneIds.push("scene-setting");
  if (source.length >= 50 && /[?!]|[「『"]/.test(source.slice(0, 200))) sceneIds.push("scene-hook");

  const dirIds: string[] = [];
  if (hasAny(result, ["나는", "내가", "내 ", "I ", "I'", "my "]) || hasAny(result, ["그는", "그녀", "he ", "she ", "they "])) dirIds.push("dir-camera");
  if (result.length >= 100) {
    const sentences = result.split(/[.!?。!?…]+/).filter(sentence => sentence.trim().length > 0);
    const avg = sentences.length > 0 ? result.length / sentences.length : 0;
    if (avg > 0 && avg < 120) dirIds.push("dir-pacing");
  }
  if (hasAny(result, ["보았", "보였", "들렸", "향", "냄새", "느꼈", "맛", "see", "saw", "heard", "smell", "taste", "felt", "touch"])) dirIds.push("dir-senses");
  if (result.length >= 100) {
    const tensionMarkers = (result.match(/[!?！?]/g) ?? []).length;
    if (tensionMarkers >= 2) dirIds.push("dir-tension");
  }

  const writeIds: string[] = [];
  if (result.length >= 100) {
    const first = (result.match(/\b(I|me|my|나는|내가)\b/g) ?? []).length;
    const third = (result.match(/\b(he|she|they|그는|그녀)\b/g) ?? []).length;
    if (first === 0 || third === 0 || Math.abs(first - third) > Math.max(first, third) * 0.4) writeIds.push("write-pov");
  }
  if (hasAny(result, ["보았", "들렸", "느꼈", "saw", "heard", "felt", "noticed"]) && result.length >= 200) writeIds.push("write-show");
  if (result.length >= 100) {
    const quotes = (result.match(/["「『""]/g) ?? []).length;
    if (quotes >= 2) writeIds.push("write-dialogue");
  }
  if (result.length >= 200) {
    const words = result.split(/\s+/).filter(word => word.length >= 3);
    const freq = new Map<string, number>();
    for (const word of words) freq.set(word, (freq.get(word) ?? 0) + 1);
    const worst = Math.max(0, ...Array.from(freq.values()));
    if (worst < 8) writeIds.push("write-repetition");
  }
  if (result.length >= 50) {
    const tail = result.slice(-100);
    if (/[?!…]|\.\.\.|[??！。]$/.test(tail)) writeIds.push("write-cliffhanger");
  }

  if (glossaryCount >= 3 && ctx.completedChapters >= 1 && !charIds.includes("char-voice")) {
    charIds.push("char-voice");
  }

  return {
    world: worldIds,
    character: charIds,
    scene: sceneIds,
    direction: dirIds,
    writing: writeIds,
  };
}

const DOMAIN_META: Record<Domain, { label: string; emoji: string; color: string }> = {
  world: { label: "세계관", emoji: "🌍", color: "accent-blue" },
  character: { label: "캐릭터", emoji: "👤", color: "accent-purple" },
  scene: { label: "씬", emoji: "🎬", color: "accent-amber" },
  direction: { label: "연출", emoji: "🎭", color: "accent-indigo" },
  writing: { label: "집필", emoji: "✍️", color: "accent-green" },
};

const DOMAIN_ORDER: ReadonlyArray<Domain> = ["world", "character", "scene", "direction", "writing"];

export function CreativeChecklistSection({ ctx }: { ctx: ChecklistContext }) {
  const [expanded, setExpanded] = useState<Set<Domain>>(new Set());

  const results = useMemo(() => {
    const present = inferPresentIds(ctx);
    return DOMAIN_ORDER.map(domain => {
      const presentIds = present[domain];
      const evalResult = evaluateChecklist(domain, presentIds);
      const completeness = checklistCompleteness(domain, presentIds);
      return { domain, presentIds, ...evalResult, completeness };
    });
  }, [ctx]);

  const overall = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, result) => acc + result.completeness, 0);
    return Math.round(sum / results.length);
  }, [results]);

  const toggle = useCallback((domain: Domain) => {
    setExpanded(previousExpanded => {
      const nextExpanded = new Set(previousExpanded);
      if (nextExpanded.has(domain)) nextExpanded.delete(domain);
      else nextExpanded.add(domain);
      return nextExpanded;
    });
  }, []);

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/10 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-text-secondary">
          <Layers className="w-3.5 h-3.5 text-accent-purple" />
          <span className="text-[12px] font-medium">5 도메인 완성도</span>
          <span className="text-[9px] text-text-tertiary">결정론적 · 휴리스틱</span>
        </div>
        <span className={`text-[11px] font-mono font-bold ${scoreColor(overall)}`}>
          평균 {overall}%
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {results.map(result => {
          const meta = DOMAIN_META[result.domain];
          const items: ReadonlyArray<ChecklistItem> = CHECKLISTS[result.domain];
          const presentSet = new Set(result.presentIds);
          const isOpen = expanded.has(result.domain);
          return (
            <div key={result.domain} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1.5">
              <button
                type="button"
                onClick={() => toggle(result.domain)}
                aria-expanded={isOpen}
                className="min-h-[44px] w-full flex items-center justify-between gap-2 text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13px]" aria-hidden>{meta.emoji}</span>
                  <span className="text-[11px] font-medium text-text-primary truncate">{meta.label}</span>
                  <span className="text-[9px] text-text-tertiary font-mono">
                    {result.passed}/{result.total}
                  </span>
                  {result.missing.length > 0 && (
                    <span className="text-[9px] text-accent-amber font-mono" title={`필수 ${result.missing.length}개 누락`}>
                      필수 {result.missing.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[12px] font-mono font-bold ${scoreColor(result.completeness)}`}>
                    {result.completeness}%
                  </span>
                  <span className={`text-[9px] text-text-tertiary transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
                </div>
              </button>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden" aria-hidden>
                <div className={`h-full ${scoreBarColor(result.completeness)} transition-[width] duration-500`} style={{ width: `${result.completeness}%` }} />
              </div>
              {isOpen && (
                <ul className="space-y-0.5 pt-1">
                  {items.map(item => {
                    const passed = presentSet.has(item.id);
                    return (
                      <li key={item.id} className="flex items-center gap-2 text-[10px]">
                        {passed ? (
                          <CheckCircle className="w-3 h-3 text-accent-green shrink-0" aria-label="충족" />
                        ) : (
                          <AlertTriangle className={`w-3 h-3 shrink-0 ${item.required ? "text-accent-amber" : "text-text-tertiary"}`} aria-label={item.required ? "필수 누락" : "권장 누락"} />
                        )}
                        <span className={passed ? "text-text-secondary" : "text-text-tertiary"}>
                          {item.label}
                        </span>
                        {item.required && !passed && (
                          <span className="text-[8px] text-accent-amber font-mono uppercase ml-auto">필수</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-text-tertiary italic">
        원문·번역문·세계관·캐릭터·줄거리·용어집에서 결정론적으로 추론. 모델 호출 없음.
      </p>
    </div>
  );
}

export function normalizeLang(code: string): SupportedLang {
  const upper = (code || "").toUpperCase();
  if (upper === "KO" || upper === "KR") return "ko";
  if (upper === "JP" || upper === "JA" || upper === "JAPANESE") return "ja";
  if (upper === "CN" || upper === "ZH" || upper === "CHINESE") return "zh";
  return "en";
}
