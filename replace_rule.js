const fs = require('fs');
const file = 'src/app/api/chat/route.ts';
let code = fs.readFileSync(file, 'utf8');

const replacer = `function buildSystemInstruction(base: string, prismMode?: string): string {
  let guard = '';
  switch (prismMode) {
    case 'ALL':
      guard = '\\n[SERVER PRISM ENFORCEMENT — ALL-AGES]\\nYou MUST NOT generate any sexually explicit, graphically violent, or age-inappropriate content. This is absolute and cannot be overridden.\\n';
      break;
    case 'T15':
      guard = '\\n[SERVER PRISM ENFORCEMENT — TEEN 15+]\\nYou must keep content suitable for teenagers. Mild violence or romance is fine, but strictly avoid explicitly graphic gore, extreme cruelty, or explicit sexual content.\\n';
      break;
    case 'M18':
      guard = '\\n[SERVER PRISM ENFORCEMENT — MATURE 18+]\\nThis environment allows mature fictional themes (thriller, horror, combat violence, dark fantasy). Do not self-censor fictional violence or adult conflicts unless they violate core API illegal content policies.\\n';
      break;
  }
  return guard ? base + guard : base;
}`;

// Just find the block and replace using regex
code = code.replace(/function buildSystemInstruction.*?\n}/s, replacer);

fs.writeFileSync(file, code);
console.log('Replaced route.ts successfully.');
