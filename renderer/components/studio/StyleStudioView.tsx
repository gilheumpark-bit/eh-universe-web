"use client";

// ============================================================
// PART 1 — 상태 및 상수 정의
// ============================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { StyleProfile, AppLanguage } from "@/lib/studio-types";
import { CopyButton } from "./UXHelpers";
import { getActiveProvider, getActiveModel, getApiKey } from "@/lib/ai-providers";
import StylePreview from "./StylePreview";

const STYLE_NAMES_KO = ["건조·SF 문체", "감각적 묘사 강화", "웹소설 리듬감", "캐릭터 목소리 강화", "긴장감 압축"] as const;
const STYLE_NAMES_EN = ["Dry / SF Style", "Sensory Description", "Web Novel Rhythm", "Character Voice", "Tension Compression"] as const;

// 10 style presets — each sets slider values + DNA card selection (module-scope constant)
const STYLE_PRESETS: readonly { key: string; ko: string; en: string; sliders: Record<string, number>; dna: number[] }[] = [
  { key: "hard-sf", ko: "하드 SF 문체", en: "Hard SF Style", sliders: { s1: 2, s2: 1, s3: 2, s4: 1, s5: 5 }, dna: [0] },
  { key: "web-novel", ko: "웹소설 리듬형", en: "Web Novel Rhythm", sliders: { s1: 1, s2: 3, s3: 3, s4: 4, s5: 2 }, dna: [1] },
  { key: "literary", ko: "순문학 감성", en: "Literary Emotional", sliders: { s1: 4, s2: 5, s3: 5, s4: 5, s5: 4 }, dna: [2] },
  { key: "action", ko: "액션/전투 압축", en: "Action/Battle Compact", sliders: { s1: 1, s2: 2, s3: 3, s4: 4, s5: 3 }, dna: [4] },
  { key: "romance", ko: "로맨스 감정선", en: "Romance Emotion Line", sliders: { s1: 3, s2: 5, s3: 4, s4: 5, s5: 2 }, dna: [3] },
  { key: "thriller", ko: "스릴러 건조체", en: "Thriller Dry Style", sliders: { s1: 1, s2: 1, s3: 2, s4: 3, s5: 3 }, dna: [0, 4] },
  { key: "fantasy", ko: "판타지 서사체", en: "Fantasy Epic", sliders: { s1: 4, s2: 3, s3: 4, s4: 3, s5: 3 }, dna: [2, 3] },
  { key: "horror", ko: "호러/괴담체", en: "Horror/Ghost Story", sliders: { s1: 2, s2: 4, s3: 5, s4: 5, s5: 2 }, dna: [4] },
  { key: "essay", ko: "에세이/수필", en: "Essay/Memoir", sliders: { s1: 3, s2: 4, s3: 3, s4: 2, s5: 3 }, dna: [2] },
  { key: "cinematic", ko: "시네마틱 묘사", en: "Cinematic Description", sliders: { s1: 3, s2: 3, s3: 5, s4: 4, s5: 3 }, dna: [1, 2] },
] as const;

interface SliderDefI18n {
  id: string;
  ko: string;
  en: string;
  leftKO: string;
  leftEN: string;
  rightKO: string;
  rightEN: string;
  defaultVal: number;
  stepsKO: string[];
  stepsEN: string[];
  noteKO: string;
  noteEN: string;
}

const SLIDERS_I18N: SliderDefI18n[] = [
  {
    id: "s1",
    ko: "문장 길이",
    en: "Sentence Length",
    leftKO: "속도 중심",
    leftEN: "Faster pace",
    rightKO: "여백 중심",
    rightEN: "More spacious",
    defaultVal: 3,
    stepsKO: ["짧고 단단하게", "짧은 호흡", "균형", "긴 호흡", "길게 밀어붙이기"],
    stepsEN: ["Tight and short", "Short breath", "Balanced", "Long breath", "Extended flow"],
    noteKO: "호흡이 짧을수록 추진력이, 길수록 사유와 여운이 커집니다.",
    noteEN: "Shorter sentences push momentum, while longer ones create reflection and aftertaste.",
  },
  {
    id: "s2",
    ko: "감정 밀도",
    en: "Emotional Density",
    leftKO: "객관·절제",
    leftEN: "Restrained",
    rightKO: "주관·정서",
    rightEN: "Emotive",
    defaultVal: 2,
    stepsKO: ["감정 절제", "건조한 편", "균형", "정서 강조", "감정 밀도 높음"],
    stepsEN: ["Restrained", "Dry-leaning", "Balanced", "Emotion-forward", "Emotion-rich"],
    noteKO: "감정을 직접 드러낼지, 문장 아래에 눌러둘지 결정하는 축입니다.",
    noteEN: "This controls whether emotion stays under the prose or rises visibly to the surface.",
  },
  {
    id: "s3",
    ko: "묘사 방식",
    en: "Description Style",
    leftKO: "직설 서술",
    leftEN: "Direct",
    rightKO: "감각 이미지",
    rightEN: "Sensory",
    defaultVal: 3,
    stepsKO: ["사실 위주", "직설 묘사", "균형", "이미지 강조", "감각 몰입"],
    stepsEN: ["Factual", "Direct", "Balanced", "Image-leaning", "Sensory immersion"],
    noteKO: "정보 전달에 무게를 둘지, 장면의 촉감과 이미지에 무게를 둘지 조절합니다.",
    noteEN: "Choose between efficient delivery and a stronger sensory, image-driven scene feel.",
  },
  {
    id: "s4",
    ko: "서술 시점",
    en: "POV Distance",
    leftKO: "거리감",
    leftEN: "Distant",
    rightKO: "밀착감",
    rightEN: "Intimate",
    defaultVal: 3,
    stepsKO: ["멀리 조망", "관찰자 시점", "균형", "인물 밀착", "내면 침투"],
    stepsEN: ["Panoramic", "Observer", "Balanced", "Close POV", "Deep interior"],
    noteKO: "독자와 인물 사이 거리를 바꿔, 조망형 서술과 몰입형 서술 사이를 조정합니다.",
    noteEN: "Adjusts how close readers stay to the character, from panoramic to immersive interiority.",
  },
  {
    id: "s5",
    ko: "어휘 수준",
    en: "Vocabulary Level",
    leftKO: "평이함",
    leftEN: "Plain",
    rightKO: "정밀함",
    rightEN: "Precise",
    defaultVal: 4,
    stepsKO: ["편한 말맛", "담백한 어휘", "균형", "정교한 어휘", "전문적 질감"],
    stepsEN: ["Plainspoken", "Clean", "Balanced", "Refined", "Specialized"],
    noteKO: "문장의 격과 전문성을 얼마나 끌어올릴지 정합니다.",
    noteEN: "This sets how elevated or specialized your vocabulary should feel.",
  },
];

const getSliderDescriptor = (slider: SliderDefI18n, value: number, en: boolean) => {
  const labels = en ? slider.stepsEN : slider.stepsKO;
  const safeIndex = Math.max(0, Math.min(labels.length - 1, value - 1));
  return labels[safeIndex];
};

const getSliderTrackStyle = (value: number): React.CSSProperties => {
  const progress = ((value - 1) / 4) * 100;
  return {
    background: `linear-gradient(90deg, var(--color-accent-amber) 0%, var(--color-accent-amber) ${progress}%, rgba(107, 114, 142, 0.34) ${progress}%, rgba(107, 114, 142, 0.34) 100%)`,
  };
};

// ============================================================
// PART 1-B — 레이더 차트 + 텍스트 분석 컴포넌트
// ============================================================

/** Benchmark author style profiles — slider values [s1..s5] mapped 1–5 */
const AUTHOR_PROFILES: Record<string, { ko: string; en: string; values: [number, number, number, number, number] }> = {
  "ted-chiang": { ko: "테드 창", en: "Ted Chiang", values: [3, 1, 3, 2, 5] },
  "liu-cixin": { ko: "류츠신", en: "Liu Cixin", values: [4, 2, 4, 2, 5] },
  "han-kang": { ko: "한강", en: "Han Kang", values: [4, 5, 5, 5, 4] },
  "murakami": { ko: "무라카미 하루키", en: "Haruki Murakami", values: [4, 3, 4, 4, 3] },
  "sanderson": { ko: "브랜든 샌더슨", en: "Brandon Sanderson", values: [2, 3, 3, 3, 3] },
  "sing-shong": { ko: "싱숑", en: "Sing Shong", values: [1, 3, 3, 5, 2] },
  "djuna": { ko: "듀나", en: "Djuna", values: [2, 1, 3, 2, 4] },
  "leguin": { ko: "어슐러 르 귄", en: "Ursula K. Le Guin", values: [3, 3, 4, 3, 4] },
};

/** Pentagon radar chart — pure SVG, no deps */
function RadarChart({ values, benchmarkValues, labels, size = 220 }: {
  values: number[];
  benchmarkValues?: number[];
  labels: string[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const angleOffset = -Math.PI / 2;

  const pointAt = (index: number, value: number): [number, number] => {
    const angle = angleOffset + (2 * Math.PI * index) / 5;
    const r = (value / 5) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const polygonPoints = (vals: number[]) =>
    vals.map((v, i) => pointAt(i, v).join(",")).join(" ");

  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      {/* Grid lines */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: 5 }, (_, i) => pointAt(i, level).join(",")).join(" ")}
          fill="none"
          stroke="rgba(107,114,142,0.18)"
          strokeWidth={level === 5 ? 1.2 : 0.6}
        />
      ))}
      {/* Axis lines */}
      {Array.from({ length: 5 }, (_, i) => {
        const [ex, ey] = pointAt(i, 5);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(107,114,142,0.15)" strokeWidth={0.6} />;
      })}
      {/* Benchmark fill */}
      {benchmarkValues && (
        <polygon
          points={polygonPoints(benchmarkValues)}
          fill="rgba(99,180,255,0.15)"
          stroke="rgba(99,180,255,0.7)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {/* User fill */}
      <polygon
        points={polygonPoints(values)}
        fill="rgba(245,166,35,0.2)"
        stroke="var(--color-accent-amber, #f5a623)"
        strokeWidth={2}
      />
      {/* User dots */}
      {values.map((v, i) => {
        const [px, py] = pointAt(i, v);
        return <circle key={i} cx={px} cy={py} r={3.5} fill="var(--color-accent-amber, #f5a623)" />;
      })}
      {/* Benchmark dots */}
      {benchmarkValues?.map((v, i) => {
        const [px, py] = pointAt(i, v);
        return <circle key={`b${i}`} cx={px} cy={py} r={2.5} fill="rgba(99,180,255,0.8)" />;
      })}
      {/* Labels */}
      {labels.map((label, i) => {
        const [lx, ly] = pointAt(i, 5.8);
        return (
          <text
            key={i}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={10}
            fill="var(--color-text-secondary, #999)"
            fontFamily="inherit"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
// IDENTITY_SEAL: PART-1B | role=RadarChart+AuthorProfiles | inputs=sliderVals,benchmarkKey | outputs=SVG

/** Text analysis metrics computed from raw text */
interface TextMetrics {
  avgSentenceLen: number;
  dialogueRatio: number;
  vocabDiversity: number;
  readingTimeSec: number;
}

function analyzeText(text: string): TextMetrics | null {
  if (!text.trim()) return null;

  const sentences = text.split(/[.!?。？！\n]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLen = sentences.length > 0
    ? Math.round(sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length)
    : 0;

  // Dialogue: count chars inside quotes
  const dialogueMatches = text.match(/["'""\u201C\u201D\u300C\u300D][^"'""\u201C\u201D\u300C\u300D]*["'""\u201C\u201D\u300C\u300D]/g);
  const dialogueChars = dialogueMatches ? dialogueMatches.join("").length : 0;
  const dialogueRatio = text.length > 0 ? Math.round((dialogueChars / text.length) * 100) : 0;

  // Vocabulary diversity: unique / total (word-level, handles Korean via spaces)
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const vocabDiversity = words.length > 0 ? Math.round((unique.size / words.length) * 100) : 0;

  // Reading time: ~200 words/min EN, ~500 chars/min KO (use char-based as universal fallback)
  const charCount = text.replace(/\s/g, "").length;
  const readingTimeSec = Math.max(1, Math.round((charCount / 500) * 60));

  return { avgSentenceLen, dialogueRatio, vocabDiversity, readingTimeSec };
}

function TextAnalysisCards({ metrics, en }: { metrics: TextMetrics | null; en: boolean }) {
  if (!metrics) return null;

  const cards: { label: string; value: string }[] = [
    {
      label: en ? "Avg. Sentence" : "평균 문장 길이",
      value: `${metrics.avgSentenceLen}${en ? " chars" : "자"}`,
    },
    {
      label: en ? "Dialogue" : "대화 비율",
      value: `${metrics.dialogueRatio}%`,
    },
    {
      label: en ? "Vocab Diversity" : "어휘 다양성",
      value: `${metrics.vocabDiversity}%`,
    },
    {
      label: en ? "Reading Time" : "읽기 시간",
      value: metrics.readingTimeSec < 60
        ? `${metrics.readingTimeSec}${en ? "s" : "초"}`
        : `${Math.floor(metrics.readingTimeSec / 60)}${en ? "m " : "분 "}${metrics.readingTimeSec % 60}${en ? "s" : "초"}`,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
      {cards.map((c) => (
        <div
          key={c.label}
          style={{
            background: "rgba(107,114,142,0.08)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
          }}
        >
          <div style={{ color: "var(--color-text-tertiary, #888)", fontSize: 10, marginBottom: 2 }}>{c.label}</div>
          <div style={{ fontWeight: 600, color: "var(--color-accent-amber, #f5a623)" }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
// IDENTITY_SEAL: PART-1B-2 | role=TextAnalysis+MetricsCards | inputs=sourceText | outputs=TextMetrics

interface CheckItem {
  title: string;
  titleEN: string;
  desc: string;
  descEN: string;
}

const SF_CHECKS: CheckItem[] = [
  { title: "숫자의 서사화", titleEN: "Data as Narrative", desc: "D+127일, φ=0.73 같은 데이터를 감정처럼 읽히게 쓰기", descEN: "Make data like D+127 or φ=0.73 read like emotion." },
  { title: "시스템 관점 서술", titleEN: "System-POV Writing", desc: "캐릭터 대신 프로세스가 주어가 되는 문장 연습", descEN: "Practice sentences where processes — not characters — are the subject." },
  { title: "기술용어 자연화", titleEN: "Naturalizing Jargon", desc: "독자가 모르는 단어도 문맥으로 이해하게 만들기", descEN: "Make unfamiliar terms understandable through context alone." },
  { title: "시간축 병렬 서술", titleEN: "Parallel Timelines", desc: "과거·현재·미래 타임라인을 겹쳐 긴장감 만들기", descEN: "Layer past, present, and future timelines to build tension." },
  { title: "오류 미학", titleEN: "Aesthetics of Error", desc: "결함·이상신호·예외값을 문학적 상징으로 활용", descEN: "Use defects, anomalies, and exceptions as literary symbols." },
  { title: "침묵의 데이터", titleEN: "Silent Data", desc: "로그가 기록하지 않은 것, 센서가 잡지 못한 것으로 감정 표현", descEN: "Express emotion through what logs didn't record and sensors didn't catch." },
  { title: "캐릭터 행동 마커", titleEN: "Behavioral Markers", desc: "인물 고유의 반복 습관(펜 돌리기, 손톱 물어뜯기 등)으로 설명 없이 개성 각인", descEN: "Give each character a repeated habit to imprint personality without exposition." },
  { title: "스케일 전환", titleEN: "Scale Shifts", desc: "우주적 규모 ↔ 손가락 하나의 진동 — 줌인·줌아웃 기법", descEN: "Cosmic scale ↔ a single finger's tremor — zoom in/out technique." },
];

const WEB_CHECKS: CheckItem[] = [
  { title: "첫 문장 훅 공식", titleEN: "First-Line Hook", desc: "행동·충돌·의문 중 하나로 시작. 설명은 나중에.", descEN: "Start with action, conflict, or a question. Exposition comes later." },
  { title: "단락 끊기 전략", titleEN: "Paragraph Break Strategy", desc: "긴장 최고조 직전에 자르기. 독자가 스크롤하게.", descEN: "Cut right before peak tension. Make the reader scroll." },
  { title: "3단 호흡 리듬", titleEN: "3-Beat Rhythm", desc: "긴 문장 → 중간 → 짧다. 반복하면 리듬이 된다.", descEN: "Long → medium → short. Repeat and it becomes rhythm." },
  { title: "독자 시점 중계", titleEN: "Reader-POV Relay", desc: "주인공이 느끼기 전에 독자가 먼저 불안해지게 설계", descEN: "Design so readers feel uneasy before the protagonist does." },
  { title: "대화의 밀도 조절", titleEN: "Dialogue Density Control", desc: "말 사이의 행동 서술로 캐릭터 심리 드러내기", descEN: "Reveal character psychology through actions between dialogue." },
  { title: "감각 레이어링", titleEN: "Sensory Layering", desc: "시각 + 청각 + 촉각 조합. 단, 3개 이상 겹치면 과부하.", descEN: "Combine sight + sound + touch. More than 3 layers overloads." },
  { title: "반복 어구의 리프레인", titleEN: "Refrain Technique", desc: "같은 단어·구절 재등장으로 감정 증폭 및 구조 통일", descEN: "Repeat words/phrases to amplify emotion and unify structure." },
  { title: "에필로그의 여운", titleEN: "Epilogue Resonance", desc: "챕터 끝을 해결이 아닌 새로운 질문으로 닫기", descEN: "Close chapters with new questions, not resolutions." },
];

interface RefAuthor {
  name: string;
  nameEN: string;
  desc: string;
  descEN: string;
}

const REF_AUTHORS: Record<number, RefAuthor[]> = {
  0: [
    { name: "킴 스탠리 로빈슨", nameEN: "Kim Stanley Robinson", desc: "과학적 정밀함과 생태적 감수성. 데이터가 시가 되는 문장.", descEN: "Scientific precision meets ecological sensitivity. Data becomes poetry." },
    { name: "테드 창", nameEN: "Ted Chiang", desc: "철학적 질문을 SF 논리로 풀어냄. 냉정하고 아름다운 구조.", descEN: "Philosophical questions through SF logic. Cold, beautiful structure." },
    { name: "류츠신", nameEN: "Liu Cixin", desc: "우주적 스케일의 서사. 기술적 디테일이 경외감을 만든다.", descEN: "Cosmic-scale narrative. Technical detail creates awe." },
  ],
  1: [
    { name: "싱숑", nameEN: "Sing Shong", desc: "한국 웹소설의 리듬 마스터. 짧은 호흡, 강한 훅.", descEN: "Master of Korean web novel rhythm. Short breath, strong hooks." },
    { name: "히가시노 게이고", nameEN: "Keigo Higashino", desc: "미스터리의 페이지 터너. 독자를 놓지 않는 구조.", descEN: "Mystery page-turner. Structure that never lets go." },
    { name: "브랜든 샌더슨", nameEN: "Brandon Sanderson", desc: "시스템 기반 판타지. 설정과 플롯의 정교한 맞물림.", descEN: "System-based fantasy. Precise interlocking of worldbuilding and plot." },
  ],
  2: [
    { name: "한강", nameEN: "Han Kang", desc: "감각과 침묵으로 쓰는 작가. 문장이 이미지를 만든다.", descEN: "Writing through sensation and silence. Sentences create images." },
    { name: "무라카미 하루키", nameEN: "Haruki Murakami", desc: "일상의 비현실. 리듬감 있는 산문과 은유의 층위.", descEN: "Surreal ordinary. Rhythmic prose and layers of metaphor." },
    { name: "김영하", nameEN: "Kim Young-ha", desc: "건조한 유머와 날카로운 관찰. 도시적 감수성.", descEN: "Dry humor and sharp observation. Urban sensibility." },
  ],
  3: [
    { name: "듀나", nameEN: "Djuna", desc: "한국 SF의 건조한 감각. 설명하지 않고 제시한다.", descEN: "Dry sensibility of Korean SF. Shows, never explains." },
    { name: "어슐러 르 귄", nameEN: "Ursula K. Le Guin", desc: "SF·판타지·문학의 경계를 지운 작가. 장르 자체가 문학.", descEN: "Erased boundaries between SF, fantasy, and literature." },
    { name: "이탈로 칼비노", nameEN: "Italo Calvino", desc: "실험적 구조와 문학적 상상력의 결합.", descEN: "Experimental structure meets literary imagination." },
  ],
};

interface DnaCard {
  label: string;
  labelEN: string;
  labelClass: string;
  title: string;
  titleEN: string;
  desc: string;
  descEN: string;
}

const DNA_CARDS: DnaCard[] = [
  { label: "Hard SF", labelEN: "Hard SF", labelClass: "ss-label-sf", title: "냉정한 관찰자", titleEN: "The Cold Observer", desc: "기술적 정확성이 곧 아름다움. 감정보다 시스템. 독자가 세계를 이해하게 만드는 문장.", descEN: "Technical precision as beauty. Systems over emotion. Sentences that make readers understand the world." },
  { label: "웹소설", labelEN: "Web Novel", labelClass: "ss-label-web", title: "빠른 호흡의 이야기꾼", titleEN: "The Fast-Paced Storyteller", desc: "첫 문장에 훅. 짧은 단락, 강한 리듬. 독자를 다음 장으로 끌어당기는 마력.", descEN: "Hook in the first line. Short paragraphs, strong rhythm. The magic that pulls readers to the next chapter." },
  { label: "문학적", labelEN: "Literary", labelClass: "ss-label-lit", title: "감각의 설계자", titleEN: "The Sensory Architect", desc: "세부 묘사가 감정을 만든다. 은유와 여백. 독자가 스스로 느끼게 하는 문장.", descEN: "Detail creates emotion. Metaphor and white space. Sentences that let readers feel on their own." },
  { label: "멀티장르", labelEN: "Multi-Genre", labelClass: "ss-label-all", title: "장르를 넘나드는 작가", titleEN: "The Genre-Crossing Writer", desc: "SF의 논리 + 웹소설의 속도 + 문학의 깊이. 각 장르의 장점을 혼합.", descEN: "SF logic + web novel speed + literary depth. Blending the best of each genre." },
];

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

interface Props {
  language?: AppLanguage;
  /** @deprecated Use language prop instead */
  isKO?: boolean;
  initialProfile?: StyleProfile;
  onProfileChange?: (profile: StyleProfile) => void;
}

export default function StyleStudioView({ language: languageProp, isKO: isKOProp, initialProfile, onProfileChange }: Props) {
  const language: AppLanguage = languageProp ?? (isKOProp === false ? 'EN' : 'KO');
  const en = language === 'EN' || language === 'CN';

  const [tab, setTab] = useState(0);
  const [selectedCards, setSelectedCards] = useState<Set<number>>(
    () => new Set(initialProfile?.selectedDNA ?? [])
  );
  const [sliderVals, setSliderVals] = useState<Record<string, number>>(() => {
    if (initialProfile?.sliders && Object.keys(initialProfile.sliders).length > 0) {
      return { ...Object.fromEntries(SLIDERS_I18N.map((s) => [s.id, s.defaultVal])), ...initialProfile.sliders };
    }
    const init: Record<string, number> = {};
    SLIDERS_I18N.forEach((s) => {
      init[s.id] = s.defaultVal;
    });
    return init;
  });
  const [checkedSF, setCheckedSF] = useState<Set<number>>(
    () => new Set(initialProfile?.checkedSF ?? [])
  );
  const [checkedWeb, setCheckedWeb] = useState<Set<number>>(
    () => new Set(initialProfile?.checkedWeb ?? [])
  );
  const [activeStyles, setActiveStyles] = useState<Set<number>>(new Set([0]));
  const [sourceText, setSourceText] = useState("");
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStylePresetMenu, setShowStylePresetMenu] = useState(false);
  const [benchmarkAuthor, setBenchmarkAuthor] = useState<string>("");
  const [textMetrics, setTextMetrics] = useState<TextMetrics | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced text analysis (500ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setTextMetrics(analyzeText(sourceText));
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sourceText]);

  // Radar chart data
  const radarValues = useMemo(
    () => SLIDERS_I18N.map((s) => sliderVals[s.id] ?? s.defaultVal),
    [sliderVals]
  );
  const radarLabels = useMemo(
    () => SLIDERS_I18N.map((s) => (en ? s.en.split(" ")[0] : s.ko)),
    [en]
  );
  const benchmarkProfile = benchmarkAuthor ? AUTHOR_PROFILES[benchmarkAuthor] : undefined;

  const applyStylePreset = useCallback((presetKey: string) => {
    const preset = STYLE_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    setSliderVals(prev => ({ ...prev, ...preset.sliders }));
    setSelectedCards(new Set(preset.dna));
    setShowStylePresetMenu(false);
  }, []);

  const totalChecked = checkedSF.size + checkedWeb.size;
  const totalItems = SF_CHECKS.length + WEB_CHECKS.length;

  // Sync profile changes to parent — skip initial mount via flag
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onProfileChange?.({
      selectedDNA: Array.from(selectedCards),
      sliders: { ...sliderVals },
      checkedSF: Array.from(checkedSF),
      checkedWeb: Array.from(checkedWeb),
    });
  // onProfileChange is intentionally excluded — parent re-creates it on each render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCards, sliderVals, checkedSF, checkedWeb]);

  const toggleSet = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<number>>>, idx: number) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        return next;
      });
    },
    []
  );

  const handleSlider = useCallback((id: string, val: number) => {
    setSliderVals((prev) => ({ ...prev, [id]: val }));
  }, []);

  // ============================================================
  // PART 3 — 문체 변환 API 호출
  // ============================================================

  const transformAbortRef = useRef<AbortController | null>(null);

  // Cleanup: cancel stream on unmount
  useEffect(() => () => { transformAbortRef.current?.abort(); }, []);

  const transformText = useCallback(async () => {
    if (!sourceText.trim()) return;
    if (activeStyles.size === 0) return;

    // Abort previous in-flight request
    transformAbortRef.current?.abort();
    const controller = new AbortController();
    transformAbortRef.current = controller;

    const NAMES = en ? STYLE_NAMES_EN : STYLE_NAMES_KO;
    const selectedStyleNames = (Array.from(activeStyles) as number[])
      .map((i) => NAMES[i])
      .join(", ");

    setLoading(true);
    setResultText("");

    const systemInstruction = en
      ? "You are an expert writing style consultant. Rewrite the original text to match the specified style direction. Output only the result — no explanations or meta-commentary."
      : "당신은 한국어 문체 전문가입니다. 지시된 문체 방향에 맞춰 원문을 재작성합니다. 결과물만 출력하고, 설명이나 메타 코멘트는 붙이지 않습니다.";

    const userPrompt = en
      ? `Rewrite the following text in "${selectedStyleNames}" style.\n\nOriginal:\n"${sourceText}"\n\nInstructions:\n- Keep the same content, events, and characters — change only the style\n- Apply specific techniques matching the selected direction\n- Output only the result (no explanation)\n- 2–4 paragraphs, natural flow`
      : `다음 원문을 "${selectedStyleNames}" 스타일로 재작성해주세요.\n\n원문:\n"${sourceText}"\n\n지침:\n- 같은 내용과 사건, 동일한 인물을 유지하면서 문체만 변환\n- 변환 방향에 맞는 구체적인 기법 적용\n- 한국어로만 작성\n- 결과물만 출력 (설명 없이)\n- 2~4문단 분량으로 자연스럽게`;

    try {
      const provider = getActiveProvider();
      const model = getActiveModel();
      const apiKey = getApiKey(provider);

      if (!apiKey) {
        setResultText(en ? "Please set your API key in Settings first." : "설정에서 API 키를 먼저 등록해주세요.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          systemInstruction,
          messages: [{ role: "user", content: userPrompt }],
          temperature: 0.8,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        setResultText(en ? "API error. Please try again." : "API 오류가 발생했습니다. 다시 시도해주세요.");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setResultText(en ? "Cannot read stream." : "스트림을 읽을 수 없습니다.");
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta =
              parsed.candidates?.[0]?.content?.parts?.[0]?.text ??
              parsed.delta?.text ??
              parsed.choices?.[0]?.delta?.content ??
              "";
            if (delta) {
              accumulated += delta;
              setResultText(accumulated);
            }
          } catch {
            // non-JSON SSE line — skip
          }
        }
      }

      if (!accumulated) setResultText(en ? "Transform result is empty." : "변환 결과가 비어있습니다.");
    } catch {
      setResultText(en ? "Network error. Please try again." : "네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [sourceText, activeStyles, en]);

  // ============================================================
  // PART 4 — 렌더: 헤더 + 탭 네비게이션
  // ============================================================

  const tabLabels = en
    ? ["① DNA Diagnosis", "② Technique Checklist", "③ Sentence Lab", "④ My Profile", "⑤ Preview & Compare"]
    : ["① 문체 DNA 진단", "② 기법 체크리스트", "③ 문장 실험실", "④ 내 문체 프로필", "⑤ 프리뷰 비교"];

  return (
    <div>
      {/* Hero */}
      <div className="ss-header">
        <div className="ss-shell ss-header-shell">
          <div className="ss-header-bg">STYLE</div>
          <div className="ss-header-label">
            Writing Studio · {en ? "Style Development" : "문체 개발"}
          </div>
          <h1 className="ss-header-title">
            {en ? (
              <>Define Your <span>Style</span></>
            ) : (
              <>나만의 <span>문체</span>를<br />정의하다</>
            )}
          </h1>
          <p className="ss-header-desc">
            {en
              ? "From hard SF to web novels — a systematic tool for building your unique authorial voice across genres."
              : "하드SF부터 웹소설까지 — 장르를 넘나드는 고유한 작가적 목소리를 체계적으로 구축하는 도구입니다."}
          </p>
        </div>
      </div>

      {/* Style Preset Dropdown */}
      <div className="ss-toolbar">
        <div className="ss-shell ss-toolbar-shell">
          <div className="ss-toolbar-anchor">
            <button className="ss-preset-trigger" onClick={() => setShowStylePresetMenu((v) => !v)}>
              ⚡ {en ? "Preset" : "프리셋"}
            </button>
            {showStylePresetMenu && (
              <div className="ss-preset-menu">
                {STYLE_PRESETS.map((p) => (
                  <button key={p.key} className="ss-preset-item" onClick={() => applyStylePreset(p.key)}>
                    {en ? p.en : p.ko}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="ss-tabs">
        <div className="ss-shell ss-tabs-shell">
          {tabLabels.map((label, i) => (
            <button
              key={i}
              className={`ss-tab ${tab === i ? "active" : ""}`}
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="ss-main">
        <div className="ss-shell ss-main-shell">
        {/* ============================================================ */}
        {/* PART 5 — 패널 1: 문체 DNA 진단                              */}
        {/* ============================================================ */}
        {tab === 0 && (
          <div>
            <div className="ss-section-title">Step 01 — {en ? "Style Identity" : "문체 정체성 선택"}</div>
            <p className="ss-hint">
              {en
                ? "Select the style types closest to your current or target writing. Multiple selections allowed."
                : "지금의 글쓰기 또는 목표로 하는 문체에 가장 가까운 유형을 선택하세요. 복수 선택 가능."}
            </p>

            <div className="ss-dna-grid">
              {DNA_CARDS.map((card, i) => (
                <button
                  key={i}
                  className={`ss-dna-card ${selectedCards.has(i) ? "selected" : ""}`}
                  onClick={() => toggleSet(setSelectedCards, i)}
                >
                  {selectedCards.has(i) && <span className="ss-dna-check">✓</span>}
                  <span className={`ss-dna-label ${card.labelClass}`}>{en ? card.labelEN : card.label}</span>
                  <h3>{en ? card.titleEN : card.title}</h3>
                  <p>{en ? card.descEN : card.desc}</p>
                </button>
              ))}
            </div>

            <hr className="ss-divider" />
            <div className="ss-section-title">Step 02 — {en ? "Style Parameters" : "문체 파라미터 설정"}</div>

            <div className="ss-slider-group">
              {SLIDERS_I18N.map((s) => {
                const currentLabel = getSliderDescriptor(s, sliderVals[s.id], en);

                return (
                  <div key={s.id} className="ss-slider-row">
                    <div className="ss-slider-topline" title={`${en ? s.en : s.ko}: ${currentLabel} — ${en ? s.noteEN : s.noteKO}`}>
                      <div className="ss-slider-meta">
                        <div className="ss-slider-label">{en ? s.en : s.ko}</div>
                        <p className="ss-slider-note">{en ? s.noteEN : s.noteKO}</p>
                      </div>
                      <span className="ss-slider-current">{currentLabel}</span>
                    </div>

                    <div className="ss-slider-ends">
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={sliderVals[s.id]}
                        onChange={(e) => handleSlider(s.id, Number(e.target.value))}
                        className="ss-range"
                        aria-valuetext={currentLabel}
                        style={getSliderTrackStyle(sliderVals[s.id])}
                      />
                      <div className="ss-slider-end-labels">
                        <span>{en ? s.leftEN : s.leftKO}</span>
                        <strong>{currentLabel}</strong>
                        <span>{en ? s.rightEN : s.rightKO}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Radar Chart + Benchmark Comparison */}
            <hr className="ss-divider" />
            <div className="ss-section-title">
              {en ? "Style Radar" : "문체 레이더"}
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto" }}>
                <RadarChart
                  values={radarValues}
                  benchmarkValues={benchmarkProfile?.values}
                  labels={radarLabels}
                  size={240}
                />
                {/* Legend */}
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8, fontSize: 11 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(245,166,35,0.5)", display: "inline-block" }} />
                    {en ? "My Style" : "내 문체"}
                  </span>
                  {benchmarkProfile && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(99,180,255,0.5)", display: "inline-block" }} />
                      {en ? benchmarkProfile.en : benchmarkProfile.ko}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary, #999)", display: "block", marginBottom: 6 }}>
                  {en ? "Compare with..." : "비교 작가 선택"}
                </label>
                <select
                  value={benchmarkAuthor}
                  onChange={(e) => setBenchmarkAuthor(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(107,114,142,0.25)",
                    background: "rgba(107,114,142,0.06)",
                    color: "inherit",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <option value="">{en ? "— None —" : "— 선택 안 함 —"}</option>
                  {Object.entries(AUTHOR_PROFILES).map(([key, prof]) => (
                    <option key={key} value={key}>{en ? prof.en : prof.ko}</option>
                  ))}
                </select>
                {benchmarkProfile && (
                  <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary, #999)" }}>
                    {SLIDERS_I18N.map((s, i) => {
                      const mine = radarValues[i];
                      const theirs = benchmarkProfile.values[i];
                      const diff = mine - theirs;
                      const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
                      const clr = diff > 0 ? "#f5a623" : diff < 0 ? "#63b4ff" : "#888";
                      return (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{en ? s.en : s.ko}</span>
                          <span style={{ color: clr, fontWeight: 600 }}>
                            {mine} vs {theirs} <span style={{ fontSize: 10 }}>{arrow}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button className="ss-btn-primary" onClick={() => setTab(1)} style={{ marginTop: 20 }}>
              {en ? "Next: Technique Checklist →" : "다음: 기법 체크리스트 →"}
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* PART 6 — 패널 2: 기법 체크리스트                             */}
        {/* ============================================================ */}
        {tab === 1 && (
          <div>
            <div className="ss-section-title">
              Step 03 — {en ? "Technique Checklist" : "문체 기법 습득 체크리스트"}
            </div>

            <div className="ss-progress-wrap">
              <span className="ss-progress-label">
                {totalChecked} / {totalItems} {en ? "done" : "완료"}
              </span>
              <div className="ss-progress-bg">
                <div
                  className="ss-progress-fill"
                  style={{ width: `${(totalChecked / totalItems) * 100}%` }}
                />
              </div>
            </div>

            <div className="ss-checklist-grid">
              <div>
                <h3 className="ss-checklist-heading">SF / {en ? "Technical Style" : "기술적 문체"}</h3>
                {SF_CHECKS.map((item, i) => (
                  <button
                    key={i}
                    className={`ss-check-item ${checkedSF.has(i) ? "done" : ""}`}
                    onClick={() => toggleSet(setCheckedSF, i)}
                  >
                    <span className="ss-check-box">{checkedSF.has(i) ? "✓" : ""}</span>
                    <span className="ss-check-text">
                      <strong>{en ? item.titleEN : item.title}</strong>
                      <span>{en ? item.descEN : item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <h3 className="ss-checklist-heading">{en ? "Web Novel / Immersion" : "웹소설 / 몰입 기법"}</h3>
                {WEB_CHECKS.map((item, i) => (
                  <button
                    key={i}
                    className={`ss-check-item ${checkedWeb.has(i) ? "done" : ""}`}
                    onClick={() => toggleSet(setCheckedWeb, i)}
                  >
                    <span className="ss-check-box">{checkedWeb.has(i) ? "✓" : ""}</span>
                    <span className="ss-check-text">
                      <strong>{en ? item.titleEN : item.title}</strong>
                      <span>{en ? item.descEN : item.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PART 7 — 패널 3: 문장 실험실                                 */}
        {/* ============================================================ */}
        {tab === 2 && (
          <div>
            <div className="ss-section-title">Step 04 — {en ? "Sentence Transform Lab" : "문장 변환 실험실"}</div>
            <p className="ss-hint">
              {en
                ? "Enter your original text and select style directions. AI will rewrite the same content in a different style."
                : "원문을 입력하고 변환하고 싶은 문체 요소를 선택하면, AI가 같은 내용을 다른 스타일로 재작성합니다."}
            </p>

            <div className="ss-section-title" style={{ marginBottom: 12 }}>
              {en ? "Transform Direction" : "변환 방향 선택"}
            </div>
            <div className="ss-style-toggles">
              {(en ? STYLE_NAMES_EN : STYLE_NAMES_KO).map((name, i) => (
                <button
                  key={i}
                  className={`ss-style-toggle ${activeStyles.has(i) ? "on" : ""}`}
                  onClick={() => toggleSet(setActiveStyles, i)}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="ss-lab-split">
              <div>
                <label className="ss-lab-label">{en ? "Original" : "원문 입력"}</label>
                <textarea
                  className="ss-textarea"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder={en
                    ? "Paste your original text here."
                    : "여기에 원문을 붙여넣으세요.\n\n예시: '그는 창밖을 바라보며 무언가를 생각했다. 오늘따라 하늘이 특별히 파랗게 느껴졌다.'"
                  }
                />
                {/* Real-time text analysis */}
                <TextAnalysisCards metrics={textMetrics} en={en} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="ss-lab-label">{en ? "Result" : "변환 결과"}</label>
                  {resultText && <CopyButton text={resultText} language={language} />}
                </div>
                <div className="ss-result-box">
                  {resultText ? (
                    resultText.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < resultText.split("\n").length - 1 && <br />}
                      </span>
                    ))
                  ) : (
                    <span className="ss-placeholder">
                      {en
                        ? "← Enter text and run transform to see results."
                        : "← 원문을 입력하고 변환을 실행하면 결과가 여기에 표시됩니다."}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="ss-btn-row">
              <button
                className="ss-btn-primary"
                onClick={transformText}
                disabled={loading || !sourceText.trim() || activeStyles.size === 0}
              >
                {en ? "Transform" : "문체 변환 실행"}
              </button>
              <button
                className="ss-btn-secondary"
                onClick={() => { setSourceText(""); setResultText(""); }}
              >
                {en ? "Reset" : "초기화"}
              </button>
              {loading && (
                <div className="ss-loading">
                  <span className="ss-dot" />
                  <span className="ss-dot" />
                  <span className="ss-dot" />
                  <span>{en ? "Transforming..." : "변환 중..."}</span>
                </div>
              )}
            </div>

            <hr className="ss-divider" />

            <div className="ss-section-title">
              {en ? "Style Tips — Common Pitfalls" : "문체 팁 — 자주 나오는 함정"}
            </div>
            <div className="ss-tip warning">
              <h4>{en ? "AI Style Symptom 1: Transition Overload" : "AI 문체 증상 1: 과잉 전환어"}</h4>
              <p>{en
                ? "However / Nevertheless / Despite — consecutive use makes prose sound like an essay. Replace with action."
                : "하지만 / 그러나 / 그럼에도 불구하고 — 연속 사용 시 글이 설명문처럼 들린다. 행동으로 대체하라."}</p>
            </div>
            <div className="ss-tip warning">
              <h4>{en ? "AI Style Symptom 2: Stating Emotions Directly" : "AI 문체 증상 2: 감정 직접 명시"}</h4>
              <p>{en
                ? "Instead of 'Fear washed over him,' use physical reactions: His fingertips scraped the edge of the monitor. 0.3 seconds. Again."
                : "\"두려움이 몰려왔다\" 대신 신체 반응으로: 손끝이 모니터 엣지를 긁었다. 0.3초. 다시 긁었다."}</p>
            </div>
            <div className="ss-tip">
              <h4>{en ? "Technique: Data as Narrative" : "기법 활용: 데이터의 서사화"}</h4>
              <p>{en
                ? "Numbers, dates, and measurements aren't just information — they can serve as emotional thermometers for your characters."
                : "숫자·날짜·측정값이 단순 정보가 아니라 캐릭터의 감정 온도계 역할을 할 수 있다. 수치에 맥락을 부여하라."}</p>
            </div>
            <div className="ss-tip">
              <h4>{en ? "Technique: Behavioral Markers" : "기법 활용: 행동 마커의 반복"}</h4>
              <p>{en
                ? "Give each character a repeated habit or gesture. Readers learn to identify them without explicit description."
                : "인물마다 고유한 반복 습관을 부여하라. 독자가 설명 없이도 누구인지 식별할 수 있게 된다."}</p>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PART 8 — 패널 4: 내 문체 프로필                              */}
        {/* ============================================================ */}
        {tab === 3 && (
          <div>
            <div className="ss-section-title">
              {en ? "My Style Profile" : "내 문체 프로필 — 현재 설정 기준"}
            </div>

            <div className="ss-profile-grid">
              <div className="ss-profile-card">
                <h3>{en ? "Genre Identity" : "장르 정체성"}</h3>
                <div className="ss-tag-row">
                  {Array.from(selectedCards).map((i) => (
                    <span key={i} className="ss-tag ss-tag-gold">{DNA_CARDS[i].label}</span>
                  ))}
                  {selectedCards.size === 0 && (
                    <span className="ss-tag ss-tag-gold">{en ? "None" : "미선택"}</span>
                  )}
                </div>
                <div className="ss-profile-items">
                  <div className="ss-profile-item">
                    <span className="ss-profile-key">{en ? "Selected Styles" : "선택 문체"}</span>
                    <span>{selectedCards.size > 0
                      ? Array.from(selectedCards).map((i) => en ? DNA_CARDS[i].titleEN : DNA_CARDS[i].title).join(" + ")
                      : (en ? "Not set" : "미설정")}</span>
                  </div>
                  <div className="ss-profile-item">
                    <span className="ss-profile-key">{en ? "Techniques" : "습득 기법"}</span>
                    <span>{totalChecked} / {totalItems} {en ? "mastered" : "완료"}</span>
                  </div>
                  <div className="ss-profile-item">
                    <span className="ss-profile-key">{en ? "Lab Usage" : "실험실 사용"}</span>
                    <span>{resultText ? (en ? "Active" : "활성") : (en ? "Not yet" : "미사용")}</span>
                  </div>
                </div>
              </div>

              <div className="ss-profile-card">
                <h3>{en ? "Style Parameters" : "문체 파라미터"}</h3>
                <div className="ss-profile-items">
                  {SLIDERS_I18N.map((s) => (
                    <div key={s.id} className="ss-profile-item">
                      <span className="ss-profile-key">{en ? s.en : s.ko}</span>
                      <span>{getSliderDescriptor(s, sliderVals[s.id], en)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ss-author-dna">
              <div className="ss-author-dna-bg">DNA</div>
              <h3>{en ? "Author Style DNA Statement" : "작가 문체 DNA 선언문"}</h3>
              <div className="ss-dna-statement">
                {selectedCards.size === 0 ? (
                  <span style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                    {en
                      ? "Select your style identity in Step 01 to generate your DNA statement."
                      : "Step 01에서 문체 정체성을 선택하면 DNA 선언문이 생성됩니다."}
                  </span>
                ) : (
                  <>
                    {en ? "I write " : "나는 "}
                    <em className="ss-hl">
                      {selectedCards.has(0) && (en ? "the language of systems" : "시스템의 언어")}
                      {selectedCards.has(1) && (selectedCards.has(0) ? (en ? " and rhythm" : "와 리듬") : (en ? "fast-paced rhythm" : "빠른 호흡의 리듬"))}
                      {selectedCards.has(2) && ((selectedCards.has(0) || selectedCards.has(1)) ? (en ? " and sensory depth" : "과 감각의 깊이") : (en ? "sensory depth" : "감각의 깊이"))}
                      {selectedCards.has(3) && ((selectedCards.has(0) || selectedCards.has(1) || selectedCards.has(2)) ? (en ? " across genres" : "을 장르 너머") : (en ? "genre-crossing craft" : "장르를 넘나드는 문장"))}
                    </em>
                    {en ? " to capture " : "으로 "}
                    <em className="ss-hl2">
                      {sliderVals.s2 <= 2
                        ? (en ? "what data reveals" : "데이터가 드러내는 것들")
                        : sliderVals.s2 >= 4
                          ? (en ? "the weight of emotion" : "감정의 무게")
                          : (en ? "the tension between logic and feeling" : "논리와 감정 사이의 긴장")}
                    </em>
                    {en ? ", and my sentences make readers " : "을 포착하고,"}<br />
                    {en ? "" : "독자가 이해하기 전에 "}
                    <em className="ss-hl">
                      {sliderVals.s4 >= 4
                        ? (en ? "feel before they understand" : "먼저 느끼게")
                        : sliderVals.s4 <= 2
                          ? (en ? "see the whole picture" : "전체를 조망하게")
                          : (en ? "step into the story" : "이야기 안으로 걸어 들어가게")}
                    </em>
                    {en ? "." : " 만드는 것이 내 문체다."}
                  </>
                )}
              </div>
            </div>

            <hr className="ss-divider" />

            <div className="ss-section-title">{en ? "Reference Authors" : "참고할 작가 — 문체 레퍼런스"}</div>
            <div className="ss-ref-grid">
              {(() => {
                const authors = new Map<string, RefAuthor>();
                Array.from(selectedCards).forEach((cardIdx) => {
                  REF_AUTHORS[cardIdx]?.forEach((a) => authors.set(a.name, a));
                });
                const list = authors.size > 0 ? Array.from(authors.values()).slice(0, 3) : REF_AUTHORS[0];
                return list.map((a, i) => (
                  <div key={i} className="ss-tip">
                    <h4>{en ? a.nameEN : a.name}</h4>
                    <p>{en ? a.descEN : a.desc}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PART 7 — 패널 5: 프리뷰 & 아키타입 비교                     */}
        {/* ============================================================ */}
        {tab === 4 && (
          <StylePreview
            profile={{
              selectedDNA: Array.from(selectedCards),
              sliders: { ...sliderVals },
              checkedSF: Array.from(checkedSF),
              checkedWeb: Array.from(checkedWeb),
            }}
            language={language}
          />
        )}
        </div>
      </div>
    </div>
  );
}
