import { SyntaxKind, } from 'ts-morph';
/** 민감 키워드가 에러 문자열에 직접 들어간 경우만 (전체 throw 금지가 아님) */
const SENSITIVE_IN_MESSAGE = /\b(password|passwd|pwd|secret|api[_-]?key|private[_-]?key|access[_-]?token|bearer\s|authorization\s*:)/i;
/** throw new Error(password) 등 식별자명이 민감한 경우 */
export function sensitiveIdentifierInThrownExpr(expr) {
    const SENSITIVE_NAMES = /^(password|passwd|apiKey|api[_-]?key|secret|token|accessToken|refreshToken|auth|bearer)$/i;
    if (expr.getKind() === SyntaxKind.NewExpression) {
        const ne = expr;
        for (const a of ne.getArguments()) {
            if (a.getKind() === SyntaxKind.Identifier && SENSITIVE_NAMES.test(a.getText()))
                return true;
        }
    }
    return false;
}
export function sensitiveLiteralInExpression(expr) {
    const k = expr.getKind();
    if (k === SyntaxKind.StringLiteral || k === SyntaxKind.NoSubstitutionTemplateLiteral) {
        return SENSITIVE_IN_MESSAGE.test(expr.getText());
    }
    if (k === SyntaxKind.TemplateExpression) {
        return SENSITIVE_IN_MESSAGE.test(expr.getText());
    }
    if (k === SyntaxKind.NewExpression) {
        const ne = expr;
        for (const a of ne.getArguments()) {
            const ak = a.getKind();
            if (ak === SyntaxKind.StringLiteral ||
                ak === SyntaxKind.NoSubstitutionTemplateLiteral ||
                ak === SyntaxKind.TemplateExpression) {
                if (SENSITIVE_IN_MESSAGE.test(a.getText()))
                    return true;
            }
        }
    }
    return false;
}
export function tryNestingDepth(tryNode) {
    let d = 0;
    let p = tryNode;
    while (p) {
        if (p.getKind() === SyntaxKind.TryStatement)
            d++;
        p = p.getParent();
    }
    return d;
}
export function isUnawaitedPromiseCall(call) {
    let cur = call;
    while (cur) {
        if (cur.getKind() === SyntaxKind.AwaitExpression)
            return false;
        cur = cur.getParent();
    }
    const expr = call.getExpression();
    const t = expr.getText();
    if (t === 'fetch' || t.endsWith('.fetch'))
        return true;
    if (expr.getKind() === SyntaxKind.ImportKeyword)
        return true;
    return false;
}
/** 응답/클라이언트로 stack이 새는 패턴만 (console.* 제외) */
export function isUserFacingStackLeak(stackAccess) {
    if (stackAccess.getName() !== 'stack')
        return false;
    let cur = stackAccess;
    while (cur) {
        if (cur.getKind() === SyntaxKind.CallExpression) {
            const call = cur;
            const callee = call.getExpression().getText();
            if (/^console\./.test(callee))
                return false;
            if (/\.\s*(json|send|end|write)\s*$/.test(callee) || /\b(json|send)\s*\(/.test(callee))
                return true;
            if (/^res\.|^response\.|^reply\./.test(callee))
                return true;
        }
        cur = cur.getParent();
    }
    return false;
}
export function catchHasTypeNarrowing(c) {
    const name = c.getVariableDeclaration()?.getName();
    if (!name)
        return true;
    const txt = c.getBlock().getFullText();
    if (/\binstanceof\b/.test(txt))
        return true;
    if (new RegExp(`\\b${name}\\s+is\\s+`).test(txt))
        return true;
    if (new RegExp(`\\bError\\.isError\\s*\\(\\s*${name}\\s*\\)`).test(txt))
        return true;
    return false;
}
export function reactBusyNotResetInCatch(c) {
    const tryStmt = c.getParent();
    if (tryStmt?.getKind() !== SyntaxKind.TryStatement)
        return false;
    const ts = tryStmt;
    const tryText = ts.getTryBlock().getText();
    const catchText = c.getBlock().getText();
    const busyOn = /set(Loading|Busy|Submitting)\s*\(\s*true\s*\)/.test(tryText);
    if (!busyOn)
        return false;
    if (/set(Loading|Busy|Submitting)\s*\(\s*false\s*\)/.test(catchText))
        return false;
    const fin = ts.getFinallyBlock();
    if (fin && /set(Loading|Busy|Submitting)\s*\(\s*false\s*\)/.test(fin.getText()))
        return false;
    return true;
}
