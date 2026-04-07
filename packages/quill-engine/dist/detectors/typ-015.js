import { SyntaxKind } from 'ts-morph';
function peelExpr(node) {
    let n = node;
    while (n.getKind() === SyntaxKind.ParenthesizedExpression) {
        const inner = n.getExpression();
        n = inner;
    }
    return n;
}
/**
 * 객체 리터럴·배열 리터럴에 대한 불필요한 optional chaining
 * Phase / Rule Category: type
 */
export const typ015Detector = {
    ruleId: 'TYP-015', // optional chaining 과용
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.PropertyAccessExpression)
                return;
            const pae = node;
            const q = pae.compilerNode.questionDotToken;
            if (!q)
                return;
            const inner = peelExpr(pae.getExpression());
            const k = inner.getKind();
            if (k === SyntaxKind.ObjectLiteralExpression || k === SyntaxKind.ArrayLiteralExpression) {
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '리터럴에 대한 optional chaining — 불필요할 수 있음',
                });
            }
        });
        return findings;
    },
};
