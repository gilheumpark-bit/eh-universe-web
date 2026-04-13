import { SyntaxKind } from 'ts-morph';
function branchReturnsWithValue(stmt) {
    if (stmt.getKind() === SyntaxKind.Block) {
        const block = stmt;
        const stmts = block.getStatements();
        if (stmts.length === 0)
            return false;
        const last = stmts[stmts.length - 1];
        if (last.getKind() !== SyntaxKind.ReturnStatement)
            return false;
        return !!last.getExpression();
    }
    if (stmt.getKind() === SyntaxKind.ReturnStatement) {
        return !!stmt.getExpression();
    }
    return false;
}
function scanBlockForIfFallthrough(block, findings) {
    const stmts = block.getStatements();
    for (let i = 0; i < stmts.length; i++) {
        const stmt = stmts[i];
        if (stmt.getKind() !== SyntaxKind.IfStatement)
            continue;
        const ifs = stmt;
        if (ifs.getElseStatement())
            continue;
        if (!branchReturnsWithValue(ifs.getThenStatement()))
            continue;
        if (i < stmts.length - 1) {
            findings.push({
                line: ifs.getStartLineNumber(),
                message: 'async 함수에서 if 분기만 값을 반환하고 이후 코드가 실행될 수 있습니다 (ASY-004). else 또는 통합 return을 검토하세요.',
            });
        }
    }
}
function checkAsyncLike(body, findings) {
    if (!body)
        return;
    scanBlockForIfFallthrough(body, findings);
}
/**
 * Phase / Rule Category: async
 * async 함수에서 if(조건) return 값; 만 있고 else 없이 뒤에 문이 이어지는 패턴 (경로별 반환 누락 가능)
 */
export const asy004Detector = {
    ruleId: 'ASY-004', // async 함수 명시적 return 누락
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.getFunctions().forEach((func) => {
            if (!func.isAsync())
                return;
            checkAsyncLike(func.getBody(), findings);
        });
        sourceFile.getClasses().forEach((c) => {
            c.getMethods().forEach((m) => {
                if (!m.hasModifier(SyntaxKind.AsyncKeyword))
                    return;
                checkAsyncLike(m.getBody(), findings);
            });
        });
        sourceFile.getVariableDeclarations().forEach((vd) => {
            const init = vd.getInitializer();
            if (!init || init.getKind() !== SyntaxKind.ArrowFunction)
                return;
            const fn = init;
            if (!fn.hasModifier(SyntaxKind.AsyncKeyword))
                return;
            const b = fn.getBody();
            if (b.getKind() === SyntaxKind.Block) {
                scanBlockForIfFallthrough(b, findings);
            }
        });
        return findings;
    },
};
