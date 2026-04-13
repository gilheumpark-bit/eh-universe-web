import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log016Detector = {
    ruleId: 'LOG-016', // 부동소수점 직접 비교
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.BinaryExpression) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '부동소수점 직접 비교 위반 의심'
                });
            }
        });
        return findings;
    }
};
