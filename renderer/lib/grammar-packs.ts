// ============================================================
// PART 1 — 국가별 서사 문법 팩 (Narrative Grammar Packs)
// ============================================================

export type GrammarRegion = 'KR' | 'US' | 'JP' | 'CN';

export interface BeatEntry {
  name: string;
  position: number; // 0-100% through the story
  desc: string;
}

export interface RewardPattern {
  name: string;
  interval: string;
  desc: string;
}

export interface RhythmRule {
  name: string;
  desc: string;
}

export interface GrammarPack {
  region: GrammarRegion;
  flag: string;
  label: { ko: string; en: string };
  subtitle: { ko: string; en: string };
  // 플롯 비트시트
  beatSheet: BeatEntry[];
  // 긴장/이완 리듬 규칙
  rhythmRules: RhythmRule[];
  // 독자 보상 패턴
  rewardPatterns: RewardPattern[];
  // 연재 호흡
  episodeLength: { min: number; max: number; unit: string };
  // 필수 문법 요소
  mustHave: string[];
  // 금기
  taboo: string[];
}

// ============================================================
// PART 2 — 한국 웹소설 문법
// ============================================================

const KR_PACK: GrammarPack = {
  region: 'KR',
  flag: '🇰🇷',
  label: { ko: '한국 웹소설', en: 'Korean Web Novel' },
  subtitle: { ko: '문피아·노벨피아·카카오페이지 문법', en: 'Munpia / Novelpia / KakaoPage grammar' },
  beatSheet: [
    { name: '훅 오프닝', position: 0, desc: '첫 문장에서 긴장 or 의문 생성' },
    { name: '상황 제시', position: 5, desc: '주인공의 처지와 결핍 노출' },
    { name: '사건 발생', position: 15, desc: '일상이 깨지는 촉발 사건' },
    { name: '고구마 투입', position: 30, desc: '답답함·억울함·위기 누적' },
    { name: '반전/사이다', position: 50, desc: '고구마 해소 — 통쾌한 역전' },
    { name: '새로운 위협', position: 60, desc: '더 큰 갈등 등장 (스케일업)' },
    { name: '결전 준비', position: 80, desc: '최종 대결 직전의 각성/각오' },
    { name: '클라이맥스', position: 90, desc: '모든 복선 회수, 최고 긴장' },
    { name: '클리프행어', position: 98, desc: '다음 화 유도하는 끊기' },
  ],
  rhythmRules: [
    { name: '고구마→사이다 사이클', desc: '3~5화 고구마 누적 후 1화 사이다 폭발. 사이다 없이 고구마만 5화 이상 금지' },
    { name: '먹방 후 전투', desc: '힐링 씬 직후 긴장 씬으로 전환. 독자 이완→긴장 루프' },
    { name: '화 끝 클리프 필수', desc: '매 화 마지막 문장은 다음 화를 열게 만드는 의문/위기' },
    { name: '3화 안에 첫 사이다', desc: '초반 3화 내 주인공의 첫 성취 or 역전 필수' },
  ],
  rewardPatterns: [
    { name: '힘숨찐', interval: '5~10화', desc: '강한데 숨기는 주인공 → 정체 드러남 → 주변 경악' },
    { name: '레벨업/각성', interval: '10~15화', desc: '새로운 능력·스킬·장비 획득으로 성장 확인' },
    { name: '사이다 역전', interval: '3~5화', desc: '무시·멸시한 상대에게 역관광' },
    { name: '비밀 폭로', interval: '20~30화', desc: '숨겨진 혈통·과거·진실 공개' },
  ],
  episodeLength: { min: 4000, max: 6000, unit: '자' },
  mustHave: ['첫 문장 훅', '고구마/사이다 리듬', '매 화 클리프행어', '캐릭터 성장 확인'],
  taboo: ['5화 연속 고구마만', '설명만으로 3문단', '사이다 없는 권말', '주인공 수동적 10화'],
};

// ============================================================
// PART 3 — 미국/영미 문법 (Save the Cat Beat Sheet)
// ============================================================

const US_PACK: GrammarPack = {
  region: 'US',
  flag: '🇺🇸',
  label: { ko: '미국 소설', en: 'American Novel' },
  subtitle: { ko: 'Save the Cat / 3막 구조 / Hero\'s Journey', en: 'Save the Cat / Three-Act / Hero\'s Journey' },
  beatSheet: [
    { name: 'Opening Image', position: 0, desc: 'Snapshot of the protagonist\'s world before change' },
    { name: 'Theme Stated', position: 5, desc: 'Someone hints at the story\'s deeper meaning' },
    { name: 'Set-Up', position: 10, desc: 'Establish the status quo, stakes, and flaws' },
    { name: 'Catalyst', position: 12, desc: 'The inciting incident that disrupts everything' },
    { name: 'Debate', position: 15, desc: 'Protagonist hesitates — should they act?' },
    { name: 'Break into Two', position: 25, desc: 'Decision made. No turning back. New world entered' },
    { name: 'B Story', position: 30, desc: 'Secondary plot (often romance/friendship) begins' },
    { name: 'Fun & Games', position: 35, desc: 'The promise of the premise delivered' },
    { name: 'Midpoint', position: 50, desc: 'False victory or false defeat. Stakes raised' },
    { name: 'Bad Guys Close In', position: 60, desc: 'External pressure + internal doubts escalate' },
    { name: 'All Is Lost', position: 75, desc: 'Lowest point. Whiff of death (literal or symbolic)' },
    { name: 'Dark Night of the Soul', position: 80, desc: 'Protagonist faces their deepest flaw' },
    { name: 'Break into Three', position: 85, desc: 'Epiphany — combining A and B stories' },
    { name: 'Finale', position: 90, desc: 'Climax. New world order established' },
    { name: 'Final Image', position: 100, desc: 'Mirror of opening — showing transformation' },
  ],
  rhythmRules: [
    { name: 'Tension Escalation', desc: 'Each act raises stakes higher than the last. Never plateau' },
    { name: 'Scene/Sequel Pattern', desc: 'Action scene → Reaction scene → Decision → New action' },
    { name: 'Chekhov\'s Gun', desc: 'Everything introduced must pay off. No loose threads' },
    { name: 'Show Don\'t Tell', desc: 'Emotions through action/sensory detail, never summary' },
  ],
  rewardPatterns: [
    { name: 'Character Growth', interval: 'Per act', desc: 'Protagonist overcomes one flaw per act boundary' },
    { name: 'Plot Twist', interval: 'Midpoint + Act 3', desc: 'Major revelations at midpoint and before climax' },
    { name: 'Earned Victory', interval: 'Finale', desc: 'Victory must cost something. No free wins' },
    { name: 'Thematic Echo', interval: 'Opening + Closing', desc: 'Final image mirrors opening, showing change' },
  ],
  episodeLength: { min: 2000, max: 5000, unit: 'words' },
  mustHave: ['Inciting incident by 12%', 'Midpoint reversal', 'All Is Lost moment', 'Thematic resolution'],
  taboo: ['Deus ex machina', 'Passive protagonist', 'Unearned victory', 'Theme stated literally'],
};

// ============================================================
// PART 4 — 일본 라이트노벨 문법
// ============================================================

const JP_PACK: GrammarPack = {
  region: 'JP',
  flag: '🇯🇵',
  label: { ko: '일본 라노벨', en: 'Japanese Light Novel' },
  subtitle: { ko: '起承転結 / 萌え→燃え / なろう系', en: 'Kishotenketsu / Moe→Moé / Narou-kei' },
  beatSheet: [
    { name: '起 (Ki) — 도입', position: 0, desc: '세계관·캐릭터 소개. 첫 장면은 전투 or 이세계 전이' },
    { name: '日常パート', position: 10, desc: '일상 파트 — 캐릭터 매력·관계 확립 (萌え)' },
    { name: '承 (Shō) — 전개', position: 25, desc: '사건 발생, 동료 합류, 퀘스트 제시' },
    { name: 'レベルアップ', position: 35, desc: '능력 습득/성장. 스킬 트리 확장' },
    { name: '転 (Ten) — 전환', position: 50, desc: '반전·위기. 동료 배신 or 강적 등장 (燃え 전환)' },
    { name: '覚醒シーン', position: 65, desc: '각성 씬 — 숨겨진 힘 발현, 불타오르는 전개' },
    { name: '最終決戦', position: 80, desc: '최종 결전 — 모든 능력 총동원' },
    { name: '結 (Ketsu) — 결말', position: 90, desc: '후일담, 일상 복귀, 다음 편 복선' },
    { name: '次巻予告', position: 98, desc: '다음 권 예고 — 새로운 적·새로운 세계' },
  ],
  rhythmRules: [
    { name: '萌え→燃え 전환', desc: '일상 파트(귀여움)에서 전투 파트(열혈)로의 극적 전환. 둘의 낙차가 클수록 효과적' },
    { name: '스킬 습득 사이클', desc: '3~5화마다 새 스킬/능력 습득. 독자에게 게임적 보상감' },
    { name: '하렘/동료 합류 리듬', desc: '10~15화마다 새 캐릭터 합류. 관계 다이나믹 변화' },
    { name: '권말 클리프', desc: '각 권 마지막에 다음 권으로 이어지는 강력한 복선/위기' },
  ],
  rewardPatterns: [
    { name: 'スキル獲得', interval: '3~5話', desc: '새 스킬·아이템 획득으로 성장 확인' },
    { name: '仲間加入', interval: '10~15話', desc: '새 동료·히로인 합류' },
    { name: '覚醒/変身', interval: '권당 1회', desc: '숨겨진 힘 각성, 변신, 한계 돌파' },
    { name: '打ち上げ (뒷풀이)', interval: '전투 후', desc: '긴장 후 일상 이완 — 관계 심화' },
  ],
  episodeLength: { min: 8000, max: 12000, unit: '文字' },
  mustHave: ['첫 장면 임팩트', '萌え↔燃え 전환', '스킬/레벨 성장', '권말 클리프'],
  taboo: ['일상만 5화 연속', '전투만 5화 연속', '히로인 없는 10화', '성장 없는 20화'],
};

// ============================================================
// PART 5 — 중국 웹소설 문법
// ============================================================

const CN_PACK: GrammarPack = {
  region: 'CN',
  flag: '🇨🇳',
  label: { ko: '중국 웹소설', en: 'Chinese Web Novel' },
  subtitle: { ko: '起点中文网 / 爽文 / 金手指 문법', en: 'Qidian / Shuangwen / Golden Finger grammar' },
  beatSheet: [
    { name: '开头 — 오프닝', position: 0, desc: '주인공의 비참한 상황 or 회귀/빙의/전이' },
    { name: '金手指 획득', position: 5, desc: '치트키(금수저) 획득 — 시스템·공간·혈통' },
    { name: '第一次打脸', position: 10, desc: '첫 번째 따리엔 — 무시한 상대 역관광' },
    { name: '小爽点', position: 20, desc: '소(小) 쾌감 — 작은 성취·인정·보상' },
    { name: '势力建立', position: 30, desc: '세력 구축 시작 — 부하·영지·조직' },
    { name: '中爽点', position: 45, desc: '중(中) 쾌감 — 강적 격파·비밀 폭로' },
    { name: '大危机', position: 55, desc: '대위기 — 더 큰 세력의 압박' },
    { name: '突破/升级', position: 65, desc: '돌파/승급 — 경지 상승, 새 영역 진입' },
    { name: '大爽点', position: 80, desc: '대(大) 쾌감 — 최강 일격, 천하진동' },
    { name: '新地图', position: 95, desc: '새 맵 — 더 넓은 세계 진입, 스케일업' },
  ],
  rhythmRules: [
    { name: '爽点 간격 규칙', desc: '3장마다 小爽, 10장마다 中爽, 30장마다 大爽. 爽감 없는 5장 연속 금지' },
    { name: '打脸(따리엔) 사이클', desc: '무시→도발→역전→경악 패턴. 5~10장마다 반복' },
    { name: '升级(승급) 리듬', desc: '경지/레벨 체계 — 15~20장마다 한 단계 돌파' },
    { name: '地图(맵) 확장', desc: '50~100장마다 새로운 더 큰 무대로 이동' },
  ],
  rewardPatterns: [
    { name: '打脸 (따리엔)', interval: '5~10章', desc: '무시한 놈이 역관광 당하는 통쾌함' },
    { name: '升级突破', interval: '15~20章', desc: '경지 돌파, 새 능력 개방' },
    { name: '装逼 (폼잡기)', interval: '매 전투', desc: '실력 숨기다가 한 방에 보여주기' },
    { name: '收获 (수확)', interval: '10~15章', desc: '보물·비급·신물 획득' },
  ],
  episodeLength: { min: 3000, max: 5000, unit: '字' },
  mustHave: ['金手指 초반 3장 내', '打脸 10장 내', '爽点 간격 준수', '升级 체계'],
  taboo: ['5장 爽감 없음', '주인공 패배 후 보상 없음', '설명충 3장', '金手指 너프 없는 치트'],
};

// ============================================================
// PART 6 — Export
// ============================================================

export const GRAMMAR_PACKS: Record<GrammarRegion, GrammarPack> = {
  KR: KR_PACK,
  US: US_PACK,
  JP: JP_PACK,
  CN: CN_PACK,
};

export const GRAMMAR_REGIONS: GrammarRegion[] = ['KR', 'US', 'JP', 'CN'];
