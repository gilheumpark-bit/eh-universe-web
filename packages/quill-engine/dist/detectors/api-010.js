import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: api-misuse
 */
export const api010Detector = {
    ruleId: 'API-010', // innerHTML 직접 할당
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.BinaryExpression && node.getText().includes('.innerHTML =')) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: 'innerHTML 직접 할당 위반 의심'
                });
            }
        });
        return findings;
    }
};
