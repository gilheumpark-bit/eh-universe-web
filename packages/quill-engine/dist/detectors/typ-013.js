import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: type
 */
export const typ013Detector = {
    ruleId: 'TYP-013', // noImplicitAny 위반
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.Parameter)
                return;
            const p = node;
            if (p.getDotDotDotToken())
                return;
            if (p.getName() === 'this')
                return;
            const nameNode = p.getNameNode();
            if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern || nameNode.getKind() === SyntaxKind.ArrayBindingPattern) {
                return;
            }
            if (!p.getTypeNode() && !p.getInitializer()) {
                findings.push({ line: node.getStartLineNumber(), message: '파라미터 타입 미표기 (noImplicitAny)' });
            }
        });
        return findings;
    },
};
