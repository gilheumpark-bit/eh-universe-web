import { SyntaxKind } from 'ts-morph';
function checkFunctionLike(findings, fn) {
    if (fn.getKind() === SyntaxKind.MethodDeclaration) {
        const n = fn.getName?.();
        if (n === 'constructor')
            return;
    }
    if (!fn.getReturnTypeNode()) {
        findings.push({ line: fn.getStartLineNumber(), message: '함수·메서드 반환 타입 미선언' });
    }
}
/**
 * Phase / Rule Category: type
 */
export const typ002Detector = {
    ruleId: 'TYP-002', // 함수 반환 타입 미선언
    detect: (sourceFile) => {
        const findings = [];
        for (const func of sourceFile.getFunctions()) {
            checkFunctionLike(findings, func);
        }
        for (const cls of sourceFile.getClasses()) {
            for (const method of cls.getMethods()) {
                checkFunctionLike(findings, method);
            }
        }
        for (const decl of sourceFile.getVariableDeclarations()) {
            const init = decl.getInitializer();
            if (!init)
                continue;
            if (init.getKind() === SyntaxKind.ArrowFunction || init.getKind() === SyntaxKind.FunctionExpression) {
                checkFunctionLike(findings, init);
            }
        }
        return findings;
    },
};
