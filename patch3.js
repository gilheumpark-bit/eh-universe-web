const fs = require('fs');
let code = fs.readFileSync('src/components/code-studio/CodeStudioPanelManager.tsx', 'utf8');
const searchStr = '          } : null}\r\n        />';
const searchStr2 = '          } : null}\n        />';

console.log('Includes str1?', code.includes(searchStr));
console.log('Includes str2?', code.includes(searchStr2));

code = code.replace(searchStr,           } : null}\n          files={Object.entries(stagedFiles || {}).map(([name]) => ({\n            name,\n            status: 'pending',\n            comments: [],\n            findings: [{ severity: 'info', message: 'Self-repair fix staged for review', source: 'pipeline', line: 0 }]\n          })) as any}\n          onApproveFile={onApproveFile}\n          onRejectFile={onRejectFile}\n        />);
code = code.replace(searchStr2,           } : null}\n          files={Object.entries(stagedFiles || {}).map(([name]) => ({\n            name,\n            status: 'pending',\n            comments: [],\n            findings: [{ severity: 'info', message: 'Self-repair fix staged for review', source: 'pipeline', line: 0 }]\n          })) as any}\n          onApproveFile={onApproveFile}\n          onRejectFile={onRejectFile}\n        />);

fs.writeFileSync('src/components/code-studio/CodeStudioPanelManager.tsx', code, 'utf8');
console.log('Done');
