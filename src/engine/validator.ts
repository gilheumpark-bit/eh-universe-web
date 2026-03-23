import { FixRecord, FixType, Severity, ValidationIssue } from './types';
import { AppLanguage } from '../lib/studio-types';

const MAX_TEXT_LENGTH = 50_000; // ReDoS prevention: hard limit on input size

// ============================================================
// AI Tone Validator — Ported from ANS 9.3 Pass2AITone
// ============================================================

const AI_TONE_DELETE_100 = ['그러나 ', '반면에 ', '한편으로는 ', '따라서 ', '그러므로 '];
const AI_TONE_DELETE_90 = ['하지만 ', '한편 ', '그런데 '];
const AI_TONE_REPLACE_100: Record<string, string> = {
  '것이다.': '다.',
  '것이었다.': '거였다.',
  '되었다.': '됐다.',
  '하였다.': '했다.',
  '되어진다.': '된다.',
  '이루어지다': '이뤄지다',
};

export function validateAITone(text: string): { score: number; fixes: FixRecord[] } {
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  const fixes: FixRecord[] = [];
  let detections = 0;

  for (const pattern of AI_TONE_DELETE_100) {
    let pos = text.indexOf(pattern);
    while (pos !== -1) {
      detections++;
      fixes.push({
        fixType: FixType.AI_TONE,
        original: pattern,
        fixed: '',
        position: pos,
        reason: `AI톤 삭제 대상: "${pattern.trim()}"`,
        severity: Severity.WARNING,
      });
      pos = text.indexOf(pattern, pos + 1);
    }
  }

  for (const pattern of AI_TONE_DELETE_90) {
    let pos = text.indexOf(pattern);
    while (pos !== -1) {
      detections++;
      fixes.push({
        fixType: FixType.AI_TONE,
        original: pattern,
        fixed: '',
        position: pos,
        reason: `AI톤 90% 삭제 대상: "${pattern.trim()}"`,
        severity: Severity.INFO,
      });
      pos = text.indexOf(pattern, pos + 1);
    }
  }

  for (const [old, replacement] of Object.entries(AI_TONE_REPLACE_100)) {
    let pos = text.indexOf(old);
    while (pos !== -1) {
      detections++;
      fixes.push({
        fixType: FixType.AI_TONE,
        original: old,
        fixed: replacement,
        position: pos,
        reason: `AI톤 치환: "${old}" → "${replacement}"`,
        severity: Severity.INFO,
      });
      pos = text.indexOf(old, pos + 1);
    }
  }

  // Score: lower is better (0 = no AI tone detected)
  const sentences = text.split(/[.!?。]+/).filter(s => s.trim()).length || 1;
  const score = Math.min(100, Math.round((detections / sentences) * 100));

  return { score, fixes };
}

// ============================================================
// Quality Validator — Ported from ANS 9.3 Pass3DeepFix
// ============================================================

const REPETITION_ALT: Record<string, string[]> = {
  '고개를 끄덕였다': ['눈짓으로 답했다', '침묵이 동의였다', '턱을 들었다'],
  '고개를 저었다': ['눈이 가늘어졌다', '시선을 돌렸다', '한숨이 답이었다'],
  '한숨을 내쉬었다': ['어깨가 처졌다', '숨이 길어졌다', '눈을 감았다'],
  '미소를 지었다': ['입꼬리가 올라갔다', '눈가에 주름이 졌다'],
};

const TELL_PATTERNS: Array<{ pattern: RegExp; shows: string[] }> = [
  { pattern: /느꼈다/g, shows: ['손끝이 차가워졌다', '숨이 거칠어졌다'] },
  { pattern: /생각했다/g, shows: ['눈이 가늘어졌다', '입술을 깨물었다'] },
  { pattern: /깨달았다/g, shows: ['눈이 커졌다', '숨을 삼켰다'] },
  { pattern: /슬[펐프]/g, shows: ['시야가 흐려졌다', '목소리가 떨렸다'] },
  { pattern: /화[가났]/g, shows: ['주먹이 떨렸다', '목소리가 낮아졌다'] },
  { pattern: /불안[했해]/g, shows: ['손을 만지작거렸다', '시선이 흔들렸다'] },
  { pattern: /기[뻤쁨]/g, shows: ['입꼬리가 올라갔다', '어깨가 펴졌다'] },
];

export function validateQuality(text: string): { showTellIssues: FixRecord[]; repetitionIssues: FixRecord[]; score: number } {
  // ReDoS prevention
  if (text.length > 50_000) text = text.slice(0, 50_000);
  const showTellIssues: FixRecord[] = [];
  const repetitionIssues: FixRecord[] = [];

  // Check repetitive expressions (flag when 3+ occurrences)
  for (const [phrase, alts] of Object.entries(REPETITION_ALT)) {
    const count = (text.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count >= 3) {
      repetitionIssues.push({
        fixType: FixType.REPETITION,
        original: phrase,
        fixed: alts[0],
        position: text.indexOf(phrase),
        reason: `"${phrase}" ${count}회 반복 — 대안: ${alts.join(', ')}`,
        severity: Severity.WARNING,
      });
    }
  }

  // Check Tell-not-Show patterns
  for (const { pattern, shows } of TELL_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      showTellIssues.push({
        fixType: FixType.SHOW_TELL,
        original: matches[0],
        fixed: shows[0],
        position: text.search(pattern),
        reason: `Tell → Show: "${matches[0]}" → "${shows[0]}"`,
        severity: Severity.INFO,
      });
    }
  }

  const totalIssues = showTellIssues.length + repetitionIssues.length;
  const score = Math.max(0, 100 - totalIssues * 10);

  return { showTellIssues, repetitionIssues, score };
}

// ============================================================
// Static Validator — Ported from ANS 9.3 Pass1Draft + StaticValidator
// ============================================================

const TYPO_FIXES: Record<string, string> = {
  '왠지': '웬지', '몇일': '며칠', '오랫만': '오랜만',
  '금새': '금세', '어떻해': '어떡해', '되요': '돼요',
  '됬': '됐', '할께': '할게', '있슴': '있음',
  '햇다': '했다', '갔엇다': '갔었다', '봤엇다': '봤었다',
  '안됀다': '안 된다', '않된다': '안 된다',
};

const PUNCT_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /\.{4,}/g, description: '과도한 마침표 (4개 이상)' },
  { pattern: /\?{2,}/g, description: '과도한 물음표' },
  { pattern: /!{3,}/g, description: '과도한 느낌표 (3개 이상)' },
];

// ============================================================
// EH Engine v1.4 — Causality Enforcer (인과율 금지어)
// ============================================================

const EH_BANNED_WORDS_KO = ['기적', '운명', '갑자기', '그냥', '원래'];
const EH_BANNED_WORDS_EN = ['miracle', 'destiny', 'suddenly', 'just because', 'originally'];

// Check if a given position in text is inside dialogue quotes.
// Supports 「」, "", '', "", '' quote pairs.
function isInsideDialogue(text: string, position: number): boolean {
  const quoteChars: Array<[string, string]> = [
    ['「', '」'], ['\u201C', '\u201D'], ['\u2018', '\u2019'], ['"', '"'], ["'", "'"],
  ];
  for (const [open, close] of quoteChars) {
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === open) depth++;
      else if (text[i] === close && depth > 0) depth--;
      if (i === position && depth > 0) return true;
    }
  }
  return false;
}

// Check if a word match is part of a longer compound word (surrounded by Korean chars).
function isCompoundWord(text: string, position: number, wordLength: number): boolean {
  const before = position > 0 ? text[position - 1] : '';
  const after = position + wordLength < text.length ? text[position + wordLength] : '';
  const koreanRange = /[\uAC00-\uD7AF]/;
  // If both before AND after are Korean chars, it's embedded in a compound
  return (before !== '' && koreanRange.test(before)) && (after !== '' && koreanRange.test(after));
}

export function validateCausality(text: string, ruleLevel: number): { fixes: FixRecord[]; issues: ValidationIssue[] } {
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  const fixes: FixRecord[] = [];
  const issues: ValidationIssue[] = [];

  if (ruleLevel < 2) return { fixes, issues };

  const allBanned = [...EH_BANNED_WORDS_KO, ...EH_BANNED_WORDS_EN];

  for (const word of allBanned) {
    const regex = new RegExp(word, 'gi');
    let m: RegExpExecArray | null;
    let totalCount = 0;
    let firstPosition = -1;
    while ((m = regex.exec(text)) !== null) {
      // Skip if inside dialogue quotes or part of a longer compound word
      if (isInsideDialogue(text, m.index)) continue;
      if (isCompoundWord(text, m.index, m[0].length)) continue;
      totalCount++;
      if (firstPosition === -1) firstPosition = m.index;
    }
    if (totalCount > 0) {
      fixes.push({
        fixType: FixType.CAUSALITY,
        original: word,
        fixed: '',
        position: firstPosition,
        reason: `[EH v1.4] 인과율 금지어: "${word}" — 논리적 인과관계로 대체 필요`,
        severity: ruleLevel >= 4 ? Severity.ERROR : Severity.WARNING,
      });
      if (ruleLevel >= 3) {
        issues.push({
          category: 'eh_enforcer',
          message: `인과율 위반: "${word}" ${totalCount}회 — 시스템 위반 가중치 +2`,
          severity: ruleLevel >= 4 ? Severity.ERROR : Severity.WARNING,
        });
      }
    }
  }

  return { fixes, issues };
}

// Simplified IP firewall — flag well-known franchise names
const IP_PATTERNS = [
  /해리\s?포터/g, /Harry\s?Potter/gi,
  /스타\s?워즈/g, /Star\s?Wars/gi,
  /반지의\s?제왕/g, /Lord\s?of\s?the\s?Rings/gi,
  /나루토/g, /Naruto/gi,
  /원피스/g, /One\s?Piece/gi,
];

export function validateStatic(text: string): { fixes: FixRecord[]; issues: ValidationIssue[] } {
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  const fixes: FixRecord[] = [];
  const issues: ValidationIssue[] = [];

  // Typo detection (Korean)
  for (const [wrong, correct] of Object.entries(TYPO_FIXES)) {
    if (text.includes(wrong)) {
      fixes.push({
        fixType: FixType.TYPO,
        original: wrong,
        fixed: correct,
        position: text.indexOf(wrong),
        reason: `오타: "${wrong}" → "${correct}"`,
        severity: Severity.WARNING,
      });
    }
  }

  // Punctuation issues
  for (const { pattern, description } of PUNCT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      issues.push({
        category: 'punctuation',
        message: `${description}: ${matches.length}건`,
        severity: Severity.INFO,
      });
    }
  }

  // IP/copyright scan
  for (const pattern of IP_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      issues.push({
        category: 'ip_firewall',
        message: `저작권 주의: "${matches[0]}" 감지`,
        severity: Severity.ERROR,
        suggestion: '고유 명칭으로 대체하세요',
      });
    }
  }

  return { fixes, issues };
}

// ============================================================
// Web-Novel Formatting Rules (웹소설 서식 규칙 7조)
// ============================================================

export function applyFormattingRules(text: string): { formatted: string; changes: string[] } {
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  const changes: string[] = [];
  let result = text;

  // 규칙 1: 괄호 제거 — ( ) 기호만 제거, 안의 텍스트는 유지
  const beforeParen = result;
  result = result.replace(/\(([^)]*)\)/g, '$1');
  if (result !== beforeParen) changes.push('괄호 기호 제거 (내용 유지)');

  // 규칙 2: 소제목 제거 — # 마크다운 헤딩 또는 단독 짧은 줄 (별도 처리는 프롬프트에서)
  // (실제 소제목 감지는 AI 프롬프트에서 지시)

  // 규칙 3: 대화문 줄 분리 — 문장 내부 대화문을 새 줄로 분리
  const beforeDialogue = result;
  result = result.replace(/([^"\n])(["「『])/g, '$1\n$2');
  result = result.replace(/(["」』])([^"\n,.])/g, '$1\n$2');
  if (result !== beforeDialogue) changes.push('대화문 줄 분리');

  // 규칙 4: Em dash — preserve inside dialogue quotes, remove elsewhere
  const beforeDash = result;
  result = result.replace(/(["「『"][^"」』"]*["」』"])|—/g, (match, dialogue) => {
    if (dialogue) return dialogue; // preserve em dashes inside quotes
    return ''; // remove em dashes outside quotes
  });
  if (result !== beforeDash) changes.push('Em dash(—) 삭제 (대화문 내 유지)');

  // 규칙 6: 말줄임표 통일 — ... → …
  const beforeEllipsis = result;
  result = result.replace(/\.{3,}/g, '…');
  if (result !== beforeEllipsis) changes.push('말줄임표 통일 (... → …)');

  return { formatted: result, changes };
}

export function validateFormattingIssues(text: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 괄호 잔존 검사
  const parenCount = (text.match(/[()]/g) || []).length;
  if (parenCount > 0) {
    issues.push({ category: 'formatting', message: `괄호 ${parenCount}개 잔존`, severity: Severity.WARNING, suggestion: '괄호 기호를 제거하고 내용만 유지하세요' });
  }

  // Em dash 잔존
  const dashCount = (text.match(/—/g) || []).length;
  if (dashCount > 0) {
    issues.push({ category: 'formatting', message: `Em dash(—) ${dashCount}개 잔존`, severity: Severity.WARNING, suggestion: 'Em dash를 삭제하세요' });
  }

  // ... 미통일
  const dotCount = (text.match(/\.{3,}/g) || []).length;
  if (dotCount > 0) {
    issues.push({ category: 'formatting', message: `마침표 3개 이상(${dotCount}건) → 말줄임표(…)로 통일 필요`, severity: Severity.INFO });
  }

  // 대화문 인라인 검사
  const inlineDialogue = text.match(/[^\n]["「『][^"」』]+["」』]/g);
  if (inlineDialogue && inlineDialogue.length > 0) {
    issues.push({ category: 'formatting', message: `인라인 대화문 ${inlineDialogue.length}건 — 줄 분리 필요`, severity: Severity.WARNING });
  }

  return issues;
}

// ============================================================
// Clean Taste Balance (AI톤 vs 인간노이즈)
// ============================================================

const HUMAN_NOISE_PATTERNS = ['ㅋㅋ', 'ㅎㅎ', '뭐랄까', '그러니까', '아무튼', '진짜', '대박'];

export function calculateCleanTaste(text: string): { aiTone: number; humanNoise: number; balance: number } {
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  const sentences = text.split(/[.!?。]+/).filter(s => s.trim()).length || 1;

  // AI Tone score
  let aiHits = 0;
  for (const p of ['그러나 ', '반면에 ', '한편으로는 ', '따라서 ', '것이다.', '되었다.', '있었다.']) {
    aiHits += (text.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  }
  const aiTone = Math.min(1, aiHits / (sentences * 0.5));

  // Human Noise score
  let humanHits = 0;
  for (const p of HUMAN_NOISE_PATTERNS) {
    humanHits += (text.match(new RegExp(p, 'g')) || []).length;
  }
  const exclamations = (text.match(/!{2,}/g) || []).length;
  humanHits += exclamations;
  const humanNoise = Math.min(1, humanHits / (sentences * 0.3));

  // Balance: sweet spot 0.6~0.8
  const balance = 1 - (aiTone * 0.5 + humanNoise * 0.5);

  return { aiTone, humanNoise, balance: Math.max(0, Math.min(1, balance)) };
}

// ============================================================
// Sentence Length Variation (같은 길이 3개 연속 금지)
// ============================================================

// Dialogue quote pairs used for filtering short dialogue from variation checks
const _DIALOGUE_OPEN_CHARS = /[「『""'']/;

export function validateSentenceVariation(text: string): ValidationIssue[] {
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  const issues: ValidationIssue[] = [];
  // Filter out sentences that are inside dialogue quotes OR shorter than 5 characters
  const sentences = text.split(/[.!?。]+/).filter(s => {
    const trimmed = s.trim();
    if (trimmed.length < 5) return false; // Skip very short fragments like "응", "아차"
    if (_DIALOGUE_OPEN_CHARS.test(trimmed[0])) return false; // Skip dialogue lines
    return true;
  });
  if (sentences.length < 4) return issues;

  let sameCount = 1;
  for (let i = 1; i < sentences.length; i++) {
    const prevLen = sentences[i - 1].trim().length;
    const currLen = sentences[i].trim().length;
    // "같은 길이" = ±5자 범위
    if (Math.abs(prevLen - currLen) <= 5) {
      sameCount++;
      if (sameCount >= 3) {
        issues.push({
          category: 'sentence_variation',
          message: `문장 ${i - 1}~${i + 1}: 비슷한 길이 ${sameCount}개 연속 (각 ~${currLen}자)`,
          severity: Severity.WARNING,
        });
      }
    } else {
      sameCount = 1;
    }
  }
  return issues;
}

// ============================================================
// 10-Part Structure Validation
// ============================================================

const PART_TARGETS = [
  { min: 450, max: 750 }, // Part 1-3 (도입)
  { min: 450, max: 750 },
  { min: 450, max: 750 },
  { min: 550, max: 800 }, // Part 4-6 (전개)
  { min: 550, max: 800 },
  { min: 550, max: 800 },
  { min: 500, max: 780 }, // Part 7-9 (절정)
  { min: 500, max: 780 },
  { min: 500, max: 780 },
  { min: 350, max: 700 }, // Part 10 (마무리)
];

export function validate10PartStructure(text: string): { withinRange: boolean; partSizes: number[] } {
  const totalChars = text.length;
  const partSizes = PART_TARGETS.map(t => {
    const targetMid = (t.min + t.max) / 2;
    return Math.round(totalChars * (targetMid / 6000)); // proportional
  });
  const withinRange = totalChars >= 5500 && totalChars <= 7000;
  return { withinRange, partSizes };
}

// ============================================================
// Orchestrator
// ============================================================

export function validateGeneratedContent(
  text: string,
  language: AppLanguage,
  ruleLevel: number = 1
): { fixes: FixRecord[]; issues: ValidationIssue[] } {
  if (!text) return { fixes: [], issues: [] };
  const allFixes: FixRecord[] = [];
  const allIssues: ValidationIssue[] = [];

  // Korean-specific validators
  if (language === 'KO') {
    const aiTone = validateAITone(text);
    allFixes.push(...aiTone.fixes);

    const quality = validateQuality(text);
    allFixes.push(...quality.showTellIssues);
    allFixes.push(...quality.repetitionIssues);
  }

  // Universal validators
  const staticResult = validateStatic(text);
  allFixes.push(...staticResult.fixes);
  allIssues.push(...staticResult.issues);

  // EH Engine v1.4 — Causality enforcer (Lv2+)
  if (ruleLevel >= 2) {
    const causalityResult = validateCausality(text, ruleLevel);
    allFixes.push(...causalityResult.fixes);
    allIssues.push(...causalityResult.issues);
  }

  // Web-novel formatting rules (서식 규칙 7조)
  const formattingIssues = validateFormattingIssues(text);
  allIssues.push(...formattingIssues);

  // Sentence variation check
  const variationIssues = validateSentenceVariation(text);
  allIssues.push(...variationIssues);

  // Clean taste balance
  const cleanTaste = calculateCleanTaste(text);
  if (cleanTaste.balance < 0.5) {
    allIssues.push({ category: 'clean_taste', message: `클린테이스트 ${cleanTaste.balance.toFixed(2)} (목표 0.6~0.8) — AI톤 과다`, severity: Severity.WARNING });
  }
  if (cleanTaste.balance > 0.85) {
    allIssues.push({ category: 'clean_taste', message: `클린테이스트 ${cleanTaste.balance.toFixed(2)} — 과도하게 다듬어짐`, severity: Severity.INFO });
  }

  // Trademark / IP filter
  const ipResult = validateTrademarkIP(text);
  allFixes.push(...ipResult.fixes);
  allIssues.push(...ipResult.issues);

  return { fixes: allFixes, issues: allIssues };
}

// ============================================================
// Trademark / IP Filter — 상표·특허·저작물 명칭 감지
// ============================================================

const TRADEMARK_PATTERNS: { pattern: RegExp; replacement: string; category: string }[] = [
  // Games / Entertainment
  { pattern: /포켓몬|피카츄|Pokémon|Pokemon|Pikachu/gi, replacement: "○○몬", category: "game" },
  { pattern: /마리오|Mario|루이지|Luigi/gi, replacement: "○○오", category: "game" },
  { pattern: /젤다|Zelda|링크|Link(?=가|를|의|은|는)/gi, replacement: "○○다", category: "game" },
  { pattern: /마인크래프트|Minecraft/gi, replacement: "블록월드", category: "game" },
  { pattern: /리그 오브 레전드|League of Legends|LOL|롤/gi, replacement: "○○ 리그", category: "game" },
  { pattern: /오버워치|Overwatch/gi, replacement: "○○워치", category: "game" },
  { pattern: /포트나이트|Fortnite/gi, replacement: "○○나이트", category: "game" },

  // Anime / Manga / Novel
  { pattern: /나루토|Naruto/gi, replacement: "○○토", category: "anime" },
  { pattern: /원피스|One Piece/gi, replacement: "○○피스", category: "anime" },
  { pattern: /드래곤볼|Dragon Ball/gi, replacement: "○○볼", category: "anime" },
  { pattern: /진격의 거인|Attack on Titan/gi, replacement: "○○의 거인", category: "anime" },
  { pattern: /귀멸의 칼날|Demon Slayer/gi, replacement: "○○의 칼날", category: "anime" },
  { pattern: /해리\s?포터|Harry\s?Potter/gi, replacement: "○○ 포터", category: "novel" },
  { pattern: /반지의 제왕|Lord of the Rings/gi, replacement: "○○의 제왕", category: "novel" },
  { pattern: /호그와트|Hogwarts/gi, replacement: "○○와트", category: "novel" },

  // Movies / Series
  { pattern: /스타워즈|Star\s?Wars/gi, replacement: "○○워즈", category: "movie" },
  { pattern: /아이언맨|Iron\s?Man/gi, replacement: "○○맨", category: "movie" },
  { pattern: /어벤져스|Avengers/gi, replacement: "○○져스", category: "movie" },
  { pattern: /스파이더맨|Spider-?Man/gi, replacement: "○○맨", category: "movie" },
  { pattern: /배트맨|Batman/gi, replacement: "○○맨", category: "movie" },
  { pattern: /슈퍼맨|Superman/gi, replacement: "○○맨", category: "movie" },
  { pattern: /트랜스포머|Transformers/gi, replacement: "○○포머", category: "movie" },

  // Tech brands
  { pattern: /아이폰|iPhone/gi, replacement: "스마트폰", category: "brand" },
  { pattern: /갤럭시|Galaxy(?=\s|S|노트|폰)/gi, replacement: "스마트폰", category: "brand" },
  { pattern: /구글|Google/gi, replacement: "검색엔진", category: "brand" },
  { pattern: /애플|Apple(?=\s|의|이|은|는|을)/gi, replacement: "IT기업", category: "brand" },
  { pattern: /테슬라|Tesla/gi, replacement: "전기차", category: "brand" },
  { pattern: /페이스북|Facebook|메타|Meta(?=버스)/gi, replacement: "소셜플랫폼", category: "brand" },
  { pattern: /인스타그램|Instagram/gi, replacement: "사진앱", category: "brand" },
  { pattern: /유튜브|YouTube/gi, replacement: "동영상플랫폼", category: "brand" },
  { pattern: /트위터|Twitter/gi, replacement: "마이크로블로그", category: "brand" },
  { pattern: /넷플릭스|Netflix/gi, replacement: "스트리밍", category: "brand" },
  { pattern: /카카오톡|KakaoTalk/gi, replacement: "메신저", category: "brand" },
  { pattern: /네이버|Naver/gi, replacement: "포털", category: "brand" },

  // Food / Consumer
  { pattern: /코카콜라|Coca-?Cola/gi, replacement: "콜라", category: "brand" },
  { pattern: /맥도날드|McDonald'?s/gi, replacement: "패스트푸드점", category: "brand" },
  { pattern: /스타벅스|Starbucks/gi, replacement: "커피숍", category: "brand" },
  { pattern: /나이키|Nike/gi, replacement: "운동브랜드", category: "brand" },
  { pattern: /아디다스|Adidas/gi, replacement: "운동브랜드", category: "brand" },

  // Music
  { pattern: /BTS|방탄소년단/gi, replacement: "○○그룹", category: "music" },
  { pattern: /블랙핑크|BLACKPINK/gi, replacement: "○○그룹", category: "music" },
];

export interface TrademarkMatch {
  original: string;
  replacement: string;
  category: string;
  position: number;
}

// Pre-compiled combined regex for fast first-pass detection (O(n) instead of O(48n))
const _TRADEMARK_COMBINED_RE = new RegExp(
  TRADEMARK_PATTERNS.map(t => `(?:${t.pattern.source})`).join('|'),
  'gi',
);

// Normalize text for trademark detection: remove zero-width chars, collapse whitespace
function normalizeTrademark(t: string): string {
  return t.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '').replace(/\s+/g, '');
}

// Korean "word boundary" check: the character before/after the match should be
// whitespace, punctuation, string boundary, or a non-Korean character.
// This prevents "마리오네트" from matching the "마리오" pattern.
const _KOREAN_CHAR_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;

function isKoreanWordBoundary(text: string, matchStart: number, matchEnd: number): boolean {
  // Check character BEFORE the match
  if (matchStart > 0) {
    const before = text[matchStart - 1];
    // If the preceding char is Korean, not a boundary
    if (_KOREAN_CHAR_RE.test(before)) return false;
  }
  // Check character AFTER the match
  if (matchEnd < text.length) {
    const after = text[matchEnd];
    // If the following char is Korean (and not a common particle/postposition start),
    // this is likely a substring of a longer word → false positive
    if (_KOREAN_CHAR_RE.test(after)) return false;
  }
  return true;
}

export function detectTrademarks(text: string): TrademarkMatch[] {
  if (!text) return [];
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);
  // 2-Track: check both original and normalized (spaces/zero-width removed)
  const normalized = normalizeTrademark(text);
  _TRADEMARK_COMBINED_RE.lastIndex = 0;
  if (!_TRADEMARK_COMBINED_RE.test(text) && !_TRADEMARK_COMBINED_RE.test(normalized)) return [];

  const matches: TrademarkMatch[] = [];
  // Scan both original and normalized text for trademark matches
  for (const target of [text, normalized]) {
    for (const { pattern, replacement, category } of TRADEMARK_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(target)) !== null) {
        // Avoid duplicates from normalized scan
        if (target === normalized && matches.some(x => x.original === m![0])) continue;
        // Korean word boundary check: skip if the match is a substring of a longer Korean word
        if (!isKoreanWordBoundary(target, m.index, m.index + m[0].length)) continue;
        matches.push({ original: m[0], replacement, category, position: m.index });
      }
    }
  }
  return matches;
}

export function filterTrademarks(text: string): { filtered: string; matches: TrademarkMatch[] } {
  const matches = detectTrademarks(text);
  let filtered = text;
  for (const { pattern, replacement } of TRADEMARK_PATTERNS) {
    filtered = filtered.replace(pattern, replacement);
  }
  return { filtered, matches };
}

function validateTrademarkIP(text: string): { fixes: FixRecord[]; issues: ValidationIssue[] } {
  const fixes: FixRecord[] = [];
  const issues: ValidationIssue[] = [];
  const matches = detectTrademarks(text);

  if (matches.length > 0) {
    const grouped = new Map<string, string[]>();
    for (const m of matches) {
      const list = grouped.get(m.category) || [];
      list.push(m.original);
      grouped.set(m.category, list);
    }

    for (const [category, names] of grouped) {
      const unique = [...new Set(names)];
      issues.push({
        category: 'trademark_ip',
        message: `[${category}] 상표/IP 감지: ${unique.join(', ')} — 자동 치환됨`,
        severity: Severity.WARNING,
      });
    }

    for (const m of matches) {
      fixes.push({
        fixType: FixType.GRAMMAR,
        original: m.original,
        fixed: m.replacement,
        position: m.position,
        reason: `상표/IP 보호: ${m.original} → ${m.replacement}`,
        severity: Severity.WARNING,
      });
    }
  }

  return { fixes, issues };
}

