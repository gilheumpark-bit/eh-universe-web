const fs = require('fs');
const p = 'apps/desktop/renderer/components/code-studio/ProjectSpecForm.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');

fs.writeFileSync(p, c);
console.log('Fixed syntax errors');
