import { SyntaxKind } from 'ts-morph';
import { expressionRootHasOptionalChain, typeHasUndefined, } from './rte-helpers';
export const rte002Detector = {
    ruleId: 'RTE-002',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.PropertyAccessExpression)
                return;
            const pae = node;
            if (expressionRootHasOptionalChain(pae))
                return;
            const expr = pae.getExpression();
            try {
                const t = expr.getType();
                if (typeHasUndefined(t)) {
                    findings.push({
                        line: pae.getStartLineNumber(),
                        message: 'undefined 가능 타입에 대한 직접 속성 접근 — ?. 또는 검사 권장',
                    });
                }
            }
            catch {
                /* ignore */
            }
        });
        return findings;
    },
};
