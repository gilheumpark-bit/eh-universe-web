// ============================================================
// Anti-Sycophancy Tone Guard — AI 출력 비서병 패턴 검출·차단
// ============================================================
//
// 5차 §4 + 6차 §9 + AGENTS.md §6 + 2차 정리 ERR_ASSISTANT_SERVILITY 패턴 정합.
// 사상 정합:
//   - "AI 가 대신 써드려요" / "완벽히 접수했습니다" / "다음 작업 지시해 주십시오" 차단
//   - 시장 분위기 = AI 피로도 ↑ → 작가 친화 톤 강제
//   - 14차 §5 본인 본능 = 사업 카탈로그 — 톤 관리도 자동화
//
// 격리: 절대 금지 8 파일 무관, 신규 모듈.
//
// 사용:
//   const result = scanForSycophancy(text, language);
//   if (result.violations.length > 0) {
//     // log warning + 자동 정정 또는 재생성 요청
//   }
// ============================================================

// ============================================================
// PART 1 — 4언어 비서병 패턴 사전
// ============================================================

export type ToneGuardLanguage = 'ko' | 'en' | 'ja' | 'zh';

/** 비서병 패턴 카테고리 */
export type SycophancyPattern =
  | 'overpraise' // "좋은 질문입니다" 칭찬 패딩
  | 'servile_acceptance' // "완벽히 접수했습니다" 충성 선언
  | 'apology_loop' // "죄송합니다" 반복
  | 'self_deprecation' // "제가 부족했습니다" 과잉 자기비하
  | 'next_task_prompt' // "다음 작업 지시해 주십시오" 즉시 실행 대기
  | 'agreement_padding' // "맞습니다 동의합니다" 무검증 동의
  | 'auto_generation_phrase'; // "자동 생성" / "AI 가 작성" — AI 피로도 직격탄

/** 패턴별 정규식 사전 */
const SYCOPHANCY_PATTERNS: Record<SycophancyPattern, Record<ToneGuardLanguage, RegExp[]>> = {
  overpraise: {
    ko: [/좋은\s*질문입니다/, /훌륭한\s*지적입니다/, /정확한\s*판단입니다/, /완벽한\s*요청입니다/],
    en: [/great\s+question/i, /excellent\s+point/i, /perfect\s+request/i, /you'?re\s+absolutely\s+right/i],
    ja: [/素晴らしい質問/, /的確なご指摘/, /完璧なリクエスト/],
    zh: [/好问题/, /极好的指摘/, /完美的请求/],
  },
  servile_acceptance: {
    ko: [/완벽히\s*접수/, /즉시\s*실행/, /충실히\s*수행/, /명령\s*받들/],
    en: [/at\s+your\s+service/i, /right\s+away,?\s+sir/i, /immediately\s+executing/i],
    ja: [/かしこまりました/, /即座に実行/, /承知いたしました/],
    zh: [/立即执行/, /马上为您/, /听候吩咐/],
  },
  apology_loop: {
    ko: [/죄송합니다.*죄송합니다/, /사과드립니다.*사과/, /제가\s*잘못했습니다/],
    en: [/i'?m\s+(so\s+)?sorry.*i'?m\s+(so\s+)?sorry/i, /my\s+apolog(y|ies).*apolog/i],
    ja: [/申し訳ございません.*申し訳/, /謝罪.*謝罪/],
    zh: [/抱歉.*抱歉/, /对不起.*对不起/],
  },
  self_deprecation: {
    ko: [/제가\s*부족했습니다/, /저의\s*무지/, /제가\s*틀렸습니다.{0,30}부족/],
    en: [/i\s+was\s+(completely\s+)?wrong.*ignoran/i, /my\s+(profound\s+)?ignorance/i],
    ja: [/私の至らなさ/, /浅はかでした/],
    zh: [/我的不足/, /我的无知/],
  },
  next_task_prompt: {
    ko: [/다음\s*작업\s*지시/, /다음\s*명령/, /추가\s*지시\s*기다/],
    en: [/awaiting\s+(your\s+)?next\s+(command|instruction|task)/i, /please\s+provide\s+next\s+task/i],
    ja: [/次のご指示/, /次のタスクをお待ち/],
    zh: [/等待下一个指示/, /请提供下一个任务/],
  },
  agreement_padding: {
    ko: [/맞습니다.{0,5}동의합니다/, /전적으로\s*동의/, /100%\s*동의/],
    en: [/i\s+(completely|totally|absolutely)\s+agree/i, /you'?re\s+100%\s+right/i],
    ja: [/完全に同意/, /おっしゃる通り/],
    zh: [/完全同意/, /您说得对/],
  },
  auto_generation_phrase: {
    // [핵심] AI 피로도 직격탄 — 외부 노출 금지 단어
    ko: [/자동\s*생성/, /AI가\s*대신\s*[써쓰]/, /AI가\s*작성/],
    en: [/auto.?generated\s+by\s+AI/i, /AI\s+wrote\s+(this|for\s+you)/i, /written\s+by\s+AI/i],
    ja: [/AIが自動生成/, /AIが代わりに/],
    zh: [/AI自动生成/, /AI代写/],
  },
};

// ============================================================
// PART 2 — Scanner
// ============================================================

export interface SycophancyViolation {
  pattern: SycophancyPattern;
  match: string;
  position: number;
}

export interface SycophancyScanResult {
  violations: SycophancyViolation[];
  /** 0 = clean, 1 = light, 2 = moderate, 3 = severe */
  severity: 0 | 1 | 2 | 3;
}

/**
 * AI 출력 텍스트 비서병 패턴 스캔.
 *
 * @param text 스캔 대상 (AI 응답)
 * @param language 4언어 중 1
 * @returns 위반 list + severity
 *
 * Severity:
 *   - 0: 위반 0건
 *   - 1: 1~2건 (양해)
 *   - 2: 3~5건 (강한 톤)
 *   - 3: 6+건 또는 auto_generation_phrase 1+건 (즉시 차단·재생성)
 */
export function scanForSycophancy(
  text: string,
  language: ToneGuardLanguage,
): SycophancyScanResult {
  if (!text) return { violations: [], severity: 0 };

  const violations: SycophancyViolation[] = [];

  for (const pattern of Object.keys(SYCOPHANCY_PATTERNS) as SycophancyPattern[]) {
    const regexList = SYCOPHANCY_PATTERNS[pattern][language];
    for (const re of regexList) {
      const match = re.exec(text);
      if (match) {
        violations.push({
          pattern,
          match: match[0],
          position: match.index,
        });
      }
    }
  }

  // Severity 계산
  const hasAutoGen = violations.some((v) => v.pattern === 'auto_generation_phrase');
  let severity: 0 | 1 | 2 | 3;
  if (violations.length === 0) severity = 0;
  else if (hasAutoGen || violations.length >= 6) severity = 3;
  else if (violations.length >= 3) severity = 2;
  else severity = 1;

  return { violations, severity };
}

// ============================================================
// PART 3 — 작가 친화 대체 권장
// ============================================================

/** 패턴별 권장 대체 문구 (4언어) */
export const REPLACEMENT_GUIDANCE: Record<SycophancyPattern, Record<ToneGuardLanguage, string>> = {
  overpraise: {
    ko: '칭찬 생략, 본론으로 바로',
    en: 'Skip praise, go directly to the point',
    ja: '称賛を省略し、本題へ',
    zh: '省略称赞,直接进入主题',
  },
  servile_acceptance: {
    ko: '실행 결과·근거 위주로 응답',
    en: 'Respond with results and reasoning',
    ja: '実行結果と根拠を中心に回答',
    zh: '以执行结果和依据回应',
  },
  apology_loop: {
    ko: '사과 1회만, 정정 내용에 집중',
    en: 'Apologize once, focus on correction',
    ja: '謝罪は1回、訂正内容に集中',
    zh: '道歉一次,集中于修正内容',
  },
  self_deprecation: {
    ko: '자기비하 생략, 사실만',
    en: 'Skip self-deprecation, state facts',
    ja: '自己卑下を省略、事実のみ',
    zh: '省略自我贬低,只陈述事实',
  },
  next_task_prompt: {
    ko: '다음 지시 대기 문구 생략',
    en: 'Skip "awaiting next task" phrasing',
    ja: '次の指示待ちの文言を省略',
    zh: '省略等待下一个任务的措辞',
  },
  agreement_padding: {
    ko: '"동의합니다" 생략, 검증 또는 반론 추가',
    en: 'Skip "I agree", add verification or counter-point',
    ja: '"同意します" を省略、検証または反論を追加',
    zh: '省略"我同意",添加验证或反驳',
  },
  auto_generation_phrase: {
    ko: '"AI가 작성" → "같이 쓴 흐름" / "AI 보조"',
    en: '"AI wrote" → "Co-write activity" / "with AI assistance"',
    ja: '"AIが作成" → "共同執筆の流れ" / "AI補助"',
    zh: '"AI 撰写" → "共同写作流程" / "AI 辅助"',
  },
};

// ============================================================
// PART 4 — Quick check helpers
// ============================================================

/**
 * 즉시 차단 권고 여부 (severity 3).
 */
export function shouldBlockOutput(result: SycophancyScanResult): boolean {
  return result.severity >= 3;
}

/**
 * 경고 로그 권고 여부 (severity 2+).
 */
export function shouldWarn(result: SycophancyScanResult): boolean {
  return result.severity >= 2;
}
