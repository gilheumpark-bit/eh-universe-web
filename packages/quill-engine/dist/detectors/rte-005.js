import { SyntaxKind } from 'ts-morph';
import { isArrayLengthAsIndex } from './rte-helpers';
/** arr[arr.length] — 대개 범위 밖(일반적으로 length-1까지) */
export const rte005Detector = {
    ruleId: 'RTE-005',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.ElementAccessExpression)
                return;
            const ea = node;
            if (isArrayLengthAsIndex(ea)) {
                findings.push({
                    line: ea.getStartLineNumber(),
                    message: 'arr[arr.length] — 유효 인덱스는 0..length-1. off-by-one 가능성',
                });
            }
        });
        return findings;
    },
};
