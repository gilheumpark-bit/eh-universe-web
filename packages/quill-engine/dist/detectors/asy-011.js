import { SyntaxKind } from 'ts-morph';
const SYNC_BLOCKING = new Set([
    'readFileSync',
    'writeFileSync',
    'appendFileSync',
    'readdirSync',
    'statSync',
    'lstatSync',
    'existsSync',
    'mkdirSync',
    'rmSync',
    'copyFileSync',
    'readSync',
    'writeSync',
    'execSync',
    'spawnSync',
    'execFileSync',
]);
/**
 * Phase / Rule Category: async
 * Node 동기 I/O / 블로킹 API 호출
 */
export const asy011Detector = {
    ruleId: 'ASY-011', // 동기 heavy computation — event loop 블로킹
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.CallExpression)
                return;
            const call = node;
            const callee = call.getExpression();
            let name;
            if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
                name = callee.getName();
            }
            else if (callee.getKind() === SyntaxKind.Identifier) {
                name = callee.getText();
            }
            if (name && SYNC_BLOCKING.has(name)) {
                findings.push({
                    line: call.getStartLineNumber(),
                    message: `동기 블로킹 API ${name}() 호출 (ASY-011). 비동기·스트리밍으로 바꾸는 것을 검토하세요.`,
                });
            }
        });
        return findings;
    },
};
