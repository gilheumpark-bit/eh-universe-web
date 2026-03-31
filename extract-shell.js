const fs = require('fs');

const shellPath = 'src/app/studio/StudioShell.tsx';
const hookPath = 'src/app/studio/useStudioShellController.ts';

const content = fs.readFileSync(shellPath, 'utf8');
const lines = content.split('\n');

// Find start and end of component function body
const startIdx = lines.findIndex(l => l.includes('export default function StudioShell() {'));
const returnIdx = lines.findIndex((l, idx) => idx > startIdx && l.includes('return ('));

if (startIdx === -1 || returnIdx === -1) {
    console.error('Could not find component boundaries');
    process.exit(1);
}

// Extract imports from lines 0 to startIdx
const imports = lines.slice(0, startIdx).join('\n');

// The hook body is from startIdx + 1 to returnIdx - 1
const hookBody = lines.slice(startIdx + 1, returnIdx).join('\n');

// Gather what needs to be returned by scanning the return JSX
// It's a huge list. Easiest way is to define it at the end of the hook body.
// We'll capture everything that looks like an assignment or declaration.
const extractKeys = hookBody.match(/(?:const|let) ([a-zA-Z0-9_]+) =/g)
    ?.map(m => m.replace(/const |let | =/g, '')) || [];
const extractDestructs = hookBody.match(/(?:const|let) \{([^}]+)\}/g)
    ?.flatMap(m => m.replace(/const \{|let \{|\}/g, '').split(',').map(s => s.trim().split(':')[0])) || [];
const extractFuncs = hookBody.match(/function ([a-zA-Z0-9_]+)\(/g)
    ?.map(m => m.replace(/function |\(/g, '')) || [];

let allVars = new Set([...extractKeys, ...extractDestructs, ...extractFuncs]);

// We also need to return pm, t, isKO, hasAiAccess, etc.
// Actually, instead of parsing, we can just replace the file contents safely.
// Since manual extraction is safer, let's write a script that just dumps the file for the AI to rewrite.

console.log("Hooks extracted... actually the script approach for 50 variables is brittle.");
process.exit(1);
