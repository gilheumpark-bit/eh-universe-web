import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log001Detector = {
    ruleId: 'LOG-001', // == loose equality
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.BinaryExpression && node.getOperatorToken().getKind() === SyntaxKind.EqualsEqualsToken) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '== loose equality 위반 의심'
                });
            }
        });
        return findings;
    }
};
