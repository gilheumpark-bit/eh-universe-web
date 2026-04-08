const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('filtered_errors.txt', 'utf-8');
const missing = new Set();
for (const line of content.split('\n')) {
  const match = line.match(/Cannot find module '(@\/[^']+)'/);
  if (match) missing.add(match[1]);
}

for (const mod of missing) {
  const isComponent = mod.includes('/components/') || mod.includes('/ui/') || mod.includes('/panels/');
  const isHook = mod.includes('/hooks/');
  
  const relPath = mod.replace('@/', '');
  let fullPath = path.join(process.cwd(), relPath);
  
  if (isComponent) fullPath += '.tsx';
  else fullPath += '.ts';
  
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  if (!fs.existsSync(fullPath)) {
    let stubContent = '';
    if (isComponent) {
      stubContent = 'import React from "react";\nexport default function Stub() { return null; };\nexport const CodeStudioShell = () => null;\nexport const CodeStudioPanelManager = () => null;\n// STUB';
    } else if (isHook) {
      stubContent = 'export function useStub() { return {}; };\nexport const useMobile = () => false;\nexport const useToast = () => ({ toast: () => {} });\n// STUB';
    } else {
      stubContent = 'export const noop = () => {};\nexport default noop;\nexport type StubType = any;\n// STUB';
    }
    fs.writeFileSync(fullPath, stubContent);
    console.log('Created stub:', fullPath);
  }
}
