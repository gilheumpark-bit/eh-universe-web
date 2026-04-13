import { SyntaxKind } from 'ts-morph';
/** 자기 호출만 있고 if/switch 분기가 전혀 없는 재귀 */
export const rte012Detector = {
    ruleId: 'RTE-012',
    detect: (sourceFile) => {
        const findings = [];
        for (const fn of sourceFile.getFunctions()) {
            const name = fn.getName();
            if (!name)
                continue;
            const body = fn.getBody();
            if (!body || body.getKind() !== SyntaxKind.Block)
                continue;
            const block = body;
            if (block.getDescendantsOfKind(SyntaxKind.IfStatement).length > 0)
                continue;
            if (block.getDescendantsOfKind(SyntaxKind.SwitchStatement).length > 0)
                continue;
            let selfCall = false;
            block.forEachDescendant((n) => {
                if (n.getKind() !== SyntaxKind.CallExpression)
                    return;
                const ce = n;
                const ex = ce.getExpression();
                if (ex.getKind() === SyntaxKind.Identifier && ex.getText() === name)
                    selfCall = true;
            });
            if (selfCall) {
                findings.push({
                    line: fn.getStartLineNumber(),
                    message: `재귀 '${name}' 에 종료 분기(if/switch) 없음 — base case 검토`,
                });
            }
        }
        return findings;
    },
};
