import { SyntaxKind } from 'ts-morph';
import { isWhileTrueOrForEver, loopBodyLacksExit } from './rte-helpers';
function statementExitsLoop(st) {
    const k = st.getKind();
    return (k === SyntaxKind.BreakStatement ||
        k === SyntaxKind.ReturnStatement ||
        k === SyntaxKind.ThrowStatement);
}
export const rte011Detector = {
    ruleId: 'RTE-011',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (!isWhileTrueOrForEver(node))
                return;
            if (node.getKind() === SyntaxKind.WhileStatement) {
                const st = node.getStatement();
                if (st.getKind() === SyntaxKind.Block) {
                    if (!loopBodyLacksExit(st))
                        return;
                }
                else if (statementExitsLoop(st))
                    return;
            }
            else if (node.getKind() === SyntaxKind.ForStatement) {
                const st = node.getStatement();
                if (st.getKind() === SyntaxKind.Block) {
                    if (!loopBodyLacksExit(st))
                        return;
                }
                else if (statementExitsLoop(st))
                    return;
            }
            findings.push({
                line: node.getStartLineNumber(),
                message: '무한 루프 의심 — while(true)/for(;;) 에 break/return/throw 없음',
            });
        });
        return findings;
    },
};
