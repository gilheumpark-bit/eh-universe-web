import { FixRecord, FixType, Severity, ValidationIssue } from './types';
import { AppLanguage } from '../lib/studio-types';

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

// Simplified IP firewall — flag well-known franchise names
const IP_PATTERNS = [
  /해리\s?포터/g, /Harry\s?Potter/gi,
  /스타\s?워즈/g, /Star\s?Wars/gi,
  /반지의\s?제왕/g, /Lord\s?of\s?the\s?Rings/gi,
  /나루토/g, /Naruto/gi,
  /원피스/g, /One\s?Piece/gi,
];

export function validateStatic(text: string): { fixes: FixRecord[]; issues: ValidationIssue[] } {
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
// Orchestrator
// ============================================================

export function validateGeneratedContent(
  text: string,
  language: AppLanguage
): { fixes: FixRecord[]; issues: ValidationIssue[] } {
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

  return { fixes: allFixes, issues: allIssues };
}

