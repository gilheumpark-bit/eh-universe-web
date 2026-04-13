import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: logic
 */
export const log010Detector = {
    ruleId: 'LOG-010', // guard clause 부재
    detect: (sourceFile) => {
        const findings = [];
        // AST 탐색 
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.IfStatement) {
                // 정밀 판별(휴리스틱)
                findings.push({
                    line: node.getStartLineNumber(),
                    message: 'guard clause 부재 위반 의심'
                });
            }
        });
        return findings;
    }
};
