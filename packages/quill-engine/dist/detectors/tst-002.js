import { SyntaxKind } from 'ts-morph';
/**
 * TST-002: setTimeout 비결정적 테스트
 * 테스트 콜백 내부에서 setTimeout/setInterval 사용 시 보고.
 */
export const tst002Detector = {
    ruleId: 'TST-002',
    detect(sourceFile) {
        const findings = [];
        const testFn = /^(it|test)$/;
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.CallExpression)
                return;
            const call = node;
            const callee = call.getExpression().getText();
            if (!testFn.test(callee))
                return;
            const cb = call.getArguments()[1];
            if (!cb)
                return;
            cb.forEachDescendant((inner) => {
                if (inner.getKind() !== SyntaxKind.CallExpression)
                    return;
                const ic = inner;
                const name = ic.getExpression().getText();
                if (/^(setTimeout|setInterval)$/.test(name)) {
                    findings.push({
                        line: ic.getStartLineNumber(),
                        message: '테스트 내 setTimeout/setInterval — 비결정적 타이밍 의존',
                    });
                }
            });
        });
        return findings;
    },
};
