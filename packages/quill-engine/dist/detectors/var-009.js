import { SyntaxKind } from 'ts-morph';
export const var009Detector = {
    ruleId: 'VAR-009',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant(node => {
            if (node.getKind() !== SyntaxKind.ForStatement)
                return;
            const init = node.getInitializer?.();
            if (init?.getText().startsWith('var ')) {
                const body = node.getStatement?.()?.getText() || '';
                if (body.includes('=>') || body.includes('function'))
                    findings.push({ line: node.getStartLineNumber(), message: 'for(var) closure capture risk' });
            }
        });
        return findings;
    },
};
