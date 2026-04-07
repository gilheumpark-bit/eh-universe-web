import { SyntaxKind } from 'ts-morph';
function isAddEventListenerCall(node) {
    if (node.getKind() !== SyntaxKind.CallExpression)
        return false;
    const call = node;
    const ex = call.getExpression();
    if (ex.getKind() !== SyntaxKind.PropertyAccessExpression)
        return false;
    return ex.getName() === 'addEventListener';
}
function isInsideLoop(node) {
    let p = node.getParent();
    while (p) {
        const k = p.getKind();
        if (k === SyntaxKind.ForStatement ||
            k === SyntaxKind.ForOfStatement ||
            k === SyntaxKind.ForInStatement ||
            k === SyntaxKind.WhileStatement ||
            k === SyntaxKind.DoStatement) {
            return true;
        }
        p = p.getParent();
    }
    return false;
}
/**
 * Phase / Rule Category: async
 * 루프 내부 addEventListener — 중복 등록 위험
 */
export const asy010Detector = {
    ruleId: 'ASY-010', // event listener 중복 등록
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (!isAddEventListenerCall(node))
                return;
            if (isInsideLoop(node)) {
                findings.push({
                    line: node.getStartLineNumber(),
                    message: '루프 안에서 addEventListener가 호출됩니다 (ASY-010). 리스너가 중복 등록될 수 있습니다.',
                });
            }
        });
        return findings;
    },
};
