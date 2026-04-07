import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: async
 */
export const asy005Detector = {
    ruleId: 'ASY-005', // .then() + async/await 혼용
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.getFunctions().forEach(func => {
            if (func.isAsync()) {
                func.forEachDescendant(node => {
                    if (node.getKind() === SyntaxKind.PropertyAccessExpression && node.getName() === 'then') {
                        findings.push({ line: node.getStartLineNumber(), message: '.then() + async/await 혼용' });
                    }
                });
            }
        });
        return findings;
    }
};
