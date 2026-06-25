import React from 'react';

export const STYLE_NAMES_KO = ['건조·SF 문체', '감각적 묘사 강화', '웹소설 리듬감', '캐릭터 목소리 강화', '긴장감 압축'] as const;
export const STYLE_NAMES_EN = ['Dry / SF Style', 'Sensory Description', 'Web Novel Rhythm', 'Character Voice', 'Tension Compression'] as const;

export const STYLE_PRESETS: readonly { key: string; ko: string; en: string; sliders: Record<string, number>; dna: number[] }[] = [
  { key: 'hard-sf', ko: '하드 SF 문체', en: 'Hard SF Style', sliders: { s1: 2, s2: 1, s3: 2, s4: 1, s5: 5 }, dna: [0] },
  { key: 'web-novel', ko: '웹소설 리듬형', en: 'Web Novel Rhythm', sliders: { s1: 1, s2: 3, s3: 3, s4: 4, s5: 2 }, dna: [1] },
  { key: 'literary', ko: '순문학 감성', en: 'Literary Emotional', sliders: { s1: 4, s2: 5, s3: 5, s4: 5, s5: 4 }, dna: [2] },
  { key: 'action', ko: '액션/전투 압축', en: 'Action/Battle Compact', sliders: { s1: 1, s2: 2, s3: 3, s4: 4, s5: 3 }, dna: [4] },
  { key: 'romance', ko: '로맨스 감정선', en: 'Romance Emotion Line', sliders: { s1: 3, s2: 5, s3: 4, s4: 5, s5: 2 }, dna: [3] },
  { key: 'thriller', ko: '스릴러 건조체', en: 'Thriller Dry Style', sliders: { s1: 1, s2: 1, s3: 2, s4: 3, s5: 3 }, dna: [0, 4] },
  { key: 'fantasy', ko: '판타지 서사체', en: 'Fantasy Epic', sliders: { s1: 4, s2: 3, s3: 4, s4: 3, s5: 3 }, dna: [2, 3] },
  { key: 'horror', ko: '호러/괴담체', en: 'Horror/Ghost Story', sliders: { s1: 2, s2: 4, s3: 5, s4: 5, s5: 2 }, dna: [4] },
  { key: 'essay', ko: '에세이/수필', en: 'Essay/Memoir', sliders: { s1: 3, s2: 4, s3: 3, s4: 2, s5: 3 }, dna: [2] },
  { key: 'cinematic', ko: '시네마틱 묘사', en: 'Cinematic Description', sliders: { s1: 3, s2: 3, s3: 5, s4: 4, s5: 3 }, dna: [1, 2] },
] as const;

export interface SliderDefI18n {
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

export const SLIDERS_I18N: SliderDefI18n[] = [
  {
    id: 's1',
    ko: '문장 길이',
    en: 'Sentence Length',
    leftKO: '속도 중심',
    leftEN: 'Faster pace',
    rightKO: '여백 중심',
    rightEN: 'More spacious',
    defaultVal: 3,
    stepsKO: ['짧고 단단하게', '짧은 호흡', '균형', '긴 호흡', '길게 밀어붙이기'],
    stepsEN: ['Tight and short', 'Short breath', 'Balanced', 'Long breath', 'Extended flow'],
    noteKO: '호흡이 짧을수록 추진력이, 길수록 사유와 여운이 커집니다.',
    noteEN: 'Shorter sentences push momentum, while longer ones create reflection and aftertaste.',
  },
  {
    id: 's2',
    ko: '감정 밀도',
    en: 'Emotional Density',
    leftKO: '객관·절제',
    leftEN: 'Restrained',
    rightKO: '주관·정서',
    rightEN: 'Emotive',
    defaultVal: 2,
    stepsKO: ['감정 절제', '건조한 편', '균형', '정서 강조', '감정 밀도 높음'],
    stepsEN: ['Restrained', 'Dry-leaning', 'Balanced', 'Emotion-forward', 'Emotion-rich'],
    noteKO: '감정을 직접 드러낼지, 문장 아래에 눌러둘지 결정하는 축입니다.',
    noteEN: 'This controls whether emotion stays under the prose or rises visibly to the surface.',
  },
  {
    id: 's3',
    ko: '묘사 방식',
    en: 'Description Style',
    leftKO: '직설 서술',
    leftEN: 'Direct',
    rightKO: '감각 이미지',
    rightEN: 'Sensory',
    defaultVal: 3,
    stepsKO: ['사실 위주', '직설 묘사', '균형', '이미지 강조', '감각 몰입'],
    stepsEN: ['Factual', 'Direct', 'Balanced', 'Image-leaning', 'Sensory immersion'],
    noteKO: '정보 전달에 무게를 둘지, 장면의 촉감과 이미지에 무게를 둘지 조절합니다.',
    noteEN: 'Choose between efficient delivery and a stronger sensory, image-driven scene feel.',
  },
  {
    id: 's4',
    ko: '서술 시점',
    en: 'POV Distance',
    leftKO: '거리감',
    leftEN: 'Distant',
    rightKO: '밀착감',
    rightEN: 'Intimate',
    defaultVal: 3,
    stepsKO: ['멀리 조망', '관찰자 시점', '균형', '인물 밀착', '내면 침투'],
    stepsEN: ['Panoramic', 'Observer', 'Balanced', 'Close POV', 'Deep interior'],
    noteKO: '독자와 인물 사이 거리를 바꿔, 조망형 서술과 몰입형 서술 사이를 조정합니다.',
    noteEN: 'Adjusts how close readers stay to the character, from panoramic to immersive interiority.',
  },
  {
    id: 's5',
    ko: '어휘 수준',
    en: 'Vocabulary Level',
    leftKO: '평이함',
    leftEN: 'Plain',
    rightKO: '정밀함',
    rightEN: 'Precise',
    defaultVal: 4,
    stepsKO: ['편한 말맛', '담백한 어휘', '균형', '정교한 어휘', '전문적 질감'],
    stepsEN: ['Plainspoken', 'Clean', 'Balanced', 'Refined', 'Specialized'],
    noteKO: '문장의 격과 전문성을 얼마나 끌어올릴지 정합니다.',
    noteEN: 'This sets how elevated or specialized your vocabulary should feel.',
  },
];

export const getSliderDescriptor = (slider: SliderDefI18n, value: number, en: boolean) => {
  const labels = en ? slider.stepsEN : slider.stepsKO;
  const safeIndex = Math.max(0, Math.min(labels.length - 1, value - 1));
  return labels[safeIndex];
};

export const AUTHOR_PROFILES: Record<string, { ko: string; en: string; values: [number, number, number, number, number] }> = {
  'ted-chiang': { ko: '테드 창', en: 'Ted Chiang', values: [3, 1, 3, 2, 5] },
  'liu-cixin': { ko: '류츠신', en: 'Liu Cixin', values: [4, 2, 4, 2, 5] },
  'han-kang': { ko: '한강', en: 'Han Kang', values: [4, 5, 5, 5, 4] },
  murakami: { ko: '무라카미 하루키', en: 'Haruki Murakami', values: [4, 3, 4, 4, 3] },
  sanderson: { ko: '브랜든 샌더슨', en: 'Brandon Sanderson', values: [2, 3, 3, 3, 3] },
  'sing-shong': { ko: '싱숑', en: 'Sing Shong', values: [1, 3, 3, 5, 2] },
  djuna: { ko: '듀나', en: 'Djuna', values: [2, 1, 3, 2, 4] },
  leguin: { ko: '어슐러 르 귄', en: 'Ursula K. Le Guin', values: [3, 3, 4, 3, 4] },
};

export function RadarChart({ values, benchmarkValues, labels, size = 220 }: {
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
    vals.map((value, index) => pointAt(index, value).join(',')).join(' ');

  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="ss-radar-svg">
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: 5 }, (_, index) => pointAt(index, level).join(',')).join(' ')}
          fill="none"
          stroke="rgba(107,114,142,0.18)"
          strokeWidth={level === 5 ? 1.2 : 0.6}
        />
      ))}
      {Array.from({ length: 5 }, (_, index) => {
        const [ex, ey] = pointAt(index, 5);
        return <line key={index} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(107,114,142,0.15)" strokeWidth={0.6} />;
      })}
      {benchmarkValues && (
        <polygon
          points={polygonPoints(benchmarkValues)}
          fill="rgba(99,180,255,0.15)"
          stroke="rgba(99,180,255,0.7)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      <polygon
        points={polygonPoints(values)}
        fill="rgba(245,166,35,0.2)"
        stroke="var(--color-accent-amber, #2563eb)"
        strokeWidth={2}
      />
      {values.map((value, index) => {
        const [px, py] = pointAt(index, value);
        return <circle key={index} cx={px} cy={py} r={3.5} fill="var(--color-accent-amber, #2563eb)" />;
      })}
      {benchmarkValues?.map((value, index) => {
        const [px, py] = pointAt(index, value);
        return <circle key={`b${index}`} cx={px} cy={py} r={2.5} fill="rgba(99,180,255,0.8)" />;
      })}
      {labels.map((label, index) => {
        const [lx, ly] = pointAt(index, 5.8);
        return (
          <text
            key={index}
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

export interface TextMetrics {
  avgSentenceLen: number;
  dialogueRatio: number;
  vocabDiversity: number;
  readingTimeSec: number;
}

export function analyzeText(text: string): TextMetrics | null {
  if (!text.trim()) return null;

  const sentences = text.split(/[.!?。？！\n]+/).filter((sentence) => sentence.trim().length > 0);
  const avgSentenceLen = sentences.length > 0
    ? Math.round(sentences.reduce((sum, sentence) => sum + sentence.trim().length, 0) / sentences.length)
    : 0;

  const dialogueMatches = text.match(/["'""\u201C\u201D\u300C\u300D][^"'""\u201C\u201D\u300C\u300D]*["'""\u201C\u201D\u300C\u300D]/g);
  const dialogueChars = dialogueMatches ? dialogueMatches.join('').length : 0;
  const dialogueRatio = text.length > 0 ? Math.round((dialogueChars / text.length) * 100) : 0;

  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const unique = new Set(words.map((word) => word.toLowerCase()));
  const vocabDiversity = words.length > 0 ? Math.round((unique.size / words.length) * 100) : 0;

  const charCount = text.replace(/\s/g, '').length;
  const readingTimeSec = Math.max(1, Math.round((charCount / 500) * 60));

  return { avgSentenceLen, dialogueRatio, vocabDiversity, readingTimeSec };
}

export function TextAnalysisCards({ metrics, en }: { metrics: TextMetrics | null; en: boolean }) {
  if (!metrics) return null;

  const cards: { label: string; value: string }[] = [
    {
      label: en ? 'Avg. Sentence' : '평균 문장 길이',
      value: `${metrics.avgSentenceLen}${en ? ' chars' : '자'}`,
    },
    {
      label: en ? 'Dialogue' : '대화 비율',
      value: `${metrics.dialogueRatio}%`,
    },
    {
      label: en ? 'Vocab Diversity' : '어휘 다양성',
      value: `${metrics.vocabDiversity}%`,
    },
    {
      label: en ? 'Reading Time' : '읽기 시간',
      value: metrics.readingTimeSec < 60
        ? `${metrics.readingTimeSec}${en ? 's' : '초'}`
        : `${Math.floor(metrics.readingTimeSec / 60)}${en ? 'm ' : '분 '}${metrics.readingTimeSec % 60}${en ? 's' : '초'}`,
    },
  ];

  return (
    <div className="ss-metrics-grid">
      {cards.map((card) => (
        <div
          key={card.label}
          className="ss-metric-card"
        >
          <div className="ss-metric-label">{card.label}</div>
          <div className="ss-metric-value">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

export interface CheckItem {
  title: string;
  titleEN: string;
  desc: string;
  descEN: string;
}

export const SF_CHECKS: CheckItem[] = [
  { title: '숫자의 서사화', titleEN: 'Data as Narrative', desc: 'D+127일, φ=0.73 같은 데이터를 감정처럼 읽히게 쓰기', descEN: 'Make data like D+127 or φ=0.73 read like emotion.' },
  { title: '시스템 관점 서술', titleEN: 'System-POV Writing', desc: '캐릭터 대신 프로세스가 주어가 되는 문장 연습', descEN: 'Practice sentences where processes — not characters — are the subject.' },
  { title: '기술용어 자연화', titleEN: 'Naturalizing Jargon', desc: '독자가 모르는 단어도 문맥으로 이해하게 만들기', descEN: 'Make unfamiliar terms understandable through context alone.' },
  { title: '시간축 병렬 서술', titleEN: 'Parallel Timelines', desc: '과거·현재·미래 타임라인을 겹쳐 긴장감 만들기', descEN: 'Layer past, present, and future timelines to build tension.' },
  { title: '오류 미학', titleEN: 'Aesthetics of Error', desc: '결함·이상신호·예외값을 문학적 상징으로 활용', descEN: 'Use defects, anomalies, and exceptions as literary symbols.' },
  { title: '침묵의 데이터', titleEN: 'Silent Data', desc: '로그가 기록하지 않은 것, 센서가 잡지 못한 것으로 감정 표현', descEN: "Express emotion through what logs didn't record and sensors didn't catch." },
  { title: '캐릭터 행동 마커', titleEN: 'Behavioral Markers', desc: '인물 고유의 반복 습관(펜 돌리기, 손톱 물어뜯기 등)으로 설명 없이 개성 각인', descEN: 'Give each character a repeated habit to imprint personality without exposition.' },
  { title: '스케일 전환', titleEN: 'Scale Shifts', desc: '우주적 규모 ↔ 손가락 하나의 진동 — 줌인·줌아웃 기법', descEN: "Cosmic scale ↔ a single finger's tremor — zoom in/out technique." },
];

export const WEB_CHECKS: CheckItem[] = [
  { title: '첫 문장 훅 공식', titleEN: 'First-Line Hook', desc: '행동·충돌·의문 중 하나로 시작. 설명은 나중에.', descEN: 'Start with action, conflict, or a question. Exposition comes later.' },
  { title: '단락 끊기 전략', titleEN: 'Paragraph Break Strategy', desc: '긴장 최고조 직전에 자르기. 독자가 스크롤하게.', descEN: 'Cut right before peak tension. Make the reader scroll.' },
  { title: '3단 호흡 리듬', titleEN: '3-Beat Rhythm', desc: '긴 문장 → 중간 → 짧다. 반복하면 리듬이 된다.', descEN: 'Long → medium → short. Repeat and it becomes rhythm.' },
  { title: '독자 시점 중계', titleEN: 'Reader-POV Relay', desc: '주인공이 느끼기 전에 독자가 먼저 불안해지게 설계', descEN: 'Design so readers feel uneasy before the protagonist does.' },
  { title: '대화의 밀도 조절', titleEN: 'Dialogue Density Control', desc: '말 사이의 행동 서술로 캐릭터 심리 드러내기', descEN: 'Reveal character psychology through actions between dialogue.' },
  { title: '감각 레이어링', titleEN: 'Sensory Layering', desc: '시각 + 청각 + 촉각 조합. 단, 3개 이상 겹치면 과부하.', descEN: 'Combine sight + sound + touch. More than 3 layers overloads.' },
  { title: '반복 어구의 리프레인', titleEN: 'Refrain Technique', desc: '같은 단어·구절 재등장으로 감정 증폭 및 구조 통일', descEN: 'Repeat words/phrases to amplify emotion and unify structure.' },
  { title: '에필로그의 여운', titleEN: 'Epilogue Resonance', desc: '챕터 끝을 해결이 아닌 새로운 질문으로 닫기', descEN: 'Close chapters with new questions, not resolutions.' },
];

export interface RefAuthor {
  name: string;
  nameEN: string;
  desc: string;
  descEN: string;
}

export const REF_AUTHORS: Record<number, RefAuthor[]> = {
  0: [
    { name: '킴 스탠리 로빈슨', nameEN: 'Kim Stanley Robinson', desc: '과학적 정밀함과 생태적 감수성. 데이터가 시가 되는 문장.', descEN: 'Scientific precision meets ecological sensitivity. Data becomes poetry.' },
    { name: '테드 창', nameEN: 'Ted Chiang', desc: '철학적 질문을 SF 논리로 풀어냄. 냉정하고 아름다운 구조.', descEN: 'Philosophical questions through SF logic. Cold, beautiful structure.' },
    { name: '류츠신', nameEN: 'Liu Cixin', desc: '우주적 스케일의 서사. 기술적 디테일이 경외감을 만든다.', descEN: 'Cosmic-scale narrative. Technical detail creates awe.' },
  ],
  1: [
    { name: '싱숑', nameEN: 'Sing Shong', desc: '한국 웹소설의 리듬 마스터. 짧은 호흡, 강한 훅.', descEN: 'Master of Korean web novel rhythm. Short breath, strong hooks.' },
    { name: '히가시노 게이고', nameEN: 'Keigo Higashino', desc: '미스터리의 페이지 터너. 독자를 놓지 않는 구조.', descEN: 'Mystery page-turner. Structure that never lets go.' },
    { name: '브랜든 샌더슨', nameEN: 'Brandon Sanderson', desc: '시스템 기반 판타지. 설정과 플롯의 정교한 맞물림.', descEN: 'System-based fantasy. Precise interlocking of worldbuilding and plot.' },
  ],
  2: [
    { name: '한강', nameEN: 'Han Kang', desc: '감각과 침묵으로 쓰는 작가. 문장이 이미지를 만든다.', descEN: 'Writing through sensation and silence. Sentences create images.' },
    { name: '무라카미 하루키', nameEN: 'Haruki Murakami', desc: '일상의 비현실. 리듬감 있는 산문과 은유의 층위.', descEN: 'Surreal ordinary. Rhythmic prose and layers of metaphor.' },
    { name: '김영하', nameEN: 'Kim Young-ha', desc: '건조한 유머와 날카로운 관찰. 도시적 감수성.', descEN: 'Dry humor and sharp observation. Urban sensibility.' },
  ],
  3: [
    { name: '듀나', nameEN: 'Djuna', desc: '한국 SF의 건조한 감각. 설명하지 않고 제시한다.', descEN: 'Dry sensibility of Korean SF. Shows, never explains.' },
    { name: '어슐러 르 귄', nameEN: 'Ursula K. Le Guin', desc: 'SF·판타지·문학의 경계를 지운 작가. 장르 자체가 문학.', descEN: 'Erased boundaries between SF, fantasy, and literature.' },
    { name: '이탈로 칼비노', nameEN: 'Italo Calvino', desc: '실험적 구조와 문학적 상상력의 결합.', descEN: 'Experimental structure meets literary imagination.' },
  ],
};

export interface DnaCard {
  label: string;
  labelEN: string;
  labelClass: string;
  title: string;
  titleEN: string;
  desc: string;
  descEN: string;
}

export const DNA_CARDS: DnaCard[] = [
  { label: 'Hard SF', labelEN: 'Hard SF', labelClass: 'ss-label-sf', title: '냉정한 관찰자', titleEN: 'The Cold Observer', desc: '기술적 정확성이 곧 아름다움. 감정보다 시스템. 독자가 세계를 이해하게 만드는 문장.', descEN: 'Technical precision as beauty. Systems over emotion. Sentences that make readers understand the world.' },
  { label: '웹소설', labelEN: 'Web Novel', labelClass: 'ss-label-web', title: '빠른 호흡의 이야기꾼', titleEN: 'The Fast-Paced Storyteller', desc: '첫 문장에 훅. 짧은 단락, 강한 리듬. 독자를 다음 장으로 끌어당기는 마력.', descEN: 'Hook in the first line. Short paragraphs, strong rhythm. The magic that pulls readers to the next chapter.' },
  { label: '문학적', labelEN: 'Literary', labelClass: 'ss-label-lit', title: '감각의 설계자', titleEN: 'The Sensory Architect', desc: '세부 묘사가 감정을 만든다. 은유와 여백. 독자가 스스로 느끼게 하는 문장.', descEN: 'Detail creates emotion. Metaphor and white space. Sentences that let readers feel on their own.' },
  { label: '멀티장르', labelEN: 'Multi-Genre', labelClass: 'ss-label-all', title: '장르를 넘나드는 작가', titleEN: 'The Genre-Crossing Writer', desc: 'SF의 논리 + 웹소설의 속도 + 문학의 깊이. 각 장르의 장점을 혼합.', descEN: 'SF logic + web novel speed + literary depth. Blending the best of each genre.' },
];
