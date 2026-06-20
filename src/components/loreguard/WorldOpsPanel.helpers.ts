import { L4 } from "@/lib/i18n";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";

export type WorldOpsView = "sim" | "timeline" | "map";

export interface SimCiv { name: string; era: string; traits: string[] }
export interface SimRel { from: string; to: string; type: string }
export interface SimResult { scenario: string; civs: SimCiv[]; rels: SimRel[] }

export interface RippleFinding { tone: "blue" | "amber"; text: string }
export interface ConflictFinding { text: string }

export function computeRipples(
  result: SimResult,
  worldSimData: StoryConfig["worldSimData"],
  language: AppLanguage,
): { findings: RippleFinding[]; hasBaseline: boolean } {
  const existingCivs = worldSimData?.civs ?? [];
  const existingRels = worldSimData?.relations ?? [];
  const hasBaseline = existingCivs.length > 0 || existingRels.length > 0;
  if (!hasBaseline) return { findings: [], hasBaseline };

  const findings: RippleFinding[] = [];
  const civNames = new Set(existingCivs.map((c) => c.name.trim()));
  const relMap = new Map<string, string>(
    existingRels.map((r) => [`${r.fromName.trim()}→${r.toName.trim()}`, r.type]),
  );

  for (const civ of result.civs) {
    if (!civNames.has(civ.name.trim())) {
      findings.push({
        tone: "blue",
        text: L4(language, {
          ko: `신규 세력 등장: ${civ.name} (${civ.era})`,
          en: `New faction appears: ${civ.name} (${civ.era})`,
          ja: `新勢力の登場: ${civ.name} (${civ.era})`,
          zh: `新势力出现: ${civ.name} (${civ.era})`,
        }),
      });
    }
  }
  for (const rel of result.rels) {
    const key = `${rel.from.trim()}→${rel.to.trim()}`;
    const prev = relMap.get(key);
    if (prev !== undefined && prev !== rel.type) {
      findings.push({
        tone: "amber",
        text: L4(language, {
          ko: `관계 변화: ${rel.from}→${rel.to} — 기존 "${prev}" → 시나리오 후 "${rel.type}"`,
          en: `Relation shift: ${rel.from}→${rel.to} — "${prev}" → "${rel.type}"`,
          ja: `関係の変化: ${rel.from}→${rel.to} — 既存「${prev}」→「${rel.type}」`,
          zh: `关系变化: ${rel.from}→${rel.to} — 原"${prev}" → "${rel.type}"`,
        }),
      });
    } else if (prev === undefined) {
      findings.push({
        tone: "blue",
        text: L4(language, {
          ko: `신규 관계: ${rel.from}→${rel.to} (${rel.type})`,
          en: `New relation: ${rel.from}→${rel.to} (${rel.type})`,
          ja: `新しい関係: ${rel.from}→${rel.to} (${rel.type})`,
          zh: `新关系: ${rel.from}→${rel.to} (${rel.type})`,
        }),
      });
    }
  }
  return { findings, hasBaseline };
}

export function computeConflicts(result: SimResult, language: AppLanguage): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const names = new Set(result.civs.map((civ) => civ.name.trim()));
  for (const rel of result.rels) {
    for (const end of [rel.from, rel.to]) {
      if (!names.has(end.trim())) {
        findings.push({
          text: L4(language, {
            ko: `관계 "${rel.from}→${rel.to}: ${rel.type}" 가 문명 목록에 없는 세력 "${end}" 를 참조`,
            en: `Relation "${rel.from}→${rel.to}: ${rel.type}" references unknown faction "${end}"`,
            ja: `関係「${rel.from}→${rel.to}: ${rel.type}」が文明一覧にない勢力「${end}」を参照`,
            zh: `关系"${rel.from}→${rel.to}: ${rel.type}"引用了文明列表外的势力"${end}"`,
          }),
        });
      }
    }
  }

  const pairTypes = new Map<string, Set<string>>();
  for (const rel of result.rels) {
    const key = `${rel.from.trim()}→${rel.to.trim()}`;
    const set = pairTypes.get(key) ?? new Set<string>();
    set.add(rel.type);
    pairTypes.set(key, set);
  }
  for (const [key, types] of pairTypes) {
    if (types.size > 1) {
      findings.push({
        text: L4(language, {
          ko: `동일 세력쌍 ${key} 에 상충 관계 ${types.size}건: ${Array.from(types).join(" vs ")}`,
          en: `Conflicting relations for ${key}: ${Array.from(types).join(" vs ")}`,
          ja: `同一勢力ペア ${key} に矛盾する関係: ${Array.from(types).join(" vs ")}`,
          zh: `同一势力对 ${key} 存在冲突关系: ${Array.from(types).join(" vs ")}`,
        }),
      });
    }
  }
  return findings;
}

export function yearSortKey(year: string): number {
  const match = year.match(/-?\d+/);
  return match ? parseInt(match[0], 10) : Number.POSITIVE_INFINITY;
}

export function splitPeople(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}
