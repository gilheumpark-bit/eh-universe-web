// ============================================================
// Frontend Gate 1: 5-State + Dead DOM Scanner
// ============================================================
// AI가 만든 UI 코드에서:
//   1. 5가지 상태(Idle/Loading/Empty/Error/Success) 분기 누락 감지
//   2. Dead DOM 사냥 (onClick 없는 button, href 없는 a 등)

export interface FrontendGateFinding {
  type: 'missing-state' | 'dead-dom' | 'dead-form' | 'dead-link';
  element: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

// ── 5-State Enforcement ──

const REQUIRED_STATES = [
  { pattern: /isLoading|loading|isPending|isFetching|skeleton/i, name: 'Loading' },
  { pattern: /isEmpty|\.length\s*===?\s*0|no\s*data|no\s*results|검색\s*결과/i, name: 'Empty' },
  { pattern: /isError|error|onError|catch|fail|실패/i, name: 'Error' },
] as const;

/** 5-State 분기 누락 검사 — 데이터 패칭 컴포넌트에서만 */
export function scan5States(code: string, _fileName: string = 'unknown'): FrontendGateFinding[] {
  const findings: FrontendGateFinding[] = [];

  // 데이터 패칭 패턴이 있는지 (fetch, useQuery, axios, API 호출)
  const hasFetching = /fetch\(|useQuery|useSWR|axios\.|\.get\(|\.post\(|api\/|getServerSide/i.test(code);
  if (!hasFetching) return []; // 데이터 패칭 없으면 스킵

  for (const state of REQUIRED_STATES) {
    if (!state.pattern.test(code)) {
      findings.push({
        type: 'missing-state',
        element: state.name,
        line: 0,
        message: `[5-State] "${state.name}" 상태 처리 분기가 없습니다. 데이터 패칭 코드가 있지만 ${state.name} 상태일 때의 UI가 정의되지 않았습니다.`,
        severity: 'error',
      });
    }
  }

  return findings;
}

// ── Dead DOM Scanner ──

interface _DOMElement {
  tag: string;
  line: number;
  hasOnClick: boolean;
  hasOnChange: boolean;
  hasHref: boolean;
  hasAction: boolean;
  hasType: boolean;
}

/** JSX에서 인터랙티브 요소 추출 + Dead DOM 감지 */
export function scanDeadDOM(code: string, _fileName: string = 'unknown'): FrontendGateFinding[] {
  const findings: FrontendGateFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // <button> without onClick
    if (/<button\b/.test(line)) {
      // 다음 몇 줄까지 확인 (멀티라인 JSX)
      const chunk = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
      if (!/onClick|on[A-Z]\w*=|type\s*=\s*["']submit/.test(chunk) && !/<\/button>/.test(line)) {
        findings.push({
          type: 'dead-dom',
          element: '<button>',
          line: lineNum,
          message: `Dead Button: onClick 이벤트가 없는 버튼입니다. 클릭해도 아무 일도 일어나지 않습니다.`,
          severity: 'error',
        });
      }
    }

    // <a> without href
    if (/<a\b/.test(line) && !/<a\s[^>]*href\s*=/.test(line)) {
      const chunk = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
      if (!/href\s*=/.test(chunk) && !/onClick/.test(chunk)) {
        findings.push({
          type: 'dead-link',
          element: '<a>',
          line: lineNum,
          message: `Dead Link: href도 onClick도 없는 링크입니다. 클릭할 수 없습니다.`,
          severity: 'error',
        });
      }
    }

    // <input> without onChange/value binding
    if (/<input\b/.test(line) && !/type\s*=\s*["'](?:submit|hidden|button)/.test(line)) {
      const chunk = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
      if (!/onChange|onInput|value\s*=|defaultValue|ref\s*=|register/.test(chunk)) {
        findings.push({
          type: 'dead-dom',
          element: '<input>',
          line: lineNum,
          message: `Dead Input: 값 바인딩(onChange/value)이 없는 입력 필드입니다. 입력해도 상태에 반영되지 않습니다.`,
          severity: 'error',
        });
      }
    }

    // <form> without onSubmit
    if (/<form\b/.test(line)) {
      const chunk = lines.slice(i, Math.min(i + 5, lines.length)).join(' ');
      if (!/onSubmit|action\s*=|handleSubmit/.test(chunk)) {
        findings.push({
          type: 'dead-form',
          element: '<form>',
          line: lineNum,
          message: `Dead Form: onSubmit 핸들러가 없는 폼입니다. 제출해도 아무 일도 일어나지 않습니다.`,
          severity: 'error',
        });
      }
    }

    // <select> without onChange
    if (/<select\b/.test(line)) {
      const chunk = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
      if (!/onChange|value\s*=|defaultValue/.test(chunk)) {
        findings.push({
          type: 'dead-dom',
          element: '<select>',
          line: lineNum,
          message: `Dead Select: onChange가 없는 드롭다운입니다. 선택해도 반영되지 않습니다.`,
          severity: 'warning',
        });
      }
    }
  }

  return findings;
}

/** Gate 1 전체 실행 */
export function runFrontendGate1(code: string, fileName: string = 'unknown'): {
  findings: FrontendGateFinding[];
  passed: boolean;
  score: number;
} {
  const findings = [
    ...scan5States(code, fileName),
    ...scanDeadDOM(code, fileName),
  ];

  const errorCount = findings.filter(f => f.severity === 'error').length;
  const score = Math.max(0, 100 - errorCount * 20);

  return { findings, passed: errorCount === 0, score };
}
