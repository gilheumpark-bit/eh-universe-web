import type { Message, StoryConfig } from "@/lib/studio-types";

const MAX_SIM_JSON = 6000;

function section(title: string, body: string | undefined): string | null {
  if (!body?.trim()) return null;
  return `## ${title}\n${body.trim()}`;
}

/** Scene direction / 연출 데이터 — RAG용 텍스트 요약 */
function sceneDirectionToText(sd: NonNullable<StoryConfig["sceneDirection"]>): string {
  const lines: string[] = [];
  if (sd.plotStructure?.trim()) lines.push(`Plot: ${sd.plotStructure.trim()}`);
  if (sd.writerNotes?.trim()) lines.push(`Notes: ${sd.writerNotes.trim()}`);
  if (sd.foreshadows?.length) {
    lines.push(
      "Foreshadows:\n" +
        sd.foreshadows
          .slice(0, 12)
          .map((f) => `- ${f.planted} → ${f.payoff} (ep.${f.episode})`)
          .join("\n"),
    );
  }
  if (sd.tensionCurve?.length) {
    lines.push(
      "Tension:\n" +
        sd.tensionCurve
          .slice(0, 16)
          .map((t) => `- ${t.label ?? t.position}: ${t.level}`)
          .join("\n"),
    );
  }
  return lines.join("\n\n");
}

function compactWorldSimJson(config: StoryConfig): string | null {
  const raw = config.worldSimData;
  if (!raw || typeof raw !== "object") return null;
  try {
    let s = JSON.stringify(raw);
    if (s.length > MAX_SIM_JSON) {
      s = s.slice(0, MAX_SIM_JSON) + `\n… [truncated ${s.length - MAX_SIM_JSON} chars]`;
    }
    return s;
  } catch {
    return null;
  }
}

export function buildShareWorldBible(config: StoryConfig, isKO: boolean): string {
  const t = {
    core: isKO ? "핵심 전제" : "Core Premise",
    power: isKO ? "권력 구조" : "Power Structure",
    conflict: isKO ? "현재 갈등" : "Current Conflict",
    hist: isKO ? "역사" : "History",
    social: isKO ? "사회" : "Society",
    econ: isKO ? "경제" : "Economy",
    magic: isKO ? "마법·기술" : "Magic/Technology",
    factions: isKO ? "세력·종족" : "Factions",
    culture: isKO ? "문화" : "Culture",
    religion: isKO ? "종교·신화" : "Religion",
    law: isKO ? "법과 질서" : "Law",
    taboo: isKO ? "금기" : "Taboo",
    daily: isKO ? "일상" : "Daily life",
    travel: isKO ? "이동·통신" : "Travel & comms",
    truth: isKO ? "진실 vs 믿음" : "Truth vs beliefs",
    sim: isKO ? "세계 시뮬레이터 스냅샷 (JSON)" : "World sim snapshot (JSON)",
  };

  const blocks = [
    section(t.core, config.corePremise),
    section(t.power, config.powerStructure),
    section(t.conflict, config.currentConflict),
    section(t.hist, config.worldHistory),
    section(t.social, config.socialSystem),
    section(t.econ, config.economy),
    section(t.magic, config.magicTechSystem),
    section(t.factions, config.factionRelations),
    section(t.culture, config.culture),
    section(t.religion, config.religion),
    section(t.law, config.lawOrder),
    section(t.taboo, config.taboo),
    section(t.daily, config.dailyLife),
    section(t.travel, config.travelComm),
    section(t.truth, config.truthVsBeliefs),
  ].filter(Boolean) as string[];

  const sim = compactWorldSimJson(config);
  if (sim) blocks.push(`## ${t.sim}\n\`\`\`json\n${sim}\n\`\`\``);

  return blocks.join("\n\n");
}

function charBlock(c: StoryConfig["characters"][number], isKO: boolean): string {
  const lines: string[] = [`### ${c.name} (${c.role})`, c.traits];
  if (c.appearance?.trim()) lines.push(isKO ? `외형: ${c.appearance}` : `Appearance: ${c.appearance}`);
  const extras: [string, string | undefined][] = [
    [isKO ? "욕망" : "Desire", c.desire],
    [isKO ? "결핍" : "Deficiency", c.deficiency],
    [isKO ? "갈등" : "Conflict", c.conflict],
    [isKO ? "아크" : "Arc", c.changeArc],
    [isKO ? "가치관" : "Values", c.values],
    [isKO ? "강점" : "Strength", c.strength],
    [isKO ? "약점" : "Weakness", c.weakness],
    [isKO ? "배경" : "Backstory", c.backstory],
    [isKO ? "비밀" : "Secret", c.secret],
  ];
  for (const [label, v] of extras) {
    if (v?.trim()) lines.push(`${label}: ${v.trim()}`);
  }
  return lines.join("\n");
}

export function buildShareCharacterSheet(config: StoryConfig, isKO: boolean): string {
  const parts = config.characters.map((c) => charBlock(c, isKO));
  const rel = config.charRelations;
  if (rel?.length) {
    const hdr = isKO ? "## 관계" : "## Relations";
    const body = rel
      .slice(0, 40)
      .map((r) => `- ${r.from} → ${r.to} (${r.type}): ${r.desc ?? ""}`)
      .join("\n");
    parts.push(`${hdr}\n${body}`);
  }
  return parts.join("\n\n");
}

export function buildShareStyleProfile(config: StoryConfig, isKO: boolean): string {
  const sp = config.styleProfile;
  if (!sp) return isKO ? "스타일 프로필이 설정되지 않았습니다." : "No style profile configured.";
  const lines: string[] = [];
  if (sp.selectedDNA?.length) {
    lines.push(
      "DNA indices: " +
        sp.selectedDNA.join(", ") +
        (isKO ? " (DNA 카드 선택)" : " (DNA card indices)"),
    );
  }
  lines.push(...Object.entries(sp.sliders).map(([k, v]) => `${k}: ${v}/5`));
  if (sp.checkedSF?.length) lines.push(`SF techniques: ${sp.checkedSF.join(", ")}`);
  if (sp.checkedWeb?.length) lines.push(`Web techniques: ${sp.checkedWeb.join(", ")}`);
  return lines.join("\n");
}

export function buildShareEpisodeContent(
  messages: Message[],
  config: StoryConfig,
  isKO: boolean,
): string {
  const episodes = messages.filter((m) => m.role === "assistant" && m.content);
  const ep = episodes.length
    ? episodes
        .map((m, i) => `## ${isKO ? "에피소드" : "Episode"} ${i + 1}\n\n${m.content}`)
        .join("\n\n---\n\n")
    : "";
  const sd = config.sceneDirection;
  if (!sd) return ep;
  const extra = sceneDirectionToText(sd);
  if (!extra.trim()) return ep;
  const hdr = isKO ? "## 연출·복선 (Scene direction)" : "## Scene direction";
  return ep ? `${ep}\n\n---\n\n${hdr}\n${extra}` : `${hdr}\n${extra}`;
}
