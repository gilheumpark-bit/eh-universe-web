import { PublishPlatform, PLATFORM_PRESETS } from './types';

// ============================================================
// PART 1 — Types & Constants
// ============================================================

export interface DirectorFinding {
  kind: string;
  severity: number;
  message: string;
  lineNo?: number;
  excerpt?: string;
}

export interface DirectorReport {
  findings: DirectorFinding[];
  stats: Record<string, number>;
  score: number;
}

const BLUR_WORDS = ['기적', '운명', '갑자기', '그냥', '원래'];
const GAIN_WORDS = ['이득', '성공', '승리', '수익', '획득', '상승', '돌파'];
const COST_WORDS = ['대가', '손실', '희생', '잃', '소실', '단축', '절단', '결손', '회수', '추방'];
const AI_PHRASES = ['요약하자면', '결론적으로', '다음과 같습니다', '중요한 점은', '한편으로는'];
const TYPO_PATTERNS = [/됬/, /안됬/, /했읍니다/, /할려고/, /있읍니다/, /되서[^요]/];
const CONTEXT_MARKERS = ['결국', '하지만', '그럼에도', '마침내', '순간'];
const CERTAINTY_MARKERS = ['확실히', '반드시', '항상', '절대', '100%', '완전히'];
const NUANCE_MARKERS = ['아마도', '일 수 있', '가능성', '추정', '일부'];

// ============================================================
// PART 2 — Individual Analyzers
// ============================================================

function checkBlur(lines: string[]): { findings: DirectorFinding[]; count: number } {
  const findings: DirectorFinding[] = [];
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    for (const word of BLUR_WORDS) {
      if (lines[i].includes(word)) {
        count++;
        findings.push({
          kind: 'BLUR',
          severity: 3,
          message: `인과 흐림 '${word}' 감지`,
          lineNo: i + 1,
          excerpt: lines[i].trim().slice(0, 80),
        });
      }
    }
  }
  return { findings, count };
}

function checkGainVsCost(lines: string[]): { findings: DirectorFinding[]; gainCount: number; noCostCount: number } {
  const findings: DirectorFinding[] = [];
  let gainCount = 0;
  let noCostCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const hasGain = GAIN_WORDS.some(w => lines[i].includes(w));
    if (!hasGain) continue;
    gainCount++;
    const windowStart = Math.max(0, i - 2);
    const windowEnd = Math.min(lines.length, i + 3);
    const window = lines.slice(windowStart, windowEnd).join(' ');
    const hasCost = COST_WORDS.some(w => window.includes(w));
    if (!hasCost) {
      noCostCount++;
      findings.push({
        kind: 'GAIN_NO_COST',
        severity: 4,
        message: '이득/성공에 대가 근거 없음',
        lineNo: i + 1,
        excerpt: lines[i].trim().slice(0, 80),
      });
    }
  }
  return { findings, gainCount, noCostCount };
}

function checkSimilarContext(text: string): { findings: DirectorFinding[]; count: number } {
  const findings: DirectorFinding[] = [];
  let count = 0;
  const paras = text.split('\n\n').filter(p => p.trim().length > 40);
  const seen = new Map<string, boolean>();
  for (const p of paras) {
    const markers = CONTEXT_MARKERS.filter(m => p.includes(m));
    if (markers.length < 2) continue;
    const sig = markers.sort().join('|');
    if (seen.has(sig)) {
      count++;
      findings.push({
        kind: 'SIMILAR_CONTEXT',
        severity: 3,
        message: `유사 맥락 구조 반복 (${markers.join(', ')})`,
        excerpt: p.trim().slice(0, 100),
      });
    } else {
      seen.set(sig, true);
    }
  }
  return { findings, count };
}

function checkAITone(text: string): { findings: DirectorFinding[]; count: number } {
  const findings: DirectorFinding[] = [];
  let count = 0;
  for (const phrase of AI_PHRASES) {
    const matches = text.split(phrase).length - 1;
    count += matches;
  }
  if (count >= 3) {
    findings.push({
      kind: 'AI_TONE',
      severity: 2,
      message: `AI 요약/정리형 문구 ${count}회 반복`,
    });
  }
  return { findings, count };
}

function checkTypo(lines: string[]): { findings: DirectorFinding[]; count: number } {
  const findings: DirectorFinding[] = [];
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    for (const pat of TYPO_PATTERNS) {
      if (pat.test(lines[i])) {
        count++;
        findings.push({
          kind: 'TYPO',
          severity: 2,
          message: '오타/비문 감지',
          lineNo: i + 1,
          excerpt: lines[i].trim().slice(0, 80),
        });
      }
    }
  }
  return { findings, count };
}

function checkEndingMono(text: string): { findings: DirectorFinding[]; ratio: number } {
  const findings: DirectorFinding[] = [];
  const sentences = text.split(/[.!?]\s/).filter(s => s.trim().length > 5);
  if (sentences.length === 0) return { findings, ratio: 0 };

  let monoCount = 0;
  for (const s of sentences) {
    const trimmed = s.trim();
    if (/[었했였]다$/.test(trimmed)) monoCount++;
  }
  const ratio = Math.round((monoCount / sentences.length) * 100);

  if (ratio >= 40) {
    findings.push({
      kind: 'ENDING_MONO',
      severity: 3,
      message: `종결 단조: ~었다/했다 비율 ${ratio}% (권장 < 40%)`,
    });
  }
  return { findings, ratio };
}

function checkHallucinationRisk(text: string): { findings: DirectorFinding[]; certaintyCount: number; nuanceCount: number } {
  const findings: DirectorFinding[] = [];
  let certaintyCount = 0;
  let nuanceCount = 0;

  for (const marker of CERTAINTY_MARKERS) {
    certaintyCount += (text.split(marker).length - 1);
  }
  for (const marker of NUANCE_MARKERS) {
    nuanceCount += (text.split(marker).length - 1);
  }

  if (certaintyCount > 2 && nuanceCount === 0) {
    findings.push({
      kind: 'hallucination_risk',
      severity: 4,
      message: `높은 확신 표현 ${certaintyCount}회, 뉘앙스 표현 0회 — 할루시네이션 위험`,
    });
  }

  return { findings, certaintyCount, nuanceCount };
}

// ============================================================
// PART 3 — Platform-Specific Checks
// ============================================================

function checkPlatformRules(text: string, publishPlatform?: PublishPlatform): DirectorFinding[] {
  if (!publishPlatform || publishPlatform === PublishPlatform.NONE) return [];
  const preset = PLATFORM_PRESETS[publishPlatform];
  if (!preset) return [];

  const findings: DirectorFinding[] = [];
  const charCount = text.length;

  // length_min_warning: 분량 미달 체크
  if (preset.nodChecks.includes('length_min_warning') && charCount < preset.episodeLength.min) {
    findings.push({
      kind: 'PLATFORM_LENGTH',
      severity: 4,
      message: `분량 미달: ${charCount.toLocaleString()}자 (${publishPlatform} 최소 ${preset.episodeLength.min.toLocaleString()}자)`,
    });
  }

  // density_check: 문피아 편당 밀도 (대화 없는 긴 서술 블록)
  if (preset.nodChecks.includes('density_check')) {
    const paras = text.split('\n\n').filter(p => p.trim().length > 0);
    const longNarrationBlocks = paras.filter(p => p.length > 500 && !p.includes('"') && !p.includes('"'));
    if (longNarrationBlocks.length >= 3) {
      findings.push({
        kind: 'PLATFORM_DENSITY',
        severity: 3,
        message: `밀도 부족: 대화 없는 장문 서술 블록 ${longNarrationBlocks.length}개 — 편당결제 독자 이탈 위험`,
      });
    }
  }

  // hook_missing_warning: 카카오페이지 회차 엔딩 훅 체크
  if (preset.nodChecks.includes('hook_missing_warning')) {
    const lastPara = text.trim().split('\n\n').pop() || '';
    const hasHook = /[?!…]$/.test(lastPara.trim()) || /[었했였]다[.]?\s*$/.test(lastPara.trim()) === false;
    if (!hasHook && lastPara.length < 100) {
      findings.push({
        kind: 'PLATFORM_HOOK',
        severity: 4,
        message: '회차 엔딩에 훅 부족 — 카카오페이지는 강한 클리프행어 필수',
      });
    }
  }

  // heavy_world_warning: 노벨피아 과도한 세계관 설명
  if (preset.nodChecks.includes('heavy_world_warning')) {
    const explanationMarkers = ['라고 불리는', '이란', '체계는', '시스템은', '역사는', '구조는'];
    let explanationCount = 0;
    for (const marker of explanationMarkers) {
      explanationCount += (text.split(marker).length - 1);
    }
    if (explanationCount >= 5) {
      findings.push({
        kind: 'PLATFORM_WORLD_HEAVY',
        severity: 3,
        message: `세계관 설명 과다 (${explanationCount}회) — 노벨피아 독자층은 가벼운 전개 선호`,
      });
    }
  }

  // pace_check: 빠른 전개 플랫폼에서 느린 호흡
  if (preset.nodChecks.includes('pace_check')) {
    const sentences = text.split(/[.!?]\s/).filter(s => s.trim().length > 5);
    const longSentences = sentences.filter(s => s.length > 120);
    if (sentences.length > 0 && (longSentences.length / sentences.length) > 0.3) {
      findings.push({
        kind: 'PLATFORM_PACE',
        severity: 3,
        message: `장문 비율 ${Math.round((longSentences.length / sentences.length) * 100)}% — 빠른 전개 플랫폼에 부적합`,
      });
    }
  }

  // ending_intensity_check: 엔딩 훅 강도
  if (preset.nodChecks.includes('ending_intensity_check')) {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    const lastLine = lines[lines.length - 1] || '';
    if (lastLine.endsWith('.') && !lastLine.includes('…') && !lastLine.includes('!') && !lastLine.includes('?')) {
      findings.push({
        kind: 'PLATFORM_ENDING',
        severity: 3,
        message: '평범한 마침표 종결 — 훅 강도 높은 엔딩 권장',
      });
    }
  }

  // completion_structure_check: 시리즈 완결 구조
  if (preset.nodChecks.includes('completion_structure_check')) {
    // 기본 체크: 에피소드 내 기승전결 구조 존재 여부
    const paras = text.split('\n\n').filter(p => p.trim().length > 0);
    if (paras.length < 3) {
      findings.push({
        kind: 'PLATFORM_STRUCTURE',
        severity: 2,
        message: '문단이 너무 적음 — 시리즈는 회차 내 구조 완성도 중요',
      });
    }
  }

  // emotion_consistency_check: 감정선 일관성
  if (preset.nodChecks.includes('emotion_consistency_check')) {
    const emotionWords = ['웃었다', '울었다', '화가', '분노', '슬픔', '기쁨', '행복'];
    const emotionPositions: number[] = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (emotionWords.some(w => lines[i].includes(w))) {
        emotionPositions.push(i);
      }
    }
    // 감정 급변: 연속 3줄 이내에 2개 이상 다른 감정
    for (let i = 0; i < emotionPositions.length - 1; i++) {
      if (emotionPositions[i + 1] - emotionPositions[i] <= 2) {
        findings.push({
          kind: 'PLATFORM_EMOTION',
          severity: 2,
          message: `감정선 급변 (${emotionPositions[i] + 1}행 부근) — 시리즈는 감정 일관성 중요`,
          lineNo: emotionPositions[i] + 1,
        });
        break;
      }
    }
  }

  return findings;
}

// ============================================================
// PART 4 — Main Analyzer
// ============================================================

export function analyzeManuscript(text: string, publishPlatform?: PublishPlatform): DirectorReport {
  if (!text || text.trim().length < 50) {
    return { findings: [], stats: {}, score: 100 };
  }

  const lines = text.split('\n');
  const allFindings: DirectorFinding[] = [];

  const blur = checkBlur(lines);
  allFindings.push(...blur.findings);

  const gain = checkGainVsCost(lines);
  allFindings.push(...gain.findings);

  const similar = checkSimilarContext(text);
  allFindings.push(...similar.findings);

  const aiTone = checkAITone(text);
  allFindings.push(...aiTone.findings);

  const typo = checkTypo(lines);
  allFindings.push(...typo.findings);

  const ending = checkEndingMono(text);
  allFindings.push(...ending.findings);

  const hallucination = checkHallucinationRisk(text);
  allFindings.push(...hallucination.findings);

  // Platform-specific checks
  const platformFindings = checkPlatformRules(text, publishPlatform);
  allFindings.push(...platformFindings);

  // Sort by severity descending
  allFindings.sort((a, b) => b.severity - a.severity);

  // Calculate score: start at 100, deduct per finding
  const deductions = allFindings.reduce((sum, f) => {
    if (f.severity >= 4) return sum + 8;
    if (f.severity === 3) return sum + 4;
    return sum + 2;
  }, 0);
  const score = Math.max(0, Math.min(100, 100 - deductions));

  const stats: Record<string, number> = {
    blur: blur.count,
    gain: gain.gainCount,
    gain_no_cost: gain.noCostCount,
    similar_context: similar.count,
    ai_tone: aiTone.count,
    typo: typo.count,
    ending_mono: ending.ratio,
    certainty: hallucination.certaintyCount,
    nuance: hallucination.nuanceCount,
  };

  return { findings: allFindings, stats, score };
}

export function gradeFromScore(score: number): string {
  if (score >= 95) return 'S+';
  if (score >= 90) return 'S';
  if (score >= 85) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  return 'C';
}

// ============================================================
// PART 6 — Adaptive Learner
// ============================================================

export interface AdaptiveThresholds {
  [checkType: string]: number; // adjustment delta, starts at 0
}

export function adjustThreshold(
  thresholds: AdaptiveThresholds,
  checkType: string,
  wasFalsePositive: boolean
): AdaptiveThresholds {
  const delta = wasFalsePositive ? 0.5 : -0.2;
  return {
    ...thresholds,
    [checkType]: (thresholds[checkType] ?? 0) + delta,
  };
}

// ============================================================
// PART 7 — Session EMA (Exponential Moving Average)
// ============================================================

export function calculateSessionEMA(
  previousEMA: number,
  currentScore: number,
  alpha: number = 0.3
): number {
  return alpha * currentScore + (1 - alpha) * previousEMA;
}
