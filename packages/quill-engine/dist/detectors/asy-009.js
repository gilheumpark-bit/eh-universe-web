import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: async
 * addEventListener(리터럴 이벤트)는 있는데 같은 이벤트 문자열의 removeEventListener가 파일에 없음
 */
export const asy009Detector = {
    ruleId: 'ASY-009', // event listener 제거 누락
    detect: (sourceFile) => {
        const findings = [];
        const removeEvents = new Set();
        const addLines = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.CallExpression)
                return;
            const call = node;
            const callee = call.getExpression();
            if (callee.getKind() !== SyntaxKind.PropertyAccessExpression)
                return;
            const prop = callee.getText();
            if (!prop.endsWith('.addEventListener') && !prop.endsWith('.removeEventListener'))
                return;
            const args = call.getArguments();
            if (args.length < 2)
                return;
            const ev = args[0];
            if (ev.getKind() !== SyntaxKind.StringLiteral)
                return;
            const eventName = ev.getLiteralValue();
            if (prop.endsWith('.addEventListener')) {
                addLines.push({ line: call.getStartLineNumber(), event: eventName });
            }
            else {
                removeEvents.add(eventName);
            }
        });
        for (const { line, event } of addLines) {
            if (!removeEvents.has(event)) {
                findings.push({
                    line,
                    message: `addEventListener('${event}')에 대응하는 removeEventListener가 보이지 않습니다 (ASY-009).`,
                });
            }
        }
        return findings;
    },
};
