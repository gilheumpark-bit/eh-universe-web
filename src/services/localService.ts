import { StoryConfig, Genre } from "../lib/studio-types";

const ATMOSPHERE: Record<Genre, string[]> = {
  [Genre.SF]: [
    "홀로그램 광고판이 빗물에 반사되어 {setting}의 바닥을 네온빛으로 물들였다.",
    "기계적인 소음만이 가득한 {setting}에는 차가운 금속 냄새가 감돌았다.",
    "인공 중력 제어 장치가 웅웅거리며 {setting}의 정적을 깨뜨렸다.",
    "네트워크 데이터 스트림이 보이지 않는 강물처럼 공기를 흐르고 있었다."
  ],
  [Genre.FANTASY]: [
    "{setting}에는 고대 마력의 잔재가 희미하게 남아있었다.",
    "바람에 실려온 숲의 향기가 {setting}을 감쌌다.",
    "마법 등불이 깜빡이며 {setting}의 그림자를 길게 늘어뜨렸다.",
    "신비로운 정령들이 숨어있는 듯, 공기가 미세하게 진동했다."
  ],
  [Genre.ROMANCE]: [
    "{setting}에 내려앉은 오후의 햇살이 나른하게 느껴졌다.",
    "어디선가 들려오는 음악 소리가 {setting}의 분위기를 부드럽게 만들었다.",
    "미묘한 긴장감이 흐르는 {setting}, 공기조차 숨을 죽인 듯했다.",
    "벚꽃 잎이 흩날리며 {setting}의 풍경을 파스텔 톤으로 물들였다."
  ],
  [Genre.THRILLER]: [
    "{setting}의 어둠 속에서 누군가가 지켜보는 듯한 시선이 느껴졌다.",
    "날카로운 바람 소리가 {setting}의 창문을 덜컹거리게 만들었다.",
    "차가운 공기가 폐부를 찌르는 듯한 {setting}의 밤이었다.",
    "불길한 예감이 {setting}의 구석구석에 스며들어 있었다."
  ],
  [Genre.HORROR]: [
    "비릿한 혈향이 {setting}의 썩은 나무 바닥에서 피어올랐다.",
    "기괴하게 비틀린 그림자가 {setting}의 벽면을 기어다니고 있었다.",
    "아무도 없어야 할 {setting}에서 희미한 속삭임이 들려왔다.",
    "절대로 열어서는 안 될 문이 {setting}의 끝에 서 있었다."
  ],
  [Genre.SYSTEM_HUNTER]: [
    "[시스템] 던전 브레이크 경보가 {setting} 전체에 울려 퍼졌다.",
    "푸른색 마나석의 빛이 {setting}을 환하게 비추고 있었다.",
    "게이트 너머의 이질적인 공기가 {setting}으로 쏟아져 들어왔다.",
    "헌터들의 함성 소리가 {setting}의 적막을 찢어발겼다."
  ],
  [Genre.FANTASY_ROMANCE]: [
    "화려한 샹들리에가 {setting}을 대낮처럼 밝히고 있었다.",
    "장미 정원의 향기가 {setting}의 창문을 넘어 들어왔다.",
    "비단 드레스 스치는 소리가 {setting}의 고요함을 우아하게 채웠다.",
    "황실 기사들의 절도 있는 발소리가 {setting}의 복도를 울렸다."
  ],
  [Genre.ALT_HISTORY]: [
    "이 세계의 {setting}은 우리가 아는 역사와 미묘하게 달랐다.",
    "비틀린 시간선의 잔해가 {setting}의 건물 곳곳에 새겨져 있었다.",
    "낡은 지도에 표시된 {setting}은 이미 존재하지 않는 국경선을 가리키고 있었다."
  ],
  [Genre.MODERN_FANTASY]: [
    "평범한 {setting}의 일상 속에 마법의 기운이 스며들어 있었다.",
    "스마트폰 화면 너머로 {setting}의 차원 균열이 희미하게 빛났다.",
    "도심 한가운데 {setting}에서 이질적인 마력이 감지되었다."
  ],
  [Genre.WUXIA]: [
    "검기가 {setting}의 공기를 가르며 날카롭게 흘러갔다.",
    "무림의 강호가 {setting}을 중심으로 요동치고 있었다.",
    "내공을 끌어올리니 {setting} 주변의 기운이 소용돌이쳤다."
  ],
  [Genre.LIGHT_NOVEL]: [
    "어쩐지 {setting}이 이세계의 시작 마을 같은 느낌이었다.",
    "시스템 창이 {setting} 한가운데에서 반짝이며 떠올랐다.",
    "평범해 보이는 {setting}이었지만, 뭔가 이상한 기운이 감돌았다."
  ]
};

const ACTIONS = [
  "{character}는 마른침을 삼키며 주위를 둘러보았다.",
  "{character}의 손끝이 미세하게 떨리고 있었다.",
  "결심한 듯, {character}는 앞으로 한 발자국 내디뎠다.",
  "{character}는 깊은 한숨을 내쉬며 고개를 저었다.",
  "날카로운 눈빛으로 상황을 주시하던 {character}가 입을 열었다.",
  "{character}는 주먹을 꽉 쥐었다.",
  "그 순간, {character}의 머릿속에 번개 같은 직감이 스쳤다."
];

const MONOLOGUES = [
  "이것은 단순한 우연이 아니었다. 분명히 누군가의 의도가 개입되어 있었다.",
  "도망칠 수 없다면, 맞서 싸우는 수밖에 없었다.",
  "심장이 터질 듯이 뛰었다. {emotion}의 감정이 전신을 지배했다.",
  "모든 것이 계획대로였다. 아니, 그래야만 했다.",
  "더 이상 물러설 곳은 없었다. 오직 전진뿐이었다.",
  "기억의 파편들이 머릿속을 어지럽게 헤집어 놓았다.",
  "그것은 {emotion}이었다. 차갑고도 명확한 감각."
];

const DIALOGUES = [
  "\"...지금 뭐라고 했어?\"",
  "\"아직 끝난 게 아니야. 이제 시작일 뿐이지.\"",
  "\"그쪽으로 가면 안 돼! 위험해!\"",
  "\"믿을 수 없군. 정말 그게 사실인가?\"",
  "\"시간이 없어. 서둘러야 해.\"",
  "\"당신이 선택한 길이야. 후회하지 마.\""
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const generateStoryStreamLocal = async (
  config: StoryConfig,
  draft: string,
  onChunk: (text: string) => void
) => {
  await sleep(1000);
  
  const atmosphereList = ATMOSPHERE[config.genre] || ATMOSPHERE[Genre.SF];
  
  const replacePlaceholders = (text: string) => {
    return text
      .replace(/{character}/g, config.povCharacter)
      .replace(/{setting}/g, config.setting)
      .replace(/{emotion}/g, config.primaryEmotion);
  };

  const streamText = async (text: string, speed = 10) => {
    const processed = replacePlaceholders(text);
    for (let i = 0; i < processed.length; i++) {
        onChunk(processed[i]);
        if (Math.random() > 0.8) await sleep(speed); 
    }
    await sleep(200);
  };

  const parts = ["발단", "전개", "위기", "절정"];
  
  for (let i = 0; i < parts.length; i++) {
    await streamText(`\n\n--- PART ${i+1}: ${parts[i]} ---\n\n`);
    
    // Generate multiple sentences to simulate density
    for (let j = 0; j < 3; j++) {
      await streamText(pick(atmosphereList) + " ");
      await streamText(pick(ACTIONS) + " ");
      await streamText(pick(MONOLOGUES) + " ");
      await streamText(pick(DIALOGUES) + "\n");
    }
    
    if (i === 0) await streamText(`\n${draft}의 그림자가 ${config.setting}에 길게 늘어졌다. `);
  }

  const analysis = {
      grade: "A",
      eos_score: 85,
      metrics: { tension: 70, pacing: 75, immersion: 80 },
      critique: "로컬 시뮬레이션 모드 결과입니다. 설정된 가이드라인에 맞춰 문장 밀도를 조정했습니다."
  };
  
  await streamText(`\n\n\`\`\`json\n${JSON.stringify(analysis, null, 2)}\n\`\`\``);
};
