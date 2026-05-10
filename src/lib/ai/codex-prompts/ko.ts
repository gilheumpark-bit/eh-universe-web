/**
 * codex-prompts/ko.ts — 한국 웹소설 도메인 prompt builder.
 *
 * 정형 출처: src/lib/translation/korean-genre-matrix.ts (8 장르 매트릭스).
 * 회귀/빙의/헌터/무협/로판 등 한국 웹소설 클리셰를 LLM hint 로 주입.
 *
 * 모든 prompt 는 한국어로 직접 작성 — 사용자 결정 (2026-05-10):
 *   "각 나라 문법 훼손 X". 영어 명령 + 한국어 출력 강제 패턴 폐기.
 *
 * [C] 한국어 명령어 일관 (~하시오 / ~하라 명령형) — LLM 신호 ↑
 * [G] 단순 template literal — 런타임 비용 0
 * [K] 7 builder 동일 인터페이스 (CodexDomainPrompts)
 */

import type {
  CodexDomainPrompts,
  CharactersPromptInput,
  ItemsPromptInput,
  SkillsPromptInput,
  MagicSystemsPromptInput,
  WorldDesignPromptInput,
  WorldSimPromptInput,
  SceneDirectionPromptInput,
} from './types';

// ============================================================
// PART 1 — 캐릭터
// ============================================================

function buildCharactersPrompt(input: CharactersPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[중복 금지] 다음 캐릭터는 이미 존재합니다. 이름·역할이 유사하지 않게 완전히 새로운 인물을 생성하시오:\n${input.existingNames.join(', ')}`
    : '';

  return `당신은 한국 웹소설 캐릭터 생성기입니다.

장르: ${input.genre}
세계관 시놉시스: ${input.synopsis}

위 설정에 맞춰 정확히 ${input.count}명의 입체적 캐릭터를 JSON 배열로 생성하시오.

[role 필드 — 다음 중 정확히 하나]
- "protagonist" 주인공: 작품의 시점·욕망·각성을 견인하는 주역 (1~2명)
- "antagonist" 적대자: 단순 악이 아닌 자체 욕망·논리를 가진 반동인물 (1~2명)
- "ally" 조력자: 주인공의 파티원·동료·아군
- "rival" 라이벌: 주인공과 같은 영역에서 경쟁하는 대등한 적수
- "mentor" 사부·스승: 비밀·과거를 가진 안내자
- "regressor" 회귀자·빙의자: 회귀물·빙의물 한정 — 미래 정보 또는 외부 시점 보유
- "extra" 단역: 단역·일반인

[필수 출력 필드]
- name: 한국 웹소설 톤의 이름 (성+이름 또는 단일 호명)
- role: 위 enum 중 정확히 하나
- traits: 핵심 성격 키워드 3~5개 (쉼표 구분)
- appearance: 외모·복장 묘사 1~2문장
- dna: 서사 잠재력 점수 0~100 (정수)
- desire: 핵심 욕망 — 인물이 절박하게 원하는 것 (1문장)
- deficiency: 핵심 결핍 — 인물이 본질적으로 부족한 것 (1문장)
- conflict: 중심 갈등 — 작품 내내 부딪히는 핵심 대립 (1문장)
- changeArc: 변화 방향 — 작품 끝에서 어떻게 변화하는가 (1문장)
- values: 가치관·금지선 — 절대 넘지 않는 선 (1문장)

[한국 웹소설 정형]
- 주인공은 명확한 트리거 (회귀·각성·빙의·환생) 또는 결정적 사건을 통해 시작
- 적대자는 거대한 외부 압력 (가문·세력·시스템) 의 대리인 또는 정상 (頂上)
- 사부는 표면적 인격과 다른 과거·비밀 보유
- 캐릭터 간 관계는 후반 회수될 떡밥·복선 잠재력 보유${existing}

JSON 배열로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 2 — 아이템
// ============================================================

function buildItemsPrompt(input: ItemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[중복 금지] 기존 아이템: ${input.existingNames.join(', ')}`
    : '';

  return `당신은 한국 웹소설 아이템 생성기입니다.

장르: ${input.genre}
세계관 시놉시스: ${input.synopsis}

위 세계관에 맞는 ${input.count}개의 고유 아이템을 JSON 배열로 생성하시오.

[category — 다음 중 정확히 하나]
- "weapon" 무기 (검·창·총·법보)
- "armor" 방어구 (갑옷·로브·보호구)
- "accessory" 장신구 (반지·목걸이·인장)
- "consumable" 소모품 (단약·물약·영약)
- "material" 재료 (마정석·영초·광석)
- "quest" 퀘스트 아이템 (지도·열쇠·증표)
- "misc" 기타

[rarity — 다음 중 정확히 하나]
- "common" 일반 / "uncommon" 희귀 / "rare" 영웅 / "epic" 전설 / "legendary" 신화 / "mythic" 신물·신화급

[필수 출력 필드]
- name: 아이템 이름 (한자 한국어 가능 — 천마검·구룡주 등)
- category: 위 enum
- rarity: 위 enum
- description: 아이템의 정체와 유래 (2~3문장)
- effect: 작중 발휘 효과 (수치·서사 기능)
- obtainedFrom: 획득 경로 (지하던전·고대유적·전대 보스 처치 등)
- worldConnection: 세계관 lore 와의 연결 (1~2문장)
- flavorText: 작중 인용문·각인 문구 (1문장)

[한국 웹소설 정형]
- 전설급 이상은 반드시 역사적 인물·전대 강자와 연결
- 일반·희귀급도 작중 의미 있는 효과 보유
- 무협 도메인이면 검·도·법보·단약 우선
- 헌터물이면 마정석·아티팩트·각성구 우선${existing}

JSON 배열로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 3 — 스킬
// ============================================================

function buildSkillsPrompt(input: SkillsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[중복 금지] 기존 스킬: ${input.existingNames.join(', ')}`
    : '';

  return `당신은 한국 웹소설 스킬·무공 생성기입니다.

장르: ${input.genre}
세계관 시놉시스: ${input.synopsis}

위 세계관에 맞는 ${input.count}개의 고유 스킬·무공·기술을 JSON 배열로 생성하시오.

[type — 다음 중 정확히 하나]
- "active" 액티브 (의도적 시전)
- "passive" 패시브 (상시 발동)
- "ultimate" 궁극기·필살기 (장시간 쿨다운)

[필수 출력 필드]
- name: 스킬·무공 이름 (한자 한국어·영문 모두 가능 — 천뢰검법·다크니스 인페르노 등)
- type: 위 enum
- owner: 시전자 또는 직업·계급·문파 (예: "검사", "암천문 장로", "S랭크 헌터")
- description: 시전 방식과 시각적 묘사 (2~3문장)
- cost: 발동 자원 (마나·내공·체력·정신력 등)
- cooldown: 사용 제한 (예: "하루 1회", "내공 30년 소모", "30초 쿨다운")
- rank: 등급·경지 (예: "S급", "현경 급", "9서클", "1등급 무공")

[한국 웹소설 정형]
- 무협 장르: 권법·검법·도법·내공술·신법·암기·진법 분류
- 헌터물: 액티브·패시브·궁극기 + 등급 (S/A/B/C/D)
- 판타지: 마법·검술·체술·정령술 + 서클 시스템
- 회귀물: 주인공이 회귀 전 미래 지식으로 익힌 스킬은 별도 표기${existing}

JSON 배열로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 4 — 마법·체계
// ============================================================

function buildMagicSystemsPrompt(input: MagicSystemsPromptInput): string {
  const existing = input.existingNames.length > 0
    ? `\n\n[중복 금지] 기존 체계: ${input.existingNames.join(', ')}`
    : '';

  return `당신은 한국 웹소설 마법·무공 체계 생성기입니다.

장르: ${input.genre}
세계관 시놉시스: ${input.synopsis}

위 세계관에 논리적으로 부합하는 ${input.count}개의 마법·무공·초능력 체계를 JSON 배열로 생성하시오.

[필수 출력 필드]
- name: 체계 이름 (예: "구천신마결", "9서클 마법", "S급 각성 시스템", "내공술")
- source: 힘의 근원 (마나·내공·정기·신성력·존재 밀도·시스템 등)
- rules: 운용 원리 — 어떻게 익히고 발휘하는가 (2~3문장)
- limitations: 결정적 약점·대가·부작용 (1~2문장)
- ranks: 3~5개의 경지·등급 배열

[한국 웹소설 정형 — 장르별 ranks 예시]
- 무협: ["삼류", "이류", "일류", "절정", "초절정", "화경", "현경", "생사경"]
- 판타지: ["1서클", "2서클", "3서클", "4서클", "5서클", "6서클", "7서클", "8서클", "9서클"]
- 헌터물: ["F급", "E급", "D급", "C급", "B급", "A급", "S급", "SS급"]
- 수련물: ["연기기", "축기기", "금단기", "원영기", "화신기", "도겁기", "대승기"]
- 모던 회귀: ["일반인", "각성자", "초인", "초월자"]${existing}

JSON 배열로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 5 — 세계관 디자인
// ============================================================

function buildWorldDesignPrompt(input: WorldDesignPromptInput): string {
  const hints = input.hints;
  const hintParts: string[] = [];
  if (hints?.title) hintParts.push(`제목 힌트: "${hints.title}"`);
  if (hints?.povCharacter) hintParts.push(`주인공: "${hints.povCharacter}"`);
  if (hints?.setting) hintParts.push(`배경: "${hints.setting}"`);
  if (hints?.primaryEmotion) hintParts.push(`핵심 정서: "${hints.primaryEmotion}"`);
  if (hints?.synopsis) hintParts.push(`시놉시스: "${hints.synopsis}"`);
  if (hints?.subGenreTags?.length) hintParts.push(`하위 장르 태그: ${hints.subGenreTags.join(', ')}`);
  if (hints?.narrativeIntensity) hintParts.push(`서사 강도: ${hints.narrativeIntensity}`);
  if (hints?.totalEpisodes) hintParts.push(`전체 회차: ${hints.totalEpisodes}회`);
  if (hints?.platform) hintParts.push(`타겟 플랫폼: ${hints.platform}`);
  const hintBlock = hintParts.length > 0 ? `\n\n[작가 제공 힌트 — 반드시 반영]\n${hintParts.join('\n')}` : '';

  return `당신은 한국 웹소설 세계관 디자이너입니다.

장르: ${input.genre}

위 장르에 맞는 독창적이고 디테일한 세계관을 JSON 객체로 생성하시오.
모든 필드를 빈 칸 없이 충실히 작성. 한국 웹소설 정형을 따르되 식상하지 않게.

[기본 정보 — 필수]
- title: 작품 제목 (1문장)
- povCharacter: 주인공 이름·간략 소개 (1~2문장)
- setting: 시공간 배경 (1~2문장)
- primaryEmotion: 작품 전체 정조 (1단어 또는 짧은 구)
- synopsis: 전체 줄거리 요약 (3~4문장)

[Tier 1 — 핵심]
- corePremise: 이 세계가 현실과 다른 단 하나의 핵심 룰 (2~3문장)
- powerStructure: 누가 권력을 쥐고 어떻게 유지하는가 (2~3문장)
- currentConflict: 현재 작품을 끌고 가는 핵심 갈등 (2~3문장)

[Tier 2 — 시스템]
- worldHistory: 세계를 만든 핵심 역사적 사건 (2~3문장)
- socialSystem: 신분·문화·교육·치안 (2~3문장)
- economy: 자원·통화·교역·일상 경제 (2~3문장)
- magicTechSystem: 마법·기술 핵심 — 원리와 한계 (2~3문장)
- factionRelations: 주요 세력 갈등·동맹 (2~3문장)
- survivalEnvironment: 지리·기후·위험 요소 (2~3문장)

[Tier 3 — 디테일]
- culture: 의례·예술·관습 (1~2문장)
- religion: 신앙·신화 (1~2문장)
- education: 지식 전수 방식 (1~2문장)
- lawOrder: 법 집행·처벌·정의 (1~2문장)
- taboo: 절대 금기 (1~2문장)
- dailyLife: 일반인의 하루 (1~2문장)
- travelComm: 도시 간 이동·정보 전달 속도 (1~2문장)
- truthVsBeliefs: 사람들이 믿는 것 vs 실제 진실 (1~2문장)

[한국 웹소설 정형]
- 회귀·빙의·환생 트리거가 있다면 corePremise 에 명시
- 헌터물이면 게이트·각성·등급 시스템을 magicTechSystem 에 통합
- 무협이면 정파·사파·강호·문파를 factionRelations 에 통합
- 로판이면 신분제·왕족·귀족 가문을 powerStructure 에 통합${hintBlock}

JSON 객체로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 6 — 세계 시뮬레이션 (문명·세력 관계)
// ============================================================

function buildWorldSimPrompt(input: WorldSimPromptInput): string {
  const ctx = input.worldContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`세계 전제: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`권력 구조: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`중심 갈등: ${ctx.currentConflict}`);
  if (ctx?.factionRelations) ctxParts.push(`알려진 세력 관계: ${ctx.factionRelations}`);
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[세계관 프레임]\n${ctxParts.join('\n')}\n위 프레임을 반영하여 문명·세력을 설계하시오.`
    : '';

  return `당신은 한국 웹소설 세력·문명 시뮬레이터입니다.

장르: ${input.genre}
시놉시스: ${input.synopsis}

위 시놉시스를 바탕으로 3~4개의 문명·세력과 그들의 상호 관계를 JSON 객체로 생성하시오.

[civilizations 배열 — 각 객체 필수 필드]
- name: 문명·세력·가문·문파 이름
- era: 시대 또는 융성기 (예: "구천백 년 전", "현 시점", "정파 절정기")
- traits: 특성 키워드 배열 3~5개 (쉼표 아닌 배열)

[relations 배열 — 각 객체 필수 필드]
- from: 출발 세력 (civilizations 의 name 중 하나)
- to: 대상 세력 (civilizations 의 name 중 하나)
- type: 관계 유형 (예: "동맹", "적대", "중립", "복수극", "혈맹", "이용")

[한국 웹소설 정형]
- 무협: 정파·사파·마교·문파 구도
- 헌터물: 길드·협회·정부·기업 구도
- 판타지: 왕국·제국·교회·길드 구도
- 모던 회귀: 가문·재벌·정치권·범죄 조직 구도${ctxBlock}

JSON 객체로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 7 — 씬·연출 디자인
// ============================================================

function buildSceneDirectionPrompt(input: SceneDirectionPromptInput): string {
  const ctx = input.tierContext;
  const ctxParts: string[] = [];
  if (ctx?.corePremise) ctxParts.push(`세계 전제: ${ctx.corePremise}`);
  if (ctx?.powerStructure) ctxParts.push(`권력 구조: ${ctx.powerStructure}`);
  if (ctx?.currentConflict) ctxParts.push(`세계 갈등: ${ctx.currentConflict}`);
  if (ctx?.charProfiles?.length) {
    const charBlock = ctx.charProfiles.map((c) =>
      `  - ${c.name}: 욕망 "${c.desire || '?'}", 갈등 "${c.conflict || '?'}", 변화 방향 "${c.changeArc || '?'}", 금지선 "${c.values || '?'}"`,
    ).join('\n');
    ctxParts.push(`캐릭터 프로필:\n${charBlock}`);
  }
  const ctxBlock = ctxParts.length > 0
    ? `\n\n[서사 프레임]\n${ctxParts.join('\n')}\n\n[필수 룰]
- hook 은 캐릭터 욕망 또는 세계 갈등과 직접 연결
- cliffhanger 는 캐릭터 가치관·금지선을 위협
- tension 장치는 캐릭터 변화 방향 으로 escalate
- 대사 톤은 각 캐릭터 핵심 갈등을 반영`
    : '';

  return `당신은 한국 웹소설 회차 연출 디자이너입니다.

시놉시스: ${input.synopsis}
주요 캐릭터: ${input.characters.join(', ')}

위 작품에 대한 종합적인 회차 연출 요소를 JSON 객체로 생성하시오.
hook·고구마/사이다·cliffhanger·감정 타겟·대사 톤·복선·도파민 장치·페이싱·텐션 곡선 모두 포함.${ctxBlock}

[출력 필드]
- hooks: 후킹 장치 배열 (각: position, hookType, desc) — 회차 첫머리·중반·끝
- goguma: 고구마/사이다 장치 배열 (각: type "고구마"|"사이다", intensity, desc)
- cliffhanger: 회차 끝 결정적 hook 객체 (cliffType, desc)
- emotionTargets: 정서 목표 배열 (각: emotion, intensity 0~10)
- dialogueTones: 캐릭터별 대사 톤 배열 (각: character, tone)
- foreshadows: 복선 배치·회수 배열 (각: planted, payoff)
- dopamineDevices: 도파민 장치 배열 (각: scale "소"|"중"|"대", device, desc)
- pacings: 페이싱 비트 배열 (각: section, percent 0~100, desc)
- tensionCurve: 텐션 곡선 배열 (각: position 0~100, level 0~100, label)

각 배열 필드는 2~4개 항목 생성. 구체적이고 한국 웹소설 정형 (회차 끝 강한 hook·고구마-사이다 사이클·도파민 빈도) 반영.

JSON 객체로만 출력. 설명·주석·markdown 코드 블록 금지.`;
}

// ============================================================
// PART 8 — Export
// ============================================================

export const KO_WEBNOVEL: CodexDomainPrompts = {
  buildCharactersPrompt,
  buildItemsPrompt,
  buildSkillsPrompt,
  buildMagicSystemsPrompt,
  buildWorldDesignPrompt,
  buildWorldSimPrompt,
  buildSceneDirectionPrompt,
};
