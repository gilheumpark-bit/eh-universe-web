export const var006Detector = {
    ruleId: 'VAR-006',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.getFunctions().forEach(fn => {
            fn.getParameters().forEach(p => {
                if (p.getName().startsWith('_'))
                    return;
                try {
                    if (p.findReferencesAsNodes().length <= 1)
                        findings.push({ line: p.getStartLineNumber(), message: 'unused param: ' + p.getName() });
                }
                catch { }
            });
        });
        return findings;
    },
};
