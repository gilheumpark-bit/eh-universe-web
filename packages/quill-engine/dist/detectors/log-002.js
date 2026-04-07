import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log002Detector = {
    ruleId: 'LOG-002', // != loose inequality
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.BinaryExpression && node.getOperatorToken().getKind() === SyntaxKind.ExclamationEqualsToken) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '!= loose inequality 위반 의심'
                });
            }
        });
        return findings;
    }
};
