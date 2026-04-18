// ============================================================
// PART 1 — Korean Contamination Dictionary (EN → KO)
// ============================================================
// Qwen 3.5-9B FP8 가 한국어 본문 생성 중 빈번히 혼입하는 영어 단어의 한국어 치환 사전.
//
// 수집 원칙:
//   1) 다의어는 소설 본문에서 가장 흔한 번역 1개만 채택 (의역 여지 큰 단어는 제외).
//   2) 의미 충돌(예: "present" = 선물/현재) 있는 단어는 채택 제외 — unresolved 로 남겨 검수.
//   3) 한국어 문맥에서 자연스러운 형태(과거형/현재형/부사형) 유지.
//
// key 는 전부 소문자. lookup 시 word.toLowerCase() 로 조회.
// ============================================================

export type ContaminationDict = Record<string, string>;

export const KOREAN_CONTAMINATION_DICT: ContaminationDict = {
  // --- Adverbs (빈도 1순위) ---
  suddenly: '갑자기',
  quickly: '빠르게',
  slowly: '천천히',
  finally: '마침내',
  immediately: '즉시',
  eventually: '결국',
  carefully: '조심스럽게',
  silently: '조용히',
  desperately: '필사적으로',
  gently: '부드럽게',
  barely: '간신히',
  hardly: '거의',
  almost: '거의',
  nearly: '거의',
  really: '정말로',
  truly: '진정으로',
  actually: '사실',
  certainly: '분명히',
  probably: '아마도',
  perhaps: '아마',
  maybe: '어쩌면',
  instantly: '순식간에',
  abruptly: '돌연히',
  calmly: '차분하게',
  quietly: '조용히',
  softly: '부드럽게',
  loudly: '큰 소리로',
  swiftly: '재빨리',
  cautiously: '신중하게',
  firmly: '단호하게',
  coldly: '차갑게',
  warmly: '따뜻하게',
  slightly: '약간',
  deeply: '깊이',

  // --- Connectors (접속어) ---
  however: '하지만',
  therefore: '그러므로',
  meanwhile: '한편',
  although: '비록',
  moreover: '게다가',
  nevertheless: '그럼에도',
  furthermore: '더욱이',
  otherwise: '그렇지 않으면',
  besides: '게다가',
  anyway: '어쨌든',
  instead: '대신',

  // --- Common verbs (past tense) ---
  realized: '깨달았다',
  noticed: '알아챘다',
  whispered: '속삭였다',
  muttered: '중얼거렸다',
  hesitated: '망설였다',
  sighed: '한숨을 쉬었다',
  smiled: '미소 지었다',
  frowned: '눈살을 찌푸렸다',
  nodded: '고개를 끄덕였다',
  shrugged: '어깨를 으쓱했다',
  laughed: '웃었다',
  cried: '울었다',
  shouted: '소리쳤다',
  screamed: '비명을 질렀다',
  gasped: '숨을 헐떡였다',
  trembled: '떨었다',
  shivered: '몸을 떨었다',
  stared: '응시했다',
  glanced: '흘끗 보았다',
  turned: '돌아섰다',
  paused: '잠시 멈췄다',
  stopped: '멈췄다',
  stepped: '발을 내디뎠다',
  approached: '다가갔다',
  retreated: '물러섰다',
  grabbed: '움켜쥐었다',
  pushed: '밀쳤다',
  pulled: '끌어당겼다',
  breathed: '숨을 내쉬었다',
  wondered: '궁금해했다',
  thought: '생각했다',
  remembered: '기억했다',
  forgot: '잊었다',
  knew: '알았다',
  felt: '느꼈다',
  saw: '보았다',
  heard: '들었다',
  watched: '지켜보았다',

  // --- Common verbs (present/base) ---
  realize: '깨닫다',
  notice: '알아채다',
  whisper: '속삭이다',
  mutter: '중얼거리다',
  hesitate: '망설이다',
  sigh: '한숨을 쉬다',
  smile: '미소 짓다',
  frown: '눈살을 찌푸리다',
  nod: '고개를 끄덕이다',
  shrug: '어깨를 으쓱하다',
  laugh: '웃다',
  shout: '소리치다',
  scream: '비명을 지르다',
  gasp: '숨을 헐떡이다',
  tremble: '떨다',
  shiver: '몸을 떨다',
  stare: '응시하다',
  glance: '흘끗 보다',
  approach: '다가가다',
  retreat: '물러서다',
  grab: '움켜쥐다',
  push: '밀치다',
  pull: '끌어당기다',
  breathe: '숨을 쉬다',
  wonder: '궁금해하다',
  think: '생각하다',
  remember: '기억하다',
  forget: '잊다',
  know: '알다',
  feel: '느끼다',
  watch: '지켜보다',

  // --- Common nouns ---
  shadow: '그림자',
  darkness: '어둠',
  silence: '침묵',
  moment: '순간',
  memory: '기억',
  light: '빛',
  sound: '소리',
  voice: '목소리',
  breath: '숨',
  heart: '심장',
  mind: '마음',
  soul: '영혼',
  spirit: '영혼',
  dream: '꿈',
  nightmare: '악몽',
  blood: '피',
  tear: '눈물',
  sweat: '땀',
  night: '밤',
  dawn: '새벽',
  dusk: '황혼',
  sky: '하늘',
  star: '별',
  moon: '달',
  sun: '태양',
  wind: '바람',
  rain: '비',
  snow: '눈',
  fire: '불',
  water: '물',
  earth: '땅',
  stone: '돌',
  tree: '나무',
  forest: '숲',
  mountain: '산',
  river: '강',
  sea: '바다',
  road: '길',
  door: '문',
  window: '창',
  room: '방',
  house: '집',
  city: '도시',
  world: '세계',
  time: '시간',
  death: '죽음',
  life: '생명',
  pain: '고통',
  wound: '상처',

  // --- Emotions ---
  fear: '두려움',
  anger: '분노',
  joy: '기쁨',
  sadness: '슬픔',
  hope: '희망',
  despair: '절망',
  love: '사랑',
  hatred: '증오',
  loneliness: '외로움',
  guilt: '죄책감',
  shame: '수치심',
  pride: '자부심',
  sorrow: '슬픔',
  rage: '격노',
  terror: '공포',
  horror: '공포',
  relief: '안도',
  surprise: '놀라움',
  confusion: '혼란',
  curiosity: '호기심',

  // --- Adjectives ---
  dark: '어두운',
  bright: '밝은',
  cold: '차가운',
  warm: '따뜻한',
  hot: '뜨거운',
  quiet: '조용한',
  loud: '시끄러운',
  soft: '부드러운',
  hard: '단단한',
  heavy: '무거운',
  deep: '깊은',
  shallow: '얕은',
  young: '젊은',
  old: '늙은',
  strong: '강한',
  weak: '약한',
  beautiful: '아름다운',
  ugly: '추한',
  dangerous: '위험한',
  safe: '안전한',
  strange: '이상한',
  familiar: '익숙한',
  calm: '차분한',
  nervous: '긴장한',
  afraid: '두려운',
  angry: '화난',
  sad: '슬픈',
  happy: '행복한',
  tired: '피곤한',
  alone: '혼자',
  silent: '조용한',
};

// ============================================================
// PART 2 — Japanese / Chinese Dictionaries (TODO scaffolding)
// ============================================================
// NOTE: 일본어/중국어 오염 패턴은 아직 실측 샘플 부족.
// 실제 Qwen 출력에서 확인된 패턴만 추가 예정. 빈 객체로 시작.

export const JAPANESE_CONTAMINATION_DICT: ContaminationDict = {
  // TODO: 일본어 본문 생성 중 혼입 영어 패턴 수집 후 추가
};

export const CHINESE_CONTAMINATION_DICT: ContaminationDict = {
  // TODO: 중국어 본문 생성 중 혼입 영어 패턴 수집 후 추가
};

// ============================================================
// PART 3 — Whitelist (보편 차용어 + 고유명사)
// ============================================================
// 한국어 본문에 영어로 남겨도 자연스러운 단어. O(1) 조회를 위해 Set.
// 대소문자 구분 — 고유명사/약어는 원형 유지.

export const COMMON_WHITELIST: ReadonlySet<string> = new Set<string>([
  // 기술 약어
  'AI', 'API', 'HTML', 'CSS', 'URL', 'IP', 'CPU', 'GPU', 'RAM',
  'PC', 'OS', 'USB', 'WiFi', 'Bluetooth',
  'HTTP', 'HTTPS', 'TCP', 'UDP', 'DNS', 'VPN',
  'SSD', 'HDD', 'LED', 'OLED',
  'SMS', 'MMS', 'GPS', 'NFC',
  'UI', 'UX', 'DB', 'SQL',
  'PDF', 'JPG', 'PNG', 'GIF', 'MP3', 'MP4',

  // 짧은 긍정/부정
  'OK', 'NG', 'Yes', 'No', 'Hi', 'Ok',

  // 브랜드/기업
  'Apple', 'Google', 'Microsoft', 'Amazon', 'Meta',
  'Samsung', 'LG', 'Sony', 'Intel', 'AMD', 'Nvidia', 'NVIDIA',
  'YouTube', 'Twitter', 'Facebook', 'Instagram',
  'iOS', 'Android', 'Windows', 'macOS', 'Linux',
]);

// IDENTITY_SEAL: PART-1~3 | role=contamination-dictionary | lang=KO(active), JP/CN(TODO) | whitelist=O(1)
