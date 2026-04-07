import { SyntaxKind } from 'ts-morph';
function argsIncludeCause(args) {
    return args.length >= 2 && args[1].getText().includes('cause');
}
function throwsAwayCaughtError(throwStmt, binding) {
    const expr = throwStmt.getExpression();
    if (expr.getKind() !== SyntaxKind.NewExpression)
        return false;
    const ne = expr;
    const ctor = ne.getExpression().getText();
    if (!/^(Error|TypeError|RangeError|SyntaxError|ReferenceError|AggregateError)$/.test(ctor))
        return false;
    const args = ne.getArguments();
    if (argsIncludeCause(args))
        return false;
    if (args.length < 1)
        return false;
    const a0 = args[0];
    const k = a0.getKind();
    if (k === SyntaxKind.StringLiteral || k === SyntaxKind.NoSubstitutionTemplateLiteral)
        return true;
    if (a0.getText() === `${binding}.message`)
        return true;
    if (k === SyntaxKind.TemplateExpression) {
        return !a0.getText().includes(binding);
    }
    return false;
}
/**
 * Phase / Rule Category: error-handling
 * catch에서 원본 예외 체인을 끊는 재throw만 탐지 (전체 catch 대상 아님)
 */
export const err003Detector = {
    ruleId: 'ERR-003', // catch 정보 손실
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.CatchClause)
                return;
            const cc = node;
            const binding = cc.getVariableDeclaration()?.getName();
            if (!binding)
                return;
            cc.getBlock().forEachDescendant((n) => {
                if (n.getKind() !== SyntaxKind.ThrowStatement)
                    return;
                if (throwsAwayCaughtError(n, binding)) {
                    findings.push({
                        line: n.getStartLineNumber(),
                        message: 'catch에서 원본 예외 없이 new Error(문자열만)로 재throw하여 원인 체인이 끊길 수 있습니다. { cause } 또는 원본 throw를 검토하세요 (ERR-003).',
                    });
                }
            });
        });
        return findings;
    },
};
