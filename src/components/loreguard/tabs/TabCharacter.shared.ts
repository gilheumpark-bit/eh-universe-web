import type {
  AcceptedImportCandidateRecord,
  AssetPotentialLevel,
  Character,
  CharacterDevelopmentTier,
  CharRelationType,
  Item,
  ItemLifecycleStatus,
  NarrativeInfoState,
} from "@/lib/studio-types";

export const AV_COLORS = [
  "var(--c-blue)",
  "var(--c-purple)",
  "var(--c-green)",
  "var(--c-amber)",
  "var(--c-red)",
  "var(--c-teal)",
] as const;

export const REL_LABELS: Record<CharRelationType, string> = {
  lover: "연인",
  rival: "라이벌",
  friend: "친구",
  enemy: "적대",
  family: "가족",
  mentor: "사제",
  subordinate: "부하",
};

export const REL_EDGE_COLORS: Record<CharRelationType, string> = {
  lover: "var(--c-red)",
  rival: "var(--c-amber)",
  friend: "var(--c-green)",
  enemy: "var(--c-red)",
  family: "var(--c-blue)",
  mentor: "var(--c-purple)",
  subordinate: "var(--ink-3)",
};

export const DEVELOPMENT_TIER_LABELS: Record<CharacterDevelopmentTier, string> = {
  T0: "T0 씨앗",
  T1: "T1 뼈대",
  T2: "T2 작동",
  T3: "T3 디테일",
  T4: "T4 연재 준비",
  T5: "T5 출고/IP",
};

export const INFO_STATE_LABELS: Record<NarrativeInfoState, string> = {
  unknown: "미공개",
  rumor: "소문",
  partial: "부분 공개",
  known: "공개",
  secret: "비밀",
  false: "오정보",
};

export const ASSET_POTENTIAL_LABELS: Record<AssetPotentialLevel, string> = {
  none: "미정",
  low: "낮음",
  medium: "보통",
  high: "높음",
  premium: "프리미엄",
};

export const DOCK_PROPOSAL_GUIDE = `[캔버스 제안 형식] 대화 중 구체적인 캐릭터 프로필 제안에 도달하면, 응답 끝에 아래 형식의 \`\`\`json 코드 블록을 1개 포함하십시오 (제안이 없으면 블록 생략):
\`\`\`json
{"characters":[{"name":"이름","role":"역할","traits":"성격 키워드(쉼표 구분)","personality":"성격 한 줄","speechStyle":"말투 스타일","speechExample":"대표 대사","appearance":"외형","developmentTier":"T2","informationState":"rumor","publicKnowledge":"작중 인물들이 아는 내용","privateTruth":"숨겨진 진실","relationAddress":"호칭 규칙","honorificRule":"존대/반말 기준","assetPotential":"medium","assetMemo":"IP 패키지 메모"}]}
\`\`\`
name 외 필드는 제안할 값이 있을 때만 포함하십시오. 캔버스 반영은 작가가 채택 버튼으로 확정합니다 — 이미 반영했다고 단정하지 마십시오.`;

export interface CharProposal {
  name: string;
  role?: string;
  traits?: string;
  personality?: string;
  speechStyle?: string;
  speechExample?: string;
  appearance?: string;
  developmentTier?: CharacterDevelopmentTier;
  informationState?: NarrativeInfoState;
  publicKnowledge?: string;
  privateTruth?: string;
  relationAddress?: string;
  honorificRule?: string;
  assetPotential?: AssetPotentialLevel;
  assetMemo?: string;
}

export function circularFallback(index: number, total: number): { x: number; y: number } {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI - Math.PI / 2;
  const radius = 230;
  return {
    x: Math.round(320 + radius * Math.cos(angle)),
    y: Math.round(260 + radius * Math.sin(angle)),
  };
}

export function avColor(index: number): string {
  return AV_COLORS[index % AV_COLORS.length];
}

export function avLetter(name: string): string {
  return name.trim().charAt(0) || "?";
}

export function avatarGradient(color: string): string {
  return `linear-gradient(145deg, color-mix(in srgb, ${color} 85%, #fff), ${color})`;
}

export function splitTraits(traits: string | undefined): string[] {
  if (!traits) return [];
  return traits
    .split(/[,，]/)
    .map((trait) => trait.trim())
    .filter(Boolean);
}

export function infoRows(character: Character): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  if (character.role) rows.push(["역할", character.role]);
  if (character.developmentTier) rows.push(["설계 단계", DEVELOPMENT_TIER_LABELS[character.developmentTier]]);
  if (character.informationState) rows.push(["정보 상태", INFO_STATE_LABELS[character.informationState]]);
  if (character.desire) rows.push(["욕망", character.desire]);
  if (character.deficiency) rows.push(["결핍", character.deficiency]);
  if (character.conflict) rows.push(["갈등", character.conflict]);
  if (character.changeArc) rows.push(["변화 아크", character.changeArc]);
  if (character.values) rows.push(["가치관", character.values]);
  if (character.strength) rows.push(["강점", character.strength]);
  if (character.weakness) rows.push(["약점", character.weakness]);
  if (character.publicKnowledge) rows.push(["공개 인식", character.publicKnowledge]);
  if (character.privateTruth) rows.push(["숨은 진실", character.privateTruth]);
  if (character.relationAddress) rows.push(["관계 호칭", character.relationAddress]);
  if (character.honorificRule) rows.push(["존대 규칙", character.honorificRule]);
  if (character.assetPotential) rows.push(["IP 가능성", ASSET_POTENTIAL_LABELS[character.assetPotential]]);
  return rows;
}

export function parseCharProposals(data: unknown): CharProposal[] {
  if (!data || typeof data !== "object") return [];
  const proposals = (data as { characters?: unknown }).characters;
  if (!Array.isArray(proposals)) return [];
  const out: CharProposal[] = [];
  const stringValue = (value: unknown): string | undefined =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  for (const item of proposals) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = stringValue(record.name);
    if (!name) continue;
    out.push({
      name,
      role: stringValue(record.role),
      traits: stringValue(record.traits),
      personality: stringValue(record.personality),
      speechStyle: stringValue(record.speechStyle),
      speechExample: stringValue(record.speechExample),
      appearance: stringValue(record.appearance),
      developmentTier: toCharacterDevelopmentTier(stringValue(record.developmentTier) ?? ""),
      informationState: toNarrativeInfoState(stringValue(record.informationState) ?? ""),
      publicKnowledge: stringValue(record.publicKnowledge),
      privateTruth: stringValue(record.privateTruth),
      relationAddress: stringValue(record.relationAddress),
      honorificRule: stringValue(record.honorificRule),
      assetPotential: toAssetPotentialLevel(stringValue(record.assetPotential) ?? ""),
      assetMemo: stringValue(record.assetMemo),
    });
    if (out.length >= 6) break;
  }
  return out;
}

export function pendingCharacterImportCandidates(config: { acceptedImportCandidates?: AcceptedImportCandidateRecord[] } | null): AcceptedImportCandidateRecord[] {
  return (config?.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "characters" && !candidate.routedAt,
  );
}

export function pendingItemImportCandidates(config: { acceptedImportCandidates?: AcceptedImportCandidateRecord[] } | null): AcceptedImportCandidateRecord[] {
  return (config?.acceptedImportCandidates ?? []).filter(
    (candidate) => candidate.bucket === "items" && !candidate.routedAt,
  );
}

export function cleanCandidateTitle(title: string, prefix: string): string {
  return title.replace(new RegExp(`^${prefix}\\s*[:：]\\s*`, "u"), "").trim() || title;
}

function importedLines(candidate: AcceptedImportCandidateRecord): string[] {
  return (candidate.text || candidate.excerpt || candidate.title)
    .split(/\r?\n/u)
    .map((line) => line.replace(/^[\s>*\-•·]+/u, "").trim())
    .filter(Boolean);
}

function normalizeImportLabel(label: string): string {
  return label.replace(/\s+/gu, "").replace(/[()]/gu, "").toLowerCase();
}

function toCharacterDevelopmentTier(value: string): CharacterDevelopmentTier | undefined {
  const key = normalizeImportLabel(value);
  if (key.includes("t5") || key.includes("출고") || key.includes("ip")) return "T5";
  if (key.includes("t4") || key.includes("연재") || key.includes("준비")) return "T4";
  if (key.includes("t3") || key.includes("디테일")) return "T3";
  if (key.includes("t2") || key.includes("작동")) return "T2";
  if (key.includes("t1") || key.includes("뼈대")) return "T1";
  if (key.includes("t0") || key.includes("씨앗")) return "T0";
  return undefined;
}

function toNarrativeInfoState(value: string): NarrativeInfoState | undefined {
  const key = normalizeImportLabel(value);
  if (!key) return undefined;
  if (key.includes("오정보") || key.includes("거짓") || key.includes("false")) return "false";
  if (key.includes("비밀") || key.includes("secret")) return "secret";
  if (key.includes("소문") || key.includes("rumor")) return "rumor";
  if (key.includes("부분") || key.includes("partial")) return "partial";
  if (key.includes("공개") || key.includes("known")) return "known";
  if (key.includes("미공개") || key.includes("unknown")) return "unknown";
  return undefined;
}

function toAssetPotentialLevel(value: string): AssetPotentialLevel | undefined {
  const key = normalizeImportLabel(value);
  if (!key) return undefined;
  if (key.includes("프리미엄") || key.includes("premium")) return "premium";
  if (key.includes("높") || key.includes("high")) return "high";
  if (key.includes("보통") || key.includes("중") || key.includes("medium")) return "medium";
  if (key.includes("낮") || key.includes("low")) return "low";
  if (key.includes("없") || key.includes("미정") || key.includes("none")) return "none";
  return undefined;
}

function toItemLifecycleStatus(value: string): ItemLifecycleStatus | undefined {
  const key = normalizeImportLabel(value);
  if (!key) return undefined;
  if (key.includes("양도") || key.includes("transferred")) return "transferred";
  if (key.includes("파괴") || key.includes("destroyed")) return "destroyed";
  if (key.includes("봉인") || key.includes("sealed")) return "sealed";
  if (key.includes("분실") || key.includes("lost")) return "lost";
  if (key.includes("활성") || key.includes("active")) return "active";
  if (key.includes("예정") || key.includes("planned")) return "planned";
  return undefined;
}

function readImportedField(lines: string[], labels: string[]): string {
  const wanted = new Set(labels.map(normalizeImportLabel));
  for (const line of lines) {
    const match = /^([^:：]+)[:：]\s*(.+)$/u.exec(line);
    if (!match) continue;
    if (wanted.has(normalizeImportLabel(match[1]))) return match[2].trim();
  }
  return "";
}

function importedRemainder(lines: string[], usedLabels: string[]): string {
  const used = new Set(usedLabels.map(normalizeImportLabel));
  return lines
    .filter((line) => {
      const match = /^([^:：]+)[:：]\s*(.+)$/u.exec(line);
      return !match || !used.has(normalizeImportLabel(match[1]));
    })
    .join("\n")
    .trim();
}

function genImportedEntityId(prefix: string): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    /* fall through to timestamp fallback */
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildImportedCharacter(candidate: AcceptedImportCandidateRecord): Character {
  const lines = importedLines(candidate);
  const used = [
    "역할", "성격", "성격 키워드", "말투", "말투 스타일", "외형",
    "단계", "성장 단계", "설계 단계", "T단계", "정보 상태", "공개 정보",
    "공개 인식", "숨은 진실", "비밀 진실", "관계 호칭", "호칭", "존대 규칙",
    "IP 가능성", "자산화 가능성", "자산화 메모", "권리/IP 메모",
  ];
  const role = readImportedField(lines, ["역할"]);
  const traits = readImportedField(lines, ["성격 키워드", "성격"]);
  const speechStyle = readImportedField(lines, ["말투 스타일", "말투"]);
  const appearance = readImportedField(lines, ["외형"]);
  const developmentTier = toCharacterDevelopmentTier(readImportedField(lines, ["단계", "성장 단계", "설계 단계", "T단계"]));
  const informationState = toNarrativeInfoState(readImportedField(lines, ["정보 상태"]));
  const publicKnowledge = readImportedField(lines, ["공개 정보", "공개 인식"]);
  const privateTruth = readImportedField(lines, ["숨은 진실", "비밀 진실"]);
  const relationAddress = readImportedField(lines, ["관계 호칭", "호칭"]);
  const honorificRule = readImportedField(lines, ["존대 규칙"]);
  const assetPotential = toAssetPotentialLevel(readImportedField(lines, ["IP 가능성", "자산화 가능성"]));
  const assetMemo = readImportedField(lines, ["자산화 메모", "권리/IP 메모"]);
  const backstory = importedRemainder(lines, used) || candidate.excerpt;
  return {
    id: genImportedEntityId("char"),
    name: cleanCandidateTitle(candidate.title, "캐릭터"),
    role,
    traits,
    appearance,
    dna: 0,
    ...(speechStyle ? { speechStyle } : {}),
    ...(developmentTier ? { developmentTier } : {}),
    ...(informationState ? { informationState } : {}),
    ...(publicKnowledge ? { publicKnowledge } : {}),
    ...(privateTruth ? { privateTruth } : {}),
    ...(relationAddress ? { relationAddress } : {}),
    ...(honorificRule ? { honorificRule } : {}),
    ...(assetPotential ? { assetPotential } : {}),
    ...(assetMemo ? { assetMemo } : {}),
    ...(backstory ? { backstory } : {}),
  };
}

function toItemCategory(value: string): Item["category"] {
  const key = normalizeImportLabel(value);
  if (key.includes("무기") || key.includes("weapon")) return "weapon";
  if (key.includes("방어") || key.includes("갑옷") || key.includes("armor")) return "armor";
  if (key.includes("장신구") || key.includes("accessory")) return "accessory";
  if (key.includes("소모") || key.includes("consumable")) return "consumable";
  if (key.includes("재료") || key.includes("material")) return "material";
  if (key.includes("퀘스트") || key.includes("quest")) return "quest";
  return "misc";
}

function toItemRarity(value: string): Item["rarity"] {
  const key = normalizeImportLabel(value);
  if (key.includes("신화") || key.includes("mythic")) return "mythic";
  if (key.includes("전설") || key.includes("legendary")) return "legendary";
  if (key.includes("영웅") || key.includes("epic")) return "epic";
  if (key.includes("희귀") || key.includes("rare")) return "rare";
  if (key.includes("고급") || key.includes("uncommon")) return "uncommon";
  return "common";
}

export function buildImportedItem(candidate: AcceptedImportCandidateRecord): Item {
  const lines = importedLines(candidate);
  const status = toItemLifecycleStatus(readImportedField(lines, ["상태", "운영 상태"]));
  const ipPotential = toAssetPotentialLevel(readImportedField(lines, ["IP 가능성", "자산화 가능성"]));
  return {
    id: genImportedEntityId("item"),
    name: cleanCandidateTitle(candidate.title, "아이템"),
    category: toItemCategory(readImportedField(lines, ["분류", "카테고리"])),
    rarity: toItemRarity(readImportedField(lines, ["등급", "희귀도"])),
    description: readImportedField(lines, ["설명"]) || candidate.excerpt,
    effect: readImportedField(lines, ["효과"]),
    obtainedFrom: readImportedField(lines, ["획득처", "획득"]),
    owner: readImportedField(lines, ["소유자", "현재 소유자"]),
    purpose: readImportedField(lines, ["용도", "사용 목적"]),
    activationCond: readImportedField(lines, ["발동 조건", "조건"]),
    costWeakness: readImportedField(lines, ["대가", "약점", "대가/약점"]),
    itemAppearance: readImportedField(lines, ["외형"]),
    currentLocation: readImportedField(lines, ["현재 위치", "위치"]),
    ownershipCond: readImportedField(lines, ["소유권 조건", "소유 조건"]),
    ...(status ? { status } : {}),
    ...(ipPotential ? { ipPotential } : {}),
    rightsMemo: readImportedField(lines, ["권리/IP 메모", "자산화 메모", "권리 메모"]),
  };
}

export function candidateSubtitle(candidate: AcceptedImportCandidateRecord): string {
  return `${candidate.sourceFileName} · 일치도 ${Math.round(candidate.confidence * 100)}%`;
}

export function candidateMeta(candidate: AcceptedImportCandidateRecord): string {
  return `${candidate.detectedFormat.toUpperCase()} · ${candidate.charCount.toLocaleString("ko-KR")}자`;
}

export function candidateNotices(candidate: AcceptedImportCandidateRecord) {
  return (candidate.alignmentWarnings ?? []).map((warning) => ({
    label: warning.label,
    detail: warning.detail,
    severity: warning.severity === "warning" ? "warning" as const : "info" as const,
  }));
}
