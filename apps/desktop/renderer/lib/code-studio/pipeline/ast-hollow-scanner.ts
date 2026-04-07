// ============================================================
// Gate 1: AST Hollow Code Scanner — 빈깡통 감지기
// ============================================================
// 구조적으로 존재하지만 실제로 아무것도 안 하는 코드를 감지.
// - 빈 함수 (body 없음)
// - 사용 안 되는 매개변수
// - 더미 리턴 (return null, return undefined, return {})
// - pass/noop 패턴
// - export만 하고 호출 안 되는 함수

export interface HollowCodeFinding {
  type: 'empty-function' | 'unused-param' | 'dummy-return' | 'noop-catch' | 'dead-export' | 'stub-implementation';
  file: string;
  line: number;
  name: string;
  message: string;
  severity: 'error' | 'warning';
}

/** 코드에서 빈깡통 패턴 감지 */
export function scanForHollowCode(code: string, fileName: string = 'unknown'): HollowCodeFinding[] {
  const findings: HollowCodeFinding[] = [];
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // 빈 함수: function foo() {} 또는 () => {}
    if (/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>)\s*\{\s*\}/.test(trimmed)) {
      const nameMatch = trimmed.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+))/);
      findings.push({
        type: 'empty-function',
        file: fileName, line: lineNum,
        name: nameMatch?.[1] || nameMatch?.[2] || 'anonymous',
        message: `Empty function body — does nothing`,
        severity: 'error',
      });
    }

    // 더미 리턴: return null, return undefined, return {}, return []
    if (/^\s*return\s+(null|undefined|\{\s*\}|\[\s*\])\s*;?\s*$/.test(trimmed)) {
      // 함수 전체가 이 return만 있는지 확인 (이전 줄이 함수 선언)
      const prevLines = lines.slice(Math.max(0, i - 3), i).join(' ');
      if (/(?:function|=>)\s*\{/.test(prevLines)) {
        findings.push({
          type: 'dummy-return',
          file: fileName, line: lineNum,
          name: '',
          message: `Dummy return (${trimmed.trim()}) — function may be a stub`,
          severity: 'warning',
        });
      }
    }

    // 빈 catch: catch { } 또는 catch(e) { }  (주석 없으면 경고)
    if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(trimmed)) {
      findings.push({
        type: 'noop-catch',
        file: fileName, line: lineNum,
        name: '',
        message: `Empty catch block — errors silently swallowed without explanation`,
        severity: 'warning',
      });
    }

    // TODO/FIXME가 있는 빈 구현
    if (/\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK|\/\/\s*XXX/.test(trimmed)) {
      // 다음 줄이 return null이나 빈 줄이면 스텁
      const nextLine = lines[i + 1]?.trim() || '';
      if (/^return\s+(null|undefined|\{\}|\[\])/.test(nextLine) || nextLine === '}' || nextLine === '') {
        findings.push({
          type: 'stub-implementation',
          file: fileName, line: lineNum,
          name: '',
          message: `TODO/FIXME followed by stub — unfinished implementation`,
          severity: 'error',
        });
      }
    }

    // 미사용 매개변수: _prefix 없는 파라미터가 함수 body에서 안 쓰이는 패턴
    const fnMatch = trimmed.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?)\(([^)]+)\)/);
    if (fnMatch) {
      const params = fnMatch[1].split(',').map(p => p.trim().replace(/[:=].*/, '').replace(/\.\.\./g, '').trim()).filter(p => p && !p.startsWith('_'));
      // 함수 body를 다음 몇 줄에서 확인
      const bodyLines = lines.slice(i + 1, Math.min(i + 30, lines.length)).join(' ');
      for (const param of params) {
        if (param.length < 2) continue; // 너무 짧은 이름은 스킵
        const paramRegex = new RegExp(`\\b${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (!paramRegex.test(bodyLines)) {
          findings.push({
            type: 'unused-param',
            file: fileName, line: lineNum,
            name: param,
            message: `Parameter '${param}' is declared but never used in function body`,
            severity: 'warning',
          });
        }
      }
    }
  }

  return findings;
}

/** 여러 파일을 스캔하고 결과 합산 */
export function scanProjectForHollowCode(files: Array<{ path: string; content: string }>): {
  findings: HollowCodeFinding[];
  score: number;
  grade: string;
} {
  const findings: HollowCodeFinding[] = [];
  for (const file of files) {
    if (!file.path.match(/\.(ts|tsx|js|jsx)$/)) continue;
    findings.push(...scanForHollowCode(file.content, file.path));
  }

  const errorCount = findings.filter(f => f.severity === 'error').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const score = Math.max(0, 100 - errorCount * 15 - warningCount * 5);
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  return { findings, score, grade };
}
