const fs = require('fs');
let code = fs.readFileSync('src/components/code-studio/CodeStudioPanelManager.tsx', 'utf8');
code = code.replace(
  /} \: null}\s*\/>/,
  } : null}
          files={Object.entries(stagedFiles || {}).map(([name]) => ({
            name,
            status: 'pending',
            comments: [],
            findings: [{ severity: 'info', message: 'Self-repair fix staged for review', source: 'pipeline', line: 0 }]
          }))}
          onApproveFile={onApproveFile}
          onRejectFile={onRejectFile}
        />
);
fs.writeFileSync('src/components/code-studio/CodeStudioPanelManager.tsx', code, 'utf8');
