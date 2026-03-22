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
const TYPO_PATTERNS = [/됬/g, /안됬/g, /했읍니다/g, /할려고/g, /있읍니다/g, /되서[^요]/g];
const CONTEXT_MARKERS = ['결국', '하지만', '그럼에도', '마침내', '순간'];
const ENDING_MONO = [/었다[.\s]/g, /했다[.\s]/g, /였다[.\s]/g, /었다$/gm, /했다$/gm, /였다$/gm];

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
      pat.lastIndex = 0;
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

// ============================================================
// PART 3 — Main Analyzer
// ============================================================

export function analyzeManuscript(text: string): DirectorReport {
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
