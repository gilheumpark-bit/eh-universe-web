import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: api-misuse
 */
export const api008Detector = {
    ruleId: 'API-008', // new Function() 사용
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Function(')) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: 'new Function() 사용 위반 의심'
                });
            }
        });
        return findings;
    }
};
