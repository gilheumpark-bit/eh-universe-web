// ============================================================
// PART 1 — 타입
// ============================================================

import type { AppLanguage } from '@/lib/studio-types';

export type VoiceTone = 'formal' | 'casual' | 'rough' | 'polite' | 'child' | 'elderly';

export interface VoiceRule {
  character: string;
  aliases?: string[];
  tone: VoiceTone;
  mustUse: RegExp[];      // 해당 언어에서 반드시 등장해야 하는 패턴 (하나 이상 매치)
  mustNotUse: RegExp[];   // 해당 언어에서 절대 나오면 안 되는 패턴
  toneRange?: [number, number];  // 0=매우 거친, 1=매우 정중. 옵션.
}

export interface VoiceViolation {
  speaker: string;
  line: string;
  violation: 'forbidden' | 'missing' | 'tone';
  matched?: string;       // forbidden인 경우 매치된 패턴
  detail: string;
  severity: 'warn' | 'error';
}

export interface VoiceDialogueLine {
  speaker: string;
  text: string;
  index?: number;
}

// ============================================================
// PART 2 — 언어별 기본 패턴 사전
// ============================================================

/**
 * 각 언어에서 톤별 특성 패턴.
 * 모듈 상수로 사전 컴파일되어 호출마다 재생성되지 않음.
 * 실제로는 더 정교한 NLP 필요하나 정규식 기반 근사.
 */
const DEFAULT_TONE_PATTERNS: Record<AppLanguage, Record<VoiceTone, { mustUse: RegExp[]; mustNotUse: RegExp[] }>> = {
  KO: {
    formal:  { mustUse: [/습니다[.!?]|습니까[.?]|시죠|세요|입니다/], mustNotUse: [/[ㄱ-ㅎ가-힣]+다[.!?]\s*$|[ㄱ-ㅎ가-힣]+해$|하네|했어$/] },
    casual:  { mustUse: [/아$|어$|야$|했어|했다|해$|이야|거야/], mustNotUse: [/습니다|습니까|세요\b|입니다/] },
    rough:   { mustUse: [/야!|씨|놈|년|젠장|빌어먹을|꺼져/], mustNotUse: [/습니다|감사합니다|송구/] },
    polite:  { mustUse: [/세요|주세요|부탁|감사|죄송/], mustNotUse: [/꺼져|닥쳐|씨발/] },
    child:   { mustUse: [/치|찌|냥|요오|에욥|용\b/], mustNotUse: [/본인|폐하|...|명하다/] },
    elderly: { mustUse: [/이보게|자네|허허|그렇구먼|하였네/], mustNotUse: [/쩝|ㅋㅋ|와우/] },
  },
  EN: {
    formal:  { mustUse: [/\b(please|would you|could you|may I|sir|madam)\b/i], mustNotUse: [/\b(yeah|yo|dude|wanna|gonna)\b/i] },
    casual:  { mustUse: [/\b(hey|yeah|okay|I'm|let's|gonna|wanna)\b/i], mustNotUse: [/\b(thou|dost|hast|may I be)\b/i] },
    rough:   { mustUse: [/\b(damn|hell|shit|fuck|bastard|asshole)\b/i], mustNotUse: [/\b(please|thank you|sir|madam)\b/i] },
    polite:  { mustUse: [/\b(please|thank you|excuse me|pardon)\b/i], mustNotUse: [/\b(damn|shut up|fuck)\b/i] },
    child:   { mustUse: [/\b(mommy|daddy|pweez|widdle)\b|!!+/i], mustNotUse: [/\b(henceforth|thus|moreover)\b/i] },
    elderly: { mustUse: [/\b(my dear|back in my day|youngster|aye)\b/i], mustNotUse: [/\b(lol|yolo|lit|cringe)\b/i] },
  },
  JP: {
    formal:  { mustUse: [/です[。！？]|ます[。！？]|でしょう|ございま/], mustNotUse: [/だぜ|だよ|じゃねえ|うっせ/] },
    casual:  { mustUse: [/だ[。！？]|だよ|だね|じゃん|よ[。！]/], mustNotUse: [/でございます|いたします|恐縮/] },
    rough:   { mustUse: [/てめえ|くそ|ちくしょう|だぜ|ふざけんな/], mustNotUse: [/恐れ入り|恐縮|申し訳/] },
    polite:  { mustUse: [/ございます|いたします|恐縮|申し訳|お願い/], mustNotUse: [/てめえ|うっせえ|くそ/] },
    child:   { mustUse: [/だよ〜|の[。!]|だもん|なの\b/], mustNotUse: [/貴殿|小職|弊社/] },
    elderly: { mustUse: [/じゃ[。!]|じゃろう|わしは|ほっほ/], mustNotUse: [/マジ|ヤバ|ウケる/] },
  },
  CN: {
    formal:  { mustUse: [/您|请|敬|尊|阁下/], mustNotUse: [/老子|丫|傻逼|去死/] },
    casual:  { mustUse: [/咱|我说|哎|啊|呗/], mustNotUse: [/阁下|在下|小的/] },
    rough:   { mustUse: [/操|他妈|去死|傻逼|滚/], mustNotUse: [/您好|请问|劳烦/] },
    polite:  { mustUse: [/您|请|谢谢|劳烦|抱歉/], mustNotUse: [/滚|死|操/] },
    child:   { mustUse: [/呀|啦|呢|嘛|嘻嘻/], mustNotUse: [/本人|在下|鄙人/] },
    elderly: { mustUse: [/老夫|咳咳|想当年|后生/], mustNotUse: [/哇塞|牛逼|绝了/] },
  },
};

// ============================================================
// PART 3 — 규칙 빌더
// ============================================================

/**
 * 캐릭터 프로필에서 VoiceRule 생성.
 * register.tone 기반 기본 패턴 적용.
 * @returns null — 이름 없거나 tone 미지정 시
 */
export function buildVoiceRule(
  character: { name: string; aliases?: string[]; register?: { tone?: VoiceTone } },
  targetLang: AppLanguage,
): VoiceRule | null {
  if (!character?.name || !character.register?.tone) return null;
  const tone = character.register.tone;
  const langPatterns = DEFAULT_TONE_PATTERNS[targetLang];
  if (!langPatterns) return null;
  const defaults = langPatterns[tone];
  if (!defaults) return null;
  return {
    character: character.name,
    aliases: character.aliases ?? [],
    tone,
    mustUse: defaults.mustUse,
    mustNotUse: defaults.mustNotUse,
  };
}

export function buildVoiceRulesFromProject(
  characters: Array<{ name: string; aliases?: string[]; register?: { tone?: VoiceTone } }>,
  targetLang: AppLanguage,
): VoiceRule[] {
  if (!Array.isArray(characters) || characters.length === 0) return [];
  return characters
    .map(c => buildVoiceRule(c, targetLang))
    .filter((r): r is VoiceRule => r !== null);
}

// ============================================================
// PART 4 — 위반 감지
// ============================================================

/** 짧은 감탄사/탄성 등은 missing 규칙에서 제외 (false positive 방지). */
const MIN_LINE_LENGTH_FOR_MISSING = 10;

/**
 * 대사 라인 배열을 규칙으로 검사.
 * @param lines 번역된 대사들 ({ speaker, text })
 * @param rules 캐릭터별 규칙
 */
export function detectVoiceViolations(
  lines: VoiceDialogueLine[],
  rules: VoiceRule[],
): VoiceViolation[] {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  if (!Array.isArray(rules) || rules.length === 0) return [];

  const violations: VoiceViolation[] = [];
  const ruleMap = new Map<string, VoiceRule>();
  for (const r of rules) {
    if (!r?.character) continue;
    ruleMap.set(r.character, r);
    for (const alias of r.aliases ?? []) {
      if (alias) ruleMap.set(alias, r);
    }
  }

  for (const line of lines) {
    if (!line?.speaker || !line.text) continue;
    const rule = ruleMap.get(line.speaker);
    if (!rule) continue;
    const text = line.text.trim();
    if (!text) continue;

    // forbidden 검사 (must NOT use)
    for (const pattern of rule.mustNotUse) {
      const match = text.match(pattern);
      if (match) {
        violations.push({
          speaker: line.speaker,
          line: text,
          violation: 'forbidden',
          matched: match[0],
          detail: `${rule.tone} 톤 캐릭터에 금지 표현 "${match[0]}" 발견`,
          severity: 'error',
        });
      }
    }

    // missing 검사 (must use 하나 이상 매치)
    // 10자 미만 짧은 감탄사 등은 false positive 방지를 위해 제외
    if (rule.mustUse.length > 0 && text.length >= MIN_LINE_LENGTH_FOR_MISSING) {
      const anyMatch = rule.mustUse.some(p => p.test(text));
      if (!anyMatch) {
        violations.push({
          speaker: line.speaker,
          line: text,
          violation: 'missing',
          detail: `${rule.tone} 톤 특성 표현이 등장하지 않음`,
          severity: 'warn',
        });
      }
    }
  }

  return violations;
}

// ============================================================
// PART 5 — 대사 추출 (번역 결과 텍스트 → 라인 배열)
// ============================================================

/**
 * 번역 결과 텍스트에서 대사 라인 추출.
 * 한국어 "..." / 영어 "..." / 일본어 「」 / 중국어 "" 감지.
 * speaker 태깅은 별도 — 여기서는 대사만 수집.
 * speaker 매핑 없으면 Voice Guard 검증 불가하므로 호출자가 별도 처리.
 */
const DIALOGUE_PATTERNS: Record<AppLanguage, RegExp[]> = {
  KO: [/"([^"]+)"/g, /「([^」]+)」/g, /'([^']{3,})'/g],
  EN: [/"([^"]+)"/g, /'([^']{3,})'/g],
  JP: [/「([^」]+)」/g, /『([^』]+)』/g, /"([^"]+)"/g],
  CN: [/"([^"]+)"/g, /'([^']{3,})'/g, /「([^」]+)」/g],
};

export function extractDialogueLines(text: string, targetLang: AppLanguage): Array<{ text: string }> {
  if (!text || typeof text !== 'string') return [];
  const regexes = DIALOGUE_PATTERNS[targetLang] ?? DIALOGUE_PATTERNS.KO;
  const results: Array<{ text: string }> = [];
  for (const regex of regexes) {
    const matches = text.matchAll(regex);
    for (const m of matches) {
      const captured = m[1];
      if (captured && captured.trim().length > 0) {
        results.push({ text: captured });
      }
    }
  }
  return results;
}

// ============================================================
// PART 6 — 리포트 생성
// ============================================================

export interface VoiceGuardReport {
  totalLines: number;
  totalRules: number;
  violations: VoiceViolation[];
  errorCount: number;
  warnCount: number;
  passRate: number;  // 0~1
}

export function summarizeViolations(
  violations: VoiceViolation[],
  totalLines: number,
  totalRules: number,
): VoiceGuardReport {
  const safeViolations = Array.isArray(violations) ? violations : [];
  const errorCount = safeViolations.filter(v => v.severity === 'error').length;
  const warnCount = safeViolations.filter(v => v.severity === 'warn').length;
  const safeTotal = Math.max(0, totalLines);
  return {
    totalLines: safeTotal,
    totalRules: Math.max(0, totalRules),
    violations: safeViolations,
    errorCount,
    warnCount,
    passRate: safeTotal > 0 ? Math.max(0, 1 - safeViolations.length / safeTotal) : 1,
  };
}

// ============================================================
// PART 7 — 대사/나레이션 필터 헬퍼 (false positive 방지)
// ============================================================
// applyVoiceGuard 호출 측에서 segments 를 detectVoiceViolations 로 넘기기 전에
// 나레이션을 제외하기 위한 신규 헬퍼.
//
// 검사 우선순위:
//   1) segment.isDialogue === true   → 채택 (감지기가 명시적으로 대사 마킹)
//   2) isDialogue 미정의 + 따옴표 마크(""/「」/'') 포함 → 채택 (휴리스틱)
//   3) speaker 가 비어 있으면 무조건 제외 (검사 불가)
//
// [확인 필요] isDialogue 필드는 translation.ts 의 TranslatedSegment 가 도입 중.
// 미도입 segment(undefined) 도 따옴표 휴리스틱으로 처리되도록 분기 유지.

/** 따옴표 마크 — 한국어/영어/일본어/중국어 공통 */
const DIALOGUE_MARK_REGEX = /"[^"]+"|「[^」]+」|『[^』]+』|'[^']{2,}'/;

/** 대사로 추정 가능한 라인만 통과 */
export interface DialogueFilterInput {
  speaker?: string;
  text?: string;
  translation?: string;
  isDialogue?: boolean;
}

/**
 * Voice Guard 입력용 — 나레이션을 걸러내고 대사만 남긴다.
 *
 * @param segments 번역 결과 segment 또는 임의의 라인 객체
 * @returns speaker/text 가 정상이고 대사로 분류된 라인만
 */
export function filterDialogueLines(
  segments: DialogueFilterInput[],
): VoiceDialogueLine[] {
  if (!Array.isArray(segments) || segments.length === 0) return [];
  const result: VoiceDialogueLine[] = [];
  for (const seg of segments) {
    if (!seg) continue;
    const text = seg.text ?? seg.translation;
    if (!text || !seg.speaker) continue;
    // 1) 명시적 isDialogue=true
    if (seg.isDialogue === true) {
      result.push({ speaker: seg.speaker, text });
      continue;
    }
    // 2) 명시적 isDialogue=false → 나레이션, 제외
    if (seg.isDialogue === false) continue;
    // 3) isDialogue 미정의 → 따옴표 휴리스틱
    if (DIALOGUE_MARK_REGEX.test(text)) {
      result.push({ speaker: seg.speaker, text });
    }
  }
  return result;
}

/**
 * Voice Guard 리포트를 재번역 지시용 힌트 텍스트로 변환.
 * error 위반만 포함 (warn은 정보용).
 */
export function buildRetryHintFromViolations(violations: VoiceViolation[]): string {
  if (!Array.isArray(violations) || violations.length === 0) return '';
  const critical = violations.filter(v => v.severity === 'error').slice(0, 5);
  if (critical.length === 0) return '';

  const lines = critical.map(v =>
    `- ${v.speaker}: "${v.line.slice(0, 80)}" — ${v.detail}`,
  );
  return `[VOICE GUARD — 재번역 필요]\n다음 대사가 캐릭터 말투 규칙을 위반함:\n${lines.join('\n')}\n\n해당 캐릭터의 톤에 맞게 다시 번역할 것.`;
}
