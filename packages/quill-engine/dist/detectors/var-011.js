import { SyntaxKind } from 'ts-morph';
export const var011Detector = {
    ruleId: 'VAR-011',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant(node => {
            if (node.getKind() === SyntaxKind.BinaryExpression) {
                const t = node.getText();
                if (/^(window|globalThis)\.\w+\s*=/.test(t))
                    findings.push({ line: node.getStartLineNumber(), message: 'global pollution: ' + t.slice(0, 40) });
            }
        });
        return findings;
    },
};
