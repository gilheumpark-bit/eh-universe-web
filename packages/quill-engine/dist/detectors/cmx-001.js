import { SyntaxKind } from 'ts-morph';
/**
 * CMX-001: 함수 50줄 초과
 * Detects functions/methods whose body exceeds 50 lines.
 */
export const cmx001Detector = {
    ruleId: 'CMX-001',
    detect: (sourceFile) => {
        const findings = [];
        const MAX_LINES = 50;
        sourceFile.forEachDescendant(node => {
            const kind = node.getKind();
            if (kind === SyntaxKind.FunctionDeclaration ||
                kind === SyntaxKind.MethodDeclaration ||
                kind === SyntaxKind.ArrowFunction ||
                kind === SyntaxKind.FunctionExpression) {
                const body = node.getBody?.();
                if (body) {
                    const startLine = body.getStartLineNumber();
                    const endLine = body.getEndLineNumber();
                    const lineCount = endLine - startLine + 1;
                    if (lineCount > MAX_LINES) {
                        const name = node.getName?.() ?? '(anonymous)';
                        findings.push({
                            line: node.getStartLineNumber(),
                            message: `함수 '${name}'이(가) ${lineCount}줄로 ${MAX_LINES}줄 제한을 초과합니다.`,
                        });
                    }
                }
            }
        });
        return findings;
    },
};
