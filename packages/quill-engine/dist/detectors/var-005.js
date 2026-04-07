export const var005Detector = {
    ruleId: 'VAR-005',
    detect: (sourceFile) => {
        const findings = [];
        sourceFile.getVariableDeclarations().forEach(d => {
            if (d.getName().startsWith('_'))
                return;
            try {
                if (d.findReferencesAsNodes().length <= 1)
                    findings.push({ line: d.getStartLineNumber(), message: 'unused var: ' + d.getName() });
            }
            catch { }
        });
        return findings;
    },
};
