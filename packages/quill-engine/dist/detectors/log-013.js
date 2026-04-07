import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log013Detector = {
    ruleId: 'LOG-013', // .filter().map() vs .reduce()
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.CallExpression && node.getText().includes('.filter(') && node.getText().includes('.map(')) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '.filter().map() vs .reduce() 위반 의심'
                });
            }
        });
        return findings;
    }
};
