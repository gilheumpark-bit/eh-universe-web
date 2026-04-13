import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log015Detector = {
    ruleId: 'LOG-015', // 문자열 + 숫자 연결 오류
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.BinaryExpression && node.getOperatorToken().getKind() === SyntaxKind.PlusToken) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '문자열 + 숫자 연결 오류 위반 의심'
                });
            }
        });
        return findings;
    }
};
