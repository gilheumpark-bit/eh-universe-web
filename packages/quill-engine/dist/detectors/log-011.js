import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log011Detector = {
    ruleId: 'LOG-011', // .sort() comparator 없음
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.CallExpression && node.getText().includes('.sort()')) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '.sort() comparator 없음 위반 의심'
                });
            }
        });
        return findings;
    }
};
