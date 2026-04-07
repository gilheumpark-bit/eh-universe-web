import { SyntaxKind } from 'ts-morph';
export const rte010Detector = {
    ruleId: 'RTE-010',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.BinaryExpression)
                return;
            const be = node;
            const op = be.getOperatorToken().getKind();
            if (op !== SyntaxKind.SlashToken && op !== SyntaxKind.PercentToken)
                return;
            const right = be.getRight();
            if (right.getKind() === SyntaxKind.NumericLiteral && right.getText().trim() === '0') {
                findings.push({
                    line: be.getStartLineNumber(),
                    message: '0으로 나눗셈/나머지 — 런타임 Infinity/NaN',
                });
            }
        });
        return findings;
    },
};
