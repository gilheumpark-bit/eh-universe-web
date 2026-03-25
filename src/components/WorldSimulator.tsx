"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { createT } from '@/lib/i18n';

// ============================================================
// PART 0: TYPES & DATA
// ============================================================

type Lang = "ko" | "en";
type ViewTab = "leveling" | "civilizations" | "relations" | "timeline" | "map" | "validation" | "language";

// --- Genre Leveling ---
interface GenreLevel {
  genre: string;
  color: string;
  levels: { lv: number; ko: string; en: string }[];
}

const GENRE_LEVELS: GenreLevel[] = [
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

// --- Civilization Data (지구 역사 치환) ---
interface CivEra {
  id: string; ko: string; en: string; techLevel: number;
  society: { ko: string; en: string };
  tech: { ko: string; en: string };
  economy: { ko: string; en: string };
  conflicts: { ko: string; en: string };
  forbidden: { ko: string; en: string };
}
const ERAS: CivEra[] = [
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

interface Civilization {
  id: string;
  name: string;
  era: string;
  color: string;
  traits: string[];
  x: number; y: number; // map position
}

type RelationType = "war" | "alliance" | "trade" | "vassal";
interface CivRelation {
  from: string;
  to: string;
  type: RelationType;
}

interface TransitionEvent {
  fromEra: string;
  toEra: string;
  description: string;
}

interface ValidationIssue {
  civName: string;
  message: string;
  severity: "warning" | "error";
}

const CIV_COLORS = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#264653","#a855f7","#06b6d4"];

// --- Language Forge Types ---
type WaveType = "sine" | "sawtooth" | "square" | "triangle";
type SigClass = "sustained" | "modulated" | "percussive" | "cyclic" | "silent";

interface CustomPhoneme {
  id: string;
  symbol: string;
  roman: string;
  type: "consonant" | "vowel";
  sigClass: SigClass;
  freq: number;
  wave: WaveType;
}

interface LangWord {
  id: string;
  meaning: string;
  phonemes: string[]; // phoneme IDs
  roman: string;
  civId?: string;
}

const SIG_CLASS_META: Record<SigClass, { ko: string; en: string; color: string; defaultWave: WaveType }> = {
  sustained:  { ko: "지속음", en: "Sustained",  color: "#38bdf8", defaultWave: "sawtooth" },
  modulated:  { ko: "변조음", en: "Modulated",   color: "#a78bfa", defaultWave: "sine" },
  percussive: { ko: "충격음", en: "Percussive",  color: "#f87171", defaultWave: "square" },
  cyclic:     { ko: "순환음", en: "Cyclic",      color: "#34d399", defaultWave: "sine" },
  silent:     { ko: "무성",   en: "Silent",      color: "#6b7280", defaultWave: "sine" },
};

const GENRE_PHONEME_PRESETS: Record<string, { label: { ko: string; en: string }; phonemes: Omit<CustomPhoneme, "id">[] }> = {
  fantasy: {
    label: { ko: "판타지 (유려한)", en: "Fantasy (Flowing)" },
    phonemes: [
      { symbol: "ㄹ", roman: "l",   type: "consonant", sigClass: "sustained",  freq: 330, wave: "sine" },
      { symbol: "ㅁ", roman: "m",   type: "consonant", sigClass: "sustained",  freq: 220, wave: "sine" },
      { symbol: "ㄴ", roman: "n",   type: "consonant", sigClass: "cyclic",     freq: 260, wave: "sine" },
      { symbol: "ㅅ", roman: "s",   type: "consonant", sigClass: "sustained",  freq: 440, wave: "sawtooth" },
      { symbol: "ㅌ", roman: "th",  type: "consonant", sigClass: "modulated",  freq: 380, wave: "sine" },
      { symbol: "∅",  roman: "",    type: "consonant", sigClass: "silent",     freq: 0,   wave: "sine" },
      { symbol: "|",  roman: "a",   type: "vowel",     sigClass: "sustained",  freq: 440, wave: "sine" },
      { symbol: "—",  roman: "e",   type: "vowel",     sigClass: "sustained",  freq: 350, wave: "sine" },
      { symbol: "/",  roman: "i",   type: "vowel",     sigClass: "sustained",  freq: 520, wave: "sine" },
      { symbol: "⊥",  roman: "o",   type: "vowel",     sigClass: "cyclic",     freq: 300, wave: "sine" },
      { symbol: "⊤",  roman: "u",   type: "vowel",     sigClass: "cyclic",     freq: 280, wave: "sine" },
    ],
  },
  sf: {
    label: { ko: "SF (기계적)", en: "SF (Mechanical)" },
    phonemes: [
      { symbol: "∧",  roman: "k",   type: "consonant", sigClass: "percussive", freq: 280, wave: "square" },
      { symbol: "∼",  roman: "t",   type: "consonant", sigClass: "percussive", freq: 310, wave: "square" },
      { symbol: "∞",  roman: "zr",  type: "consonant", sigClass: "modulated",  freq: 520, wave: "sawtooth" },
      { symbol: "⊠",  roman: "gn",  type: "consonant", sigClass: "percussive", freq: 600, wave: "square" },
      { symbol: "≈",  roman: "vr",  type: "consonant", sigClass: "modulated",  freq: 400, wave: "sawtooth" },
      { symbol: "∅",  roman: "",    type: "consonant", sigClass: "silent",     freq: 0,   wave: "sine" },
      { symbol: "|",  roman: "a",   type: "vowel",     sigClass: "sustained",  freq: 440, wave: "sawtooth" },
      { symbol: "⊢",  roman: "ae",  type: "vowel",     sigClass: "modulated",  freq: 460, wave: "sawtooth" },
      { symbol: "╱",  roman: "ei",  type: "vowel",     sigClass: "modulated",  freq: 380, wave: "sine" },
      { symbol: "⊥",  roman: "o",   type: "vowel",     sigClass: "sustained",  freq: 300, wave: "square" },
    ],
  },
  horror: {
    label: { ko: "호러 (불협화음)", en: "Horror (Dissonant)" },
    phonemes: [
      { symbol: "⩚",  roman: "tch", type: "consonant", sigClass: "percussive", freq: 560, wave: "square" },
      { symbol: "∿",  roman: "khr", type: "consonant", sigClass: "modulated",  freq: 480, wave: "sawtooth" },
      { symbol: "✕",  roman: "p",   type: "consonant", sigClass: "percussive", freq: 370, wave: "square" },
      { symbol: "∩",  roman: "gh",  type: "consonant", sigClass: "modulated",  freq: 180, wave: "sawtooth" },
      { symbol: "□",  roman: "sh",  type: "consonant", sigClass: "sustained",  freq: 200, wave: "sawtooth" },
      { symbol: "∅",  roman: "",    type: "consonant", sigClass: "silent",     freq: 0,   wave: "sine" },
      { symbol: "|",  roman: "a",   type: "vowel",     sigClass: "sustained",  freq: 220, wave: "sine" },
      { symbol: "⊕",  roman: "oa",  type: "vowel",     sigClass: "cyclic",     freq: 170, wave: "sine" },
      { symbol: "╲",  roman: "oi",  type: "vowel",     sigClass: "modulated",  freq: 390, wave: "sawtooth" },
      { symbol: "⊞",  roman: "ue",  type: "vowel",     sigClass: "sustained",  freq: 330, wave: "sine" },
    ],
  },
};

const RELATION_STYLES: Record<RelationType, { ko: string; en: string; color: string; dash: string }> = {
  war:      { ko: "전쟁", en: "War",      color: "#ef4444", dash: "none" },
  alliance: { ko: "동맹", en: "Alliance", color: "#22c55e", dash: "8,4" },
  trade:    { ko: "무역", en: "Trade",    color: "#eab308", dash: "4,4" },
  vassal:   { ko: "종속", en: "Vassal",   color: "#a855f7", dash: "2,6" },
};

// HEX grid constants
const HEX_SIZE = 28;
const HEX_COLS = 12;
const HEX_ROWS = 8;

// ============================================================
// PART 1: GENRE LEVELING COMPONENT (Multi-Select, max 5)
// ============================================================

interface GenreSelectionEntry { genre: string; level: number; }

const MAX_GENRE_SELECTIONS = 5;

function GenreLeveling({ lang, selections, onToggle }: {
  lang: Lang;
  selections: GenreSelectionEntry[];
  onToggle: (genre: string, level: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold tracking-wider text-text-secondary uppercase">
          {lang === "ko" ? "장르별 세계관 복잡도" : "Genre World Complexity"}
        </h3>
        <span className="text-[9px] font-[family-name:var(--font-mono)] text-text-tertiary">
          {selections.length}/{MAX_GENRE_SELECTIONS} {lang === "ko" ? "선택" : "selected"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {GENRE_LEVELS.map(g => {
          const sel = selections.find(s => s.genre === g.genre);
          const isSelected = !!sel;
          return (
            <div key={g.genre} className={`space-y-1 rounded-lg p-1.5 transition-all border-2 ${isSelected ? "" : "border-transparent"}`}
              style={isSelected ? { borderColor: g.color, background: `${g.color}10` } : undefined}>
              <div className="text-[10px] font-bold tracking-wider text-center font-[family-name:var(--font-mono)] flex items-center justify-center gap-1" style={{ color: g.color }}>
                {isSelected && <span className="text-[8px]">✓</span>}
                {g.genre}
              </div>
              <div className="flex gap-0.5">
                {g.levels.map(lv => {
                  const active = sel?.level === lv.lv;
                  return (
                    <button
                      key={lv.lv}
                      onClick={() => onToggle(g.genre, lv.lv)}
                      className={`flex-1 py-1.5 rounded text-[8px] font-bold transition-all border ${
                        active
                          ? "text-white shadow-lg"
                          : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"
                      }`}
                      style={active ? { background: g.color, borderColor: g.color } : undefined}
                      title={lang === "ko" ? lv.ko : lv.en}
                    >
                      {lv.lv}
                    </button>
                  );
                })}
              </div>
              <div className="text-[8px] text-text-tertiary text-center truncate">
                {isSelected
                  ? (lang === "ko"
                      ? g.levels[(sel?.level ?? 1) - 1]?.ko
                      : g.levels[(sel?.level ?? 1) - 1]?.en)
                  : (lang === "ko" ? g.levels[0].ko : g.levels[0].en)
                }
              </div>
            </div>
          );
        })}
      </div>
      {/* Selected genres summary */}
      {selections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selections.map((s, i) => {
            const g = GENRE_LEVELS.find(gl => gl.genre === s.genre);
            const lvName = g?.levels[(s.level ?? 1) - 1];
            return (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold text-white"
                style={{ background: g?.color }}>
                {s.genre} Lv{s.level}
                <span className="opacity-70">({lang === "ko" ? lvName?.ko : lvName?.en})</span>
                <button onClick={() => onToggle(s.genre, 0)}
                  className="ml-0.5 opacity-60 hover:opacity-100">×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 2: CIVILIZATION MAPPER
// ============================================================

function CivMapper({ lang, civs, setCivs }: {
  lang: Lang;
  civs: Civilization[];
  setCivs: React.Dispatch<React.SetStateAction<Civilization[]>>;
}) {
  const [newName, setNewName] = useState("");
  const [newEra, setNewEra] = useState("medieval");

  const addCiv = () => {
    if (!newName.trim()) return;
    const color = CIV_COLORS[civs.length % CIV_COLORS.length];
    const angle = (civs.length / 8) * Math.PI * 2;
    const cx = 50 + 25 * Math.cos(angle);
    const cy = 50 + 25 * Math.sin(angle);
    setCivs(prev => [...prev, {
      id: `civ-${Date.now()}`,
      name: newName.trim(),
      era: newEra,
      color,
      traits: [],
      x: cx, y: cy,
    }]);
    setNewName("");
  };

  const removeCiv = (id: string) => setCivs(prev => prev.filter(c => c.id !== id));

  const addTrait = (civId: string, trait: string) => {
    if (!trait.trim()) return;
    setCivs(prev => prev.map(c =>
      c.id === civId ? { ...c, traits: [...c.traits, trait.trim()] } : c
    ));
  };

  const removeTrait = (civId: string, idx: number) => {
    setCivs(prev => prev.map(c =>
      c.id === civId ? { ...c, traits: c.traits.filter((_, i) => i !== idx) } : c
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addCiv()}
          placeholder={lang === "ko" ? "문명 이름..." : "Civilization name..."}
          className="flex-1 bg-bg-primary border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent-purple transition-colors"
        />
        <select
          value={newEra}
          onChange={e => setNewEra(e.target.value)}
          className="bg-bg-primary border border-border rounded px-2 py-2 text-xs outline-none"
        >
          {ERAS.map(era => (
            <option key={era.id} value={era.id}>{lang === "ko" ? era.ko : era.en}</option>
          ))}
        </select>
        <button onClick={addCiv} className="px-4 py-2 bg-accent-purple text-white rounded text-xs font-bold hover:opacity-80 transition-opacity">
          +
        </button>
      </div>

      {civs.length === 0 && (
        <div className="text-center py-8 text-text-tertiary text-xs italic">
          {lang === "ko" ? "문명을 추가하세요" : "Add civilizations"}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {civs.map(civ => {
          const era = ERAS.find(e => e.id === civ.era);
          return (
            <div key={civ.id} className="border border-border rounded-lg p-3 bg-bg-primary" style={{ borderLeftWidth: 3, borderLeftColor: civ.color }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-bold text-sm" style={{ color: civ.color }}>{civ.name}</span>
                  <span className="text-[10px] text-text-tertiary ml-2 font-[family-name:var(--font-mono)]">
                    {lang === "ko" ? era?.ko : era?.en} (TL{era?.techLevel})
                  </span>
                </div>
                <button onClick={() => removeCiv(civ.id)} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
              </div>

              {/* ERA detail fields */}
              {era && (
                <div className="mb-2 space-y-0.5 bg-bg-secondary/50 rounded p-2 border border-border/50">
                  {([
                    { key: 'society' as const, icon: '🏛', ko: '사회', en: 'Society' },
                    { key: 'tech' as const, icon: '⚙', ko: '기술', en: 'Tech' },
                    { key: 'economy' as const, icon: '💰', ko: '경제', en: 'Economy' },
                    { key: 'conflicts' as const, icon: '⚔', ko: '갈등', en: 'Conflicts' },
                    { key: 'forbidden' as const, icon: '🚫', ko: '금기', en: 'Forbidden' },
                  ]).map(field => (
                    <div key={field.key} className="flex gap-1.5 text-[9px]">
                      <span className="shrink-0 w-12 text-text-tertiary font-bold">{field.icon} {lang === "ko" ? field.ko : field.en}</span>
                      <span className="text-text-secondary">{lang === "ko" ? era[field.key].ko : era[field.key].en}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-2">
                {civ.traits.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-secondary rounded text-[9px] text-text-secondary border border-border">
                    {t}
                    <button onClick={() => removeTrait(civ.id, i)} className="text-text-tertiary hover:text-accent-red">×</button>
                  </span>
                ))}
              </div>
              <input
                placeholder={lang === "ko" ? "특성 추가 (Enter)" : "Add trait (Enter)"}
                className="w-full bg-bg-secondary border border-border rounded px-2 py-1 text-[10px] outline-none focus:border-accent-purple"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    addTrait(civ.id, (e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PART 3: RELATIONS VIEW (SVG circular layout)
// ============================================================

function RelationsView({ lang, civs, relations, setRelations }: {
  lang: Lang;
  civs: Civilization[];
  relations: CivRelation[];
  setRelations: React.Dispatch<React.SetStateAction<CivRelation[]>>;
}) {
  const [selFrom, setSelFrom] = useState("");
  const [selTo, setSelTo] = useState("");
  const [selType, setSelType] = useState<RelationType>("alliance");

  const addRelation = () => {
    if (!selFrom || !selTo || selFrom === selTo) return;
    const exists = relations.some(r =>
      (r.from === selFrom && r.to === selTo) || (r.from === selTo && r.to === selFrom)
    );
    if (exists) return;
    setRelations(prev => [...prev, { from: selFrom, to: selTo, type: selType }]);
  };

  const removeRelation = (idx: number) => setRelations(prev => prev.filter((_, i) => i !== idx));

  // Circular positions
  const nodePositions = useMemo(() => {
    const cx = 200, cy = 200, r = 150;
    return civs.map((c, i) => {
      const angle = (i / Math.max(civs.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return { id: c.id, name: c.name, color: c.color, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }, [civs]);

  const getPos = (id: string) => nodePositions.find(n => n.id === id);

  if (civs.length < 2) {
    return (
      <div className="text-center py-12 text-text-tertiary text-xs italic">
        {lang === "ko" ? "문명을 2개 이상 추가하면 관계도를 구성할 수 있습니다" : "Add 2+ civilizations to create a relationship map"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-end">
        <select value={selFrom} onChange={e => setSelFrom(e.target.value)} className="bg-bg-primary border border-border rounded px-2 py-1.5 text-xs outline-none">
          <option value="">{lang === "ko" ? "문명 A" : "Civ A"}</option>
          {civs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selTo} onChange={e => setSelTo(e.target.value)} className="bg-bg-primary border border-border rounded px-2 py-1.5 text-xs outline-none">
          <option value="">{lang === "ko" ? "문명 B" : "Civ B"}</option>
          {civs.filter(c => c.id !== selFrom).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(Object.keys(RELATION_STYLES) as RelationType[]).map(rt => (
            <button key={rt} onClick={() => setSelType(rt)}
              className={`px-2 py-1.5 rounded text-[10px] font-bold border transition-all ${
                selType === rt ? "text-white" : "text-text-tertiary border-border hover:border-text-tertiary"
              }`}
              style={selType === rt ? { background: RELATION_STYLES[rt].color, borderColor: RELATION_STYLES[rt].color } : undefined}
            >
              {lang === "ko" ? RELATION_STYLES[rt].ko : RELATION_STYLES[rt].en}
            </button>
          ))}
        </div>
        <button onClick={addRelation} className="px-3 py-1.5 bg-accent-purple text-white rounded text-xs font-bold">
          {lang === "ko" ? "추가" : "Add"}
        </button>
      </div>

      {/* SVG */}
      <div className="flex justify-center">
        <svg viewBox="0 0 400 400" className="w-full max-w-[500px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
          <rect width="400" height="400" fill="transparent" />
          {/* Relation lines */}
          {relations.map((rel, i) => {
            const from = getPos(rel.from);
            const to = getPos(rel.to);
            if (!from || !to) return null;
            const style = RELATION_STYLES[rel.type];
            return (
              <g key={i}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={style.color} strokeWidth="2" strokeDasharray={style.dash} opacity="0.7" />
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}
                  fill={style.color} fontSize="8" textAnchor="middle" fontWeight="bold">
                  {lang === "ko" ? style.ko : style.en}
                </text>
              </g>
            );
          })}
          {/* Nodes */}
          {nodePositions.map(node => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="20" fill={node.color} opacity="0.15" stroke={node.color} strokeWidth="2" />
              <circle cx={node.x} cy={node.y} r="4" fill={node.color} />
              <text x={node.x} y={node.y + 32} fill={node.color} fontSize="10" textAnchor="middle" fontWeight="bold">
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend + list */}
      <div className="flex flex-wrap gap-3 text-[9px]">
        {(Object.keys(RELATION_STYLES) as RelationType[]).map(rt => (
          <span key={rt} className="flex items-center gap-1">
            <span className="w-3 h-0.5 inline-block rounded" style={{ background: RELATION_STYLES[rt].color }} />
            {lang === "ko" ? RELATION_STYLES[rt].ko : RELATION_STYLES[rt].en}
          </span>
        ))}
      </div>
      {relations.length > 0 && (
        <div className="space-y-1">
          {relations.map((rel, i) => {
            const fromCiv = civs.find(c => c.id === rel.from);
            const toCiv = civs.find(c => c.id === rel.to);
            const style = RELATION_STYLES[rel.type];
            return (
              <div key={i} className="flex items-center justify-between bg-bg-primary border border-border rounded px-3 py-1.5 text-[10px]">
                <span>
                  <span style={{ color: fromCiv?.color }}>{fromCiv?.name}</span>
                  <span className="text-text-tertiary mx-1">⇄</span>
                  <span style={{ color: toCiv?.color }}>{toCiv?.name}</span>
                  <span className="ml-2 font-bold" style={{ color: style.color }}>
                    [{lang === "ko" ? style.ko : style.en}]
                  </span>
                </span>
                <button onClick={() => removeRelation(i)} className="text-text-tertiary hover:text-accent-red">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 4: TIMELINE VIEW (with transition events)
// ============================================================

function TimelineView({ lang, civs, transitions, setTransitions }: {
  lang: Lang;
  civs: Civilization[];
  transitions: TransitionEvent[];
  setTransitions: React.Dispatch<React.SetStateAction<TransitionEvent[]>>;
}) {
  const eraOrder = ERAS.map(e => e.id);
  const civsByEra = useMemo(() => {
    const map: Record<string, Civilization[]> = {};
    ERAS.forEach(e => { map[e.id] = []; });
    civs.forEach(c => { if (map[c.era]) map[c.era].push(c); });
    return map;
  }, [civs]);

  const addTransition = (fromEra: string, toEra: string) => {
    const exists = transitions.some(t => t.fromEra === fromEra && t.toEra === toEra);
    if (exists) return;
    const defaultDesc = lang === "ko" ? "전환 이벤트를 입력하세요" : "Enter transition event";
    setTransitions(prev => [...prev, { fromEra, toEra, description: defaultDesc }]);
  };

  const updateTransitionDesc = useCallback((idx: number, desc: string) => {
    setTransitions(prev => prev.map((t, i) => i === idx ? { ...t, description: desc } : t));
  }, [setTransitions]);

  const removeTransition = (idx: number) => setTransitions(prev => prev.filter((_, i) => i !== idx));

  const generateAIEvent = useCallback((fromEra: string, toEra: string, idx: number) => {
    const fromLabel = lang === "ko" ? ERAS.find(e => e.id === fromEra)?.ko : ERAS.find(e => e.id === fromEra)?.en;
    const toLabel = lang === "ko" ? ERAS.find(e => e.id === toEra)?.ko : ERAS.find(e => e.id === toEra)?.en;
    const templates_ko = [
      `${fromLabel}의 마지막 대전쟁으로 문명이 붕괴, ${toLabel} 시대가 열림`,
      `대재앙으로 인구 80% 감소, 생존자들이 ${toLabel} 체제를 수립`,
      `혁명적 기술 발견으로 ${fromLabel}에서 ${toLabel}로 급격한 전환`,
      `외부 세력의 침략이 ${fromLabel} 체계를 파괴, ${toLabel}의 여명`,
      `신비한 에너지원 발견으로 ${toLabel} 패러다임 전환`,
    ];
    const templates_en = [
      `Great war of ${fromLabel} collapses civilization, ushering in ${toLabel}`,
      `Cataclysm reduces population 80%, survivors establish ${toLabel} order`,
      `Revolutionary discovery triggers rapid transition to ${toLabel}`,
      `External invasion destroys ${fromLabel} systems, dawn of ${toLabel}`,
      `Discovery of mystical energy source triggers ${toLabel} paradigm shift`,
    ];
    const templates = lang === "ko" ? templates_ko : templates_en;
    const event = templates[Math.floor(Math.random() * templates.length)];
    updateTransitionDesc(idx, event);
  }, [lang, updateTransitionDesc]);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Era timeline bar */}
          <div className="flex items-stretch gap-0">
            {ERAS.map((era, i) => {
              const hasCivs = civsByEra[era.id]?.length > 0;
              return (
                <React.Fragment key={era.id}>
                  <div className={`flex-1 text-center py-3 border border-border rounded-lg mx-0.5 transition-all ${
                    hasCivs ? "bg-accent-purple/10 border-accent-purple/30" : "bg-bg-primary"
                  }`}>
                    <div className="text-[9px] font-bold text-text-tertiary font-[family-name:var(--font-mono)] uppercase">
                      {lang === "ko" ? era.ko : era.en}
                    </div>
                    <div className="text-[8px] text-text-tertiary mt-0.5">TL{era.techLevel}</div>
                    {civsByEra[era.id]?.map(c => (
                      <div key={c.id} className="text-[8px] font-bold mt-1 truncate px-1" style={{ color: c.color }}>
                        {c.name}
                      </div>
                    ))}
                  </div>
                  {/* Transition slot between eras */}
                  {i < ERAS.length - 1 && (
                    <div className="w-6 flex flex-col items-center justify-center">
                      <div className="text-text-tertiary text-[10px]">→</div>
                      {!transitions.some(t => t.fromEra === era.id && t.toEra === eraOrder[i + 1]) && (
                        <button
                          onClick={() => addTransition(era.id, eraOrder[i + 1])}
                          className="w-4 h-4 rounded-full border border-border text-text-tertiary text-[8px] hover:border-accent-purple hover:text-accent-purple transition-colors"
                          title={lang === "ko" ? "전환 이벤트 추가" : "Add transition event"}
                        >
                          +
                        </button>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transition events */}
      {transitions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
            {lang === "ko" ? "시대 전환 이벤트" : "Era Transition Events"}
          </h4>
          {transitions.map((tr, i) => {
            const fromLabel = lang === "ko" ? ERAS.find(e => e.id === tr.fromEra)?.ko : ERAS.find(e => e.id === tr.fromEra)?.en;
            const toLabel = lang === "ko" ? ERAS.find(e => e.id === tr.toEra)?.ko : ERAS.find(e => e.id === tr.toEra)?.en;
            return (
              <div key={i} className="border border-border rounded-lg p-3 bg-bg-primary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-accent-purple">
                    {fromLabel} → {toLabel}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => generateAIEvent(tr.fromEra, tr.toEra, i)}
                      className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold hover:bg-accent-purple/20 transition-colors"
                      title={lang === 'ko' ? '템플릿에서 자동 생성' : 'Auto-generate from templates'}>
                      {lang === 'ko' ? '자동' : 'Auto'}
                    </button>
                    <button onClick={() => removeTransition(i)} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                  </div>
                </div>
                <input
                  value={tr.description}
                  onChange={e => updateTransitionDesc(i, e.target.value)}
                  className="w-full bg-bg-secondary border border-border rounded px-2 py-1.5 text-[11px] outline-none focus:border-accent-purple"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 5: HEX MAP VIEW
// ============================================================

function HexMapView({ lang, civs }: {
  lang: Lang;
  civs: Civilization[];
}) {
  const [selectedCiv, setSelectedCiv] = useState<string | null>(null);
  const [paintCiv, setPaintCiv] = useState<string | null>(null);
  const [hexMap, setHexMap] = useState<Record<string, string>>({});

  const hexCenters = useMemo(() => {
    const centers: { col: number; row: number; x: number; y: number; key: string }[] = [];
    for (let row = 0; row < HEX_ROWS; row++) {
      for (let col = 0; col < HEX_COLS; col++) {
        const offsetX = row % 2 === 1 ? HEX_SIZE * 0.87 : 0;
        const x = col * HEX_SIZE * 1.74 + offsetX + HEX_SIZE + 10;
        const y = row * HEX_SIZE * 1.5 + HEX_SIZE + 10;
        centers.push({ col, row, x, y, key: `${col}-${row}` });
      }
    }
    return centers;
  }, []);

  const hexPath = (cx: number, cy: number) => {
    const s = HEX_SIZE * 0.85;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
    });
    return pts.join(" ");
  };

  const [hexHint, setHexHint] = useState('');
  const handleHexClick = (key: string) => {
    if (paintCiv) {
      setHexMap(prev => {
        const next = { ...prev };
        if (next[key] === paintCiv) {
          delete next[key];
        } else {
          next[key] = paintCiv;
        }
        return next;
      });
      setHexHint('');
    } else {
      setHexHint(lang === "ko" ? '먼저 세력을 선택하세요' : 'Select a faction first');
      setTimeout(() => setHexHint(''), 2000);
    }
  };

  const civFromHex = (key: string) => civs.find(c => c.id === hexMap[key]);

  return (
    <div className="space-y-4">
      {/* Paint selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
          {lang === "ko" ? "세력 페인트:" : "Paint faction:"}
        </span>
        {civs.map(c => (
          <button key={c.id} onClick={() => { setPaintCiv(paintCiv === c.id ? null : c.id); setSelectedCiv(c.id); }}
            className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
              paintCiv === c.id ? "text-white" : "text-text-tertiary border-border"
            }`}
            style={paintCiv === c.id ? { background: c.color, borderColor: c.color } : undefined}
          >
            {c.name}
          </button>
        ))}
        {paintCiv && (
          <button onClick={() => setPaintCiv(null)} className="text-[10px] text-text-tertiary hover:text-accent-red">
            {lang === "ko" ? "해제" : "Clear"}
          </button>
        )}
      </div>

      {civs.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-xs italic">
          {lang === "ko" ? "문명을 추가하면 영역을 칠할 수 있습니다" : "Add civilizations to paint territories"}
        </div>
      ) : (
        <div className="flex justify-center overflow-x-auto">
          <svg
            viewBox={`0 0 ${HEX_COLS * HEX_SIZE * 1.74 + HEX_SIZE * 2 + 20} ${HEX_ROWS * HEX_SIZE * 1.5 + HEX_SIZE * 2 + 20}`}
            className="w-full max-w-[700px]"
          >
            {hexCenters.map(h => {
              const owner = civFromHex(h.key);
              return (
                <g key={h.key} onClick={() => handleHexClick(h.key)} className="cursor-pointer">
                  <polygon
                    points={hexPath(h.x, h.y)}
                    fill={owner ? owner.color : "var(--color-bg-secondary)"}
                    fillOpacity={owner ? 0.3 : 1}
                    stroke={owner ? owner.color : "var(--color-border)"}
                    strokeWidth={owner ? 1.5 : 0.5}
                    className="transition-all hover:opacity-80"
                  />
                  {owner && (
                    <text x={h.x} y={h.y + 3} fill={owner.color} fontSize="7" textAnchor="middle" fontWeight="bold" opacity="0.8">
                      {owner.name.slice(0, 2)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hexHint && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-amber-900/80 text-amber-200 text-[11px] rounded-lg font-[family-name:var(--font-mono)] animate-pulse z-10">
              {hexHint}
            </div>
          )}
        </div>
      )}

      {/* Hex info panel */}
      {selectedCiv && (() => {
        const civ = civs.find(c => c.id === selectedCiv);
        if (!civ) return null;
        const era = ERAS.find(e => e.id === civ.era);
        return (
          <div className="border border-border rounded-lg p-3" style={{ borderLeftWidth: 3, borderLeftColor: civ.color }}>
            <div className="font-bold text-sm" style={{ color: civ.color }}>{civ.name}</div>
            <div className="text-[10px] text-text-tertiary">{lang === "ko" ? era?.ko : era?.en} | TL{era?.techLevel}</div>
            <div className="text-[10px] text-text-secondary mt-1">{civ.traits.join(", ") || (lang === "ko" ? "특성 없음" : "No traits")}</div>
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================
// PART 6: VALIDATION VIEW
// ============================================================

function ValidationView({ lang, civs, selectedGenre, selectedLevel }: {
  lang: Lang;
  civs: Civilization[];
  selectedGenre: string;
  selectedLevel: number;
}) {
  const issues = useMemo(() => {
    const result: ValidationIssue[] = [];

    // Tech level vs genre level mismatch
    civs.forEach(civ => {
      const era = ERAS.find(e => e.id === civ.era);
      if (!era) return;

      // Medieval civ with modern traits
      const modernTraits = ["총", "화약", "전기", "인터넷", "AI", "핵", "우주선", "gun", "electricity", "internet", "nuclear"];
      civ.traits.forEach(trait => {
        const lower = trait.toLowerCase();
        if (era.techLevel <= 3 && modernTraits.some(mt => lower.includes(mt))) {
          result.push({
            civName: civ.name,
            message: lang === "ko"
              ? `"${trait}" 특성은 ${era.ko} 시대(TL${era.techLevel})에 부적합합니다`
              : `"${trait}" trait is anachronistic for ${era.en} era (TL${era.techLevel})`,
            severity: "error",
          });
        }
      });

      // Genre-specific checks
      if (selectedGenre === "SF" && selectedLevel >= 3 && era.techLevel < 5) {
        result.push({
          civName: civ.name,
          message: lang === "ko"
            ? `SF Lv${selectedLevel} 세계관에 ${era.ko}(TL${era.techLevel}) 문명은 기술 수준이 낮습니다`
            : `${era.en}(TL${era.techLevel}) is too low-tech for SF Lv${selectedLevel}`,
          severity: "warning",
        });
      }
      if (selectedGenre === "Fantasy" && era.techLevel >= 7) {
        result.push({
          civName: civ.name,
          message: lang === "ko"
            ? `Fantasy 세계관에 ${era.ko}(TL${era.techLevel}) 기술 수준은 과도합니다`
            : `${era.en}(TL${era.techLevel}) is too advanced for Fantasy world`,
          severity: "warning",
        });
      }

      // Duplicate names
      const dupes = civs.filter(c => c.name === civ.name);
      if (dupes.length > 1 && dupes[0].id === civ.id) {
        result.push({
          civName: civ.name,
          message: lang === "ko" ? `"${civ.name}" 이름이 중복됩니다` : `Duplicate name: "${civ.name}"`,
          severity: "error",
        });
      }
    });

    // No civilizations warning
    if (civs.length === 0) {
      result.push({
        civName: "-",
        message: lang === "ko" ? "문명이 하나도 등록되지 않았습니다" : "No civilizations registered",
        severity: "warning",
      });
    }

    return result;
  }, [civs, selectedGenre, selectedLevel, lang]);

  const errors = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex gap-3 items-center">
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-[family-name:var(--font-mono)] ${
          errors.length > 0 ? "bg-accent-red/10 text-accent-red border border-accent-red/30"
            : warnings.length > 0 ? "bg-accent-amber/10 text-accent-amber border border-accent-amber/30"
            : "bg-accent-green/10 text-accent-green border border-accent-green/30"
        }`}>
          {errors.length > 0
            ? `${errors.length} ERROR${errors.length > 1 ? "S" : ""}`
            : warnings.length > 0
              ? `${warnings.length} WARNING${warnings.length > 1 ? "S" : ""}`
              : lang === "ko" ? "검증 통과" : "ALL CLEAR"
          }
        </div>
        <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
          {civs.length} {lang === "ko" ? "문명" : "civs"} | {selectedGenre} Lv{selectedLevel}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-text-secondary text-sm font-bold">
            {lang === "ko" ? "세계관 일관성 검증 통과" : "World consistency validation passed"}
          </div>
          <div className="text-text-tertiary text-xs mt-1">
            {lang === "ko" ? "기술 수준, 장르 레벨, 명칭 충돌 없음" : "No tech level, genre, or naming conflicts"}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-3 border rounded-lg p-3 ${
              issue.severity === "error"
                ? "border-accent-red/30 bg-accent-red/5"
                : "border-accent-amber/30 bg-accent-amber/5"
            }`}>
              <span className={`text-xs font-bold font-[family-name:var(--font-mono)] shrink-0 mt-0.5 ${
                issue.severity === "error" ? "text-accent-red" : "text-accent-amber"
              }`}>
                {issue.severity === "error" ? "ERR" : "WRN"}
              </span>
              <div>
                <span className="text-[10px] font-bold text-text-secondary">[{issue.civName}]</span>
                <span className="text-[11px] text-text-secondary ml-1">{issue.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PART 7: LANGUAGE FORGE (세계관 언어 생성기)
// ============================================================

function LanguageForge({ lang, civs }: { lang: Lang; civs: Civilization[] }) {
  const [phonemes, setPhonemes] = useState<CustomPhoneme[]>([]);
  const [words, setWords] = useState<LangWord[]>([]);
  const [subTab, setSubTab] = useState<"phonemes" | "words" | "compose">("phonemes");
  const [composeBuf, setComposeBuf] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizFrameRef = useRef<number | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  }, []);

  // --- Waveform visualizer ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2 = canvas.getContext("2d");
    if (!ctx2) return;
    const analyser = analyserRef.current;
    const bufLen = analyser ? analyser.frequencyBinCount : 512;
    const dataArr = new Uint8Array(bufLen);

    function draw() {
      vizFrameRef.current = requestAnimationFrame(draw);
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
      ctx2!.fillStyle = "rgba(10,10,12,0.85)";
      ctx2!.fillRect(0, 0, w, h);
      if (analyser) {
        analyser.getByteTimeDomainData(dataArr);
        ctx2!.lineWidth = 1.5;
        ctx2!.strokeStyle = "#7b5ea7";
        ctx2!.shadowBlur = 6;
        ctx2!.shadowColor = "#7b5ea7";
        ctx2!.beginPath();
        const sliceW = w / bufLen;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = dataArr[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) { ctx2!.moveTo(x, y); } else { ctx2!.lineTo(x, y); }
          x += sliceW;
        }
        ctx2!.stroke();
      }
    }
    draw();
    return () => {
      if (vizFrameRef.current) cancelAnimationFrame(vizFrameRef.current);
    };
  }, []);

  // --- Play a single phoneme ---
  const playPhoneme = useCallback((ph: CustomPhoneme) => {
    if (ph.freq === 0) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const duration = ph.type === "consonant" ? 0.4 : 0.35;
    const gainNode = ctx.createGain();
    gainNode.connect(analyserRef.current!);

    setPlayingId(ph.id);
    setTimeout(() => setPlayingId(null), duration * 1000);

    if (ph.sigClass === "sustained") {
      const osc = ctx.createOscillator();
      osc.type = ph.wave;
      osc.frequency.setValueAtTime(ph.freq, now);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gainNode.gain.setValueAtTime(0.18, now + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now); osc.stop(now + duration);
    } else if (ph.sigClass === "modulated") {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = ph.wave; modulator.type = "sine";
      carrier.frequency.setValueAtTime(ph.freq, now);
      modulator.frequency.setValueAtTime(ph.freq * 0.5, now);
      modGain.gain.setValueAtTime(ph.freq * 1.5, now);
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(gainNode);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      carrier.start(now); carrier.stop(now + duration);
      modulator.start(now); modulator.stop(now + duration);
    } else if (ph.sigClass === "percussive") {
      const osc = ctx.createOscillator();
      osc.type = ph.wave;
      osc.frequency.setValueAtTime(ph.freq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(ph.freq * 0.3, now + 0.15);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.28, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.2);
    } else if (ph.sigClass === "cyclic") {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      osc.type = ph.wave; lfo.type = "sine";
      osc.frequency.setValueAtTime(ph.freq, now);
      lfo.frequency.setValueAtTime(6, now);
      lfoGain.gain.setValueAtTime(0.12, now);
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      osc.connect(gainNode);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      osc.start(now); osc.stop(now + duration);
      lfo.start(now); lfo.stop(now + duration);
    }
  }, [getAudioCtx]);

  // --- Play a sequence of phonemes (word or sentence) ---
  const playSequence = useCallback((phIds: string[]) => {
    const delay = 280;
    phIds.forEach((pid, i) => {
      const ph = phonemes.find(p => p.id === pid);
      if (ph) setTimeout(() => playPhoneme(ph), i * delay);
    });
  }, [phonemes, playPhoneme]);

  // --- Speak using TTS ---
  const speakTTS = useCallback((roman: string) => {
    if (!window.speechSynthesis || !roman.trim()) return;
    const utt = new SpeechSynthesisUtterance(roman);
    utt.lang = "en-US";
    utt.rate = 0.85;
    utt.pitch = 1.1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
  }, []);

  // --- Load genre preset ---
  const loadPreset = useCallback((presetKey: string) => {
    const preset = GENRE_PHONEME_PRESETS[presetKey];
    if (!preset) return;
    setPhonemes(preset.phonemes.map((p, i) => ({ ...p, id: `ph-${presetKey}-${i}-${Date.now()}` })));
  }, []);

  // --- Add custom phoneme ---
  const [newPhForm, setNewPhForm] = useState({ symbol: "", roman: "", type: "consonant" as "consonant" | "vowel", sigClass: "sustained" as SigClass, freq: 300, wave: "sine" as WaveType });

  const addPhoneme = () => {
    if (!newPhForm.symbol.trim() || !newPhForm.roman.trim()) return;
    setPhonemes(prev => [...prev, { ...newPhForm, id: `ph-custom-${Date.now()}` }]);
    setNewPhForm({ symbol: "", roman: "", type: "consonant", sigClass: "sustained", freq: 300, wave: "sine" });
  };

  // --- Word builder ---
  const [newWordMeaning, setNewWordMeaning] = useState("");
  const [wordPhBuf, setWordPhBuf] = useState<string[]>([]);

  const addWord = () => {
    if (!newWordMeaning.trim() || wordPhBuf.length === 0) return;
    const roman = wordPhBuf.map(id => phonemes.find(p => p.id === id)?.roman || "").join("");
    setWords(prev => [...prev, { id: `w-${Date.now()}`, meaning: newWordMeaning.trim(), phonemes: [...wordPhBuf], roman }]);
    setNewWordMeaning("");
    setWordPhBuf([]);
  };

  const consonants = phonemes.filter(p => p.type === "consonant");
  const vowels = phonemes.filter(p => p.type === "vowel");

  // --- Compose sentence buffer ---
  const composeRoman = composeBuf.map(wid => words.find(w => w.id === wid)?.roman || "").join(" ");
  const composePhIds = composeBuf.flatMap(wid => words.find(w => w.id === wid)?.phonemes || []);

  return (
    <div className="space-y-5">
      {/* Sub tabs */}
      <div className="flex gap-2">
        {([
          { id: "phonemes" as const, ko: "음소 설계", en: "Phonemes" },
          { id: "words" as const, ko: "어휘 빌더", en: "Vocabulary" },
          { id: "compose" as const, ko: "문장 합성", en: "Compose" },
        ]).map(st => (
          <button key={st.id} onClick={() => setSubTab(st.id)}
            className={`px-3 py-1.5 rounded text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-wider uppercase transition-all ${
              subTab === st.id ? "bg-accent-purple text-white" : "bg-bg-primary text-text-tertiary border border-border hover:text-text-secondary"
            }`}>
            {lang === "ko" ? st.ko : st.en}
          </button>
        ))}
      </div>

      {/* Waveform canvas */}
      <canvas ref={canvasRef} className="w-full h-16 rounded border border-border bg-bg-primary" />

      {/* ====== PHONEMES TAB ====== */}
      {subTab === "phonemes" && (
        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
              {lang === "ko" ? "프리셋:" : "Presets:"}
            </span>
            {Object.entries(GENRE_PHONEME_PRESETS).map(([key, val]) => (
              <button key={key} onClick={() => loadPreset(key)}
                className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors">
                {lang === "ko" ? val.label.ko : val.label.en}
              </button>
            ))}
          </div>

          {/* Consonant/Vowel grid */}
          {phonemes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Consonants */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
                  {lang === "ko" ? "자음" : "Consonants"} ({consonants.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {consonants.map(ph => {
                    const meta = SIG_CLASS_META[ph.sigClass];
                    return (
                      <button key={ph.id} onClick={() => playPhoneme(ph)}
                        className={`relative px-2.5 py-2 rounded border text-xs font-bold transition-all ${
                          playingId === ph.id ? "ring-2 ring-accent-purple scale-105" : ""
                        }`}
                        style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}10` }}
                        title={`${ph.roman} | ${ph.freq}Hz | ${meta.ko}`}
                      >
                        <div className="text-sm">{ph.symbol}</div>
                        <div className="text-[7px] opacity-60">{ph.roman}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Vowels */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
                  {lang === "ko" ? "모음" : "Vowels"} ({vowels.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {vowels.map(ph => {
                    const meta = SIG_CLASS_META[ph.sigClass];
                    return (
                      <button key={ph.id} onClick={() => playPhoneme(ph)}
                        className={`relative px-2.5 py-2 rounded border text-xs font-bold transition-all ${
                          playingId === ph.id ? "ring-2 ring-accent-purple scale-105" : ""
                        }`}
                        style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}10` }}
                        title={`${ph.roman} | ${ph.freq}Hz | ${meta.ko}`}
                      >
                        <div className="text-sm">{ph.symbol}</div>
                        <div className="text-[7px] opacity-60">{ph.roman}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Add custom phoneme */}
          <div className="border border-border rounded-lg p-3 bg-bg-primary space-y-2">
            <h4 className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider font-[family-name:var(--font-mono)]">
              {lang === "ko" ? "커스텀 음소 추가" : "Add Custom Phoneme"}
            </h4>
            <div className="flex flex-wrap gap-2">
              <input value={newPhForm.symbol} onChange={e => setNewPhForm(p => ({ ...p, symbol: e.target.value }))}
                placeholder={lang === "ko" ? "기호" : "Symbol"} className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent-purple" />
              <input value={newPhForm.roman} onChange={e => setNewPhForm(p => ({ ...p, roman: e.target.value }))}
                placeholder={lang === "ko" ? "로마자" : "Roman"} className="w-20 bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none focus:border-accent-purple" />
              <select value={newPhForm.type} onChange={e => setNewPhForm(p => ({ ...p, type: e.target.value as "consonant" | "vowel" }))}
                className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none">
                <option value="consonant">{lang === "ko" ? "자음" : "Cons."}</option>
                <option value="vowel">{lang === "ko" ? "모음" : "Vowel"}</option>
              </select>
              <select value={newPhForm.sigClass} onChange={e => setNewPhForm(p => ({ ...p, sigClass: e.target.value as SigClass }))}
                className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none">
                {(Object.keys(SIG_CLASS_META) as SigClass[]).map(sc => (
                  <option key={sc} value={sc}>{lang === "ko" ? SIG_CLASS_META[sc].ko : SIG_CLASS_META[sc].en}</option>
                ))}
              </select>
              <input type="number" value={newPhForm.freq} onChange={e => setNewPhForm(p => ({ ...p, freq: parseInt(e.target.value) || 0 }))}
                className="w-16 bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none" placeholder="Hz" />
              <select value={newPhForm.wave} onChange={e => setNewPhForm(p => ({ ...p, wave: e.target.value as WaveType }))}
                className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs outline-none">
                <option value="sine">Sine</option><option value="sawtooth">Saw</option>
                <option value="square">Square</option><option value="triangle">Triangle</option>
              </select>
              <button onClick={addPhoneme} className="px-3 py-1 bg-accent-purple text-white rounded text-xs font-bold">+</button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[9px]">
            {(Object.keys(SIG_CLASS_META) as SigClass[]).map(sc => (
              <span key={sc} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: SIG_CLASS_META[sc].color }} />
                {lang === "ko" ? SIG_CLASS_META[sc].ko : SIG_CLASS_META[sc].en}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ====== WORDS TAB ====== */}
      {subTab === "words" && (
        <div className="space-y-4">
          {phonemes.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-xs italic">
              {lang === "ko" ? "먼저 음소 탭에서 음소를 추가하세요" : "Add phonemes in the Phonemes tab first"}
            </div>
          ) : (
            <>
              {/* Word creator */}
              <div className="border border-border rounded-lg p-3 bg-bg-primary space-y-3">
                <input value={newWordMeaning} onChange={e => setNewWordMeaning(e.target.value)}
                  placeholder={lang === "ko" ? "뜻 (예: 불, 물, 인사)" : "Meaning (e.g. fire, water, hello)"}
                  className="w-full bg-bg-secondary border border-border rounded px-3 py-2 text-xs outline-none focus:border-accent-purple" />

                {/* Phoneme picker */}
                <div className="flex flex-wrap gap-1">
                  {phonemes.filter(p => p.sigClass !== "silent").map(ph => (
                    <button key={ph.id} onClick={() => { setWordPhBuf(prev => [...prev, ph.id]); playPhoneme(ph); }}
                      className="px-2 py-1 rounded border text-[10px] font-bold hover:scale-105 transition-all"
                      style={{ borderColor: SIG_CLASS_META[ph.sigClass].color, color: SIG_CLASS_META[ph.sigClass].color }}>
                      {ph.symbol}
                    </button>
                  ))}
                </div>

                {/* Buffer display */}
                {wordPhBuf.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-text-tertiary">{lang === "ko" ? "조합:" : "Build:"}</span>
                    {wordPhBuf.map((pid, i) => {
                      const ph = phonemes.find(p => p.id === pid);
                      return (
                        <span key={i} className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[10px] font-bold cursor-pointer hover:line-through"
                          onClick={() => setWordPhBuf(prev => prev.filter((_, idx) => idx !== i))}>
                          {ph?.symbol}
                        </span>
                      );
                    })}
                    <span className="text-[10px] text-text-secondary font-[family-name:var(--font-mono)]">
                      → {wordPhBuf.map(id => phonemes.find(p => p.id === id)?.roman || "").join("")}
                    </span>
                    <button onClick={() => playSequence(wordPhBuf)} className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold">
                      ▶
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={addWord} disabled={!newWordMeaning.trim() || wordPhBuf.length === 0}
                    className="px-4 py-1.5 bg-accent-purple text-white rounded text-xs font-bold disabled:opacity-30">
                    {lang === "ko" ? "단어 등록" : "Register Word"}
                  </button>
                  <button onClick={() => setWordPhBuf([])} className="px-3 py-1.5 bg-bg-secondary border border-border rounded text-xs text-text-tertiary">
                    {lang === "ko" ? "초기화" : "Clear"}
                  </button>
                </div>
              </div>

              {/* Word list */}
              {words.length > 0 && (
                <div className="space-y-1.5">
                  {words.map(w => (
                    <div key={w.id} className="flex items-center justify-between bg-bg-primary border border-border rounded px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-text-primary">{w.meaning}</span>
                        <span className="text-[10px] text-accent-purple font-[family-name:var(--font-mono)] font-bold">{w.roman}</span>
                        <span className="text-[9px] text-text-tertiary">
                          [{w.phonemes.map(pid => phonemes.find(p => p.id === pid)?.symbol).join("")}]
                        </span>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => playSequence(w.phonemes)} className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-[9px] font-bold">▶ SIG</button>
                        <button onClick={() => speakTTS(w.roman)} className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-[9px] font-bold">▶ TTS</button>
                        <button onClick={() => setWords(prev => prev.filter(ww => ww.id !== w.id))} className="text-text-tertiary hover:text-accent-red text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ====== COMPOSE TAB ====== */}
      {subTab === "compose" && (
        <div className="space-y-4">
          {words.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-xs italic">
              {lang === "ko" ? "먼저 어휘 탭에서 단어를 등록하세요" : "Register words in the Vocabulary tab first"}
            </div>
          ) : (
            <>
              {/* Word palette */}
              <div className="space-y-2">
                <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">
                  {lang === "ko" ? "단어를 클릭하여 문장 조립:" : "Click words to compose sentence:"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {words.map(w => (
                    <button key={w.id} onClick={() => setComposeBuf(prev => [...prev, w.id])}
                      className="px-2.5 py-1.5 bg-bg-primary border border-border rounded text-[10px] font-bold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-colors">
                      {w.meaning} <span className="text-text-tertiary">({w.roman})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sentence display */}
              {composeBuf.length > 0 && (
                <div className="border border-accent-purple/30 bg-accent-purple/5 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {composeBuf.map((wid, i) => {
                      const w = words.find(ww => ww.id === wid);
                      return (
                        <span key={i} className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-xs font-bold cursor-pointer hover:line-through"
                          onClick={() => setComposeBuf(prev => prev.filter((_, idx) => idx !== i))}>
                          {w?.meaning}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-sm font-bold text-text-primary font-[family-name:var(--font-mono)]">
                    {composeRoman}
                  </div>

                  {/* Assign to civ */}
                  {civs.length > 0 && (
                    <div className="flex items-center gap-2 text-[9px] text-text-tertiary">
                      <span>{lang === "ko" ? "문명 지정:" : "Assign to civ:"}</span>
                      {civs.map(c => (
                        <button key={c.id} onClick={() => {
                          // 현재 조합 중인 단어들의 civId를 일괄 변경
                          setWords(prev => prev.map(w =>
                            composeBuf.includes(w.id) ? { ...w, civId: c.id } : w
                          ));
                        }}
                          className="px-1.5 py-0.5 rounded border text-[9px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ borderColor: c.color, color: c.color }}
                          title={lang === 'ko' ? `${c.name}에 귀속` : `Assign to ${c.name}`}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => playSequence(composePhIds)}
                      className="px-4 py-2 bg-accent-purple text-white rounded text-xs font-bold flex items-center gap-1.5">
                      ▶ {lang === "ko" ? "신호음 재생" : "Play Signal"}
                    </button>
                    <button onClick={() => speakTTS(composeRoman)}
                      className="px-4 py-2 bg-accent-blue text-white rounded text-xs font-bold flex items-center gap-1.5">
                      ▶ {lang === "ko" ? "TTS 발음" : "TTS Speak"}
                    </button>
                    <button onClick={() => setComposeBuf([])} className="px-3 py-2 bg-bg-secondary border border-border rounded text-xs text-text-tertiary">
                      {lang === "ko" ? "초기화" : "Clear"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 text-[9px] font-[family-name:var(--font-mono)] pt-2 border-t border-border">
        <span className="text-text-tertiary">{lang === "ko" ? "음소" : "Phonemes"}: <span className="text-accent-purple font-bold">{phonemes.length}</span></span>
        <span className="text-text-tertiary">{lang === "ko" ? "자음" : "Cons"}: <span className="font-bold">{consonants.length}</span></span>
        <span className="text-text-tertiary">{lang === "ko" ? "모음" : "Vowels"}: <span className="font-bold">{vowels.length}</span></span>
        <span className="text-text-tertiary">{lang === "ko" ? "어휘" : "Words"}: <span className="text-accent-purple font-bold">{words.length}</span></span>
      </div>
    </div>
  );
}

// ============================================================
// PART 8: MAIN WORLD SIMULATOR
// ============================================================

// ============================================================
// PART 8-A: EH RULE LEVEL DESCRIPTIONS
// ============================================================

const RULE_LEVELS: { lv: number; ko: string; en: string; desc_ko: string; desc_en: string; pct: number; genre_ko: string; genre_en: string; color: string }[] = [
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

// EH 엔진 강도 공식 — 적용률(R)에 따른 모듈별 승수 계산
// Reserved for future use: EH engine module intensity calculation
function _getEHModuleIntensity(pct: number) {
  const R = pct;
  return {
    bannedWordWarn: R >= 5,                              // 금지어 경고
    bannedWordBlock: R >= 15,                            // 금지어 차단
    costHint: R >= 10,                                   // 대가 힌트
    costEnforce: R >= 25,                                // 대가 강제
    ehTracking: R >= 20,                                 // EH 수치 추적
    stabilityTracking: R >= 30,                          // 세계 안정도
    povLock: R >= 45,                                    // 시점 제한
    choiceCollapse: R >= 55,                             // 선택지 붕괴
    styleMorph: R >= 60,                                 // 문체 자동 변환
    dualLog: R >= 70,                                    // 이중 로그
    glitchTrigger: R >= 80,                              // 글리치 트리거
    dequalification: R >= 90,                            // 자격 박탈
    costMultiplier: Math.max(0, (R - 25) / 75),          // 0.0 ~ 1.0
    ehDecayMultiplier: Math.max(0, (R - 20) / 80),       // 0.0 ~ 1.0
    stabilityDecayMultiplier: Math.max(0, (R - 30) / 70), // 0.0 ~ 1.0
  };
}

// ============================================================
// PART 8-B: WORLD AUTO-GENERATOR
// ============================================================

const AUTO_WORLD_TEMPLATES: Record<string, { civs: Omit<Civilization, "id">[]; relations: Omit<CivRelation, "from" | "to">[] }> = {
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

interface WorldSimProps {
  lang?: Lang;
  synopsis?: string;
  worldContext?: { corePremise?: string; powerStructure?: string; currentConflict?: string; factionRelations?: string };
  onSave?: (data: { civs: Civilization[]; relations: CivRelation[]; transitions: TransitionEvent[]; selectedGenre: string; selectedLevel: number; genreSelections: GenreSelectionEntry[]; ruleLevel: number }) => void;
  initialData?: { civs?: { name: string; era: string; color: string; traits: string[] }[]; relations?: { fromName: string; toName: string; type: string }[]; transitions?: { fromEra: string; toEra: string; description: string }[]; selectedGenre?: string; selectedLevel?: number; genreSelections?: GenreSelectionEntry[]; ruleLevel?: number };
}

export default function WorldSimulator({ lang = "ko", synopsis, worldContext, onSave, initialData }: WorldSimProps) {
  const tl = createT(lang === 'ko' ? 'KO' : 'EN');
  const [activeView, setActiveView] = useState<ViewTab>("leveling");

  // Multi-genre selections (max 5) — backwards compatible
  const [genreSelections, setGenreSelections] = useState<GenreSelectionEntry[]>(() => {
    if (initialData?.genreSelections && initialData.genreSelections.length > 0) return initialData.genreSelections;
    if (initialData?.selectedGenre) return [{ genre: initialData.selectedGenre, level: initialData.selectedLevel || 1 }];
    return [{ genre: "Fantasy", level: 1 }];
  });

  // Primary genre = first selection (backwards compatibility)
  const selectedGenre = genreSelections[0]?.genre || "Fantasy";
  const selectedLevel = genreSelections[0]?.level || 1;

  const [ruleLevel, setRuleLevel] = useState(initialData?.ruleLevel || 1);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [civs, setCivs] = useState<Civilization[]>(() => {
    if (initialData?.civs && initialData.civs.length > 0) {
      return initialData.civs.map((c, i) => ({ ...c, id: `saved-${i}`, x: 50 + 25 * Math.cos((i / Math.max(initialData.civs!.length, 1)) * Math.PI * 2), y: 50 + 25 * Math.sin((i / Math.max(initialData.civs!.length, 1)) * Math.PI * 2) }));
    }
    const t = AUTO_WORLD_TEMPLATES["Fantasy"];
    return t ? t.civs.map((c, i) => ({ ...c, id: `base-${i}` })) : [];
  });
  const [relations, setRelations] = useState<CivRelation[]>(() => {
    if (initialData?.relations && initialData.relations.length > 0) {
      // Reconstruct: map saved relation names to restored civ IDs
      const savedCivs = initialData.civs ?? [];
      const VALID_TYPES: RelationType[] = ['war', 'alliance', 'trade', 'vassal'];
      return initialData.relations
        .filter((r: Record<string, string>) => (r.from || r.fromName) && (r.to || r.toName) && r.type)
        .map((r: Record<string, string>) => {
          const fromKey = r.from || r.fromName;
          const toKey = r.to || r.toName;
          return {
            from: `saved-${savedCivs.findIndex(c => c.name === fromKey)}`,
            to: `saved-${savedCivs.findIndex(c => c.name === toKey)}`,
            type: (VALID_TYPES.includes(r.type as RelationType) ? r.type : 'trade') as RelationType,
          };
        })
        .filter(r => !r.from.includes('-1') && !r.to.includes('-1'));
    }
    const t = AUTO_WORLD_TEMPLATES["Fantasy"];
    if (!t) return [];
    const ids = t.civs.map((_, i) => `base-${i}`);
    return t.relations.filter((_, i) => ids[i] && ids[i + 1]).map((r, i) => ({ from: ids[i], to: ids[i + 1], type: r.type }));
  });
  const [transitions, setTransitions] = useState<TransitionEvent[]>(
    initialData?.transitions || []
  );

  // Auto-save to parent when data changes
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useEffect(() => {
    onSaveRef.current?.({
      civs, relations, transitions, selectedGenre, selectedLevel, genreSelections, ruleLevel,
    });
  }, [civs, relations, transitions, selectedGenre, selectedLevel, genreSelections, ruleLevel]);

  const handleGenreToggle = useCallback((genre: string, level: number) => {
    setGenreSelections(prev => {
      // level === 0 means remove
      if (level === 0) return prev.filter(s => s.genre !== genre);
      const existing = prev.find(s => s.genre === genre);
      if (existing) {
        // Same genre+level click = deselect
        if (existing.level === level) return prev.filter(s => s.genre !== genre);
        // Same genre different level = update level
        return prev.map(s => s.genre === genre ? { ...s, level } : s);
      }
      // New genre — check max
      if (prev.length >= MAX_GENRE_SELECTIONS) {
        alert(lang === "ko" ? `장르는 최대 ${MAX_GENRE_SELECTIONS}개까지 선택 가능합니다` : `Max ${MAX_GENRE_SELECTIONS} genres allowed`);
        return prev;
      }
      return [...prev, { genre, level }];
    });
  }, [lang]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future genre auto-generation UI
  const handleAutoGenerate = useCallback(() => {
    const template = AUTO_WORLD_TEMPLATES[selectedGenre];
    if (!template) return;
    const newCivs = template.civs.map((c, i) => ({
      ...c,
      id: `auto-${Date.now()}-${i}`,
    }));
    setCivs(newCivs);
    // Auto relations
    const newRels: CivRelation[] = [];
    template.relations.forEach((r, i) => {
      if (newCivs[i] && newCivs[i + 1]) {
        newRels.push({ from: newCivs[i].id, to: newCivs[i + 1].id, type: r.type });
      }
    });
    setRelations(newRels);
    setTransitions([]);
  }, [selectedGenre]);

  const VIEW_TABS: { id: ViewTab; ko: string; en: string }[] = [
    { id: "leveling", ko: "장르 레벨", en: "Genre Level" },
    { id: "civilizations", ko: "문명 매핑", en: "Civilizations" },
    { id: "relations", ko: "관계도", en: "Relations" },
    { id: "timeline", ko: "타임라인", en: "Timeline" },
    { id: "map", ko: "세력 지도", en: "Territory Map" },
    { id: "validation", ko: "검증", en: "Validation" },
    { id: "language", ko: "언어 생성", en: "Language" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="doc-header rounded-t mb-0">
        <span className="badge badge-blue mr-2">SIMULATOR</span>
        {lang === "ko" ? "세계관 시뮬레이터 — World Consistency Engine" : "World Simulator — Consistency Engine"}
      </div>

      <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-4 sm:p-6 space-y-6">
        {/* Genre Leveling (always visible at top) */}
        <GenreLeveling lang={lang} selections={genreSelections} onToggle={handleGenreToggle} />

        {/* EH Rule Level + Auto Generate */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          {/* Rule Level Selector */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-[family-name:var(--font-mono)] text-xs font-bold tracking-wider text-text-secondary uppercase">
                {lang === "ko" ? "EH 규칙 강도" : "EH Rule Intensity"}
              </h3>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded font-[family-name:var(--font-mono)]"
                style={{
                  background: `${RULE_LEVELS[ruleLevel - 1].color}20`,
                  color: RULE_LEVELS[ruleLevel - 1].color,
                }}>
                {RULE_LEVELS[ruleLevel - 1].pct}% — {lang === "ko" ? RULE_LEVELS[ruleLevel - 1].genre_ko : RULE_LEVELS[ruleLevel - 1].genre_en}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {RULE_LEVELS.map(rl => (
                <button key={rl.lv} type="button" onClick={() => setRuleLevel(rl.lv)}
                  className={`py-1.5 px-2 rounded text-[8px] font-bold border transition-all min-w-[60px] ${
                    ruleLevel === rl.lv
                      ? "text-white border-transparent"
                      : "bg-bg-primary text-text-tertiary border-border hover:border-text-tertiary"
                  }`}
                  style={ruleLevel === rl.lv ? {
                    background: rl.color,
                    borderColor: "transparent",
                  } : undefined}
                  title={lang === "ko" ? rl.desc_ko : rl.desc_en}
                >
                  <div>{lang === "ko" ? rl.ko : rl.en}</div>
                  <div className="text-[7px] opacity-70">Lv{rl.lv}</div>
                </button>
              ))}
            </div>
            <div className="text-[9px] text-text-tertiary">
              {lang === "ko" ? RULE_LEVELS[ruleLevel - 1].desc_ko : RULE_LEVELS[ruleLevel - 1].desc_en}
            </div>
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-2 shrink-0 relative">
            <button onClick={() => setShowPresetMenu(v => !v)}
              className="px-3 py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity">
              ⚡ {lang === "ko" ? '프리셋' : 'Preset'}
            </button>
            {showPresetMenu && (
              <div className="absolute bottom-full mb-2 right-0 bg-bg-secondary border border-border rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
                {Object.keys(AUTO_WORLD_TEMPLATES).map(key => (
                  <button key={key} onClick={() => {
                    const template = AUTO_WORLD_TEMPLATES[key];
                    if (!template) return;
                    const newCivs = template.civs.map((c, i) => ({ ...c, id: `auto-${Date.now()}-${i}` }));
                    setCivs(newCivs);
                    const newRels: CivRelation[] = [];
                    template.relations.forEach((r, i) => {
                      if (newCivs[i] && newCivs[i + 1]) {
                        newRels.push({ from: newCivs[i].id, to: newCivs[i + 1].id, type: r.type });
                      }
                    });
                    setRelations(newRels);
                    setTransitions([]);
                    setShowPresetMenu(false);
                  }}
                    className="w-full text-left px-4 py-2.5 text-[11px] text-text-secondary hover:bg-accent-purple/20 hover:text-text-primary transition-colors border-b border-border/50 last:border-0">
                    {key}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={aiGenerating}
              onClick={async () => {
              if (!synopsis) { alert(lang === "ko" ? '세계관 설계에서 시놉시스를 먼저 작성하세요.' : 'Write a synopsis in World Design first.'); return; }
              setAiGenerating(true);
              try {
                const { generateWorldSim } = await import('@/services/geminiService');
                const result = await generateWorldSim(synopsis, selectedGenre, lang === "ko" ? 'KO' : 'EN', worldContext);
                if (result.civilizations) {
                  const newCivs = result.civilizations.map((c: { name: string; era: string; traits: string[] }, i: number) => ({
                    id: `ai-${Date.now()}-${i}`, name: c.name, era: c.era || 'medieval',
                    color: CIV_COLORS[i % CIV_COLORS.length], traits: c.traits || [],
                    x: 50 + 25 * Math.cos((i / Math.max(result.civilizations.length, 1)) * Math.PI * 2),
                    y: 50 + 25 * Math.sin((i / Math.max(result.civilizations.length, 1)) * Math.PI * 2),
                  }));
                  setCivs(newCivs);
                  setRelations([]);
                }
              } catch { alert(lang === "ko" ? '자동 생성 실패. API 키를 확인하세요.' : 'Generation failed. Check API key.'); }
              finally { setAiGenerating(false); }
            }}
              className={`px-3 py-2 bg-accent-purple text-white rounded-lg text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider transition-opacity ${aiGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}>
              {aiGenerating ? '⏳' : '🤖'} {lang === "ko" ? (aiGenerating ? '생성 중...' : '자동 생성') : (aiGenerating ? 'Generating...' : 'Auto Generate')}
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-3 py-2 rounded-t text-[10px] font-bold font-[family-name:var(--font-mono)] tracking-wider uppercase transition-all whitespace-nowrap ${
                activeView === tab.id
                  ? "bg-accent-purple/10 text-accent-purple border-b-2 border-accent-purple"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {lang === "ko" ? tab.ko : tab.en}
            </button>
          ))}
        </div>

        {/* Active View */}
        {activeView === "leveling" && (
          <div className="text-center py-8 space-y-3">
            {genreSelections.length === 0 ? (
              <div className="text-text-tertiary text-sm">
                {lang === "ko" ? "장르를 선택하세요 (최대 5개)" : "Select genres (max 5)"}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap justify-center gap-3">
                  {genreSelections.map((s, i) => {
                    const g = GENRE_LEVELS.find(gl => gl.genre === s.genre);
                    const lvName = g?.levels[(s.level ?? 1) - 1];
                    return (
                      <div key={i} className="text-center">
                        <div className="text-xl font-black font-[family-name:var(--font-display)]" style={{ color: g?.color }}>
                          {s.genre} Lv.{s.level}
                        </div>
                        <div className="text-text-secondary text-xs">
                          {lang === "ko" ? lvName?.ko : lvName?.en}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-text-tertiary text-xs max-w-md mx-auto">
                  {lang === "ko"
                    ? `${genreSelections.length}개 장르 조합 — 문명 매핑, 타임라인, 검증 및 AI 집필에 반영됩니다.`
                    : `${genreSelections.length} genre blend — applied to civilization mapping, timeline, validation, and AI writing.`}
                </div>
              </>
            )}
          </div>
        )}

        {activeView === "civilizations" && (
          <CivMapper lang={lang} civs={civs} setCivs={setCivs} />
        )}

        {activeView === "relations" && (
          <RelationsView lang={lang} civs={civs} relations={relations} setRelations={setRelations} />
        )}

        {activeView === "timeline" && (
          <TimelineView lang={lang} civs={civs} transitions={transitions} setTransitions={setTransitions} />
        )}

        {activeView === "map" && (
          <HexMapView lang={lang} civs={civs} />
        )}

        {activeView === "validation" && (
          <ValidationView lang={lang} civs={civs} selectedGenre={selectedGenre} selectedLevel={selectedLevel} />
        )}

        {activeView === "language" && (
          <LanguageForge lang={lang} civs={civs} />
        )}

        {/* Footer stats */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{lang === "ko" ? "문명" : "Civs"}: </span>
            <span className="text-accent-purple font-bold">{civs.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{lang === "ko" ? "관계" : "Relations"}: </span>
            <span className="text-accent-purple font-bold">{relations.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{lang === "ko" ? "전환" : "Transitions"}: </span>
            <span className="text-accent-purple font-bold">{transitions.length}</span>
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{lang === "ko" ? "장르" : "Genre"}: </span>
            {genreSelections.map((s, i) => (
              <span key={i}>
                {i > 0 && <span className="text-text-tertiary"> + </span>}
                <span className="font-bold" style={{ color: GENRE_LEVELS.find(g => g.genre === s.genre)?.color }}>
                  {s.genre} Lv{s.level}
                </span>
              </span>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-bg-primary border border-border rounded text-[9px] font-[family-name:var(--font-mono)]">
            <span className="text-text-tertiary">{tl('worldSim.ehRules')}: </span>
            <span className="font-bold" style={{
              color: ruleLevel <= 1 ? "var(--color-text-tertiary)" : ruleLevel <= 2 ? "#22c55e" : ruleLevel <= 3 ? "#eab308" : ruleLevel <= 4 ? "#f97316" : "#ef4444"
            }}>
              Lv{ruleLevel} ({RULE_LEVELS[ruleLevel - 1].pct}%)
            </span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* World Narrative Summary — 세계관 서술 요약 */}
        {/* ============================================================ */}
        {civs.length > 0 && (() => {
          const isKO = lang === "ko";
          const wsT = createT(isKO ? 'KO' : 'EN');
          const RELATION_KO: Record<string, string> = { war: "전쟁", alliance: "동맹", trade: "교역", vassal: "종속" };
          const RELATION_EN: Record<string, string> = { war: "at war with", alliance: "allied with", trade: "trades with", vassal: "vassal of" };

          const genreDesc = genreSelections.map(s => {
            const g = GENRE_LEVELS.find(gl => gl.genre === s.genre);
            const lvName = g?.levels.find(l => l.lv === s.level);
            return `${s.genre} Lv${s.level}(${lvName ? (isKO ? lvName.ko : lvName.en) : ""})`;
          }).join(" + ");

          const paragraphs: string[] = [];

          // Genre + rule intro
          paragraphs.push(isKO
            ? `이 세계는 ${genreDesc} 장르 블렌드로 구축되었으며, EH 규칙 Lv${ruleLevel}(${RULE_LEVELS[ruleLevel - 1][isKO ? "ko" : "en"]})이 적용됩니다.`
            : `This world is built on a ${genreDesc} genre blend with EH Rules Lv${ruleLevel} (${RULE_LEVELS[ruleLevel - 1].en}).`);

          // Civilizations
          civs.forEach(c => {
            const era = ERAS.find(e => e.id === c.era);
            const eraName = era ? (isKO ? era.ko : era.en) : c.era;
            const traitStr = c.traits.length > 0 ? c.traits.join(", ") : wsT('worldSim.traitsTBD');
            paragraphs.push(isKO
              ? `"${c.name}"은(는) ${eraName} 시대의 문명으로, ${traitStr}의 특성을 가집니다.`
              : `"${c.name}" is a ${eraName}-era civilization characterized by ${traitStr}.`);
          });

          // Relations
          if (relations.length > 0) {
            const relLines = relations.map(r => {
              const fromCiv = civs.find(c => c.id === r.from);
              const toCiv = civs.find(c => c.id === r.to);
              if (!fromCiv || !toCiv) return null;
              return isKO
                ? `${fromCiv.name}과(와) ${toCiv.name}은(는) ${RELATION_KO[r.type] || r.type} 관계입니다.`
                : `${fromCiv.name} is ${RELATION_EN[r.type] || r.type} ${toCiv.name}.`;
            }).filter(Boolean);
            if (relLines.length > 0) paragraphs.push(relLines.join(" "));
          }

          // Transitions
          if (transitions.length > 0) {
            const transLines = transitions.map(t => {
              const fromEra = ERAS.find(e => e.id === t.fromEra);
              const toEra = ERAS.find(e => e.id === t.toEra);
              return isKO
                ? `${fromEra ? fromEra.ko : t.fromEra}에서 ${toEra ? toEra.ko : t.toEra}로의 전환: ${t.description}`
                : `Transition from ${fromEra ? fromEra.en : t.fromEra} to ${toEra ? toEra.en : t.toEra}: ${t.description}`;
            });
            paragraphs.push(transLines.join(" "));
          }

          const narrative = paragraphs.join("\n\n");

          return (
            <div className="border-t border-border pt-4 mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-text-tertiary">
                  {wsT('worldSim.narrativeSummary')}
                </span>
                <button onClick={() => navigator.clipboard.writeText(narrative)}
                  className="text-[8px] font-bold text-text-tertiary hover:text-accent-purple bg-bg-secondary px-2 py-1 rounded border border-border transition-colors">
                  {wsT('worldSim.copy')}
                </button>
              </div>
              <div className="text-[10px] text-text-secondary bg-bg-primary border border-border rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                {narrative}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
