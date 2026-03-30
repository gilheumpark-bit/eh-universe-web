// ============================================================
// PART 1 — Shared Types, Constants & Data
// All world-simulator sub-modules import from this single source.
// ============================================================

import { L4 } from '@/lib/i18n';

// ── Core domain types ──────────────────────────────────────

export type Lang = "ko" | "en";
export type ViewTab = "leveling" | "civilizations" | "relations" | "timeline" | "map" | "validation" | "language";

// --- Genre Leveling ---
export interface GenreLevel {
  genre: string;
  color: string;
  levels: { lv: number; ko: string; en: string }[];
}

export interface GenreSelectionEntry { genre: string; level: number; }
export const MAX_GENRE_SELECTIONS = 5;

export const GENRE_LEVELS: GenreLevel[] = [
  { genre: "Fantasy", color: "#6b46c1", levels: [
    { lv: 1, ko: "소프트매직", en: "Soft Magic" },
    { lv: 2, ko: "루즈매직", en: "Loose Magic" },
    { lv: 3, ko: "미들매직", en: "Mid Magic" },
    { lv: 4, ko: "하이매직", en: "High Magic" },
    { lv: 5, ko: "하드매직", en: "Hard Magic" },
  ]},
  { genre: "SF", color: "#2563eb", levels: [
    { lv: 1, ko: "근미래", en: "Near Future" },
    { lv: 2, ko: "우주시대", en: "Space Age" },
    { lv: 3, ko: "FTL문명", en: "FTL Civilization" },
    { lv: 4, ko: "트랜스휴먼", en: "Transhuman" },
    { lv: 5, ko: "포스트싱귤래리티", en: "Post-Singularity" },
  ]},
  { genre: "Romance", color: "#db2777", levels: [
    { lv: 1, ko: "일상로맨스", en: "Everyday Romance" },
    { lv: 2, ko: "직장/학원", en: "Office/School" },
    { lv: 3, ko: "신분차이", en: "Class Gap" },
    { lv: 4, ko: "정략결혼", en: "Political Marriage" },
    { lv: 5, ko: "궁중암투", en: "Court Intrigue" },
  ]},
  { genre: "Thriller", color: "#dc2626", levels: [
    { lv: 1, ko: "개인범죄", en: "Personal Crime" },
    { lv: 2, ko: "조직범죄", en: "Organized Crime" },
    { lv: 3, ko: "정부음모", en: "Gov. Conspiracy" },
    { lv: 4, ko: "국가전복", en: "State Overthrow" },
    { lv: 5, ko: "글로벌음모", en: "Global Conspiracy" },
  ]},
  { genre: "Horror", color: "#7c3aed", levels: [
    { lv: 1, ko: "심리공포", en: "Psychological" },
    { lv: 2, ko: "슬래셔", en: "Slasher" },
    { lv: 3, ko: "초자연", en: "Supernatural" },
    { lv: 4, ko: "바디호러", en: "Body Horror" },
    { lv: 5, ko: "코즈믹호러", en: "Cosmic Horror" },
  ]},
  { genre: "System/Hunter", color: "#0891b2", levels: [
    { lv: 1, ko: "단순스탯", en: "Simple Stats" },
    { lv: 2, ko: "스킬트리", en: "Skill Tree" },
    { lv: 3, ko: "직업시스템", en: "Class System" },
    { lv: 4, ko: "차원게이트", en: "Dimensional Gate" },
    { lv: 5, ko: "다차원시스템", en: "Multi-Dimensional" },
  ]},
  { genre: "Fantasy Romance", color: "#e11d48", levels: [
    { lv: 1, ko: "순정", en: "Pure Romance" },
    { lv: 2, ko: "악녀물", en: "Villainess" },
    { lv: 3, ko: "회귀", en: "Regression" },
    { lv: 4, ko: "권력투쟁", en: "Power Struggle" },
    { lv: 5, ko: "정치결혼+전쟁", en: "Political War" },
  ]},
];

// --- Civilization Data ---
export interface CivEra {
  id: string; ko: string; en: string; techLevel: number;
  society: { ko: string; en: string };
  tech: { ko: string; en: string };
  economy: { ko: string; en: string };
  conflicts: { ko: string; en: string };
  forbidden: { ko: string; en: string };
}

export const ERAS: CivEra[] = [
  { id: "primitive", ko: "원시", en: "Primitive", techLevel: 1,
    society: { ko: "부족 사회, 샤먼 지도자, 혈연 집단", en: "Tribal, shaman leaders, kinship groups" },
    tech: { ko: "석기, 불, 동굴 벽화, 구전 전승", en: "Stone tools, fire, cave art, oral tradition" },
    economy: { ko: "수렵채집, 물물교환", en: "Hunter-gatherer, barter" },
    conflicts: { ko: "영역 다툼, 자원 쟁탈, 맹수 위협", en: "Territory disputes, resource fights, predators" },
    forbidden: { ko: "금속, 문자, 농경, 건축", en: "Metal, writing, farming, architecture" },
  },
  { id: "ancient", ko: "고대", en: "Ancient", techLevel: 2,
    society: { ko: "도시국가, 왕정, 신관 계급, 노예제", en: "City-states, monarchy, priesthood, slavery" },
    tech: { ko: "청동기/철기, 문자, 바퀴, 관개 수로", en: "Bronze/iron, writing, wheel, irrigation" },
    economy: { ko: "농경, 조공, 교역로", en: "Agriculture, tribute, trade routes" },
    conflicts: { ko: "제국 확장, 신전 전쟁, 반란", en: "Imperial expansion, temple wars, rebellion" },
    forbidden: { ko: "화약, 인쇄술, 나침반", en: "Gunpowder, printing, compass" },
  },
  { id: "medieval", ko: "중세", en: "Medieval", techLevel: 3,
    society: { ko: "봉건제, 영주-기사-농노, 종교 권위", en: "Feudalism, lord-knight-serf, religious authority" },
    tech: { ko: "석조 건축, 갑옷, 석궁, 풍차, 양피지", en: "Stone architecture, armor, crossbow, windmill" },
    economy: { ko: "장원 경제, 길드, 대상 무역", en: "Manor economy, guilds, caravan trade" },
    conflicts: { ko: "왕위 계승, 십자군, 역병, 농민 반란", en: "Succession wars, crusades, plague, peasant revolts" },
    forbidden: { ko: "화약 무기, 인쇄술, 전기, 증기기관", en: "Firearms, printing press, electricity, steam" },
  },
  { id: "renaissance", ko: "르네상스", en: "Renaissance", techLevel: 4,
    society: { ko: "절대왕정, 상인 귀족, 예술 후원, 대학", en: "Absolute monarchy, merchant nobles, patronage, universities" },
    tech: { ko: "인쇄술, 화약, 항해술, 망원경, 해부학", en: "Printing, gunpowder, navigation, telescope, anatomy" },
    economy: { ko: "중상주의, 은행업, 식민지 무역", en: "Mercantilism, banking, colonial trade" },
    conflicts: { ko: "종교개혁, 식민지 쟁탈, 왕조 전쟁", en: "Reformation, colonial rivalry, dynastic wars" },
    forbidden: { ko: "전기, 증기기관, 자동화", en: "Electricity, steam engine, automation" },
  },
  { id: "industrial", ko: "산업혁명", en: "Industrial", techLevel: 5,
    society: { ko: "자본가-노동자, 도시화, 의회 민주주의", en: "Capitalist-worker, urbanization, parliamentary democracy" },
    tech: { ko: "증기기관, 철도, 전신, 공장 생산", en: "Steam engine, railway, telegraph, factory production" },
    economy: { ko: "산업 자본주의, 주식회사, 세계 무역", en: "Industrial capitalism, corporations, world trade" },
    conflicts: { ko: "제국주의, 노동 운동, 민족 전쟁", en: "Imperialism, labor movements, national wars" },
    forbidden: { ko: "컴퓨터, 핵, 인터넷, 항공", en: "Computer, nuclear, internet, aviation" },
  },
  { id: "modern", ko: "근현대", en: "Modern", techLevel: 6,
    society: { ko: "민주주의/독재, 냉전, 대중문화, 인권", en: "Democracy/dictatorship, Cold War, mass culture, human rights" },
    tech: { ko: "자동차, 비행기, 핵, TV, 초기 컴퓨터", en: "Cars, planes, nuclear, TV, early computers" },
    economy: { ko: "혼합 경제, 복지국가, 다국적 기업", en: "Mixed economy, welfare state, multinationals" },
    conflicts: { ko: "세계대전, 냉전, 테러, 지역 분쟁", en: "World wars, Cold War, terrorism, regional conflicts" },
    forbidden: { ko: "AI, 우주여행, 유전자 편집", en: "AI, space travel, gene editing" },
  },
  { id: "info", ko: "정보화", en: "Information", techLevel: 7,
    society: { ko: "디지털 사회, SNS, 감시 자본주의, 원격근무", en: "Digital society, social media, surveillance capitalism" },
    tech: { ko: "인터넷, 스마트폰, AI, 드론, 3D프린팅", en: "Internet, smartphones, AI, drones, 3D printing" },
    economy: { ko: "플랫폼 경제, 암호화폐, 긱이코노미", en: "Platform economy, crypto, gig economy" },
    conflicts: { ko: "사이버 전쟁, 정보 조작, 기술 격차", en: "Cyber warfare, disinformation, tech divide" },
    forbidden: { ko: "FTL, 텔레포트, 의식 업로드", en: "FTL, teleportation, consciousness upload" },
  },
  { id: "space", ko: "우주시대", en: "Space Age", techLevel: 8,
    society: { ko: "행성 연방, 우주 식민지, AI 협치", en: "Planetary federation, space colonies, AI governance" },
    tech: { ko: "FTL 항행, 테라포밍, 양자 통신, 사이보그", en: "FTL travel, terraforming, quantum comms, cyborgs" },
    economy: { ko: "항성간 무역, 자원 채굴, 에너지 경제", en: "Interstellar trade, resource mining, energy economy" },
    conflicts: { ko: "행성간 전쟁, 외계 접촉, AI 반란", en: "Interplanetary war, alien contact, AI rebellion" },
    forbidden: { ko: "차원이동, 시간여행, 의식 복제", en: "Dimensional travel, time travel, consciousness copy" },
  },
  { id: "post", ko: "포스트휴먼", en: "Post-Human", techLevel: 9,
    society: { ko: "초월 지능, 의식 네트워크, 물질 초월", en: "Transcendent intelligence, consciousness network, post-material" },
    tech: { ko: "나노 조립, 의식 업로드, 현실 조작, 특이점", en: "Nano-assembly, mind upload, reality manipulation, singularity" },
    economy: { ko: "포스트-희소성, 에너지=화폐", en: "Post-scarcity, energy=currency" },
    conflicts: { ko: "존재론적 위기, 의미의 상실, 엔트로피", en: "Existential crisis, loss of meaning, entropy" },
    forbidden: { ko: "없음 — 물리법칙만이 제한", en: "None — only physics limits" },
  },
];

export interface Civilization {
  id: string;
  name: string;
  era: string;
  color: string;
  traits: string[];
  x: number; y: number;
}

export type RelationType = "war" | "alliance" | "trade" | "vassal";
export interface CivRelation {
  from: string;
  to: string;
  type: RelationType;
}

export interface TransitionEvent {
  fromEra: string;
  toEra: string;
  description: string;
}

export interface ValidationIssue {
  civName: string;
  message: string;
  severity: "warning" | "error";
}

export const CIV_COLORS = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#264653","#a855f7","#06b6d4"];

export const RELATION_STYLES: Record<RelationType, { ko: string; en: string; color: string; dash: string }> = {
  war:      { ko: "전쟁", en: "War",      color: "#ef4444", dash: "none" },
  alliance: { ko: "동맹", en: "Alliance", color: "#22c55e", dash: "8,4" },
  trade:    { ko: "무역", en: "Trade",    color: "#eab308", dash: "4,4" },
  vassal:   { ko: "종속", en: "Vassal",   color: "#a855f7", dash: "2,6" },
};

// --- Language Forge Types ---
export type WaveType = "sine" | "sawtooth" | "square" | "triangle";
export type SigClass = "sustained" | "modulated" | "percussive" | "cyclic" | "silent";

export interface CustomPhoneme {
  id: string;
  symbol: string;
  roman: string;
  type: "consonant" | "vowel";
  sigClass: SigClass;
  freq: number;
  wave: WaveType;
}

export interface LangWord {
  id: string;
  meaning: string;
  phonemes: string[];
  roman: string;
  civId?: string;
}

export const SIG_CLASS_META: Record<SigClass, { ko: string; en: string; color: string; defaultWave: WaveType }> = {
  sustained:  { ko: "지속음", en: "Sustained",  color: "#38bdf8", defaultWave: "sawtooth" },
  modulated:  { ko: "변조음", en: "Modulated",   color: "#a78bfa", defaultWave: "sine" },
  percussive: { ko: "충격음", en: "Percussive",  color: "#f87171", defaultWave: "square" },
  cyclic:     { ko: "순환음", en: "Cyclic",      color: "#34d399", defaultWave: "sine" },
  silent:     { ko: "무성",   en: "Silent",      color: "#6b7280", defaultWave: "sine" },
};

export const GENRE_PHONEME_PRESETS: Record<string, { label: { ko: string; en: string }; phonemes: Omit<CustomPhoneme, "id">[] }> = {
  fantasy: {
    label: { ko: "판타지 (유려한)", en: "Fantasy (Flowing)" },
    phonemes: [
      { symbol: "ㄹ", roman: "l",   type: "consonant", sigClass: "sustained",  freq: 330, wave: "sine" },
      { symbol: "ㅁ", roman: "m",   type: "consonant", sigClass: "sustained",  freq: 220, wave: "sine" },
      { symbol: "ㄴ", roman: "n",   type: "consonant", sigClass: "cyclic",     freq: 260, wave: "sine" },
      { symbol: "ㅅ", roman: "s",   type: "consonant", sigClass: "sustained",  freq: 440, wave: "sawtooth" },
      { symbol: "ㅌ", roman: "th",  type: "consonant", sigClass: "modulated",  freq: 380, wave: "sine" },
      { symbol: "\u2205",  roman: "",    type: "consonant", sigClass: "silent",     freq: 0,   wave: "sine" },
      { symbol: "|",  roman: "a",   type: "vowel",     sigClass: "sustained",  freq: 440, wave: "sine" },
      { symbol: "\u2014",  roman: "e",   type: "vowel",     sigClass: "sustained",  freq: 350, wave: "sine" },
      { symbol: "/",  roman: "i",   type: "vowel",     sigClass: "sustained",  freq: 520, wave: "sine" },
      { symbol: "\u22A5",  roman: "o",   type: "vowel",     sigClass: "cyclic",     freq: 300, wave: "sine" },
      { symbol: "\u22A4",  roman: "u",   type: "vowel",     sigClass: "cyclic",     freq: 280, wave: "sine" },
    ],
  },
  sf: {
    label: { ko: "SF (기계적)", en: "SF (Mechanical)" },
    phonemes: [
      { symbol: "\u2227",  roman: "k",   type: "consonant", sigClass: "percussive", freq: 280, wave: "square" },
      { symbol: "\u223C",  roman: "t",   type: "consonant", sigClass: "percussive", freq: 310, wave: "square" },
      { symbol: "\u221E",  roman: "zr",  type: "consonant", sigClass: "modulated",  freq: 520, wave: "sawtooth" },
      { symbol: "\u22A0",  roman: "gn",  type: "consonant", sigClass: "percussive", freq: 600, wave: "square" },
      { symbol: "\u2248",  roman: "vr",  type: "consonant", sigClass: "modulated",  freq: 400, wave: "sawtooth" },
      { symbol: "\u2205",  roman: "",    type: "consonant", sigClass: "silent",     freq: 0,   wave: "sine" },
      { symbol: "|",  roman: "a",   type: "vowel",     sigClass: "sustained",  freq: 440, wave: "sawtooth" },
      { symbol: "\u22A2",  roman: "ae",  type: "vowel",     sigClass: "modulated",  freq: 460, wave: "sawtooth" },
      { symbol: "\u2571",  roman: "ei",  type: "vowel",     sigClass: "modulated",  freq: 380, wave: "sine" },
      { symbol: "\u22A5",  roman: "o",   type: "vowel",     sigClass: "sustained",  freq: 300, wave: "square" },
    ],
  },
  horror: {
    label: { ko: "호러 (불협화음)", en: "Horror (Dissonant)" },
    phonemes: [
      { symbol: "\u2A5A",  roman: "tch", type: "consonant", sigClass: "percussive", freq: 560, wave: "square" },
      { symbol: "\u223F",  roman: "khr", type: "consonant", sigClass: "modulated",  freq: 480, wave: "sawtooth" },
      { symbol: "\u2715",  roman: "p",   type: "consonant", sigClass: "percussive", freq: 370, wave: "square" },
      { symbol: "\u2229",  roman: "gh",  type: "consonant", sigClass: "modulated",  freq: 180, wave: "sawtooth" },
      { symbol: "\u25A1",  roman: "sh",  type: "consonant", sigClass: "sustained",  freq: 200, wave: "sawtooth" },
      { symbol: "\u2205",  roman: "",    type: "consonant", sigClass: "silent",     freq: 0,   wave: "sine" },
      { symbol: "|",  roman: "a",   type: "vowel",     sigClass: "sustained",  freq: 220, wave: "sine" },
      { symbol: "\u2295",  roman: "oa",  type: "vowel",     sigClass: "cyclic",     freq: 170, wave: "sine" },
      { symbol: "\u2572",  roman: "oi",  type: "vowel",     sigClass: "modulated",  freq: 390, wave: "sawtooth" },
      { symbol: "\u229E",  roman: "ue",  type: "vowel",     sigClass: "sustained",  freq: 330, wave: "sine" },
    ],
  },
};

// --- HEX grid constants ---
export const HEX_SIZE = 28;
export const HEX_COLS = 12;
export const HEX_ROWS = 8;

// --- EH Rule Levels ---
export const RULE_LEVELS: { lv: number; ko: string; en: string; desc_ko: string; desc_en: string; pct: number; genre_ko: string; genre_en: string; color: string }[] = [
  { lv: 1, ko: "미적용", en: "Off", desc_ko: "EH 규칙 없음. 자유 집필", desc_en: "No EH rules. Free writing", pct: 0, genre_ko: "자유", genre_en: "Free", color: "#6b7280" },
  { lv: 2, ko: "먼치킨", en: "Munchkin", desc_ko: "금지어 경고만. 대가 거의 없음", desc_en: "Soft warnings only. Minimal cost", pct: 15, genre_ko: "먼치킨/무쌍", genre_en: "OP/Power Fantasy", color: "#22c55e" },
  { lv: 3, ko: "로맨스", en: "Romance", desc_ko: "금지어 차단 + 관계 갈등 대가", desc_en: "Bans + relationship cost only", pct: 25, genre_ko: "로맨스/로판", genre_en: "Romance", color: "#a855f7" },
  { lv: 4, ko: "아카데미", en: "Academy", desc_ko: "금지어 + 성장통 대가 + EH 추적 시작", desc_en: "Bans + growth cost + EH tracking", pct: 35, genre_ko: "아카데미물", genre_en: "Academy", color: "#3b82f6" },
  { lv: 5, ko: "헌터", en: "Hunter", desc_ko: "금지어 + 신체/관계 대가 + 시점 제한 시작", desc_en: "Bans + body/relation cost + POV limit", pct: 50, genre_ko: "헌터/각성물", genre_en: "Hunter/Awakening", color: "#eab308" },
  { lv: 6, ko: "회귀", en: "Regression", desc_ko: "기억/시간 대가 + 문체 변환 시작", desc_en: "Memory/time cost + style morphing", pct: 65, genre_ko: "회귀물", genre_en: "Regression", color: "#f97316" },
  { lv: 7, ko: "다크", en: "Dark", desc_ko: "전 영역 대가 + 이중 로그 + 글리치", desc_en: "Full cost + dual-log + glitch", pct: 75, genre_ko: "다크 판타지", genre_en: "Dark Fantasy", color: "#ef4444" },
  { lv: 8, ko: "디스토피아", en: "Dystopia", desc_ko: "풀 엔진 + 자격 박탈 + 세계 붕괴", desc_en: "Full engine + dequalification + system crash", pct: 90, genre_ko: "디스토피아/SF", genre_en: "Dystopia/SF", color: "#991b1b" },
  { lv: 9, ko: "풀 EH", en: "Full EH", desc_ko: "v1.0 원본 100% 적용. 자비 없음", desc_en: "v1.0 original 100%. No mercy", pct: 100, genre_ko: "순문학", genre_en: "Literary Fiction", color: "#1f2937" },
];

// EH engine intensity calculator (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function _getEHModuleIntensity(pct: number) {
  const R = pct;
  return {
    bannedWordWarn: R >= 5,
    bannedWordBlock: R >= 15,
    costHint: R >= 10,
    costEnforce: R >= 25,
    ehTracking: R >= 20,
    stabilityTracking: R >= 30,
    povLock: R >= 45,
    choiceCollapse: R >= 55,
    styleMorph: R >= 60,
    dualLog: R >= 70,
    glitchTrigger: R >= 80,
    dequalification: R >= 90,
    costMultiplier: Math.max(0, (R - 25) / 75),
    ehDecayMultiplier: Math.max(0, (R - 20) / 80),
    stabilityDecayMultiplier: Math.max(0, (R - 30) / 70),
  };
}

// --- Auto World Templates ---
export const AUTO_WORLD_TEMPLATES: Record<string, { civs: Omit<Civilization, "id">[]; relations: Omit<CivRelation, "from" | "to">[] }> = {
  Fantasy: {
    civs: [
      { name: "엘도라 왕국", era: "medieval", color: "#6b46c1", traits: ["마법 기사단", "왕정"], x: 30, y: 30 },
      { name: "다크포레스트 부족", era: "primitive", color: "#059669", traits: ["자연 마법", "샤먼"], x: 70, y: 25 },
      { name: "드워프 연합", era: "renaissance", color: "#d97706", traits: ["단조 기술", "지하 도시"], x: 50, y: 70 },
    ],
    relations: [{ type: "alliance" as RelationType }, { type: "trade" as RelationType }],
  },
  SF: {
    civs: [
      { name: "테라 연방", era: "space", color: "#2563eb", traits: ["FTL 항행", "의회 민주주의"], x: 25, y: 40 },
      { name: "네오코프 기업국", era: "info", color: "#dc2626", traits: ["AI 통치", "사이버네틱스"], x: 75, y: 35 },
      { name: "프리 콜로니", era: "space", color: "#0891b2", traits: ["해적", "자유 무역"], x: 50, y: 75 },
    ],
    relations: [{ type: "war" as RelationType }, { type: "trade" as RelationType }],
  },
  Romance: {
    civs: [
      { name: "로즈가든 학원", era: "modern", color: "#db2777", traits: ["명문 사립", "학생회"], x: 40, y: 30 },
      { name: "하이소사이어티", era: "modern", color: "#7c3aed", traits: ["재벌가", "정략결혼"], x: 60, y: 65 },
    ],
    relations: [{ type: "vassal" as RelationType }],
  },
  Thriller: {
    civs: [
      { name: "쉐도우 카르텔", era: "modern", color: "#dc2626", traits: ["마약 조직", "정보망"], x: 30, y: 40 },
      { name: "국가정보원", era: "info", color: "#1e40af", traits: ["첩보", "감시"], x: 70, y: 35 },
      { name: "글로벌 컨소시엄", era: "info", color: "#6b7280", traits: ["다국적 음모", "로비"], x: 50, y: 75 },
    ],
    relations: [{ type: "war" as RelationType }, { type: "alliance" as RelationType }],
  },
  Horror: {
    civs: [
      { name: "세일럼 마을", era: "industrial", color: "#7c3aed", traits: ["고립", "미신"], x: 40, y: 30 },
      { name: "심연 교단", era: "ancient", color: "#991b1b", traits: ["코즈믹 숭배", "금기 의식"], x: 55, y: 70 },
    ],
    relations: [{ type: "vassal" as RelationType }],
  },
  "System/Hunter": {
    civs: [
      { name: "한터 협회", era: "modern", color: "#0891b2", traits: ["랭크 시스템", "던전 관리"], x: 30, y: 35 },
      { name: "게이트 너머", era: "post", color: "#dc2626", traits: ["마수", "보스 몬스터"], x: 70, y: 30 },
      { name: "비각성자 사회", era: "modern", color: "#6b7280", traits: ["일반인", "공포"], x: 50, y: 70 },
    ],
    relations: [{ type: "war" as RelationType }, { type: "trade" as RelationType }],
  },
  "Fantasy Romance": {
    civs: [
      { name: "크로노아 제국", era: "renaissance", color: "#e11d48", traits: ["황실", "정략결혼"], x: 35, y: 30 },
      { name: "북방 공작령", era: "medieval", color: "#1e40af", traits: ["냉혈 공작", "군사력"], x: 65, y: 35 },
      { name: "성녀의 신전", era: "medieval", color: "#d97706", traits: ["신성력", "예언"], x: 50, y: 70 },
    ],
    relations: [{ type: "alliance" as RelationType }, { type: "vassal" as RelationType }],
  },
  "Post-Apocalypse": {
    civs: [
      { name: "뉴 헤이븐", era: "post", color: "#16a34a", traits: ["생존자 커뮤니티", "농업"], x: 30, y: 35 },
      { name: "워로드 군벌", era: "post", color: "#dc2626", traits: ["약탈", "군사력"], x: 70, y: 30 },
      { name: "테크 벙커", era: "info", color: "#2563eb", traits: ["구시대 기술", "고립"], x: 50, y: 75 },
    ],
    relations: [{ type: "war" as RelationType }, { type: "trade" as RelationType }],
  },
  "Wuxia": {
    civs: [
      { name: "천산파", era: "ancient", color: "#7c3aed", traits: ["검술", "무림 정파"], x: 30, y: 30 },
      { name: "혈교", era: "ancient", color: "#991b1b", traits: ["마공", "사파"], x: 70, y: 30 },
      { name: "황실 무림원", era: "medieval", color: "#d97706", traits: ["관부", "중립"], x: 50, y: 70 },
    ],
    relations: [{ type: "war" as RelationType }, { type: "vassal" as RelationType }],
  },
  "Historical": {
    civs: [
      { name: "왕국 궁정", era: "renaissance", color: "#7c3aed", traits: ["왕권", "궁중 정치"], x: 35, y: 30 },
      { name: "귀족 연합", era: "renaissance", color: "#0891b2", traits: ["영지", "세력 다툼"], x: 65, y: 35 },
      { name: "민중 세력", era: "industrial", color: "#d97706", traits: ["혁명", "민란"], x: 50, y: 70 },
    ],
    relations: [{ type: "alliance" as RelationType }, { type: "war" as RelationType }],
  },
};

// --- Props for main WorldSimulator ---
export interface WorldSimProps {
  lang?: Lang;
  synopsis?: string;
  worldContext?: { corePremise?: string; powerStructure?: string; currentConflict?: string; factionRelations?: string };
  onSave?: (data: { civs: Civilization[]; relations: CivRelation[]; transitions: TransitionEvent[]; selectedGenre: string; selectedLevel: number; genreSelections: GenreSelectionEntry[]; ruleLevel: number }) => void;
  initialData?: { civs?: { name: string; era: string; color: string; traits: string[] }[]; relations?: { fromName: string; toName: string; type: string }[]; transitions?: { fromEra: string; toEra: string; description: string }[]; selectedGenre?: string; selectedLevel?: number; genreSelections?: GenreSelectionEntry[]; ruleLevel?: number };
}

// ── Utility re-export for brevity ──────────────────────────
export { L4 };

// IDENTITY_SEAL: PART-1 | role=shared-types-constants | inputs=none | outputs=all-types,all-constants
