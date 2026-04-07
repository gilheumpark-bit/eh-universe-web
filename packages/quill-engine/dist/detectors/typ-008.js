import { SyntaxKind } from 'ts-morph';
/**
 * nullable 타입에 대해 optional chaining 없이 속성 접근 (휴리스틱)
 * Phase / Rule Category: type
 */
export const typ008Detector = {
    ruleId: 'TYP-008', // union null|undefined 미처리
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.forEachDescendant((node) => {
            if (node.getKind() !== SyntaxKind.PropertyAccessExpression)
                return;
            const pae = node;
            // optional chain — 제외
            const questionDot = pae.compilerNode.questionDotToken;
            if (questionDot)
                return;
            const expr = pae.getExpression();
            try {
                const t = expr.getType();
                if (t.isNullable()) {
                    findings.push({
                        line: node.getStartLineNumber(),
                        message: 'nullable 표현식에 non-null 접근 — narrowing 또는 ?. 권장',
                    });
                }
            }
            catch {
                /* 타입 정보 없음 */
            }
        });
        return findings;
    },
};
