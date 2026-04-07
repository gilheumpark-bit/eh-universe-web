export const var010Detector = {
    ruleId: 'VAR-010',
    detect: (sourceFile) => {
        const findings = [];
        const seen = new Map();
        sourceFile.getVariableDeclarations().forEach(d => {
            const n = d.getName(), l = d.getStartLineNumber();
            if (seen.has(n))
                findings.push({ line: l, message: n + ' duplicate declaration' });
            else
                seen.set(n, l);
        });
        return findings;
    },
};
