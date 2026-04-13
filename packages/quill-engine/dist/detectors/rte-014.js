import { SyntaxKind } from 'ts-morph';
/** for (i <= arr.length) 스타일 off-by-one */
export const rte014Detector = {
    ruleId: 'RTE-014',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.ForStatement)
                return;
            const fs = node;
            const cond = fs.getCondition();
            if (!cond || cond.getKind() !== SyntaxKind.BinaryExpression)
                return;
            const be = cond;
            if (be.getOperatorToken().getKind() !== SyntaxKind.LessThanEqualsToken)
                return;
            const right = be.getRight();
            if (right.getKind() !== SyntaxKind.PropertyAccessExpression)
                return;
            const pa = right;
            if (pa.getName() !== 'length')
                return;
            findings.push({
                line: fs.getStartLineNumber(),
                message: 'for 조건 i <= .length — 보통 i < length 가 맞는지 확인 (off-by-one)',
            });
        });
        return findings;
    },
};
