const fs = require('fs');
const file = 'src/app/api/chat/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Using regex to replace the exact return line inside the function
code = code.replace(
  /if \(body\.temperature !== undefined.*?\r?\n\s*return { valid: true, data: body };/,
  "if (body.temperature !== undefined && (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)) return { valid: false, error: 'temperature 0-2' };\n  if (body.maxTokens !== undefined && (typeof body.maxTokens !== 'number' || body.maxTokens < 1 || body.maxTokens > 16384)) return { valid: false, error: 'maxTokens must be 1-16384' };\n  return { valid: true, data: body };"
);

fs.writeFileSync(file, code);
console.log('Fixed maxTokens DoW bug!');
