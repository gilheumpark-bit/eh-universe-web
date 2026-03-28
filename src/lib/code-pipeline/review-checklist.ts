// ============================================================
// Multi-AI Review Checklist + Anti-Convergence Scoring
// ============================================================
// 1. 에이전트별 체크리스트 제공 (역할 기반)
// 2. 77점 이상 통과 기준
// 3. 평균 수렴 방지 (HFCP 스타일 anti-convergence)

// ── Types ──

export interface ChecklistItem {
  id: string;
  category: string;
  description: string;
  weight: number;         // 0-1, importance
  passCondition: string;  // what "pass" means for this item
}

export interface ChecklistResult {
  item: ChecklistItem;
  passed: boolean;
  score: number;          // 0-100 per item
  comment: string;
}

export interface ReviewChecklist {
  role: string;
  perspective: string;
  items: ChecklistItem[];
  passThreshold: number;  // 77
}

export interface ScoringState {
  reviewScores: number[];         // 각 리뷰어의 원점수
  adjustedScores: number[];       // anti-convergence 적용 후
  convergenceDetected: boolean;
  spreadFactor: number;           // 점수 분산도
  finalScore: number;
  passed: boolean;
}

// ── Constants ──

const PASS_THRESHOLD = 77;
const CONVERGENCE_BAND = 8;       // 점수차이가 이 범위 안이면 수렴으로 판단
const DIVERGENCE_BOOST = 1.3;     // 수렴 방지 부스트 계수
const OUTLIER_WEIGHT = 1.5;       // 이탈 점수에 더 높은 가중치

// ── Role-Based Checklists ──

const CODER_CHECKLIST: ChecklistItem[] = [
  { id: "code-01", category: "기능", description: "요구사항이 모두 구현되었는가?", weight: 1.0, passCondition: "모든 요구사항 충족" },
  { id: "code-02", category: "기능", description: "엣지 케이스가 처리되었는가?", weight: 0.8, passCondition: "null, undefined, 빈 값 처리" },
  { id: "code-03", category: "품질", description: "코드가 DRY 원칙을 따르는가?", weight: 0.7, passCondition: "중복 코드 없음" },
  { id: "code-04", category: "품질", description: "함수/변수 네이밍이 명확한가?", weight: 0.6, passCondition: "의도를 명확히 표현" },
  { id: "code-05", category: "품질", description: "불필요한 복잡성이 없는가?", weight: 0.7, passCondition: "단순한 해결책 사용" },
  { id: "code-06", category: "성능", description: "명백한 성능 문제가 없는가?", weight: 0.8, passCondition: "O(n²) 이상의 불필요한 루프 없음" },
  { id: "code-07", category: "타입", description: "타입이 정확하게 정의되었는가?", weight: 0.7, passCondition: "any 타입 미사용, 적절한 인터페이스" },
];

const REVIEWER_CHECKLIST: ChecklistItem[] = [
  { id: "rev-01", category: "가독성", description: "코드를 처음 보는 사람이 이해할 수 있는가?", weight: 1.0, passCondition: "주석 없이도 흐름 파악 가능" },
  { id: "rev-02", category: "패턴", description: "프로젝트 코딩 컨벤션을 따르는가?", weight: 0.8, passCondition: "기존 패턴과 일관" },
  { id: "rev-03", category: "에러", description: "에러 처리가 적절한가?", weight: 0.9, passCondition: "try-catch, 에러 전파 적절" },
  { id: "rev-04", category: "에러", description: "잠재적 런타임 에러가 없는가?", weight: 1.0, passCondition: "null 참조, 범위 초과 없음" },
  { id: "rev-05", category: "설계", description: "단일 책임 원칙을 따르는가?", weight: 0.7, passCondition: "함수/클래스가 하나의 역할만" },
  { id: "rev-06", category: "설계", description: "의존성이 적절한가?", weight: 0.6, passCondition: "불필요한 의존성 없음" },
  { id: "rev-07", category: "유지보수", description: "수정이 용이한 구조인가?", weight: 0.7, passCondition: "하드코딩 없음, 확장 가능" },
];

const TESTER_CHECKLIST: ChecklistItem[] = [
  { id: "test-01", category: "커버리지", description: "핵심 기능이 테스트되었는가?", weight: 1.0, passCondition: "주요 함수 모두 테스트" },
  { id: "test-02", category: "커버리지", description: "경계값이 테스트되었는가?", weight: 0.9, passCondition: "0, -1, MAX, 빈 값 테스트" },
  { id: "test-03", category: "엣지", description: "에러 시나리오가 테스트되었는가?", weight: 0.8, passCondition: "잘못된 입력 시 적절한 에러" },
  { id: "test-04", category: "엣지", description: "비동기 동작이 테스트되었는가?", weight: 0.7, passCondition: "Promise 거부, 타임아웃 처리" },
  { id: "test-05", category: "품질", description: "테스트가 독립적인가?", weight: 0.6, passCondition: "테스트 간 의존성 없음" },
  { id: "test-06", category: "품질", description: "테스트명이 의도를 설명하는가?", weight: 0.5, passCondition: "should/when/then 패턴" },
];

const SECURITY_CHECKLIST: ChecklistItem[] = [
  { id: "sec-01", category: "인젝션", description: "SQL/NoSQL 인젝션 위험이 없는가?", weight: 1.0, passCondition: "파라미터화된 쿼리 사용" },
  { id: "sec-02", category: "인젝션", description: "XSS 취약점이 없는가?", weight: 1.0, passCondition: "사용자 입력 이스케이프" },
  { id: "sec-03", category: "인증", description: "인증/인가가 적절한가?", weight: 0.9, passCondition: "권한 검사 존재" },
  { id: "sec-04", category: "데이터", description: "민감 데이터가 노출되지 않는가?", weight: 1.0, passCondition: "API 키, 비밀번호 미노출" },
  { id: "sec-05", category: "데이터", description: "입력 검증이 되어있는가?", weight: 0.9, passCondition: "모든 외부 입력 검증" },
  { id: "sec-06", category: "설정", description: "보안 헤더가 설정되었는가?", weight: 0.7, passCondition: "CORS, CSP, HSTS 등" },
  { id: "sec-07", category: "암호", description: "암호화가 적절한가?", weight: 0.8, passCondition: "평문 저장 없음, 적절한 해싱" },
];

const ARCHITECT_CHECKLIST: ChecklistItem[] = [
  { id: "arch-01", category: "구조", description: "모듈 간 결합도가 낮은가?", weight: 1.0, passCondition: "인터페이스 기반 의존성" },
  { id: "arch-02", category: "구조", description: "레이어 분리가 적절한가?", weight: 0.9, passCondition: "UI/비즈니스/데이터 분리" },
  { id: "arch-03", category: "확장", description: "새 기능 추가가 용이한가?", weight: 0.8, passCondition: "OCP 원칙 준수" },
  { id: "arch-04", category: "확장", description: "스케일링에 문제가 없는가?", weight: 0.7, passCondition: "병목 지점 없음" },
  { id: "arch-05", category: "일관", description: "기존 아키텍처와 일관되는가?", weight: 0.8, passCondition: "패턴, 폴더 구조 일치" },
  { id: "arch-06", category: "일관", description: "API 설계가 일관되는가?", weight: 0.7, passCondition: "RESTful, 네이밍 규칙 통일" },
];

// ── Debugger-Specific Checklist ──

const DEBUGGER_CHECKLIST: ChecklistItem[] = [
  { id: "dbg-01", category: "메모리", description: "메모리 누수 패턴이 없는가? (이벤트 리스너 미해제, 클로저 참조 누적, 전역 변수 누적)", weight: 1.0, passCondition: "addEventListener에 대응하는 removeEventListener, WeakRef/WeakMap 적절히 사용" },
  { id: "dbg-02", category: "메모리", description: "DOM 참조가 적절히 해제되는가?", weight: 0.8, passCondition: "제거된 DOM 노드에 대한 참조 없음" },
  { id: "dbg-03", category: "비동기", description: "처리되지 않은 Promise rejection이 없는가?", weight: 1.0, passCondition: "모든 Promise에 .catch() 또는 try-catch, unhandledrejection 방지" },
  { id: "dbg-04", category: "비동기", description: "async/await에서 에러 전파가 올바른가?", weight: 0.9, passCondition: "await 누락 없음, 에러가 삼켜지지 않음" },
  { id: "dbg-05", category: "루프", description: "무한 루프 위험이 없는가? (while 탈출 조건, 재귀 깊이 제한)", weight: 1.0, passCondition: "모든 루프에 명확한 종료 조건, 재귀에 깊이 제한" },
  { id: "dbg-06", category: "경쟁조건", description: "경쟁 조건(race condition)이 없는가?", weight: 0.9, passCondition: "공유 상태 동시 접근 보호, 타이밍 의존 코드 없음" },
  { id: "dbg-07", category: "널참조", description: "null/undefined 참조 위험이 없는가?", weight: 1.0, passCondition: "옵셔널 체이닝, nullish 병합 적절히 사용" },
];

// ── Performance-Specific Checklist ──

const PERFORMANCE_CHECKLIST: ChecklistItem[] = [
  { id: "perf-01", category: "렌더링", description: "불필요한 리렌더링이 없는가?", weight: 1.0, passCondition: "React.memo, useMemo, useCallback 적절히 사용, props 안정성 확보" },
  { id: "perf-02", category: "렌더링", description: "대규모 리스트에 가상화가 적용되었는가?", weight: 0.7, passCondition: "1000개 이상 항목은 가상 스크롤 사용" },
  { id: "perf-03", category: "메모이제이션", description: "비용이 큰 계산에 메모이제이션이 적용되었는가?", weight: 0.9, passCondition: "useMemo, 캐싱, 또는 계산 최적화 적용" },
  { id: "perf-04", category: "쿼리", description: "N+1 쿼리 패턴이 없는가?", weight: 1.0, passCondition: "루프 안 개별 쿼리 대신 배치/조인 쿼리 사용" },
  { id: "perf-05", category: "번들", description: "불필요한 대용량 의존성이 없는가?", weight: 0.8, passCondition: "tree-shaking 가능, 동적 import 사용, 대안 라이브러리 검토" },
  { id: "perf-06", category: "네트워크", description: "불필요한 네트워크 요청이 없는가?", weight: 0.8, passCondition: "요청 중복 방지, 캐싱, 디바운싱 적용" },
];

// ── Accessibility-Specific Checklist ──

const ACCESSIBILITY_CHECKLIST: ChecklistItem[] = [
  { id: "a11y-01", category: "이미지", description: "모든 이미지에 alt 텍스트가 있는가?", weight: 1.0, passCondition: "img 태그에 의미있는 alt 속성, 장식 이미지는 alt=\"\"" },
  { id: "a11y-02", category: "ARIA", description: "ARIA 레이블이 적절히 사용되었는가?", weight: 0.9, passCondition: "인터랙티브 요소에 aria-label/aria-labelledby, 랜드마크 역할 지정" },
  { id: "a11y-03", category: "키보드", description: "키보드 네비게이션이 가능한가?", weight: 1.0, passCondition: "모든 인터랙티브 요소가 탭 접근 가능, focus 표시 visible, 커스텀 컴포넌트에 키 이벤트 처리" },
  { id: "a11y-04", category: "색상", description: "색상 대비가 충분한가?", weight: 0.8, passCondition: "WCAG 2.1 AA 기준 4.5:1 이상 대비율, 색상만으로 정보 전달하지 않음" },
  { id: "a11y-05", category: "시맨틱", description: "시맨틱 HTML이 사용되었는가?", weight: 0.7, passCondition: "div 남용 없이 header, nav, main, section, button 등 시맨틱 태그 사용" },
  { id: "a11y-06", category: "폼", description: "폼 요소에 레이블이 연결되었는가?", weight: 0.9, passCondition: "label의 for 속성 또는 aria-labelledby로 입력 필드와 연결" },
];

export const ROLE_CHECKLISTS: Record<string, ChecklistItem[]> = {
  coder: CODER_CHECKLIST,
  reviewer: REVIEWER_CHECKLIST,
  tester: TESTER_CHECKLIST,
  security: SECURITY_CHECKLIST,
  architect: ARCHITECT_CHECKLIST,
  debugger: DEBUGGER_CHECKLIST,
  documenter: REVIEWER_CHECKLIST,  // 문서 작성자는 리뷰어 체크리스트 공유
  performance: PERFORMANCE_CHECKLIST,
  accessibility: ACCESSIBILITY_CHECKLIST,
};

// ── Checklist Builder ──

export function getChecklistForRole(role: string, customPerspective?: string): ReviewChecklist {
  // Dynamic checklist generation for 'custom' role based on customPerspective text
  if (role === 'custom' && customPerspective) {
    const dynamicItems = generateCustomChecklist(customPerspective);
    return {
      role: 'custom',
      perspective: customPerspective,
      items: dynamicItems,
      passThreshold: PASS_THRESHOLD,
    };
  }

  const items = ROLE_CHECKLISTS[role] ?? REVIEWER_CHECKLIST;

  return {
    role,
    perspective: customPerspective ?? role,
    items,
    passThreshold: PASS_THRESHOLD,
  };
}

/**
 * Dynamically generate checklist items from a user's customPerspective text.
 * Parses the perspective to identify focus areas and creates relevant items.
 */
function generateCustomChecklist(perspective: string): ChecklistItem[] {
  const lower = perspective.toLowerCase();
  const items: ChecklistItem[] = [];
  let counter = 0;

  const makeId = () => `custom-${String(++counter).padStart(2, '0')}`;

  // Keyword-driven checklist generation: detect focus areas from the perspective text
  const keywordGroups: Array<{ keywords: string[]; items: ChecklistItem[] }> = [
    {
      keywords: ['성능', 'performance', '속도', 'speed', '최적화', 'optimize'],
      items: PERFORMANCE_CHECKLIST.slice(0, 4),
    },
    {
      keywords: ['접근성', 'accessibility', 'a11y', '장애', 'wcag', 'aria'],
      items: ACCESSIBILITY_CHECKLIST.slice(0, 4),
    },
    {
      keywords: ['보안', 'security', '취약점', 'vulnerability', 'xss', 'injection'],
      items: SECURITY_CHECKLIST.slice(0, 4),
    },
    {
      keywords: ['디버그', 'debug', '버그', 'bug', '메모리', 'memory', '누수', 'leak'],
      items: DEBUGGER_CHECKLIST.slice(0, 4),
    },
    {
      keywords: ['테스트', 'test', '커버리지', 'coverage', '단위', 'unit'],
      items: TESTER_CHECKLIST.slice(0, 4),
    },
    {
      keywords: ['구조', 'architecture', '아키텍처', '설계', 'design', '모듈', 'module'],
      items: ARCHITECT_CHECKLIST.slice(0, 4),
    },
  ];

  for (const group of keywordGroups) {
    if (group.keywords.some((kw) => lower.includes(kw))) {
      items.push(...group.items.map((item) => ({ ...item, id: makeId() })));
    }
  }

  // Always include a generic "perspective alignment" item
  items.push({
    id: makeId(),
    category: '커스텀',
    description: `"${perspective}" 관점에서 코드가 적절한가?`,
    weight: 1.0,
    passCondition: '사용자 정의 관점의 요구사항 충족',
  });

  // If no keyword matches, include a baseline reviewer checklist
  if (items.length <= 1) {
    items.unshift(...REVIEWER_CHECKLIST.slice(0, 4).map((item) => ({ ...item, id: makeId() })));
  }

  return items;
}

/**
 * Format checklist as a prompt for the AI reviewer
 */
export function formatChecklistPrompt(checklist: ReviewChecklist): string {
  const itemList = checklist.items
    .map((item, i) => `${i + 1}. [${item.category}] ${item.description} (가중치: ${item.weight}, 통과기준: ${item.passCondition})`)
    .join("\n");

  return (
    `## 리뷰 체크리스트 (${checklist.role})\n\n` +
    `아래 체크리스트의 각 항목을 평가하세요.\n` +
    `통과 기준: **${PASS_THRESHOLD}점 이상**\n\n` +
    `${itemList}\n\n` +
    `반드시 아래 JSON 형식으로 응답하세요:\n` +
    `{\n` +
    `  "status": "pass" | "warn" | "fail",\n` +
    `  "score": 0-100,\n` +
    `  "checklist": [\n` +
    `    { "id": "항목ID", "passed": true|false, "score": 0-100, "comment": "평가 코멘트" }\n` +
    `  ],\n` +
    `  "findings": [{ "severity": "critical|major|minor|suggestion", "message": "...", "line": null }],\n` +
    `  "summary": "전체 요약 (한국어)"\n` +
    `}\n\n` +
    `중요 규칙:\n` +
    `- 각 체크리스트 항목을 개별 평가하세요\n` +
    `- 항목별 점수는 가중치를 반영한 최종 점수에 영향을 줍니다\n` +
    `- ${PASS_THRESHOLD}점 미만이면 반드시 "fail"로 판정하세요\n` +
    `- **평균 수렴 금지**: 모든 항목에 비슷한 점수를 주지 마세요. 잘한 건 높게, 못한 건 낮게.\n` +
    `- 확실히 문제없는 항목은 90-100점, 문제 있는 항목은 30-60점으로 명확히 구분하세요`
  );
}

// ── Anti-Convergence Scoring ──

/**
 * Detect if scores are converging (all too similar)
 */
function detectConvergence(scores: number[]): boolean {
  if (scores.length < 2) return false;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return (max - min) <= CONVERGENCE_BAND;
}

/**
 * Calculate score spread (standard deviation)
 */
function calculateSpread(scores: number[]): number {
  if (scores.length < 2) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  return Math.sqrt(variance);
}

/**
 * Anti-convergence: if all reviewers give similar scores,
 * boost outlier scores and penalize average-zone scores.
 *
 * HFCP의 Load Leveling + Spike Buffer 개념 적용:
 * - 평균 근처 점수 → 변동 증폭 (수렴 방지)
 * - 극단 점수 → 가중치 증가 (의미있는 차이 강조)
 * - 급격한 변화 → 완충 (노이즈 방지)
 */
export function applyAntiConvergence(rawScores: number[]): ScoringState {
  if (rawScores.length === 0) {
    return {
      reviewScores: [],
      adjustedScores: [],
      convergenceDetected: false,
      spreadFactor: 0,
      finalScore: 0,
      passed: false,
    };
  }

  if (rawScores.length === 1) {
    return {
      reviewScores: rawScores,
      adjustedScores: rawScores,
      convergenceDetected: false,
      spreadFactor: 0,
      finalScore: rawScores[0],
      passed: rawScores[0] >= PASS_THRESHOLD,
    };
  }

  const avg = rawScores.reduce((a, b) => a + b, 0) / rawScores.length;
  const convergenceDetected = detectConvergence(rawScores);
  const spread = calculateSpread(rawScores);

  let adjustedScores: number[];

  if (convergenceDetected) {
    // 수렴 감지: 평균에서의 거리를 증폭
    adjustedScores = rawScores.map((score) => {
      const distFromAvg = score - avg;

      // 평균 근처 점수 → 변동 증폭 (HFCP Load Leveling 역적용)
      if (Math.abs(distFromAvg) < CONVERGENCE_BAND / 2) {
        // 평균 수렴 구간: 랜덤성 제거를 위해 원래 방향으로 밀어냄
        const push = distFromAvg * DIVERGENCE_BOOST;
        return clamp(avg + push, 0, 100);
      }

      // 이탈 점수 → 가중치 증가 (의미있는 차이)
      return clamp(score + distFromAvg * (OUTLIER_WEIGHT - 1), 0, 100);
    });
  } else {
    // 수렴 아님: Spike Buffer 적용 (극단값 완충)
    const spikeThreshold = spread * 2;
    adjustedScores = rawScores.map((score) => {
      const distFromAvg = Math.abs(score - avg);
      if (distFromAvg > spikeThreshold) {
        // 극단값 완충: 60%만 반영
        const direction = score > avg ? 1 : -1;
        return avg + direction * (spikeThreshold + (distFromAvg - spikeThreshold) * 0.6);
      }
      return score;
    });
  }

  // 최종 점수: 가중 평균 (이탈 점수에 더 높은 가중치)
  const weights = adjustedScores.map((score) => {
    const dist = Math.abs(score - avg);
    // 평균에서 멀수록 가중치 높음 (수렴 방지)
    return 1.0 + (dist / 50) * (OUTLIER_WEIGHT - 1);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const finalScore = Math.round(
    adjustedScores.reduce((sum, score, i) => sum + score * weights[i], 0) / totalWeight
  );

  return {
    reviewScores: rawScores,
    adjustedScores: adjustedScores.map(Math.round),
    convergenceDetected,
    spreadFactor: Math.round(spread * 100) / 100,
    finalScore: clamp(finalScore, 0, 100),
    passed: finalScore >= PASS_THRESHOLD,
  };
}

/**
 * Calculate weighted checklist score from individual item results
 */
export function calculateChecklistScore(results: ChecklistResult[]): number {
  if (results.length === 0) return 0;

  const totalWeight = results.reduce((sum, r) => sum + r.item.weight, 0);
  const weightedScore = results.reduce((sum, r) => sum + r.score * r.item.weight, 0);

  return Math.round(weightedScore / totalWeight);
}

/**
 * Determine pass/fail for a single review based on checklist
 */
export function judgeReview(checklistScore: number): {
  status: "pass" | "warn" | "fail";
  message: string;
} {
  if (checklistScore >= PASS_THRESHOLD) {
    return {
      status: "pass",
      message: `✅ 통과 (${checklistScore}점 ≥ ${PASS_THRESHOLD}점)`,
    };
  }
  if (checklistScore >= PASS_THRESHOLD - 10) {
    return {
      status: "warn",
      message: `⚠️ 경고 (${checklistScore}점, 기준 ${PASS_THRESHOLD}점에 근접)`,
    };
  }
  return {
    status: "fail",
    message: `❌ 실패 (${checklistScore}점 < ${PASS_THRESHOLD}점)`,
  };
}

/**
 * Generate final verdict with anti-convergence applied
 */
export function generateFinalVerdict(
  reviewerScores: Array<{ reviewer: string; rawScore: number; checklistScore: number }>,
): {
  scoring: ScoringState;
  verdict: "pass" | "warn" | "fail";
  summary: string;
} {
  const rawScores = reviewerScores.map((r) => r.checklistScore);
  const scoring = applyAntiConvergence(rawScores);

  let verdict: "pass" | "warn" | "fail";
  if (scoring.passed) {
    verdict = "pass";
  } else if (scoring.finalScore >= PASS_THRESHOLD - 10) {
    verdict = "warn";
  } else {
    verdict = "fail";
  }

  // Summary
  const scoreDetails = reviewerScores
    .map((r, i) => `${r.reviewer}: ${r.rawScore}점 → ${scoring.adjustedScores[i]}점`)
    .join(", ");

  let summary = `최종 점수: ${scoring.finalScore}점 (기준: ${PASS_THRESHOLD}점)\n`;
  summary += `판정: ${verdict === "pass" ? "✅ 통과" : verdict === "warn" ? "⚠️ 조건부 통과" : "❌ 불통과"}\n`;
  summary += `리뷰어별: ${scoreDetails}\n`;

  if (scoring.convergenceDetected) {
    summary += `⚠️ 점수 수렴 감지 — anti-convergence 적용됨 (분산: ${scoring.spreadFactor})\n`;
  }

  const failedReviewers = reviewerScores.filter((r) => r.checklistScore < PASS_THRESHOLD);
  if (failedReviewers.length > 0) {
    summary += `불통과 리뷰어: ${failedReviewers.map((r) => `${r.reviewer}(${r.checklistScore}점)`).join(", ")}`;
  }

  return { scoring, verdict, summary };
}

// ── Utility ──

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
