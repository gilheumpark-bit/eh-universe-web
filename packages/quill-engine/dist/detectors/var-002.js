import { VariableDeclarationKind } from 'ts-morph';
/**
 * VAR-002: var 호이스팅 의존 — let/const 권장
 * Severity: medium | Confidence: high | Engine: ast
 */
export const var002Detector = {
    ruleId: 'VAR-002',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.getVariableStatements().forEach(stmt => {
            if (stmt.getDeclarationKind() === VariableDeclarationKind.Var) {
                findings.push({ line: stmt.getStartLineNumber(), message: 'var 사용 — let/const 권장' });
            }
        });
        return findings;
    },
};
