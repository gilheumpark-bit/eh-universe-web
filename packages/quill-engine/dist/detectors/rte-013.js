import { SyntaxKind } from 'ts-morph';
/** 동일 인자로 중첩된 자기 호출 foo(foo(...)) — 스택 위험 휴리스틱 */
export const rte013Detector = {
    ruleId: 'RTE-013',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.CallExpression)
                return;
            const outer = node;
            const ex = outer.getExpression();
            if (ex.getKind() !== SyntaxKind.Identifier)
                return;
            const name = ex.getText();
            for (const arg of outer.getArguments()) {
                if (arg.getKind() !== SyntaxKind.CallExpression)
                    continue;
                const inner = arg;
                const iex = inner.getExpression();
                if (iex.getKind() === SyntaxKind.Identifier && iex.getText() === name) {
                    findings.push({
                        line: outer.getStartLineNumber(),
                        message: `깊은 재귀 호출 패턴 ${name}(${name}(...)) — 스택 오버플로 위험 검토`,
                    });
                    return;
                }
            }
        });
        return findings;
    },
};
