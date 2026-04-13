import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: async
 */
export const asy013Detector = {
    ruleId: 'ASY-013', // Promise 생성자 async 콜백
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.NewExpression && node.getExpression().getText() === 'Promise') {
                const args = node.getArguments();
                if (args.length > 0 && (args[0].getKind() === SyntaxKind.ArrowFunction || args[0].getKind() === SyntaxKind.FunctionExpression)) {
                    if (args[0].hasModifier(SyntaxKind.AsyncKeyword)) {
                        findings.push({ line: node.getStartLineNumber(), message: 'Promise 생성자에 async 콜백 금지' });
                    }
                }
            }
        });
        return findings;
    }
};
