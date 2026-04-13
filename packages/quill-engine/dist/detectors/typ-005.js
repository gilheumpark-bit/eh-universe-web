import { SyntaxKind } from 'ts-morph';
/**
 * Phase / Rule Category: type
 */
export const typ005Detector = {
    ruleId: 'TYP-005', // {} empty object type
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() === SyntaxKind.TypeLiteral) {
                const tl = node;
                if (tl.getMembers().length === 0) {
                    findings.push({ line: node.getStartLineNumber(), message: '{} empty object type' });
                }
            }
        });
        return findings;
    },
};
